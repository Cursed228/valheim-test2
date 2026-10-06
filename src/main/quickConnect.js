const fs = require('fs');
const path = require('path');

function buildServerLine(server) {
  const title = server.Title || 'Server';
  const ip = server.ServerIP || '';
  const port = server.ServerPort || 2456;
  const password = server.Password || '';
  return `${title}:${ip}:${port}:${password}`;
}

function writeQuickConnectConfig(valheimPath, server) {
  const configDir = path.join(valheimPath, 'BepInEx', 'config');
  fs.mkdirSync(configDir, { recursive: true });
  const configPath = path.join(configDir, 'quick_connect_servers.cfg');
  const line = buildServerLine(server);
  fs.writeFileSync(configPath, line + '\n', 'utf8');
  return configPath;
}

module.exports = { buildServerLine, writeQuickConnectConfig };