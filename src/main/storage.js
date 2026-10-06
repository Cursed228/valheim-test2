/**
 * Хранение локального состояния лаунчера в state.json.
 * Файл лежит в app.getPath('userData')/state.json
 */

const { app } = require('electron');
const fs = require('fs');
const path = require('path');
const { DEFAULT_CONFIG_URL } = require('../shared/constants');

function stateFile() {
  return path.join(app.getPath('userData'), 'state.json');
}

const DEFAULT_STATE = {
  valheimPath: null,
  configUrl: DEFAULT_CONFIG_URL,   // ← подставляется автоматически
  installed: {}
};

function load() {
  try {
    if (!fs.existsSync(stateFile())) {
      return { ...DEFAULT_STATE, installed: {} };
    }
    const raw = fs.readFileSync(stateFile(), 'utf8');
    const parsed = JSON.parse(raw);
    return {
      ...DEFAULT_STATE,
      ...parsed,
      // Если в state.json configUrl пуст — используем дефолтный
      configUrl: parsed.configUrl || DEFAULT_CONFIG_URL,
      installed: { ...(parsed.installed || {}) }
    };
  } catch (err) {
    console.error('[storage] load error:', err.message);
    return { ...DEFAULT_STATE, installed: {} };
  }
}

function save(state) {
  try {
    fs.mkdirSync(path.dirname(stateFile()), { recursive: true });
    fs.writeFileSync(stateFile(), JSON.stringify(state, null, 2), 'utf8');
    return state;
  } catch (err) {
    console.error('[storage] save error:', err.message);
    return state;
  }
}

function update(patch) {
  const state = load();
  const next = { ...state, ...patch };
  if (patch && patch.installed && typeof patch.installed === 'object') {
    next.installed = { ...state.installed, ...patch.installed };
  }
  return save(next);
}

function setInstalled(key, info) {
  const state = load();
  state.installed = state.installed || {};
  state.installed[key] = info;
  return save(state);
}

function getInstalled(key) {
  const state = load();
  return state.installed ? state.installed[key] : null;
}

function removeInstalled(key) {
  const state = load();
  if (state.installed && state.installed[key]) {
    delete state.installed[key];
    save(state);
  }
  return state;
}

module.exports = {
  load,
  save,
  update,
  setInstalled,
  getInstalled,
  removeInstalled,
  stateFile
};