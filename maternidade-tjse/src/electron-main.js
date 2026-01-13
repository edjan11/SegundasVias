const { app, Tray, Menu, nativeImage, Notification, BrowserWindow, session, globalShortcut, dialog } = require('electron');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const http = require('http');
const https = require('https');
// removed external chrome automation helpers (we use Electron flow)

// Evita crash por EPIPE ao logar quando stdout some.
try {
    const safeWrite = () => true;
    process.stdout.write = safeWrite;
    process.stderr.write = safeWrite;
} catch {}

process.on('uncaughtException', (err) => {
    if (err && err.code === 'EPIPE') return;
    throw err;
});
// CONFIGURAÃ‡ÃƒO
// ========================================
const CHECK_INTERVAL_MS = 5 * 60 * 1000; // 5 minutos
const TARGET_URL = 'https://www.tjse.jus.br/registrocivil/seguro/maternidade/solicitacaoExterna/consultaSolicitacaoExterna.tjse';
const LOGIN_URL = 'https://www.tjse.jus.br/controleacesso/paginas/loginTJSE.tjse';

const ICONS_DIR = path.join(__dirname, '..', 'icons');
const SECRET_KEY = 'tjse-monitor-2024-secure-key-32b';

// Chrome externo automation removed â€” priorizamos fluxo Electron (fazerLogin)

// ========================================
// ESTADO GLOBAL
// ========================================
let tray = null;
let mainWindow = null;
let checkInterval = null;
let isLoggedIn = false;
let lastCount = -1; // -1 para forÃ§ar notificaÃ§Ã£o na primeira verificaÃ§Ã£o
let lastUserFocus = 0;
let isDoingLogin = false; // Evita logins simultÃ¢neos
let isHandlingSolicitacao = false; // Evita handler concorrente

// Config simples persistida em arquivo para pasta de downloads
const LEGACY_CONFIG_FILE = path.join(__dirname, '..', 'maternidade-config.json');
function getUserDataDir() {
    return app.getPath('userData');
}
function getCredentialsFile() {
    return path.join(getUserDataDir(), 'credentials.enc');
}
function getConfigFile() {
    return path.join(getUserDataDir(), 'maternidade-config.json');
}
function getLogsDir() {
    return path.join(getUserDataDir(), 'logs');
}
function readConfig() {
    try {
        const file = getConfigFile();
        if (fs.existsSync(file)) {
            return JSON.parse(fs.readFileSync(file, 'utf8') || '{}');
        }
        if (fs.existsSync(LEGACY_CONFIG_FILE)) {
            const legacy = JSON.parse(fs.readFileSync(LEGACY_CONFIG_FILE, 'utf8') || '{}');
            writeConfig(legacy);
            return legacy;
        }
    } catch (e) { }
    return {};
}
function writeConfig(cfg) {
    try { fs.writeFileSync(getConfigFile(), JSON.stringify(cfg, null, 2), 'utf8'); } catch (e) { console.warn('Erro ao salvar config:', e.message); }
}
function getDownloadBase() {
    const cfg = readConfig();
    if (cfg && cfg.downloadDir) return cfg.downloadDir;
    if (process.env.MATERNIDADE_DOWNLOAD_DIR) return process.env.MATERNIDADE_DOWNLOAD_DIR;
    return path.join(getUserDataDir(), 'downloads');
}
function setDownloadBase(dir) {
    const cfg = readConfig();
    cfg.downloadDir = dir;
    writeConfig(cfg);
}

// ========================================
// CRIPTOGRAFIA
// ========================================
function encrypt(text) {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(SECRET_KEY), iv);
    let encrypted = cipher.update(text);
    encrypted = Buffer.concat([encrypted, cipher.final()]);
    return iv.toString('hex') + ':' + encrypted.toString('hex');
}

function decrypt(text) {
    try {
            const parts = text.split(':');
        const iv = Buffer.from(parts[0], 'hex');
        const encrypted = Buffer.from(parts[1], 'hex');
        const decipher = crypto.createDecipheriv('aes-256-cbc', Buffer.from(SECRET_KEY), iv);
        let decrypted = decipher.update(encrypted);
        decrypted = Buffer.concat([decrypted, decipher.final()]);
        return decrypted.toString();
    } catch {
        return null;
    }
}

function saveCredentials(login, senha) {
    fs.writeFileSync(getCredentialsFile(), encrypt(JSON.stringify({ login, senha })));
}

function loadCredentials() {
    try {
            const file = getCredentialsFile();
        if (fs.existsSync(file)) {
            const decrypted = decrypt(fs.readFileSync(file, 'utf8'));
            return decrypted ? JSON.parse(decrypted) : null;
        }
    } catch { }
    return null;
}

