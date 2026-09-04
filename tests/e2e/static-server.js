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

  // Index de répertoire, comme GitHub Pages : « /jeu/ » sert « /jeu/index.html »,
  // et « /jeu » redirige vers « /jeu/ ». Sans cela, les pages du jeu du moment
  // seraient introuvables ICI et nulle part ailleurs — le test conclurait à une
  // panne que la production n'a pas, ou l'inverse.
  let cible = filePath;
  try {
    if (fs.statSync(cible).isDirectory()) {
      if (!pathname.endsWith('/')) {
        res.writeHead(301, { location: pathname + '/' });
        return res.end();
      }
      cible = path.join(cible, 'index.html');
    }
  } catch (_) { /* n'existe pas : le readFile ci-dessous répondra 404 */ }

  fs.readFile(cible, (err, data) => {
    if (err) {
      res.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' });
      return res.end('404');
    }
    res.writeHead(200, {
      // ⚠️ `cible` et non `filePath` : sur « /jeu/ », `filePath` est un
      // répertoire, dont l'extension est vide — la page serait servie en
      // « application/octet-stream » et le navigateur la téléchargerait.
      'content-type': MIME[path.extname(cible).toLowerCase()] || 'application/octet-stream'
    });
    res.end(data);
  });
});

server.listen(PORT, () => {
  console.log(`[static-server] http://127.0.0.1:${PORT}  (racine: ${ROOT})`);
});
