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
// CONFIGURAÇÃO
// ========================================
const CHECK_INTERVAL_MS = 5 * 60 * 1000; // 5 minutos
const CHECK_TIMEOUT_MS = 120000; // timeout mais folgado para a verificacao
const FAILOVER_MS = 15 * 60 * 1000; // 15 minutos para trocar credencial
const ALT_LOGIN = process.env.MATERNIDADE_ALT_LOGIN;
const ALT_SENHA = process.env.MATERNIDADE_ALT_SENHA;
const HAS_ALT_CREDS = !!(ALT_LOGIN && ALT_SENHA);
const FAILURE_NOTIFY_COOLDOWN_MS = 15 * 60 * 1000; // 15 minutos entre notificacoes de falha
const TARGET_URL = 'https://www.tjse.jus.br/registrocivil/seguro/maternidade/solicitacaoExterna/consultaSolicitacaoExterna.tjse';
const LOGIN_URL = 'https://www.tjse.jus.br/controleacesso/paginas/loginTJSE.tjse';

const ICONS_DIR = path.join(__dirname, '..', 'icons');
const SECRET_KEY = 'tjse-monitor-2024-secure-key-32b';
const APP_ICON = (() => {
    const fromEnv = process.env.MATERNIDADE_APP_ICON;
    if (fromEnv && fs.existsSync(fromEnv)) return fromEnv;
    const fallback = path.join(ICONS_DIR, 'maternidade-ok.ico');
    return fs.existsSync(fallback) ? fallback : undefined;
})();

// Chrome externo automation removed a priorizamos fluxo Electron (fazerLogin)

// ========================================
// ESTADO GLOBAL
// ========================================
let tray = null;
let mainWindow = null;
let checkInterval = null;
let isLoggedIn = false;
let lastCount = -1; // -1 para forcar notificacao na primeira verificacao
let lastUserFocus = 0;
let lastUserActivity = Date.now();
let isDoingLogin = false; // Evita logins simultaneos
let isHandlingSolicitacao = false; // Evita handler concorrente
let isQuitting = false;
let consecutiveCheckFailures = 0;
let alertBlinkTimer = null;
let alertBlinkState = false;
let consecutiveTimeouts = 0;
let currentCredSource = 'primary';
let failureSince = null;
let lastFailureNotifyAt = 0;

// Config simples persistida em arquivo para pasta de downloads
const LEGACY_CONFIG_FILE = path.join(__dirname, '..', 'maternidade-config.json');
function getUserDataDir() {
    return app.getPath('userData');
}
function getCredentialsFile() {
    return path.join(getUserDataDir(), 'credentials.enc');
}
function getAltCredentialsFile() {
    return path.join(getUserDataDir(), 'credentials-alt.enc');
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

function loadCredentials(source = 'primary') {
    try {
        if (source === 'alternate') {
            if (HAS_ALT_CREDS) return { login: ALT_LOGIN, senha: ALT_SENHA };
            const altFile = getAltCredentialsFile();
            if (fs.existsSync(altFile)) {
                const decrypted = decrypt(fs.readFileSync(altFile, 'utf8'));
                return decrypted ? JSON.parse(decrypted) : null;
            }
            return null;
        }
        const file = getCredentialsFile();
        if (fs.existsSync(file)) {
            const decrypted = decrypt(fs.readFileSync(file, 'utf8'));
            return decrypted ? JSON.parse(decrypted) : null;
        }
    } catch { }
    return null;
}

function saveAltCredentials(login, senha) {
    fs.writeFileSync(getAltCredentialsFile(), encrypt(JSON.stringify({ login, senha })));
}

// ========================================
// ÍCONES E NOTIFICAÇÕES
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
    // Controla piscar quando estiver em alerta
    if (alertBlinkTimer) {
        clearInterval(alertBlinkTimer);
        alertBlinkTimer = null;
    }
    const setIcon = (iconType) => {
        const icon = getIcon(iconType);
        if (icon) tray.setImage(icon);
    };
    if (type === 'alert') {
        setIcon('alert');
        alertBlinkState = false;
        alertBlinkTimer = setInterval(() => {
            alertBlinkState = !alertBlinkState;
            setIcon(alertBlinkState ? 'alert' : 'ok');
        }, 800);
    } else {
        setIcon(type);
    }
    tray.setToolTip(toAscii(tooltip || 'Monitor Maternidade TJSE'));
    console.log('Tray: ' + type + ' - ' + tooltip);
}