// ========================================
// ÃCONES E NOTIFICAÃ‡Ã•ES
// ========================================
function getIcon(type) {
    const icons = {
        'ok': 'maternidade-ok.ico',
        'alert': 'maternidade-nova-solicitacao.ico',
        'offline': 'maternidade-offline.ico',
        'loading': 'maternidade-ok.ico'
    };
    const iconPath = path.join(ICONS_DIR, icons[type] || icons['offline']);
    return fs.existsSync(iconPath) ? nativeImage.createFromPath(iconPath) : null;
}

function toAscii(text) {
    return (text || '').replace(/[^\x20-\x7E]/g, '');
}

function updateTray(type, tooltip) {
    if (!tray) return;
    const icon = getIcon(type);
    if (icon) tray.setImage(icon);
    tray.setToolTip(toAscii(tooltip || 'Monitor Maternidade TJSE'));
    console.log('Tray: ' + type + ' - ' + tooltip);
}

function notify(title, body) {
    console.log('Notificacao: ' + title + ' - ' + body);
    new Notification({ title: toAscii(title), body: toAscii(body) }).show();
}


// ========================================
// AÃ‡ÃƒO: quando houver novo SOLICITADO, captura nome e clica no link de AÃ§Ãµes
// ========================================
async function handleNewSolicitacaoAndClick() {
    if (isHandlingSolicitacao) return;
    isHandlingSolicitacao = true;
    // helper para download com cookies da sessÃ£o persist:tjse-monitor   
    function downloadWithCookies(fileUrl, destPath, cookieHeader, userAgent, referer, redirectsLeft = 5) {
        return new Promise((resolve, reject) => {
            try {
                    const u = new URL(fileUrl);
                const opts = {
                    protocol: u.protocol,
                    hostname: u.hostname,
                    path: u.pathname + u.search,
                    port: u.port || (u.protocol === 'https:' ? 443 : 80),
                    headers: {
                        Cookie: cookieHeader || undefined,
                        'User-Agent': userAgent || undefined,
                        'Referer': referer || undefined,
                        'Accept': 'application/pdf,application/octet-stream,*/*'
                    }
                };
                const lib = u.protocol === 'https:' ? https : http;
                const req = lib.get(opts, (res) => {
                    if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
                        if (redirectsLeft <= 0) return reject(new Error('Redirect limit'));
                        const nextUrl = new URL(res.headers.location, fileUrl).href;
                        res.resume();
                        return resolve(downloadWithCookies(nextUrl, destPath, cookieHeader, userAgent, referer, redirectsLeft - 1));
                    }
                    if (res.statusCode >= 400) return reject(new Error('Status ' + res.statusCode));
                    const file = fs.createWriteStream(destPath);
                    res.pipe(file);
                    file.on('finish', () => file.close(resolve));
                    file.on('error', (err) => reject(err));
                });
                req.on('error', reject);
            } catch (e) { reject(e); }
        });
    }

    try {
            // Abrir janela oculta com mesma sessÃ£o
        const win = new BrowserWindow({
            width: 1200,
            height: 800,
            show: false,
            webPreferences: {
                partition: 'persist:tjse-monitor',
                nodeIntegration: false,
                contextIsolation: true
            }
        });

        await win.loadURL(TARGET_URL);

        // Extrai nomes e hrefs (actionLink.href Ã© absoluto)
        const encontrados = await win.webContents.executeJavaScript(`(function(){
            const rows = Array.from(document.querySelectorAll('#j_idt27_data tr'));
            const out = [];
            for (const tr of rows) {
                try {
                        const tds = tr.querySelectorAll('td');
                    if (!tds || tds.length < 6) continue;
                    const nome = (tds[1].textContent || '').trim();
                    const situacaoSpan = tds[5].querySelector('span.ui-message-warn, span.ui-message-info, span.ui-message-error');
                    const situacao = situacaoSpan ? (situacaoSpan.textContent || '').trim().toUpperCase() : '';
                    const actionLink = tr.querySelector('td.opcoesDataTable a');
                    const href = actionLink ? actionLink.href : null;
                    if (situacao === 'SOLICITADO') out.push({ nome, href });
                } catch(e) { }
            }
            return out;
        })();`);

        if (!encontrados || encontrados.length === 0) {
            console.log('ðŸ”Ž Nenhum SOLICITADO encontrado (background).');
            writeStatusLog({ event: 'no_solicitado_found' });
            isHandlingSolicitacao = false;
            win.destroy();
            return;
        }

        const primeiro = encontrados[0];
        const nome = primeiro.nome.replace(/\s+/g, '_').replace(/[^a-zA-Z0-9_\-]/g, '');
        const href = primeiro.href;
        console.log('ðŸ“‹ (bg) Primeiro SOLICITADO:', nome, href);
        writeStatusLog({ event: 'auto_process_solicitado', nome, href });

        // Navega para a pÃ¡gina da solicitaÃ§Ã£o (oculto)
        if (href) {
            await win.loadURL(href);
            // espera carregar
            await new Promise(r => setTimeout(r, 1500));

            // Extrai dados da pÃ¡gina: nome registrado, data e links especÃ­ficos
            const info = await win.webContents.executeJavaScript(`(function(){
                function abs(h) { try { if (!h) return null; if (h.startsWith('http')) return h; if (h.startsWith('/')) return location.origin + h; return new URL(h, location.href).href; } catch(e){ return h; } }
                const nomeInput = document.querySelector('#nomeRegistrado');
                const nomeVal = nomeInput ? (nomeInput.value || nomeInput.textContent || '').trim() : '';
                const dataInput = document.querySelector('#dataSolicitacao_input');
                const dataVal = dataInput ? (dataInput.value || dataInput.textContent || '').trim() : '';
                const docAnchor = document.querySelector('#linkDownloadDocumentos') || document.querySelector('#idDocumentos a');
                const dnvAnchor = document.querySelector('#linkDownloadDeclaracao') || document.querySelector('#idDnv a');
                return {
                    nomeVal: nomeVal || null,
                    dataVal: dataVal || null,
                    docHref: docAnchor ? abs(docAnchor.getAttribute('href') || docAnchor.href) : null,
                    dnvHref: dnvAnchor ? abs(dnvAnchor.getAttribute('href') || dnvAnchor.href) : null
                };
            })();`);

            // Normaliza nome (para uso em nomes de arquivos/pastas)
            const rawName = (info && info.nomeVal) ? info.nomeVal : nome.replace(/_/g, ' ');
            const sanitizedName = rawName.replace(/\s+/g, ' ').trim().replace(/[\\/:*?"<>|]/g, '').replace(/\s/g, ' ');

            // Formata data (espera dd/mm/yyyy) -> yyyy-mm-dd
            let dateFormatted = null;
            if (info && info.dataVal) {
                const parts = info.dataVal.split('/').map(p=>p.trim());
                if (parts.length === 3) {
                    const [dd, mm, yyyy] = parts;
                    dateFormatted = `${yyyy}-${mm.padStart(2,'0')}-${dd.padStart(2,'0')}`;
                } else {
                    // fallback para timestamp
                    dateFormatted = new Date().toISOString().slice(0,10);
                }
            } else {
                dateFormatted = new Date().toISOString().slice(0,10);
            }
            // Monta diretorio base (config, env ou fallback)
            const baseDownloads = getDownloadBase();
            if (!fs.existsSync(baseDownloads)) fs.mkdirSync(baseDownloads, { recursive: true });

            const childDirName = `${sanitizedName} - ${dateFormatted}`.replace(/\s+/g,' ').trim();
            const childDir = path.join(baseDownloads, childDirName);
            if (!fs.existsSync(childDir)) fs.mkdirSync(childDir, { recursive: true });

            // Evita reprocessar se os PDFs ja existem na pasta compartilhada
            let solicitacaoId = null;
            try {
                    const u = new URL(href);
                solicitacaoId = u.searchParams.get('idSolicitacao');
            } catch {}
            const docPath = path.join(childDir, `DOCUMENTOS - ${sanitizedName}.pdf`);
            const dnvPath = path.join(childDir, `DNV - ${sanitizedName}.pdf`);
            const doneMarker = path.join(childDir, `.done${solicitacaoId ? '-' + solicitacaoId : ''}`);
            if ((fs.existsSync(docPath) && fs.existsSync(dnvPath)) || fs.existsSync(doneMarker)) {
                console.log('Ja processado, pulando download:', childDir);
                writeStatusLog({ event: 'already_downloaded', nome: sanitizedName, href, dir: childDir });
                try { win.destroy(); } catch {}
                isHandlingSolicitacao = false;
                return;
            }
            // Obter cookies da sessÃ£o para autenticar downloads
            const sess = session.fromPartition('persist:tjse-monitor');
            const cookieBaseUrl = href ? new URL(href).origin : TARGET_URL;
            const cookieList = await sess.cookies.get({ url: cookieBaseUrl });
            const cookieHeader = cookieList.map(c => `${c.name}=${c.value}`).join('; ');
            const userAgent = win.webContents.getUserAgent();

            // Baixa os PDFs esperados com nomes fixos
            const tasks = [];
            let allOk = true;
            if (info && info.docHref) {
                const dest = path.join(childDir, `DOCUMENTOS - ${sanitizedName}.pdf`);
                tasks.push({ url: info.docHref, dest, label: 'DOCUMENTOS' });
            } else {
                writeStatusLog({ event: 'missing_documentos_link', nome: sanitizedName, href });
            }

            if (info && info.dnvHref) {
                const dest = path.join(childDir, `DNV - ${sanitizedName}.pdf`);
                tasks.push({ url: info.dnvHref, dest, label: 'DNV' });
            } else {
                writeStatusLog({ event: 'missing_dnv_link', nome: sanitizedName, href });
            }

            for (const t of tasks) {
                try {
                        await downloadWithCookies(t.url, t.dest, cookieHeader, userAgent, href);
                    console.log(`âœ… ${t.label} baixado:`, t.dest);
                    writeStatusLog({ event: 'pdf_downloaded', tipo: t.label, nome: sanitizedName, pdfUrl: t.url, dest: t.dest });
                } catch (e) {
                    console.warn(`Falha ao baixar ${t.label}`, t.url, e.message);
                    writeStatusLog({ event: 'pdf_download_failed', tipo: t.label, nome: sanitizedName, pdfUrl: t.url, error: e.message });
                    allOk = false;
                }
            }
            if (allOk && tasks.length > 0) {
                try { fs.writeFileSync(doneMarker, new Date().toISOString(), 'utf8'); } catch (e) {}
            }
            // ApÃ³s completar ciclo de download, voltar ao loop principal normalmente
            try {
                    setTimeout(() => { try { loopPrincipal(); } catch (e) {} }, 2000);
            } catch (e) { }
        }

        // fecha a janela de background
        try { win.destroy(); } catch {}

    } catch (err) {
        console.error('Erro em handleNewSolicitacaoAndClick (bg):', err.message);
        writeStatusLog({ event: 'error_handle_solicitacao', error: err.message });
    } finally {
        isHandlingSolicitacao = false;
    }
}

// ========================================
// AGUARDAR ELEMENTO NA PÃGINA
// ========================================
async function aguardarElemento(win, selector, timeout = 10000) {
    const inicio = Date.now();
    while (Date.now() - inicio < timeout) {
        try {
                const existe = await win.webContents.executeJavaScript(`
                !!document.querySelector('${selector.replace(/'/g, "\\'")}')
            `);
            if (existe) return true;
        } catch { }
        await new Promise(r => setTimeout(r, 300));
    }
    return false;
}

// ========================================
// LOGGING: escreve status periÃ³dicos em logs/
// ========================================
function writeStatusLog(payload) {
    try {
            const logsDir = getLogsDir();
        if (!fs.existsSync(logsDir)) fs.mkdirSync(logsDir, { recursive: true });
        const file = path.join(logsDir, `status-${new Date().toISOString().slice(0,10)}.log`);
        const line = `${new Date().toISOString()} ${JSON.stringify(payload)}\n`;
        fs.appendFileSync(file, line, 'utf8');
    } catch (e) {
        console.warn('Erro ao gravar log de status:', e.message);
    }
}

// ========================================
// VERIFICAÃ‡ÃƒO RÃPIDA (USA SESSÃƒO LOGADA)
// ========================================
async function verificarSolicitados() {
    console.log('\nðŸ” Verificando solicitaÃ§Ãµes...');
    
    return new Promise((resolve) => {
        // USA A MESMA SESSÃƒO DO LOGIN para manter cookies!
        const win = new BrowserWindow({
            width: 800,
            height: 600,
            show: false,
            webPreferences: {
                partition: 'persist:tjse-monitor',
                nodeIntegration: false,
                contextIsolation: true
            }
        });

        let done = false;
        const finish = (result) => {
            if (done) return;
            done = true;
            win.destroy();
            resolve(result);
        };

        // Timeout 60 segundos (aumentado para conexÃµes lentas)
        setTimeout(() => {
            console.log('â° Timeout na verificaÃ§Ã£o');
            finish({ ok: false, count: 0, needsLogin: true });
        }, 60000);

        win.webContents.on('did-finish-load', async () => {
            const url = win.webContents.getURL();
            if (url.includes('blank.tjse')) return;
            
            console.log('ðŸ“„', url);

            // SessÃ£o expirada?
            if (url.includes('loginTJSE') || url.includes('acessonegado')) {
                console.log('âš ï¸ SessÃ£o expirada - precisa logar');
                isLoggedIn = false;
                finish({ ok: false, count: 0, needsLogin: true });
                return;
            }

            // PÃ¡gina de consultas - conta SOLICITADO
            if (url.includes('consultaSolicitacaoExterna')) {
                // Espera a pÃ¡gina carregar completamente
                await new Promise(r => setTimeout(r, 3000));
                
                try {
                        const count = await win.webContents.executeJavaScript(`
                        (function() {
                            let c = 0;
                            // Busca em todas as cÃ©lulas e spans da tabela
                            document.querySelectorAll('td, span, div').forEach(el => {
                                const texto = el.textContent.trim().toUpperCase();
                                if (texto === 'SOLICITADO' || texto === 'SOLICITADA') c++;
                            });
                            console.log('Contagem SOLICITADO:', c);
                            return c;
                        })();
                    `);
                    
                    console.log('âœ… Encontrados:', count, 'SOLICITADO(s)');
                    isLoggedIn = true;
                    finish({ ok: true, count, needsLogin: false });
                } catch (e) {
                    console.log('âŒ Erro ao contar:', e.message);
                    finish({ ok: false, count: 0, needsLogin: false });
                }
                return;
            }

            // Se caiu em outro lugar, vai para consultas
            if (url.includes('/registrocivil/') || url.includes('portal')) {
                console.log('ðŸ“ Redirecionando para consultas...');
                win.loadURL(TARGET_URL);
            }
        });

        win.loadURL(TARGET_URL);
    });
}

// ========================================
// LOGIN AUTOMÃTICO (VISÃVEL)
// ========================================
async function fazerLogin() {
    // Evita logins simultÃ¢neos
    if (isDoingLogin) {
        console.log('â³ Login jÃ¡ em andamento...');
        return false;
    }
    
    const creds = loadCredentials();
    if (!creds) {
        console.log('âŒ Configure suas credenciais primeiro!');
        notify('Monitor TJSE', 'âš ï¸ Configure suas credenciais no menu');
        return false;
    }

    isDoingLogin = true;
    console.log('ðŸ” Iniciando login...');

    // Se jÃ¡ existe janela, fecha
    if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.destroy();
    }

    return new Promise((resolve) => {
        mainWindow = new BrowserWindow({
            width: 1100,
            height: 750,
            show: true,
            webPreferences: {
                partition: 'persist:tjse-monitor',
                nodeIntegration: false,
                contextIsolation: true
            }
        });

        let done = false;
        let etapa = 'inicio';
        
        const finish = (success) => {
            if (done) return;
            done = true;
            isDoingLogin = false;
            if (success) {
                mainWindow.hide();
            }
            resolve(success);
        };

        // Timeout 120 segundos (aumentado para conexÃµes lentas)
        setTimeout(() => {
            console.log('â° Timeout no login');
            finish(false);
        }, 120000);

        // Oculta ao fechar (nÃ£o destrÃ³i)
        mainWindow.on('close', () => { app.quit(); });

        // Detecta foco do usuÃ¡rio
        mainWindow.on('focus', () => {
            lastUserFocus = Date.now();
        });

        // Intercepta popups
        mainWindow.webContents.setWindowOpenHandler(({ url }) => {
            if (!url.includes('blank.tjse')) {
                mainWindow.loadURL(url);
            }
            return { action: 'deny' };
        });

        mainWindow.webContents.on('did-finish-load', async () => {
            if (done) return;
            
            try {
                    const url = mainWindow.webContents.getURL();
                if (url.includes('blank.tjse')) return;
                
                console.log(`ðŸ“„ [${etapa}]`, url);

                // === ETAPA 1: PÃ¡gina de Login ===
                if (url.includes('loginTJSE') && etapa === 'inicio') {
                    etapa = 'login';
                    // Espera a pÃ¡gina carregar
                    await aguardarElemento(mainWindow, 'img[alt="Entrar com login e senha"]', 10000);
                    
                    // Clica em "Login e senha"
                    await mainWindow.webContents.executeJavaScript(`
                        document.querySelector('img[alt="Entrar com login e senha"]')?.click();
                    `);
                    
                    // Espera os campos aparecerem
                    await aguardarElemento(mainWindow, '#loginName', 8000);
                    await new Promise(r => setTimeout(r, 500));
                    
                    // Preenche credenciais
                    await mainWindow.webContents.executeJavaScript(`
                        const l = document.querySelector('#loginName');
                        const s = document.querySelector('#loginSenha');
                        if (l) { l.value = '${creds.login}'; l.dispatchEvent(new Event('input', {bubbles:true})); }
                        if (s) { s.value = '${creds.senha}'; s.dispatchEvent(new Event('input', {bubbles:true})); }
                    `);
                    
                    await new Promise(r => setTimeout(r, 300));
                    
                    // Clica Entrar
                    await mainWindow.webContents.executeJavaScript(`
                        (document.querySelector('input[value="Entrar"]') || document.querySelector('button[type="submit"]'))?.click();
                    `);
                    
                    etapa = 'aguardando-portal';
                    return;
                }

                // === ETAPA 2: Portal de Sistemas ===
                if ((url.includes('sistemasTJSE') || url.includes('portalExterno')) && etapa === 'aguardando-portal') {
                    etapa = 'portal';
                    // Espera o link do Registro Civil aparecer
                    await aguardarElemento(mainWindow, 'a[id*="clAcessar"]', 10000);
                    
                    // Clica em Registro Civil
                    await mainWindow.webContents.executeJavaScript(`
                        const links = document.querySelectorAll('a[id*="clAcessar"]');
                        for (let a of links) {
                            const h2 = a.querySelector('h2');
                            if (h2 && h2.textContent.trim() === 'Registro Civil') {
                                a.click();
                                break;
                            }
                        }
                    `);
                    
                    etapa = 'aguardando-rc';
                    return;
                }

                // === ETAPA 3: Registro Civil (modal de cartÃ³rio) ===
                if (url.includes('/registrocivil/') && !url.includes('consultaSolicitacaoExterna') && etapa === 'aguardando-rc') {
                    etapa = 'registro-civil';
                    await new Promise(r => setTimeout(r, 2000));
                    
                    // Verifica se tem modal de seleÃ§Ã£o
                    const temModal = await mainWindow.webContents.executeJavaScript(`
                        !!document.querySelector('.ui-dialog-title')?.textContent?.includes('Selecionar');
                    `);
                    
                    if (temModal) {
                        console.log('ðŸ¢ Selecionando cartÃ³rio...');
                        
                        // Abre dropdown
                        await mainWindow.webContents.executeJavaScript(`
                            document.querySelector('#formSetor\\\\:cbSetor_label')?.click();
                        `);
                        await aguardarElemento(mainWindow, '#formSetor\\\\:cbSetor_items li', 5000);
                        
                        // Seleciona 9Âº OfÃ­cio
                        await mainWindow.webContents.executeJavaScript(`
                            const items = document.querySelectorAll('#formSetor\\\\:cbSetor_items li');
                            for (const item of items) {
                                if (item.textContent.includes('9Âº OfÃ­cio')) {
                                    item.click();
                                    break;
                                }
                            }
                        `);
                        await new Promise(r => setTimeout(r, 500));
                        
                        // Clica Entrar
                        await mainWindow.webContents.executeJavaScript(`
                            document.querySelector('#formSetor\\\\:sim')?.click();
                        `);
                        await new Promise(r => setTimeout(r, 1000));
                    }
                    
                    // Navega para Maternidade
                    mainWindow.loadURL(TARGET_URL);
                    etapa = 'aguardando-maternidade';
                    return;
                }

                // === ETAPA 4: PÃ¡gina de Maternidade ===
                if (url.includes('consultaSolicitacaoExterna')) {
                    console.log('âœ… LOGIN COMPLETO!');
                    isLoggedIn = true;
                    updateTray('ok', 'âœ… Logado com sucesso');
                    notify('Monitor TJSE', 'âœ… Login realizado!');
                    finish(true);
                    return;
                }

            } catch (err) {
                console.log('âŒ Erro no login:', err.message);
            }
        });

        mainWindow.loadURL(LOGIN_URL);
    });
}

