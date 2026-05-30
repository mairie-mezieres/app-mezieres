// Petit serveur statique sans dépendance, servant la racine du dépôt
// (l'application MAT). Utilisé par Playwright (webServer) pour les tests
// E2E. Volontairement minimal : pas de cache, pas de listing.
const http = require('http');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', '..');
const PORT = process.env.PORT || 4173;

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.webmanifest': 'application/manifest+json',
  '.webp': 'image/webp',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2'
};

const server = http.createServer((req, res) => {
  let pathname = decodeURIComponent(req.url.split('?')[0]);
  if (pathname === '/' || pathname === '') pathname = '/index.html';

  const filePath = path.normalize(path.join(ROOT, pathname));
  // Garde-fou anti-traversée : frontière de répertoire réelle (ROOT + séparateur),
  // sinon un dossier voisin partageant le préfixe (ex. « <root>-secrets ») passerait.
  if (filePath !== ROOT && !filePath.startsWith(ROOT + path.sep)) {
    res.writeHead(403);
    return res.end('403');
  }

  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' });
      return res.end('404');
    }
    res.writeHead(200, {
      'content-type': MIME[path.extname(filePath).toLowerCase()] || 'application/octet-stream'
    });
    res.end(data);
  });
});

server.listen(PORT, () => {
  console.log(`[static-server] http://127.0.0.1:${PORT}  (racine: ${ROOT})`);
});
