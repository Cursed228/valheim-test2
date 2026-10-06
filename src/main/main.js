const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs');
const storage = require('./storage');
const { findValheim, isValidValheimPath } = require('./steam');
const { loadConfig } = require('./config');
const os = require('os');
const { download } = require('./downloader');
const { extract, readManifest } = require('./extractor');
const { verifyFiles } = require('./hasher');
const { MOD_FOLDERS, MOD_FILES } = require('../shared/constants');
const { launch } = require('./launcher');
const { writeQuickConnectConfig } = require('./quickConnect');

let mainWindow = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1000,
    height: 700,
    minWidth: 800,
    minHeight: 600,
    backgroundColor: '#0f0f12',
    title: 'Valheim Launcher',
    icon: path.join(__dirname, '..', '..', 'assets', 'icon.png'),
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false
    }
  });
  mainWindow.loadFile(path.join(__dirname, '..', 'renderer', 'index.html'));
}

function registerIpc() {
  ipcMain.handle('valheim:detect', async () => {
    const found = findValheim();
    return found ? { ok: true, path: found } : { ok: false, error: 'Valheim не найден' };
  });

  ipcMain.handle('valheim:select', async (event) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    const result = await dialog.showOpenDialog(win, {
      title: 'Выберите папку Valheim',
      properties: ['openDirectory']
    });
    if (result.canceled || !result.filePaths.length) {
      return { ok: false, error: 'Выбор отменён' };
    }
    const selected = result.filePaths[0];
    if (!isValidValheimPath(selected)) {
      return { ok: false, error: 'В выбранной папке не найден Valheim' };
    }
    return { ok: true, path: selected };
  });

  ipcMain.handle('state:get', () => storage.load());
  ipcMain.handle('state:save', (event, patch) => storage.update(patch || {}));

  ipcMain.handle('config:load', async (event, url) => {
    try {
      const servers = await loadConfig(url);
      return { ok: true, servers };
    } catch (err) {
      return { ok: false, error: err.message };
    }
  });

  ipcMain.handle('modpack:install', async (event, { server, modpackName }) => {
    try {
      const pack = server.Modpacks[modpackName];
      if (!pack) throw new Error(`Модпак "${modpackName}" не найден`);
      if (!pack.ContentUrl) throw new Error('У модпака нет ContentUrl');

      const state = storage.load();
      if (!state.valheimPath) throw new Error('Valheim не найден. Укажите путь в настройках.');
      if (!isValidValheimPath(state.valheimPath)) {
        throw new Error('Указанная папка Valheim некорректна');
      }

      const key = `${server.Title}/${modpackName}`;
      const installed = state.installed ? state.installed[key] : null;

      if (installed && installed.version === pack.Version) {
        return { ok: true, skipped: true, message: 'Уже установлена актуальная версия' };
      }

      const tmpDir = path.join(os.tmpdir(), 'valheim-launcher');
      fs.mkdirSync(tmpDir, { recursive: true });
      const zipPath = path.join(tmpDir, sanitize(server.Title) + '_' + sanitize(modpackName) + '.zip');

      emitProgress({ phase: 'download', percent: 0, message: 'Начинаем загрузку...' });
      await download(pack.ContentUrl, zipPath, (p) => {
        emitProgress({
          phase: 'download',
          percent: p.percent,
          message: `Скачивание: ${p.receivedMB} / ${p.totalMB} МБ`
        });
      });

      emitProgress({ phase: 'clean', percent: 0, message: 'Очистка старых модов...' });
      cleanMods(state.valheimPath);

      emitProgress({ phase: 'extract', percent: 0, message: 'Распаковка архива...' });
      await extract(zipPath, state.valheimPath);

      try {
        const qcPath = writeQuickConnectConfig(state.valheimPath, server);
        console.log('[quickConnect] Записан конфиг:', qcPath);
      } catch (qcErr) {
        console.error('[quickConnect] Ошибка:', qcErr.message);
      }

      const manifest = readManifest(zipPath);
      if (manifest && manifest.files) {
        emitProgress({ phase: 'verify', percent: 0, message: 'Проверка целостности...' });
        const result = await verifyFiles(state.valheimPath, manifest);
        if (!result.ok) {
          return { ok: false, error: `Проверка не пройдена. Отсутствуют: ${result.missing.length}, повреждены: ${result.mismatched.length}` };
        }
      }

      try { fs.unlinkSync(zipPath); } catch {}

      storage.setInstalled(key, { version: pack.Version, installedAt: new Date().toISOString() });

      emitProgress({ phase: 'done', percent: 100, message: 'Готово!' });
      return { ok: true, message: 'Модпак успешно установлен' };
    } catch (err) {
      console.error('[modpack:install]', err);
      return { ok: false, error: err.message };
    }
  });

  ipcMain.handle('modpack:reset', async (event, { server, modpackName }) => {
    try {
      const state = storage.load();
      if (!state.valheimPath) throw new Error('Valheim не найден');
      emitProgress({ phase: 'clean', percent: 0, message: 'Удаление модов...' });
      cleanMods(state.valheimPath);
      const key = `${server.Title}/${modpackName}`;
      storage.removeInstalled(key);
      emitProgress({ phase: 'done', percent: 100, message: 'Моды удалены' });
      return { ok: true };
    } catch (err) {
      return { ok: false, error: err.message };
    }
  });

  ipcMain.handle('modpack:isInstalled', (event, key) => {
    return storage.getInstalled(key);
  });

  ipcMain.handle('game:launch', async (event, preferSteam) => {
    try {
      const state = storage.load();
      const result = await launch(state.valheimPath, preferSteam !== false);
      return { ok: true, ...result };
    } catch (err) {
      return { ok: false, error: err.message };
    }
  });
}

function emitProgress(data) {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('progress', data);
  }
}

function sanitize(str) {
  return String(str).replace(/[^a-zA-Z0-9._-]/g, '_');
}

function cleanMods(valheimPath) {
  for (const folder of MOD_FOLDERS) {
    const p = path.join(valheimPath, folder);
    if (fs.existsSync(p)) {
      try { fs.rmSync(p, { recursive: true, force: true }); } catch (e) { console.warn('[clean]', e.message); }
    }
  }
  for (const file of MOD_FILES) {
    const p = path.join(valheimPath, file);
    if (fs.existsSync(p)) {
      try { fs.unlinkSync(p); } catch (e) { console.warn('[clean]', e.message); }
    }
  }
}

app.whenReady().then(() => {
  registerIpc();
  createWindow();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});