// ========================================
// LOOP PRINCIPAL
// ========================================
async function loopPrincipal() {
    // SÃ“ pausa se o usuÃ¡rio estÃ¡ ATIVAMENTE usando a janela (em foco)
    if (mainWindow && !mainWindow.isDestroyed() && mainWindow.isFocused()) {
        console.log('â¸ï¸ Janela em foco, pulando verificaÃ§Ã£o automÃ¡tica');
        return;
    }

    const result = await verificarSolicitados();
    // Gravacao simples do status para debug/monitoramento externo
    try { writeStatusLog({ check: 'verificarSolicitados', result }); } catch {}
    
    if (result.ok) {
        if (result.count > 0) {
            updateTray('alert', `âš ï¸ ${result.count} SOLICITADO(s) pendente(s)`);
            
            // Notifica se Ã© primeira vez OU se aumentou
            if (lastCount === -1 || result.count > lastCount) {
                notify('ðŸ¥ Nova SolicitaÃ§Ã£o!', `Existem ${result.count} solicitaÃ§Ã£o(Ãµes) com status SOLICITADO`);
                // Ao detectar nova solicitaÃ§Ã£o, captura nome e clica no botÃ£o para teste
                try { await handleNewSolicitacaoAndClick(); } catch (e) { console.warn('Erro ao executar handleNewSolicitacaoAndClick:', e.message); }
            }
        } else {
            updateTray('ok', 'âœ… Nenhuma solicitaÃ§Ã£o pendente');
        }
        lastCount = result.count;
        
    } else if (result.needsLogin) {
        updateTray('offline', 'ðŸ”´ SessÃ£o expirada');
        
        // Tenta login automÃ¡tico (qualquer horÃ¡rio)
        console.log('ðŸ”„ Tentando login automÃ¡tico...');
        const ok = await fazerLogin();
        if (ok) {
            // Verifica de novo apÃ³s logar
            setTimeout(() => loopPrincipal(), 3000);
        }
    }
}

