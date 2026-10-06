const https = require('https');
const http = require('http');

function fetchUrl(url) {
  return new Promise((resolve, reject) => {
    const client = url.startsWith('https') ? https : http;
    client.get(url, (res) => {
      if ([301, 302, 307, 308].includes(res.statusCode) && res.headers.location) {
        const next = new URL(res.headers.location, url).toString();
        res.resume();
        return fetchUrl(next).then(resolve, reject);
      }
      if (res.statusCode !== 200) {
        res.resume();
        return reject(new Error(`HTTP ${res.statusCode} при загрузке конфига`));
      }
      let data = '';
      res.setEncoding('utf8');
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => resolve(data));
    }).on('error', reject);
  });
}

function normalizeServers(parsed) {
  if (Array.isArray(parsed)) return parsed;
  if (parsed && Array.isArray(parsed.servers)) return parsed.servers;
  if (parsed && parsed.Title && parsed.Modpacks) return [parsed];
  throw new Error('Неверный формат конфига');
}

function validateServer(srv, idx) {
  if (!srv || typeof srv !== 'object') throw new Error(`Сервер #${idx} не объект`);
  if (!srv.Title) srv.Title = `Сервер ${idx + 1}`;
  if (!srv.Modpacks || typeof srv.Modpacks !== 'object') {
    throw new Error(`У сервера "${srv.Title}" нет Modpacks`);
  }
  for (const [name, pack] of Object.entries(srv.Modpacks)) {
    if (!pack.Version) throw new Error(`У модпака "${name}" нет Version`);
    if (!pack.ContentUrl) throw new Error(`У модпака "${name}" нет ContentUrl`);
  }
  return srv;
}

async function loadConfig(url) {
  if (!url) throw new Error('URL конфига не задан');
  const raw = await fetchUrl(url);
  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch (err) {
    throw new Error('Конфиг не валидный JSON: ' + err.message);
  }
  return normalizeServers(parsed).map(validateServer);
}

module.exports = { loadConfig };