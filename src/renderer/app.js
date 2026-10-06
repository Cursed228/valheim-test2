const state = {
  servers: [],
  selectedServer: null,
  selectedModpack: null,
  configUrl: null,
  valheimPath: null
};

const $ = (id) => document.getElementById(id);

function log(message, type = '') {
  const el = $('log');
  if (!el) return;
  const line = document.createElement('div');
  if (type) line.className = type;
  line.textContent = `[${new Date().toLocaleTimeString()}] ${message}`;
  el.appendChild(line);
  el.scrollTop = el.scrollHeight;
}

function setProgress(percent, text) {
  $('progressBox').classList.remove('hidden');
  $('progressFill').style.width = `${percent}%`;
  $('progressText').textContent = text || '';
}

function hideProgress() {
  setTimeout(() => $('progressBox').classList.add('hidden'), 1500);
}

async function loadServers() {
  if (!state.configUrl) {
    log('URL конфига не задан. Откройте настройки.', 'err');
    return;
  }
  log('Загрузка конфига...');
  const result = await window.api.loadConfig(state.configUrl);
  if (!result.ok) {
    log('Ошибка конфига: ' + result.error, 'err');
    return;
  }
  state.servers = result.servers;
  log(`Загружено серверов: ${state.servers.length}`, 'ok');
  renderServerList();
}

function renderServerList() {
  const list = $('serverList');
  list.innerHTML = '';
  if (state.servers.length === 0) {
    $('serverListEmpty').classList.remove('hidden');
    return;
  }
  $('serverListEmpty').classList.add('hidden');
  for (const srv of state.servers) {
    const li = document.createElement('li');
    li.className = 'server-item';
    if (state.selectedServer && state.selectedServer.Title === srv.Title) {
      li.classList.add('active');
    }
    const img = document.createElement('img');
    img.className = 'server-avatar';
    img.src = '../../assets/server-icon.webp';
    img.onerror = () => (img.style.display = 'none');
    li.appendChild(img);
    const title = document.createElement('span');
    title.textContent = srv.Title;
    li.appendChild(title);
    li.onclick = () => selectServer(srv);
    list.appendChild(li);
  }
}

async function selectServer(srv) {
  state.selectedServer = srv;
  const packNames = Object.keys(srv.Modpacks);
  state.selectedModpack = packNames[0] || null;
  renderServerList();
  await renderServerDetails();
}

async function renderServerDetails() {
  const srv = state.selectedServer;
  if (!srv) return;
  $('noServer').classList.add('hidden');
  $('serverDetails').classList.remove('hidden');

  $('serverTitle').textContent = srv.Title;
  $('serverGameVersion').textContent = srv.GameVersion ? `Версия игры: ${srv.GameVersion}` : '';

  const ipInfo = $('serverIpInfo');
  if (ipInfo) {
    if (srv.ServerIP) {
      ipInfo.textContent = `Сервер: ${srv.ServerIP}:${srv.ServerPort || 2456}`;
      ipInfo.style.display = '';
    } else {
      ipInfo.style.display = 'none';
    }
  }

  if (srv.IconUrl) {
    $('serverIcon').src = srv.IconUrl;
    $('serverIcon').style.display = '';
  } else {
    $('serverIcon').style.display = 'none';
  }

  const discord = $('discordLink');
  if (srv.DiscordUrl) { discord.href = srv.DiscordUrl; discord.classList.remove('hidden'); }
  else discord.classList.add('hidden');

  const website = $('websiteLink');
  if (srv.WebsiteUrl) { website.href = srv.WebsiteUrl; website.classList.remove('hidden'); }
  else website.classList.add('hidden');

  renderModpackTabs();
  await updatePackStatus();
}

function renderModpackTabs() {
  const tabs = $('modpackTabs');
  tabs.innerHTML = '';
  const srv = state.selectedServer;
  for (const name of Object.keys(srv.Modpacks)) {
    const btn = document.createElement('button');
    btn.className = 'tab';
    if (name === state.selectedModpack) btn.classList.add('active');
    btn.textContent = name;
    btn.onclick = async () => {
      state.selectedModpack = name;
      renderModpackTabs();
      await updatePackStatus();
    };
    tabs.appendChild(btn);
  }
}

async function updatePackStatus() {
  const srv = state.selectedServer;
  const packName = state.selectedModpack;
  if (!srv || !packName) return;
  const pack = srv.Modpacks[packName];
  $('packVersion').textContent = `Версия сборки: ${pack.Version}`;

  const key = `${srv.Title}/${packName}`;
  const installed = await window.api.isInstalled(key);
  const status = $('packStatus');

  if (!installed) {
    status.textContent = 'Не установлена';
    status.className = 'pack-status';
    $('playBtn').textContent = '⬇ Установить и играть';
  } else if (installed.version !== pack.Version) {
    status.textContent = `Установлена: ${installed.version} → нужно обновить`;
    status.className = 'pack-status update';
    $('playBtn').textContent = '⬆ Обновить и играть';
  } else {
    status.textContent = 'Установлена актуальная версия';
    status.className = 'pack-status installed';
    $('playBtn').textContent = '▶ Играть';
  }
}