function notify(title, body) {
    const finalTitle = (title && title.toLowerCase().includes('maternidade'))
        ? title
        : `Maternidade TJSE - ${title || 'Aviso'}`;
    console.log('Notificacao: ' + finalTitle + ' - ' + body);
    new Notification({ title: toAscii(finalTitle), body: toAscii(body) }).show();
}


// ========================================
// AAAO: quando houver novo SOLICITADO, captura nome e clica no link de AAAes
// ========================================
async function handleNewSolicitacaoAndClick() {
    if (isHandlingSolicitacao) return;
    isHandlingSolicitacao = true;
    // helper para download com cookies da sessAo persist:tjse-monitor   
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
            // Abrir janela oculta com mesma sessAo
        const win = new BrowserWindow({
            width: 1200,
            height: 800,
            show: false,
            icon: APP_ICON,
            webPreferences: {
                partition: 'persist:tjse-monitor',
                nodeIntegration: false,
                contextIsolation: true
            }
        });

        await win.loadURL(TARGET_URL);

        // Extrai nomes e hrefs (actionLink.href A absoluto)
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
            console.log('Nenhum SOLICITADO encontrado (background).');
            writeStatusLog({ event: 'no_solicitado_found' });
            isHandlingSolicitacao = false;
            win.destroy();
            return;
        }

        const primeiro = encontrados[0];
        const nome = primeiro.nome.replace(/\s+/g, '_').replace(/[^a-zA-Z0-9_\-]/g, '');
        const href = primeiro.href;
        console.log('(bg) Primeiro SOLICITADO:', nome, href);
        writeStatusLog({ event: 'auto_process_solicitado', nome, href });

        // Navega para a pAgina da solicitaAAo (oculto)
        if (href) {
            await win.loadURL(href);
            // espera carregar
            await new Promise(r => setTimeout(r, 1500));

            // Extrai dados da pAgina: nome registrado, data e links especAficos
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
            // Obter cookies da sessAo para autenticar downloads
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
                notify('Maternidade - Link faltando', `Sem link de DOCUMENTOS para ${sanitizedName}.`);
            }

            if (info && info.dnvHref) {
                const dest = path.join(childDir, `DNV - ${sanitizedName}.pdf`);
                tasks.push({ url: info.dnvHref, dest, label: 'DNV' });
            } else {
                writeStatusLog({ event: 'missing_dnv_link', nome: sanitizedName, href });
                notify('Maternidade - Link faltando', `Sem link de DNV para ${sanitizedName}.`);
            }

            for (const t of tasks) {
                try {
                        await downloadWithCookies(t.url, t.dest, cookieHeader, userAgent, href);
                    console.log(`a... ${t.label} baixado:`, t.dest);
                    writeStatusLog({ event: 'pdf_downloaded', tipo: t.label, nome: sanitizedName, pdfUrl: t.url, dest: t.dest });
                } catch (e) {
                    console.warn(`Falha ao baixar ${t.label}`, t.url, e.message);
                    writeStatusLog({ event: 'pdf_download_failed', tipo: t.label, nome: sanitizedName, pdfUrl: t.url, error: e.message });
                    notify('Maternidade - Erro download', `${t.label} de ${sanitizedName} falhou: ${e.message}`);
                    allOk = false;
                }
            }
            if (allOk && tasks.length > 0) {
                try { fs.writeFileSync(doneMarker, new Date().toISOString(), 'utf8'); } catch (e) {}
            }
            // ApA3s completar ciclo de download, voltar ao loop principal normalmente
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
// AGUARDAR ELEMENTO NA PAGINA
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
// LOGGING: escreve status periA3dicos em logs/
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
// VERIFICAAAO RAPIDA (USA SESSAO LOGADA)
// ========================================
async function verificarSolicitados() {
    console.log('\nVerificando solicitações...');
    const MAX_RETRY = 3;
    let lastResult = { ok: false, count: 0, needsLogin: true, reason: 'timeout' };

    for (let attempt = 1; attempt <= MAX_RETRY; attempt++) {
        const result = await new Promise((resolve) => {
            // USA A MESMA SESSAO DO LOGIN para manter cookies!
            const win = new BrowserWindow({
                width: 800,
                height: 600,
                show: false,
                icon: APP_ICON,
                webPreferences: {
                    partition: 'persist:tjse-monitor',
                    nodeIntegration: false,
                    contextIsolation: true
                }
            });

            let done = false;
            const finish = (res) => {
                if (done) return;
                done = true;
                try { win.destroy(); } catch {}
                resolve(res);
            };

            const timeout = setTimeout(() => {
                console.log('Timeout na verificação (tentativa ' + attempt + ')');
                finish({ ok: false, count: 0, needsLogin: true, reason: 'timeout' });
            }, CHECK_TIMEOUT_MS);

            win.webContents.on('did-finish-load', async () => {
                const url = win.webContents.getURL();
                if (url.includes('blank.tjse')) return;
                
                console.log('URL carregada:', url);

                // Verifica se a página atual já mostra "Acesso negado" (mesmo sem trocar a URL)
                try {
                    const bodyText = await win.webContents.executeJavaScript("document.body ? document.body.innerText : ''");
                    if ((bodyText || '').toLowerCase().includes('acesso negado')) {
                        console.log('Sessão expirada (acesso negado detectado) - precisa logar');
                        isLoggedIn = false;
                        clearTimeout(timeout);
                        finish({ ok: false, count: 0, needsLogin: true, reason: 'acesso_negado' });
                        return;
                    }
                } catch {}

                // Sessão expirada?
                if (url.includes('loginTJSE') || url.includes('acessonegado')) {
                    console.log('Sessão expirada - precisa logar');
                    isLoggedIn = false;
                    clearTimeout(timeout);
                    finish({ ok: false, count: 0, needsLogin: true, reason: 'login' });
                    return;
                }

                // Página de consultas - conta SOLICITADO
                if (url.includes('consultaSolicitacaoExterna')) {
                    // Espera a página carregar completamente
                    await new Promise(r => setTimeout(r, 3000));
                    
                    try {
                        const count = await win.webContents.executeJavaScript(`
                        (function() {
                            let c = 0;
                            // Busca em todas as células e spans da tabela
                            document.querySelectorAll('td, span, div').forEach(el => {
                                const texto = el.textContent.trim().toUpperCase();
                                if (texto === 'SOLICITADO' || texto === 'SOLICITADA') c++;
                            });
                            console.log('Contagem SOLICITADO:', c);
                            return c;
                        })();
                    `);
                        
                        console.log('Encontrados:', count, 'SOLICITADO(s)');
                        isLoggedIn = true;
                        clearTimeout(timeout);
                        finish({ ok: true, count, needsLogin: false });
                    } catch (e) {
                        console.log('Erro ao contar:', e.message);
                        clearTimeout(timeout);
                        finish({ ok: false, count: 0, needsLogin: true, reason: 'count_error' });
                    }
                    return;
                }

                // Se caiu em outro lugar, vai para consultas
                if (url.includes('/registrocivil/') || url.includes('portal')) {
                    console.log('Redirecionando para consultas...');
                    win.loadURL(TARGET_URL);
                }
            });

            win.loadURL(TARGET_URL);
        });

        if (result.ok) {
            return result;
        }

        lastResult = result;
        if (attempt < MAX_RETRY) {
            console.log(`Repetindo verificação (${attempt}/${MAX_RETRY})...`);
            await new Promise(r => setTimeout(r, 1500));
            continue;
        }
    }

    return lastResult;
}

