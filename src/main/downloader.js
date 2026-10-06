const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');

function download(url, destPath, onProgress, redirects = 0) {
  return new Promise((resolve, reject) => {
    if (redirects > 5) {
      return reject(new Error('Слишком много редиректов'));
    }

    const client = url.startsWith('https') ? https : http;
    const request = client.get(url, { timeout: 30000 }, (response) => {
      // Обработка редиректов (301, 302, 303, 307, 308)
      if ([301, 302, 303, 307, 308].includes(response.statusCode) && response.headers.location) {
        response.resume();
        const next = new URL(response.headers.location, url).toString();
        return download(next, destPath, onProgress, redirects + 1).then(resolve, reject);
      }

      if (response.statusCode !== 200) {
        response.resume();
        return reject(new Error(`HTTP ${response.statusCode} при скачивании ${url}`));
      }

      const total = Number(response.headers['content-length'] || 0);
      const totalMB = total ? (total / 1024 / 1024).toFixed(1) : '?';

      fs.mkdirSync(path.dirname(destPath), { recursive: true });
      const fileStream = fs.createWriteStream(destPath);

      let received = 0;
      let lastEmit = 0;

      response.on('data', (chunk) => {
        received += chunk.length;
        fileStream.write(chunk);

        const now = Date.now();
        if (onProgress && (now - lastEmit > 100 || received === total)) {
          lastEmit = now;
          const percent = total ? (received / total) * 100 : 0;
          onProgress({
            received,
            total,
            percent: Math.min(100, percent),
            receivedMB: (received / 1024 / 1024).toFixed(1),
            totalMB
          });
        }
      });

      response.on('end', () => {
        fileStream.end(() => resolve(destPath));
      });

      response.on('error', (err) => {
        fileStream.end();
        reject(err);
      });
    });

    request.on('timeout', () => {
      request.destroy(new Error('Timeout: соединение не установлено'));
    });

    request.on('error', reject);
  });
}

module.exports = { download };