const { shell } = require('electron');
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const { VALHEIM_APPID, WIN_EXE, MAC_EXE } = require('../shared/constants');

async function launchViaSteam() {
  await shell.openExternal(`steam://rungameid/${VALHEIM_APPID}`);
  return { method: 'steam' };
}

function launchDirect(valheimPath) {
  const exeRel = process.platform === 'win32' ? WIN_EXE : MAC_EXE;
  const exePath = path.join(valheimPath, exeRel);
  if (!fs.existsSync(exePath)) {
    throw new Error('Не найден исполняемый файл: ' + exePath);
  }
  const child = spawn(exePath, [], {
    cwd: valheimPath,
    detached: true,
    stdio: 'ignore'
  });
  child.unref();
  return { method: 'direct', exePath };
}

async function launch(valheimPath, preferSteam = true) {
  if (preferSteam) {
    try {
      return await launchViaSteam();
    } catch (err) {
      console.warn('[launcher] Steam не сработал, пробую напрямую:', err.message);
    }
  }
  if (!valheimPath) throw new Error('Папка Valheim не найдена. Укажите путь в настройках.');
  return launchDirect(valheimPath);
}

module.exports = { launch };