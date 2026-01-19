
import path from 'path';
import fs from 'fs';
const { spawn } = require('child_process');
import * as db from './db';


const _db = db as any;
function ensureElectron() {
const mod = require('electron');
  const isElectronRuntime = !!(process.versions && process.versions.electron);
  const procType = (process as any).type || 'node';
  console.log(
    '[segundas-vias] electron?',
    typeof mod,
    'versions.electron=',
    process.versions.electron,
    'type=',
    procType,
    'runAsNode=',
    process.env.ELECTRON_RUN_AS_NODE,
  );
  const appCandidate = mod && mod.app;
  const hasApp = appCandidate && typeof appCandidate.getPath === 'function';
  if (hasApp) return mod;

  if (isElectronRuntime) {
    try {
const mainMod = require('electron/main');
      if (mainMod && mainMod.app) return mainMod;
    } catch (err) {
      console.error('[segundas-vias] falha ao carregar electron/main:', err?.message || err);
    }
    console.error('[segundas-vias] Electron API indisponivel no runtime Electron.');
    process.exit(1);
  }

  const alreadyRetry = !!process.env.SEGUNDAS_ELECTRON_OK;
  if (alreadyRetry) {
    console.error('[segundas-vias] Electron API indisponivel mesmo apos relancar.');
    process.exit(1);
  }

  const electronBin = typeof mod === 'string' ? mod : require('electron');
  const env: any = { ...process.env, SEGUNDAS_ELECTRON_OK: '1' };
  delete env.ELECTRON_RUN_AS_NODE;
  const child = spawn(electronBin, process.argv.slice(1), {
    stdio: 'inherit',
    env,
  });
  child.on('error', (err) => {
    console.error('[segundas-vias] falha ao relancar Electron:', err?.message || err);
  });
  child.on('exit', (code) => process.exit(code || 0));
  process.exit(0);
}

const electronMod = ensureElectron();
if (!electronMod) process.exit(1);
const { app, BrowserWindow, Tray, Menu, nativeImage, ipcMain, dialog, shell } = electronMod;

// Identidade clara para nao conflitar com o app da maternidade
try {
  app.setName('2 Via');
  if (app.setAppUserModelId) app.setAppUserModelId('com.local.2via');
  try {
    process.title = '2 Via';
  } catch (e) { void e;}
} catch (e) { void e;}