// ========================================
// MENU DO TRAY
// ========================================
function criarMenu() {
    const creds = loadCredentials();
    
    return Menu.buildFromTemplate([
        { label: 'Monitor Maternidade TJSE', enabled: false },
        { type: 'separator' },
        {
            label: 'Pasta destino: ' + getDownloadBase(),
            enabled: false
        },
        {
            label: 'Escolher pasta de destino',
            click: async () => {
                try {
                        const res = await dialog.showOpenDialog({ properties: ['openDirectory'] });
                    if (!res.canceled && res.filePaths && res.filePaths[0]) {
                        setDownloadBase(res.filePaths[0]);
                        tray.setContextMenu(criarMenu());


                        notify('Monitor TJSE', 'Pasta destino atualizada');
                    }
                } catch (e) { console.warn('Erro ao escolher pasta:', e.message); }
            }
        },
        {
            label: 'Fazer Login',
            click: async () => {
                await fazerLogin();
                await loopPrincipal();
            }
        },
        {
            label: 'Verificar Agora',
            click: () => {
                lastCount = -1;
                loopPrincipal();
            }
        },
        {
            label: 'Forcar download agora',
            click: async () => {
                lastCount = -1;
                try {
                        await handleNewSolicitacaoAndClick();
                } catch (e) {
                    console.warn('Erro ao forcar download agora:', e.message);
                }
            }
        },
        {
            label: 'Toggle DevTools (F12)',
            accelerator: 'F12',
            click: (menuItem, browserWindow) => {
                (async () => {
                    let win = browserWindow || mainWindow;
                    if (!win || win.isDestroyed()) {
                        // criar uma janela temporÃ¡ria para debug
                        win = new BrowserWindow({
                            width: 1200,
                            height: 800,
                            show: true,
                            webPreferences: {
                                partition: 'persist:tjse-monitor',
                                nodeIntegration: false,
                                contextIsolation: true
                            }
                        });
                        await win.loadURL(TARGET_URL);
                    }
                    try {
                            if (!win.isVisible()) win.show();
                        win.focus();
                        win.webContents.toggleDevTools();
                    } catch (e) {
                        console.warn('Falha ao abrir DevTools:', e.message);
                    }
                })();
            }
        },
        {
            label: 'Abrir Maternidade',
            click: async () => {
                lastUserFocus = Date.now();

                // Se jÃ¡ estÃ¡ logado, apenas abre/mostra a janela com a pÃ¡gina
                if (isLoggedIn) {
                    if (mainWindow && !mainWindow.isDestroyed()) {
                        mainWindow.loadURL(TARGET_URL);
                        mainWindow.show();
                        mainWindow.focus();
                    } else {
                        const win = new BrowserWindow({
                            width: 1200,
                            height: 800,
                            show: true,
                            webPreferences: {
                                partition: 'persist:tjse-monitor',
                                nodeIntegration: false,
                                contextIsolation: true
                            }
                        });
                        win.loadURL(TARGET_URL);
                    }
                    return;
                }

                // Se nÃ£o estÃ¡ logado, usar o fluxo Electron confiÃ¡vel
                console.log('âœ³ï¸ NÃ£o logado â€” iniciando fluxo Electron de login');
                const ok = await fazerLogin();
                if (ok) {
            
                } else {
                    // Opcional: fallback para Chrome externo (comentado por seguranÃ§a)
                    // launchChromeWithProfile(TARGET_URL, CHROME_PROFILE);
                    notify('Monitor TJSE', 'âš ï¸ NÃ£o foi possÃ­vel efetuar login automaticamente');
                }
            }
        },
        { type: 'separator' },
        {
            label: creds ? ('Login: ' + creds.login) : 'Configurar Login',
            click: () => abrirConfigCredenciais()
        },
        { type: 'separator' },
        { label: 'Sair', click: () => app.quit() }
    ]);
}

