const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

function sha256File(filePath) {
  return new Promise((resolve, reject) => {
    const hash = crypto.createHash('sha256');
    const stream = fs.createReadStream(filePath);
    stream.on('error', reject);
    stream.on('data', (chunk) => hash.update(chunk));
    stream.on('end', () => resolve(hash.digest('hex')));
  });
}

async function verifyFiles(baseDir, manifest) {
  if (!manifest || !manifest.files) return { ok: true, missing: [], mismatched: [] };
  const missing = [];
  const mismatched = [];
  for (const [rel, expectedHash] of Object.entries(manifest.files)) {
    const full = path.join(baseDir, rel);
    if (!fs.existsSync(full)) { missing.push(rel); continue; }
    const actual = await sha256File(full);
    if (actual.toLowerCase() !== expectedHash.toLowerCase()) mismatched.push(rel);
  }
  return { ok: missing.length === 0 && mismatched.length === 0, missing, mismatched };
}

module.exports = { sha256File, verifyFiles };