// ========================================
// CONFIG SIMPLES
// ========================================
function getConfigFile() {
  return path.join(app.getPath('userData'), 'segundas-vias.json');
}
function readConfig() {
  try {
    const file = getConfigFile();
    if (fs.existsSync(file)) {
      return JSON.parse(fs.readFileSync(file, 'utf8') || '{}');
    }
  } catch (e) {
    console.warn('Erro lendo config:', e.message);
  }
  return {};
}
function writeConfig(cfg) {
  try {
    fs.writeFileSync(getConfigFile(), JSON.stringify(cfg, null, 2), 'utf8');
  } catch (e) {
    console.warn('Erro escrevendo config:', e.message);
  }
}
function getOutputDir() {
  const cfg = readConfig();
  if (cfg.outputDir) return cfg.outputDir;
  const fallback = path.join(app.getPath('documents'), 'SegundasVias');
  ensureDir(fallback);
  return fallback;
}
function setOutputDir(dir) {
  const cfg = readConfig();
  cfg.outputDir = dir;
  writeConfig(cfg);
}
function getJsonDir() {
  const cfg = readConfig();
  if (cfg.jsonDir) return cfg.jsonDir;
  const fallback = path.join(app.getPath('documents'), 'SegundasVias', 'JSON');
  ensureDir(fallback);
  return fallback;
}
function setJsonDir(dir) {
  const cfg = readConfig();
  cfg.jsonDir = dir;
  writeConfig(cfg);
}
function getXmlDir() {
  const cfg = readConfig();
  if (cfg.xmlDir) return cfg.xmlDir;
  const fallback = path.join(app.getPath('documents'), 'SegundasVias', 'XML');
  ensureDir(fallback);
  return fallback;
}
function setXmlDir(dir) {
  const cfg = readConfig();
  cfg.xmlDir = dir;
  writeConfig(cfg);
}
function getAlwaysOnTop() {
  const cfg = readConfig();
  return !!cfg.alwaysOnTop;
}
function setAlwaysOnTop(flag) {
  const cfg = readConfig();
  cfg.alwaysOnTop = !!flag;
  writeConfig(cfg);
}
function ensureDir(dir) {
  if (!dir) return;
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

// ========================================
// TRAY ICON (inline png)
// ========================================
const TRAY_ICON = (() => {
  const ico = path.join(process.cwd(), 'icons', 'logo.ico');
  const icoAlt = path.join(__dirname, '..', 'icons', 'logo.ico');
  const candidate = path.join(process.cwd(), 'icons', 'tray.png');
  const alt = path.join(__dirname, '..', 'icons', 'tray.png');
  const paths = [ico, icoAlt, candidate, alt];
  for (const p of paths) {
    try {
      if (fs.existsSync(p)) {
        const img = nativeImage.createFromPath(p);
        if (!img.isEmpty()) return img;
      }
    } catch (e) { void e;}
  }
  const base64 =
    'iVBORw0KGgoAAAANSUhEUgAAAEAAAABACAYAAACqaXHeAAABE0lEQVR4nO3XwQnCMBBA0Y8URqVE0iEcyPHff4O89ByiDubKXZOr79ouW4HGBgYGBgYGBgYGBgYGBgYGBgYGBgYGBgYKDTx2gWQCMIJBCIIQQiCMEIgjBCIIwQgCMIIQgiiAEEIgjBCIIwQiCMEIgjBCIIwQiCMEIgjBCIIwQiCMEIgjBCIIwQiCMEIgjBCIIwQiCMEIgjBCIIwQiCMEIgjBCIIwQiCMEIgjBCIIwQiCMEIgjBCIIwQiCMEIgjBCIIwQiCMCIRFgBrz5b2M6iWRtxkbSZZGlpZvWoN1qDbqvu4d3lPvId7mXvId5i7yHeZr/8fyR/7P12uwYGBgYGBgYGBgYGBgYGBgYGBgYGBgYGBgYGBl4AbA0X9WZCGl8AAAAASUVORK5CYII=';
  return nativeImage.createFromDataURL(`data:image/png;base64,${base64}`);
})();

// ========================================
// ESTADO
// ========================================
let mainWindow = null;
let tray = null;

// ========================================
// MAIN WINDOW
// ========================================
function createMainWindow() {
  console.log('[segundas-vias] criando janela...');
  const win = new BrowserWindow({
    width: 1150,
    height: 740,
    minWidth: 960,
    minHeight: 620,
    show: false,
    title: '2 Via',
    alwaysOnTop: getAlwaysOnTop(),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  const uiPath = path.join(__dirname, '..', 'ui', 'pages', 'Nascimento2Via.html');
  win
    .loadFile(uiPath)
    .catch((err: unknown) => console.error('[segundas-vias] erro ao carregar UI:', err));
  try {
    win.center();
  } catch (e) { void e;}
  win.on('ready-to-show', () => {
    try {
      console.log('[segundas-vias] ready-to-show');
    } catch (err) {
      console.error('[segundas-vias] ready-to-show erro', err);
    }
  });

  win.on('close', (e) => {
    // manter na bandeja
    if (!app.isQuiting) {
      e.preventDefault();
      win.hide();
    }
  });

  return win;
}

// ========================================
// TRAY
// ========================================
function updateTrayMenu() {
  if (!tray) return;
  const alwaysOnTop = getAlwaysOnTop();
  const menu = Menu.buildFromTemplate([
    { label: '2 Via (painel)', enabled: false },
    { type: 'separator' },
    { label: 'Abrir painel', click: () => showWindow() },
    {
      label: `Sempre no topo: ${alwaysOnTop ? 'On' : 'Off'}`,
      click: () => {
        const next = !getAlwaysOnTop();
        setAlwaysOnTop(next);
        if (mainWindow && !mainWindow.isDestroyed()) {
          mainWindow.setAlwaysOnTop(next);
        }
        updateTrayMenu();
      },
    },
    {
      label: 'Pasta de saida',
      click: async () => {
        const res = await dialog.showOpenDialog({
          properties: ['openDirectory', 'createDirectory'],
        });
        if (!res.canceled && res.filePaths && res.filePaths[0]) {
          setOutputDir(res.filePaths[0]);
        }
      },
    },
    { label: 'Abrir pasta de saida', click: () => shell.openPath(getOutputDir()) },
    { type: 'separator' },
    {
      label: 'Sair',
      click: () => {
        app.isQuiting = true;
        app.quit();
      },
    },
  ]);
  tray.setContextMenu(menu);
}

function showWindow() {
  if (!mainWindow || mainWindow.isDestroyed()) {
    mainWindow = createMainWindow();
  }
  mainWindow.show();
  mainWindow.focus();
}

// ========================================
// IPC
// ========================================
ipcMain.handle('app:get-config', async () => {
  return {
    outputDir: getOutputDir(),
    jsonDir: getJsonDir(),
    xmlDir: getXmlDir(),
    alwaysOnTop: getAlwaysOnTop(),
  };
});

ipcMain.handle('app:set-output-dir', async () => {
  const res = await dialog.showOpenDialog({ properties: ['openDirectory', 'createDirectory'] });
  if (!res.canceled && res.filePaths && res.filePaths[0]) {
    const dir = res.filePaths[0];
    ensureDir(dir);
    setOutputDir(dir);
    return dir;
  }
  return getOutputDir();
});

ipcMain.handle('app:set-json-dir', async () => {
  const res = await dialog.showOpenDialog({ properties: ['openDirectory', 'createDirectory'] });
  if (!res.canceled && res.filePaths && res.filePaths[0]) {
    const dir = res.filePaths[0];
    ensureDir(dir);
    setJsonDir(dir);
    return dir;
  }
  return getJsonDir();
});

ipcMain.handle('app:set-xml-dir', async () => {
  const res = await dialog.showOpenDialog({ properties: ['openDirectory', 'createDirectory'] });
  if (!res.canceled && res.filePaths && res.filePaths[0]) {
    const dir = res.filePaths[0];
    ensureDir(dir);
    setXmlDir(dir);
    return dir;
  }
  return getXmlDir();
});

ipcMain.handle('app:save-file', async (_event, payload) => {
  const outputDir = getOutputDir();
  ensureDir(outputDir);
  const safeName = sanitizeFilename(payload?.name || `saida-${Date.now()}.txt`);
  const content = payload?.content || '';
  const fullPath = path.join(outputDir, safeName);
  fs.writeFileSync(fullPath, content, 'utf8');
  return fullPath;
});

ipcMain.handle('app:save-json', async (_event, payload) => {
  const outputDir = getJsonDir();
  ensureDir(outputDir);
  const safeName = sanitizeFilename(payload?.name || `certidao-${Date.now()}.json`);
  const content = payload?.content || '';
  const fullPath = path.join(outputDir, safeName);
  fs.writeFileSync(fullPath, content, 'utf8');
  return fullPath;
});

ipcMain.handle('app:save-xml', async (_event, payload) => {
  const outputDir = getXmlDir();
  ensureDir(outputDir);
  const safeName = sanitizeFilename(payload?.name || `certidao-${Date.now()}.xml`);
  const content = payload?.content || '';
  const fullPath = path.join(outputDir, safeName);
  fs.writeFileSync(fullPath, content, 'utf8');
  return fullPath;
});

ipcMain.handle('app:set-always-on-top', async (_event, flag) => {
  const enabled = !!flag;
  setAlwaysOnTop(enabled);
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.setAlwaysOnTop(enabled);
  }
  updateTrayMenu();
  return enabled;
});

ipcMain.handle('app:open-output-dir', async () => {
  const dir = getOutputDir();
  ensureDir(dir);
  await shell.openPath(dir);
  return dir;
});

ipcMain.handle('app:open-json-dir', async () => {
  const dir = getJsonDir();
  ensureDir(dir);
  await shell.openPath(dir);
  return dir;
});

ipcMain.handle('app:open-xml-dir', async () => {
  const dir = getXmlDir();
  ensureDir(dir);
  await shell.openPath(dir);
  return dir;
});

// ========================================
// DB IPC
// ========================================
ipcMain.handle('db:save-draft', async (_event, payload) => {
  return _db.saveDraft(payload || {});
});

ipcMain.handle('db:ingest', async (_event, payload) => {
  return _db.ingest(payload || {});
});

ipcMain.handle('db:list', async (_event, payload) => {
  return _db.list(payload || {});
});

ipcMain.handle('db:get', async (_event, id) => {
  return _db.getById(id);
});

ipcMain.handle('db:update-status', async (_event, payload) => {
  return _db.updateStatus(payload || {});
});

function sanitizeFilename(name) {
  return (name || '').replace(/[\\/:*?"<>|]+/g, '_').trim() || `saida-${Date.now()}.txt`;
}

// ========================================
// APP
// ========================================
app
  .whenReady()
  .then(() => {
    console.log('[segundas-vias] app ready, criando tray e janela');
    try {
      _db.initDb(app.getPath('userData'));
    } catch (err) {
      console.warn('db init falhou', err?.message || err);
    }
    mainWindow = createMainWindow();
    tray = new Tray(TRAY_ICON);
    tray.setToolTip('2 Via');
    updateTrayMenu();

    tray.on('click', () => showWindow());
    tray.on('double-click', () => showWindow());
    console.log('[segundas-vias] iniciado');
  })
  .catch((err) => {
    console.error('[segundas-vias] erro ao iniciar', err);
  });

app.on('window-all-closed', (e) => {
  // Mant??m em bandeja
  e.preventDefault();
});

app.on('activate', () => {
  showWindow();
});