async function playOrInstall() {
  const srv = state.selectedServer;
  const packName = state.selectedModpack;
  if (!srv || !packName) return;

  $('playBtn').disabled = true;
  $('playBtn').textContent = '...';

  try {
    log(`Установка ${srv.Title} / ${packName}...`);
    const result = await window.api.installModpack({ server: srv, modpackName: packName });

    if (!result.ok) {
      log('Ошибка установки: ' + result.error, 'err');
      $('playBtn').disabled = false;
      await updatePackStatus();
      hideProgress();
      return;
    }

    if (result.skipped) {
      log('Сборка уже актуальна', 'ok');
    } else {
      log('Сборка установлена', 'ok');
    }

    await updatePackStatus();
    log('Запуск игры...');
    const launchResult = await window.api.launchGame(true);
    if (!launchResult.ok) {
      log('Не удалось запустить: ' + launchResult.error, 'err');
    } else {
      log('Игра запущена (' + launchResult.method + ')', 'ok');
    }
  } catch (err) {
    log('Ошибка: ' + err.message, 'err');
  } finally {
    $('playBtn').disabled = false;
    hideProgress();
    await updatePackStatus();
  }
}

async function resetModpack() {
  const srv = state.selectedServer;
  const packName = state.selectedModpack;
  if (!srv || !packName) return;
  if (!confirm('Удалить установленную сборку и начать заново?')) return;

  log('Удаление сборки...');
  const result = await window.api.resetModpack({ server: srv, modpackName: packName });
  if (result.ok) {
    log('Сборка удалена', 'ok');
    await updatePackStatus();
  } else {
    log('Ошибка: ' + result.error, 'err');
  }
}

const settingsModal = $('settingsModal');

async function openSettings() {
  try {
    const s = await window.api.getState();
    if (s.valheimPath) $('valheimPathInput').value = s.valheimPath;
    if (s.configUrl) $('configUrlInput').value = s.configUrl;
  } catch (err) { console.error(err); }
  settingsModal.classList.remove('hidden');
}

function closeSettings() { settingsModal.classList.add('hidden'); }

async function detectValheim() {
  try {
    const result = await window.api.detectValheim();
    if (result && result.ok) {
      await window.api.saveState({ valheimPath: result.path });
      $('valheimPathInput').value = result.path;
    } else {
      $('valheimPathInput').value = '';
      alert(result && result.error ? result.error : 'Valheim не найден');
    }
  } catch (err) { alert('Ошибка при поиске Valheim'); }
}

async function browseValheim() {
  try {
    const result = await window.api.selectValheimFolder();
    if (result && result.ok) {
      await window.api.saveState({ valheimPath: result.path });
      $('valheimPathInput').value = result.path;
    } else if (result && result.error) { alert(result.error); }
  } catch (err) { alert('Ошибка при выборе папки'); }
}

async function saveConfigUrl() {
  const url = $('configUrlInput').value.trim();
  if (!url) return;
  await window.api.saveState({ configUrl: url });
  state.configUrl = url;
  log('URL конфига сохранён', 'ok');
  await loadServers();
}

async function init() {
  const s = await window.api.getState();
  state.configUrl = s.configUrl;
  state.valheimPath = s.valheimPath;

  if (!state.valheimPath) {
    const found = await window.api.detectValheim();
    if (found.ok) {
      state.valheimPath = found.path;
      await window.api.saveState({ valheimPath: found.path });
    }
  }

  window.api.onProgress((data) => {
    setProgress(data.percent || 0, data.message || '');
  });

  $('settingsBtn').addEventListener('click', openSettings);
  $('closeSettingsBtn').addEventListener('click', closeSettings);
  $('detectBtn').addEventListener('click', detectValheim);
  $('browseBtn').addEventListener('click', browseValheim);
  $('saveConfigUrlBtn').addEventListener('click', saveConfigUrl);
  $('refreshBtn').addEventListener('click', loadServers);
  $('playBtn').addEventListener('click', playOrInstall);
  $('resetBtn').addEventListener('click', resetModpack);
  $('backBtn').addEventListener('click', () => {
    state.selectedServer = null;
    state.selectedModpack = null;
    $('serverDetails').classList.add('hidden');
    $('noServer').classList.remove('hidden');
    renderServerList();
  });

  if (state.configUrl) await loadServers();
  else log('URL конфига не задан. Откройте настройки ⚙', 'err');
}

window.addEventListener('DOMContentLoaded', init);

// ========== ХИЛЬДИР (скрытая механика) ==========
(function initHildir() {
  const hildir = document.getElementById('hildir');
  const links = document.getElementById('hildirLinks');
  if (!hildir) return;

  const STORAGE_KEY = 'hildirClicks';
  const CLICKS_REQUIRED = 10;
  const CLOTHED_IMG = '../../assets/hildir-clothed.png';
  const UNDERWEAR_IMG = '../../assets/hildir-underwear.png';

  // Секрет всегда начинается заново при запуске лаунчера
  localStorage.removeItem(STORAGE_KEY);
  localStorage.removeItem('hildirRevealed');

  let clicks = 0;
  let isRevealed = false;

  function render() {
    hildir.src = isRevealed ? UNDERWEAR_IMG : CLOTHED_IMG;
    if (links) {
      if (isRevealed) links.classList.remove('hidden');
      else links.classList.add('hidden');
    }
  }

  hildir.addEventListener('click', () => {
    if (isRevealed) {
      // повторный клик — сброс на первый образ
      clicks = 0;
      isRevealed = false;
      localStorage.setItem(STORAGE_KEY, '0');
      localStorage.setItem('hildirRevealed', 'false');
      render();
      return;
    }

    clicks++;
    if (clicks >= CLICKS_REQUIRED) {
      isRevealed = true;
      clicks = CLICKS_REQUIRED;
    }
    localStorage.setItem(STORAGE_KEY, String(clicks));
    localStorage.setItem('hildirRevealed', String(isRevealed));
    render();
  });

  render();
})();