function abrirConfigCredenciais() {
    const creds = loadCredentials();
    
    const win = new BrowserWindow({
        width: 400,
        height: 320,
        resizable: false,
        alwaysOnTop: true,
        title: 'Credenciais TJSE',
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            preload: path.join(__dirname, 'preload-creds.js')
        }
    });

    // Cria preload se necessÃ¡rio
    const preloadPath = path.join(__dirname, 'preload-creds.js');
    if (!fs.existsSync(preloadPath)) {
        fs.writeFileSync(preloadPath, `
            const { contextBridge, ipcRenderer } = require('electron');
            contextBridge.exposeInMainWorld('api', {
                saveCredentials: (data) => ipcRenderer.send('save-credentials', data)
            });
        `);
    }

    const html = `<!DOCTYPE html>
<html><head><meta charset="utf-8">
<style>
body { font-family: Segoe UI, sans-serif; padding: 20px; background: #f5f5f5; }
h2 { color: #333; text-align: center; }
label { display: block; margin: 10px 0 5px; font-weight: 500; }
input { width: 100%; padding: 10px; margin-bottom: 10px; border: 1px solid #ccc; border-radius: 4px; box-sizing: border-box; }
.buttons { text-align: center; margin-top: 20px; }
button { background: #0078d4; color: white; border: none; padding: 10px 25px; border-radius: 4px; cursor: pointer; margin: 0 5px; }
button:hover { background: #106ebe; }
button.cancel { background: #666; }
</style></head>
<body>
<h2>ðŸ”‘ Credenciais TJSE</h2>
<label>Login:</label>
<input type="text" id="login" value="${creds?.login || ''}" placeholder="seu.usuario">
<label>Senha:</label>
<input type="password" id="senha" value="${creds?.senha || ''}" placeholder="sua senha">
<div class="buttons">
<button onclick="salvar()">ðŸ’¾ Salvar</button>
<button class="cancel" onclick="window.close()">Cancelar</button>
</div>
<script>
function salvar() {
    const login = document.getElementById('login').value;
    const senha = document.getElementById('senha').value;
    if (login && senha) {
        window.api.saveCredentials({ login, senha });
        window.close();
    } else {
        alert('Preencha login e senha');
    }
}
</script>
</body></html>`;

    const tempFile = path.join(app.getPath('temp'), 'tjse-creds.html');
    fs.writeFileSync(tempFile, html);
    win.loadFile(tempFile);
    win.setMenu(null);

    const { ipcMain } = require('electron');
    ipcMain.once('save-credentials', (event, data) => {
        saveCredentials(data.login, data.senha);
        console.log('âœ… Credenciais salvas:', data.login);
        tray.setContextMenu(criarMenu());

    
    });
}