// ========================================
// LOGIN AUTOMATICO (VISAVEL)
// ========================================
async function fazerLogin() {
    // Evita logins simultAneos
    if (isDoingLogin) {
        console.log('a3 Login jA em andamento...');
        return false;
    }
    
    let creds = loadCredentials(currentCredSource);
    if (!creds) {
        // tenta alternativo se o atual nao existir
        creds = loadCredentials(currentCredSource === 'primary' ? 'alternate' : 'primary');
        if (creds) currentCredSource = currentCredSource === 'primary' ? 'alternate' : 'primary';
    }
    if (!creds) {
        console.log('Configure suas credenciais primeiro!');
        notify('Maternidade - Credenciais ausentes', 'Configure o login/senha pelo menu ou defina MATERNIDADE_ALT_LOGIN/MATERNIDADE_ALT_SENHA.');
        return false;
    }

    isDoingLogin = true;
    console.log('Iniciando login...');

    // Se jA existe janela, fecha
    if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.destroy();
    }

    return new Promise((resolve) => {
        mainWindow = new BrowserWindow({
            width: 1100,
            height: 750,
            show: true,
            icon: APP_ICON,
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

        // Timeout 120 segundos (aumentado para conexões lentas)
        setTimeout(() => {
            console.log('Timeout no login');
            finish(false);
        }, 120000);

        // Oculta ao fechar (nao destroi)
        mainWindow.on('close', (e) => {
            if (isQuitting) return;
            try { e.preventDefault(); } catch {}
            try { mainWindow.hide(); mainWindow.setSkipTaskbar(true); } catch {}
        });

        // Detecta foco/atividade do usuario
        mainWindow.on('focus', () => {
            lastUserFocus = Date.now();
            lastUserActivity = Date.now();
            try { mainWindow.setSkipTaskbar(false); } catch {}
        });
        mainWindow.webContents.on('before-input-event', () => {
            lastUserActivity = Date.now();
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
                
                console.log(`Login etapa [${etapa}]`, url);

                // === ETAPA 1: Página de Login ===
                if (url.includes('loginTJSE') && etapa === 'inicio') {
                    etapa = 'login';
                    // Espera a página carregar
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

                // === ETAPA 3: Registro Civil (modal de cartório) ===
                if (url.includes('/registrocivil/') && !url.includes('consultaSolicitacaoExterna') && etapa === 'aguardando-rc') {
                    etapa = 'registro-civil';
                    await new Promise(r => setTimeout(r, 2000));
                    
                    // Verifica se tem modal de seleAAo
                    const temModal = await mainWindow.webContents.executeJavaScript(`
                        !!document.querySelector('.ui-dialog-title')?.textContent?.includes('Selecionar');
                    `);
                    
                    if (temModal) {
                        console.log('Selecionando cartório...');
                        
                        // Abre dropdown
                        await mainWindow.webContents.executeJavaScript(`
                            document.querySelector('#formSetor\\\\:cbSetor_label')?.click();
                        `);
                        await aguardarElemento(mainWindow, '#formSetor\\\\:cbSetor_items li', 5000);
                        
                        // Seleciona 9º Ofício
                        await mainWindow.webContents.executeJavaScript(`
                            const items = document.querySelectorAll('#formSetor\\\\:cbSetor_items li');
                            for (const item of items) {
                                if (item.textContent.includes('9Ao OfAcio')) {
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

                // === ETAPA 4: Página de Maternidade ===
            if (url.includes('consultaSolicitacaoExterna')) {
                console.log('LOGIN COMPLETO!');
                isLoggedIn = true;
                updateTray('ok', 'Logado com sucesso');
                notify('Maternidade - Login ok', 'Sessão autenticada com sucesso.');
                finish(true);
                return;
            }

            } catch (err) {
                console.log('Erro no login:', err.message);
            }
        });

        mainWindow.loadURL(LOGIN_URL);
    });
}

// ========================================
// LOOP PRINCIPAL
// ========================================
async function loopPrincipal() {
    const result = await verificarSolicitados();
    // Gravacao simples do status para debug/monitoramento externo
    try { writeStatusLog({ check: 'verificarSolicitados', result }); } catch {}
    
    if (result.ok) {
        consecutiveCheckFailures = 0;
        failureSince = null;
        lastFailureNotifyAt = 0;
        if (result.count > 0) {
            updateTray('alert', `${result.count} SOLICITADO(s) pendente(s)`);
            
            // Notifica se e primeira vez OU se aumentou
            if (lastCount === -1 || result.count > lastCount) {
                notify('Maternidade - Nova solicitação', `Existem ${result.count} solicitação(ões) com status SOLICITADO`);
                // Ao detectar nova solicitacao, captura nome e clica no botao para teste
                try { await handleNewSolicitacaoAndClick(); } catch (e) { console.warn('Erro ao executar handleNewSolicitacaoAndClick:', e.message); }
            }
        } else {
            updateTray('ok', 'Nenhuma solicitacao pendente');
        }
        lastCount = result.count;
        
    } else if (result.needsLogin) {
        updateTray('offline', 'Sessao expirada');
        consecutiveCheckFailures += 1;
        if (!failureSince) failureSince = Date.now();
        const now = Date.now();
        // Evita notificar na primeira falha logo ao abrir; só notifica a partir da segunda falha
        if (consecutiveCheckFailures > 1 && (now - lastFailureNotifyAt) >= FAILURE_NOTIFY_COOLDOWN_MS) {
            notify('Maternidade - Sessão expirada', 'A sessão caiu ou houve timeout. Refaça o login.');
            lastFailureNotifyAt = now;
        }
        if (HAS_ALT_CREDS && (now - failureSince) >= FAILOVER_MS) {
            currentCredSource = currentCredSource === 'primary' ? 'alternate' : 'primary';
            failureSince = now;
            notify('Maternidade - Alternando login', `Trocando para credencial ${currentCredSource === 'primary' ? 'principal' : 'alternativa'} após falhas contínuas.`);
        }
        
        // Tenta login automatico (qualquer horario)
        console.log('Tentando login automatico...');
        const ok = await fazerLogin();
        if (ok) {
            // Verifica de novo apos logar
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


                        notify('Maternidade - Pasta alterada', 'Pasta destino atualizada.');
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
                        // criar uma janela temporAria para debug
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
                lastUserActivity = Date.now();

                // Se ja esta logado, apenas abre/mostra a janela com a pagina
                if (isLoggedIn) {
                    if (mainWindow && !mainWindow.isDestroyed()) {
                        mainWindow.loadURL(TARGET_URL);
                        mainWindow.show();
                        try { mainWindow.setSkipTaskbar(false); } catch {}
                        mainWindow.focus();
                    } else {
                        const win = new BrowserWindow({
                            width: 1200,
                            height: 800,
                            show: true,
                            icon: APP_ICON,
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

                // Se nao esta logado, usar o fluxo Electron confiavel
                console.log('Nao logado - iniciando fluxo Electron de login');
                const ok = await fazerLogin();
                if (ok) {
            
                } else {
                    // Opcional: fallback para Chrome externo (comentado por seguranca)
                    // launchChromeWithProfile(TARGET_URL, CHROME_PROFILE);
                    notify('Maternidade - Falha login', 'Nao foi possivel efetuar login automaticamente.');
                }
            }
        },
        { type: 'separator' },
        {
            label: creds ? ('Login: ' + creds.login) : 'Configurar Login',
            click: () => abrirConfigCredenciais()
        },
        { type: 'separator' },
        { label: 'Sair', click: () => { isQuitting = true; app.quit(); } }
    ]);
}

function abrirConfigCredenciais() {
    const creds = loadCredentials();
    const altCreds = loadCredentials('alternate');
    
    const win = new BrowserWindow({
        width: 420,
        height: 420,
        resizable: false,
        alwaysOnTop: true,
        title: 'Credenciais TJSE',
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            preload: path.join(__dirname, 'preload-creds.js')
        }
    });

    // Cria preload se necessario
    const preloadPath = path.join(__dirname, 'preload-creds.js');
    if (!fs.existsSync(preloadPath)) {
        fs.writeFileSync(preloadPath, `
            const { contextBridge, ipcRenderer } = require('electron');
            contextBridge.exposeInMainWorld('api', {
                saveCredentials: (data) => ipcRenderer.send('save-credentials', data),
                saveAltCredentials: (data) => ipcRenderer.send('save-alt-credentials', data)
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
hr { margin: 16px 0; }
.buttons { text-align: center; margin-top: 10px; }
button { background: #0078d4; color: white; border: none; padding: 10px 25px; border-radius: 4px; cursor: pointer; margin: 0 5px; }
button:hover { background: #106ebe; }
button.cancel { background: #666; }
</style></head>
<body>
<h2>Credenciais TJSE</h2>
<label>Login principal:</label>
<input type="text" id="login" value="${creds?.login || ''}" placeholder="seu.usuario">
<label>Senha principal:</label>
<input type="password" id="senha" value="${creds?.senha || ''}" placeholder="sua senha">
<hr>
<label>Login alternativo:</label>
<input type="text" id="loginAlt" value="${altCreds?.login || ''}" placeholder="usuario alternativo (opcional)">
<label>Senha alternativa:</label>
<input type="password" id="senhaAlt" value="${altCreds?.senha || ''}" placeholder="senha alternativa (opcional)">
<div class="buttons">
<button onclick="salvar()">Salvar</button>
<button class="cancel" onclick="window.close()">Cancelar</button>
</div>
<script>
function salvar() {
    const login = document.getElementById('login').value;
    const senha = document.getElementById('senha').value;
    const loginAlt = document.getElementById('loginAlt').value;
    const senhaAlt = document.getElementById('senhaAlt').value;
    if (!login || !senha) {
        alert('Preencha login e senha principal');
        return;
    }
    window.api.saveCredentials({ login, senha });
    if (loginAlt && senhaAlt) {
        window.api.saveAltCredentials({ login: loginAlt, senha: senhaAlt });
    }
    window.close();
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
        console.log('Credenciais principais salvas:', data.login);
        tray.setContextMenu(criarMenu());
    });
    ipcMain.once('save-alt-credentials', (event, data) => {
        saveAltCredentials(data.login, data.senha);
        console.log('Credenciais alternativas salvas:', data.login);
    });
}

// ========================================
// INICIALIZAAAO
// ========================================
app.whenReady().then(() => {
    const gotLock = app.requestSingleInstanceLock();
    if (!gotLock) {
        console.log('?O JC existe uma instC12ncia rodando!');
        app.quit();
        return;
    }
    app.on('second-instance', () => {
        try {
                if (mainWindow && !mainWindow.isDestroyed()) {
                if (!mainWindow.isVisible()) mainWindow.show();
                try { mainWindow.setSkipTaskbar(false); } catch {}
                mainWindow.focus();
            }
        } catch {}
    });
    const creds = loadCredentials();
    
    console.log('\naaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa');
    console.log('Monitor Maternidade TJSE - SIMPLIFICADO');
    console.log('asaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa');
    console.log(`aa VerificaAAo: a cada 5 minutos`);
    console.log(`aa Login: ${creds ? creds.login : '(nAo configurado)'}`);

    // Cria tray
    tray = new Tray(getIcon('loading'));
    tray.setToolTip('Carregando...');
    tray.setContextMenu(criarMenu());
    updateTray('loading', 'Carregando...');

    

    // Duplo clique abre a janela (prioriza Electron)
    tray.on('double-click', async () => {
        lastUserFocus = Date.now();
        lastUserActivity = Date.now();
        if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.show();
            try { mainWindow.setSkipTaskbar(false); } catch {}
            mainWindow.focus();
            return;
        }

        if (isLoggedIn) {
            const win = new BrowserWindow({
                width: 1200,
                height: 800,
                show: true,
                icon: APP_ICON,
                webPreferences: {
                    partition: 'persist:tjse-monitor',
                    nodeIntegration: false,
                    contextIsolation: true
                }
            });
            win.loadURL(TARGET_URL);
            return;
        }

        // Se nAo logado, iniciar fluxo de login via Electron
        const ok = await fazerLogin();
        if (ok && mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.loadURL(TARGET_URL);
            mainWindow.show();
            mainWindow.focus();
        }
    });

    // Registrar globalShortcut F12 para abrir DevTools (quando possAvel)
    try {
            globalShortcut.register('F12', async () => {
            let win = BrowserWindow.getFocusedWindow() || mainWindow;
            if (!win || win.isDestroyed()) {
                win = new BrowserWindow({
                    width: 1200,
                    height: 800,
                    show: true,
                    icon: APP_ICON,
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
        console.warn('NAo foi possAvel registrar globalShortcut F12:', e.message);
    }

        // Primeira verificação em 5 segundos
    setTimeout(() => {
        loopPrincipal();
    }, 5000);
    
    // Loop a cada 5 minutos
    checkInterval = setInterval(loopPrincipal, CHECK_INTERVAL_MS);

    // Auto-ocultar após inatividade (padrão 5 min). Defina MATERNIDADE_AUTO_HIDE_MINUTES para alterar ou 0 para desativar.
    const AUTO_HIDE_MINUTES = parseInt(process.env.MATERNIDADE_AUTO_HIDE_MINUTES || '5', 10);
    const AUTO_HIDE_MS = isNaN(AUTO_HIDE_MINUTES) ? 0 : AUTO_HIDE_MINUTES * 60 * 1000;
    if (AUTO_HIDE_MS > 0) {
        setInterval(() => {
            try {
                const win = mainWindow;
                if (!win || win.isDestroyed()) return;
                const idleMs = Date.now() - (lastUserActivity || lastUserFocus || 0);
                if (win.isVisible() && idleMs >= AUTO_HIDE_MS) {
                    win.hide();
                    try { win.setSkipTaskbar(true); } catch {}
                    console.log(`Auto-hide apos ${AUTO_HIDE_MINUTES} min sem atividade`);
                }
            } catch {}
        }, 60 * 1000);
    }
});

app.on('window-all-closed', (e) => {
    if (!isQuitting) {
        try { e.preventDefault(); } catch {}
        return;
    }
    app.quit();
});

app.on('will-quit', () => {
    try { globalShortcut.unregisterAll(); } catch {}
});














































