const AdmZip = require('adm-zip');
const fs = require('fs');

async function extract(zipPath, targetDir) {
  if (!fs.existsSync(zipPath)) {
    throw new Error('Архив не найден: ' + zipPath);
  }
  fs.mkdirSync(targetDir, { recursive: true });
  const zip = new AdmZip(zipPath);
  zip.extractAllTo(targetDir, true);
  return targetDir;
}

function readManifest(zipPath) {
  try {
    const zip = new AdmZip(zipPath);
    const entry = zip.getEntry('manifest.json');
    if (!entry) return null;
    return JSON.parse(entry.getData().toString('utf8'));
  } catch (err) {
    console.warn('[extractor] manifest.json не прочитан:', err.message);
    return null;
  }
}

module.exports = { extract, readManifest };