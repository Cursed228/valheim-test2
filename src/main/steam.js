/**
* Поиск папки Valheim в библиотеках Steam (Windows и macOS).
*/
const fs = require('fs');
const path = require('path');
const os = require('os');
const { WIN_EXE, MAC_EXE } = require('../shared/constants');
const WIN_STEAM_ROOTS = [
'C:\\Program Files (x86)\\Steam',
'C:\\Program Files\\Steam'
];
const WIN_COMMON_CANDIDATES = [
'C:\\Program Files (x86)\\Steam\\steamapps\\common\\Valheim',
'C:\\Program Files\\Steam\\steamapps\\common\\Valheim',
'D:\\SteamLibrary\\steamapps\\common\\Valheim',
'D:\\Steam\\steamapps\\common\\Valheim',
'E:\\SteamLibrary\\steamapps\\common\\Valheim',
'E:\\Steam\\steamapps\\common\\Valheim',
'F:\\SteamLibrary\\steamapps\\common\\Valheim'
];
function isValidValheimPath(candidate) {
if (!candidate) return false;
try {
if (process.platform === 'darwin') {
const inFolder = path.join(candidate, MAC_EXE);
const inBundle = path.join(candidate, 'Contents', 'MacOS', 'Valheim');
return fs.existsSync(inFolder) || fs.existsSync(inBundle);
}
return fs.existsSync(path.join(candidate, WIN_EXE));
} catch {
return false;
}
}
function parseLibraryFolders(vdfPath) {
const result = [];
try {
const content = fs.readFileSync(vdfPath, 'utf8');
const re = /"path"\s+"([^"]+)"/gi;
let m;
while ((m = re.exec(content)) !== null) {
result.push(m[1].replace(/\\\\/g, '\\'));
}
} catch (err) {
console.error('[steam] parse vdf error:', err.message);
}
return result;
}
function candidatesFromVdf() {
const list = [];
for (const root of WIN_STEAM_ROOTS) {
const vdf = path.join(root, 'steamapps', 'libraryfolders.vdf');
if (!fs.existsSync(vdf)) continue;
const libs = parseLibraryFolders(vdf);
for (const lib of libs) {
list.push(path.join(lib, 'steamapps', 'common', 'Valheim'));
}
}
return list;
}
function findValheim() {
const candidates = [];
if (process.platform === 'darwin') {
candidates.push(path.join(os.homedir(), 'Library', 'Application Support', 'Steam', 'steamapps', 'common', 'Valheim'));
candidates.push('/Volumes/SteamLibrary/steamapps/common/Valheim');
} else if (process.platform === 'win32') {
candidates.push(...WIN_COMMON_CANDIDATES);
candidates.push(...candidatesFromVdf());
}
const seen = new Set();
for (const c of candidates) {
if (!c || seen.has(c)) continue;
seen.add(c);
if (isValidValheimPath(c)) return c;
}
return null;
}
module.exports = { findValheim, isValidValheimPath };