// ========================================
// INICIALIZAÃ‡ÃƒO
// ========================================
app.whenReady().then(() => {
    const gotLock = app.requestSingleInstanceLock();
    if (!gotLock) {
        console.log('ƒ?O JÇ­ existe uma instÇ½ncia rodando!');
        app.quit();
        return;
    }
    app.on('second-instance', () => {
        try {
                if (mainWindow && !mainWindow.isDestroyed()) {
                if (!mainWindow.isVisible()) mainWindow.show();
                mainWindow.focus();
            }
        } catch {}
    });
    const creds = loadCredentials();
    
    console.log('\nâ•”â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•—');
    console.log('Monitor Maternidade TJSE - SIMPLIFICADO');
    console.log('â•šâ•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•');
    console.log(`â”œâ”€ VerificaÃ§Ã£o: a cada 5 minutos`);
    console.log(`â”œâ”€ Login: ${creds ? creds.login : '(nÃ£o configurado)'}`);

    // Cria tray
    tray = new Tray(getIcon('loading'));
    tray.setToolTip('Carregando...');
    tray.setContextMenu(criarMenu());
    updateTray('loading', 'Carregando...');

    

    // Duplo clique abre a janela (prioriza Electron)
    tray.on('double-click', async () => {
        lastUserFocus = Date.now();
        if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.show();
            mainWindow.focus();
            return;
        }

        if (isLoggedIn) {
            const win = new BrowserWindow({
                width: 1200,
                height: 800,
                show: true,
                webPreferences: {
                    partition: 'persist:tjse-monitor',
                    nodeIntegration: false,
                    contextIsolation: true
                }
            });
            win.loadURL(TARGET_URL);
            return;
        }

        // Se nÃ£o logado, iniciar fluxo de login via Electron
        const ok = await fazerLogin();
        if (ok && mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.loadURL(TARGET_URL);
            mainWindow.show();
            mainWindow.focus();
        }
    });

    // Registrar globalShortcut F12 para abrir DevTools (quando possÃ­vel)
    try {
            globalShortcut.register('F12', async () => {
            let win = BrowserWindow.getFocusedWindow() || mainWindow;
            if (!win || win.isDestroyed()) {
                win = new BrowserWindow({
                    width: 1200,
                    height: 800,
                    show: true,
                    webPreferences: {
                        partition: 'persist:tjse-monitor',
                        nodeIntegration: false,
                        contextIsolation: true
                    }
                });
                await win.loadURL(TARGET_URL);
            }
            try {
                    if (!win.isVisible()) win.show();
                win.focus();
                win.webContents.toggleDevTools();
            } catch (e) {
                console.warn('Falha ao abrir DevTools via globalShortcut:', e.message);
            }
        });
    } catch (e) {
        console.warn('NÃ£o foi possÃ­vel registrar globalShortcut F12:', e.message);
    }

    // Primeira verificaÃ§Ã£o em 5 segundos
    setTimeout(() => {
        loopPrincipal();
    }, 5000);
    
    // Loop a cada 5 minutos
    checkInterval = setInterval(loopPrincipal, CHECK_INTERVAL_MS);
});

app.on('window-all-closed', () => app.quit());

app.on('will-quit', () => {
    try { globalShortcut.unregisterAll(); } catch {}
});














































