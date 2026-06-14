/* ════════════════════════════════════════════════════════════
   MAT — Galerie photos communautaires v1.3.3
   Overlay "Vos photos" + lightbox + mode galerie plein écran en paysage.
   Copyright (c) 2024-2026 Commune de Mézières-lez-Cléry — Licence MIT
   ════════════════════════════════════════════════════════════ */

const _PHOTOS_API      = 'https://chatbot-mairie-mezieres.onrender.com';
const _PHOTO_VOTES_KEY = 'mat_photo_votes_v1';
const _MY_PHOTOS_KEY   = 'mat_my_photos_v1';
const _PHOTOS_SEEN_KEY = 'mat_photos_seen_v1';

function _getPhotoVotes() {
  try { return JSON.parse(localStorage.getItem(_PHOTO_VOTES_KEY) || '{}'); } catch(_) { return {}; }
}
function _getMyPhotos() {
  try { return JSON.parse(localStorage.getItem(_MY_PHOTOS_KEY) || '[]'); } catch(_) { return []; }
}
function _addMyPhoto(id) {
  const ids = _getMyPhotos();
  if (!ids.includes(id)) { ids.unshift(id); localStorage.setItem(_MY_PHOTOS_KEY, JSON.stringify(ids.slice(0, 50))); }
}
function _removeMyPhoto(id) {
  localStorage.setItem(_MY_PHOTOS_KEY, JSON.stringify(_getMyPhotos().filter(function(i) { return i !== id; })));
}

// ── Badge "nouvelles photos" ─────────────────────────────────────
function _checkPhotosBadge() {
  var seen = parseInt(localStorage.getItem(_PHOTOS_SEEN_KEY) || '0', 10);
  var badge = document.getElementById('photos-badge');
  if (!badge) return;
  if (_allPhotos.length > seen) {
    badge.style.display = 'flex';
  } else {
    badge.style.display = 'none';
  }
}
function _clearPhotosBadge() {
  localStorage.setItem(_PHOTOS_SEEN_KEY, String(_allPhotos.length));
  var badge = document.getElementById('photos-badge');
  if (badge) badge.style.display = 'none';
}

// ── État ─────────────────────────────────────────────────────────
var _allPhotos  = [];
var _photoSort  = 'votes'; // 'votes' | 'date'
var _galeriePhotos = [], _galerieIdx = 0, _galerieTimer = null, _galerieOpen = false;
var _gyroMode = false, _gyroDebounce = null, _gyroRotDir = 90;
// Verrou anti-réouverture : passe à true quand on ferme manuellement (tap) le
// diaporama, pour ne pas le rouvrir tant qu'on n'est pas repassé en portrait.
var _galerieDismissed = false;
var _touchStartX = 0, _touchStartY = 0;

// ── Tri ──────────────────────────────────────────────────────────
function setPhotoSort(sort) {
  _photoSort = sort;
  var active   = { background: 'var(--forest)', color: '#fff', fontWeight: '900' };
  var inactive = { background: 'var(--mist)',   color: 'var(--text)', fontWeight: '600' };
  ['votes', 'date'].forEach(function(s) {
    var btn = document.getElementById('photo-sort-' + s);
    if (!btn) return;
    var st = (s === sort) ? active : inactive;
    btn.style.background = st.background;
    btn.style.color      = st.color;
    btn.style.fontWeight = st.fontWeight;
  });
  _renderPhotos();
}

function _getSorted() {
  return _photoSort === 'date'
    ? [..._allPhotos].sort(function(a, b) { return new Date(b.date) - new Date(a.date); })
    : _allPhotos;
}

// ── Diaporama direct depuis la tuile (page principale) ───────────
// Contourne le verrou WebAPK Android : fullscreen + orientation.lock
// depuis un geste utilisateur — pas besoin de tourner l'écran.
function launchDiapo() {
  if (!_allPhotos.length) {
    fetch(_PHOTOS_API + '/photos')
      .then(function(r) { return r.json(); })
      .then(function(d) {
        _allPhotos = d.photos || [];
        _galeriePhotos = _allPhotos;
        if (!_galeriePhotos.length) { alertMAT('Aucune photo disponible pour le moment.', 'Vos photos', '📸'); return; }
        _startGalerieAt(0);
      })
      .catch(function() { alertMAT('Impossible de charger les photos.', 'Vos photos', '⚠️'); });
    return;
  }
  _galeriePhotos = _getSorted();
  _startGalerieAt(0);
}

// ── Overlay "Vos photos" ─────────────────────────────────────────
function openPhotos() {
  _clearPhotosBadge();
  openOv('photos');
  loadPhotos();
}

async function loadPhotos() {
  const list = document.getElementById('photos-list');
  if (!list) return;
  list.innerHTML = '<div style="grid-column:1/-1;text-align:center;padding:24px;color:var(--muted)">Chargement…</div>';
  try {
    const r = await fetch(_PHOTOS_API + '/photos');
    if (!r.ok) throw new Error('HTTP ' + r.status);
    const data = await r.json();
    _allPhotos = data.photos || [];
    _galeriePhotos = _allPhotos;
    _checkPhotosBadge();
    _renderPhotos();
  } catch(_) {
    list.innerHTML = '<div style="grid-column:1/-1;text-align:center;padding:24px;color:#dc2626">Impossible de charger les photos.</div>';
  }
}

function _renderPhotos() {
  const list = document.getElementById('photos-list');
  if (!list) return;

  const sorted = _getSorted();

  if (!sorted.length) {
    list.innerHTML = '<div style="grid-column:1/-1;text-align:center;padding:32px;color:var(--muted)">Aucune photo pour l\'instant.<br>Soyez le premier à partager !</div>';
    return;
  }

  const votes = _getPhotoVotes();
  const myIds = _getMyPhotos();

  list.innerHTML = sorted.map(function(p) {
    const voted  = !!votes[p.id];
    const isMine = myIds.includes(p.id);
    const imgUrl = (typeof matCloudImg === 'function') ? matCloudImg(p.url, 400) : p.url;
    const safeId = JSON.stringify(p.id).replace(/"/g, '&quot;');
    return '<div style="border-radius:12px;overflow:hidden;background:var(--card);box-shadow:0 1px 4px rgba(0,0,0,.08)">'
      + '<div style="position:relative">'
      + '<img src="' + esc(imgUrl) + '" loading="lazy"'
      + ' onclick="openGalerie(' + safeId + ')" style="width:100%;aspect-ratio:4/3;object-fit:cover;display:block;cursor:pointer"'
      + ' alt="' + esc(p.desc || 'Photo') + '">'
      + (isMine
          ? '<button onclick="deleteMyPhoto(' + safeId + ')" title="Supprimer ma photo"'
            + ' style="position:absolute;top:6px;right:6px;background:rgba(0,0,0,.55);border:none;'
            + 'border-radius:6px;color:#fff;font-size:.7rem;padding:3px 7px;cursor:pointer;'
            + 'backdrop-filter:blur(4px)">🗑️</button>'
          : '')
      + '</div>'
      + '<div style="padding:8px 10px 10px">'
      + (p.desc ? '<div style="font-size:.78rem;color:var(--text);line-height:1.4;margin-bottom:6px">' + esc(p.desc) + '</div>' : '')
      + '<div style="display:flex;align-items:center;justify-content:space-between;gap:6px">'
      + '<span style="font-size:.65rem;color:var(--muted);overflow:hidden;text-overflow:ellipsis;white-space:nowrap">' + esc(p.lieu || '') + '</span>'
      + '<button onclick="votePhoto(' + safeId + ')" style="display:flex;align-items:center;gap:4px;'
      + 'background:' + (voted ? 'var(--forest)' : 'var(--mist)') + ';border:none;border-radius:50px;'
      + 'padding:4px 10px;cursor:pointer;font-size:.75rem;color:' + (voted ? '#fff' : 'var(--text)') + ';'
      + 'font-family:inherit;font-weight:700;flex-shrink:0">❤️ ' + esc(String(p.votes || 0)) + '</button>'
      + '</div></div></div>';
  }).join('');
}

// ── Votes ────────────────────────────────────────────────────────
async function votePhoto(id) {
  const votes = _getPhotoVotes();
  const alreadyVoted = !!votes[id];
  const url = _PHOTOS_API + '/photos/' + id + '/vote';
  if (alreadyVoted) {
    delete votes[id];
    localStorage.setItem(_PHOTO_VOTES_KEY, JSON.stringify(votes));
    try { await matFetch(url, { method: 'DELETE', headers: { 'x-device-id': getMatDeviceId() } }, 8000); } catch(_) {}
  } else {
    votes[id] = 1;
    localStorage.setItem(_PHOTO_VOTES_KEY, JSON.stringify(votes));
    try { await matFetch(url, { method: 'POST', headers: { 'x-device-id': getMatDeviceId() } }, 8000); } catch(_) {}
  }
  const idx = _allPhotos.findIndex(function(p) { return p.id === id; });
  if (idx >= 0) _allPhotos[idx].votes = Math.max(0, (_allPhotos[idx].votes || 0) + (alreadyVoted ? -1 : 1));
  _renderPhotos();
}

// ── Suppression de sa propre photo ───────────────────────────────
async function deleteMyPhoto(id) {
  if (!confirm('Supprimer votre photo ? Cette action est irréversible.')) return;
  try {
    const r = await fetch(_PHOTOS_API + '/photos/' + id, {
      method: 'DELETE',
      headers: { 'x-device-id': getMatDeviceId() }
    });
    const d = await r.json();
    if (!d.success) throw new Error(d.error || 'Erreur');
    _removeMyPhoto(id);
    _allPhotos = _allPhotos.filter(function(p) { return p.id !== id; });
    _galeriePhotos = _allPhotos;
    _renderPhotos();
  } catch(e) {
    await alertMAT('Impossible de supprimer : ' + e.message, 'Vos photos', '⚠️');
  }
}

// ── Upload photo ─────────────────────────────────────────────────
function _previewPhotoUpload() {
  const input = document.getElementById('photo-upload-input');
  const file = input && input.files && input.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = function(ev) {
    const prev = document.getElementById('photo-upload-preview');
    if (prev) { prev.src = ev.target.result; prev.style.display = 'block'; }
    const placeholder = document.getElementById('photo-upload-placeholder');
    if (placeholder) placeholder.style.display = 'none';
  };
  reader.readAsDataURL(file);
}

async function submitPhoto() {
  const prev = document.getElementById('photo-upload-preview');
  const hasPhoto = prev && prev.style.display !== 'none' && prev.src && prev.src !== window.location.href;
  if (!hasPhoto) { await alertMAT('Veuillez choisir une photo.', 'Vos photos', '📸'); return; }
  const btn = document.getElementById('photo-upload-btn');
  if (btn) { btn.disabled = true; btn.textContent = 'Envoi…'; }
  try {
    const photoB64 = await compressImage(prev.src, 1200, 0.8);
    const desc = (document.getElementById('photo-upload-desc') || {}).value || '';
    const lieu = (document.getElementById('photo-upload-lieu') || {}).value || '';
    const deviceId = getMatDeviceId();
    const r = await fetch(_PHOTOS_API + '/photos', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ desc: desc.trim(), lieu: lieu.trim(), photoB64, deviceId })
    });
    const d = await r.json();
    if (d.id) _addMyPhoto(d.id);
    if (btn) { btn.disabled = false; btn.textContent = '📤 Envoyer'; }
    const input = document.getElementById('photo-upload-input');
    if (input) input.value = '';
    prev.src = ''; prev.style.display = 'none';
    const placeholder = document.getElementById('photo-upload-placeholder');
    if (placeholder) placeholder.style.display = 'flex';
    const descEl = document.getElementById('photo-upload-desc');
    if (descEl) descEl.value = '';
    const lieuEl = document.getElementById('photo-upload-lieu');
    if (lieuEl) lieuEl.value = '';
    await alertMAT('Photo envoyée ! Elle sera visible après validation par la mairie.', 'Vos photos', '✅');
  } catch(_) {
    if (btn) { btn.disabled = false; btn.textContent = '📤 Envoyer'; }
    await alertMAT('Erreur d\'envoi. Vérifiez votre connexion.', 'Vos photos', '⚠️');
  }
}

// ── Lightbox / Galerie plein écran ───────────────────────────────
// Ouvre le diaporama en commençant par la photo dont l'id est fourni.
// Appelée au tap sur une photo dans la grille ET à la rotation paysage.
function openGalerie(photoId) {
  if (!_allPhotos.length) return;
  var sorted = _getSorted();
  _galeriePhotos = sorted;
  var idx = sorted.findIndex(function(p) { return p.id === photoId; });
  _startGalerieAt(idx >= 0 ? idx : 0);
}

function _startGalerieAt(startIdx, gyro, gyroRot) {
  var ov = document.getElementById('ov-galerie-paysage');
  if (!ov) return;
  clearTimeout(_galerieTimer);
  _galerieOpen = true;
  _galerieIdx = startIdx;
  ov.style.display = 'block';
  var hint = document.getElementById('galerie-hint');
  if (hint) hint.textContent = gyro
    ? '← → Glisser · Redresser ou appuyer pour fermer'
    : '← → Glisser pour naviguer · Appuyer pour fermer';
  ov.addEventListener('touchstart', _galerieTouchStart, { passive: true });
  ov.addEventListener('touchend', _galerieTouchEnd);
  if (gyro) {
    _enterGyroMode(ov, gyroRot || 90);
  } else {
    _enterFullscreenLandscape(ov);
  }
  _galerieStep(true);
  ov.addEventListener('click', _galerieClickHandler);
}

// ── Mode gyroscope (CSS rotation via DeviceOrientationEvent) ────
// DeviceOrientationEvent se déclenche indépendamment du verrou OS.
// Quand |gamma| > 65° pendant 500ms : on pivote le contenu en CSS.
// Pas besoin de requestFullscreen ni de geste utilisateur.
function _enterGyroMode(ov, rotation) {
  _gyroMode = true;
  _gyroRotDir = rotation;
  ov.style.top = '50%';
  ov.style.right = 'auto';
  ov.style.bottom = 'auto';
  ov.style.left = '50%';
  ov.style.width = '100vh';
  ov.style.height = '100vw';
  ov.style.transform = 'translate(-50%, -50%) rotate(' + rotation + 'deg)';
}

function _exitGyroMode(ov) {
  _gyroMode = false;
  if (!ov) return;
  ov.style.top = '0';
  ov.style.right = '0';
  ov.style.bottom = '0';
  ov.style.left = '0';
  ov.style.width = '';
  ov.style.height = '';
  ov.style.transform = '';
}

function _showGalerieGyro(rotation) {
  if (!_allPhotos.length) {
    fetch(_PHOTOS_API + '/photos')
      .then(function(r) { return r.json(); })
      .then(function(d) {
        _allPhotos = d.photos || [];
        _galeriePhotos = _allPhotos;
        if (_galeriePhotos.length) _startGalerieAt(0, true, rotation);
      })
      .catch(function() {});
    return;
  }
  _galeriePhotos = _getSorted();
  _startGalerieAt(0, true, rotation);
}

function _onDeviceOrientation(e) {
  var gamma = e.gamma || 0;
  var absGamma = Math.abs(gamma);
  if (_galerieOpen) {
    // Retour à la verticale → fermeture (mode gyro uniquement).
    // Hystérésis 65°/35° : évite l'oscillation ouverture/fermeture au seuil.
    if (_gyroMode && absGamma < 35) _closeGaleriePaysage();
    return;
  }
  if (absGamma > 65) {
    if (!_gyroDebounce) {
      var rotation = gamma < 0 ? 90 : -90; // landscape-droite ou gauche
      _gyroDebounce = setTimeout(function() {
        _gyroDebounce = null;
        // Le mode gyro (rotation CSS) ne sert QUE si l'écran reste bloqué en
        // portrait. Si l'écran tourne réellement en paysage, c'est la bascule
        // d'orientation (plein écran, identique au bouton) qui prend le relais —
        // sinon on cumulerait deux rotations. On respecte aussi le verrou de
        // fermeture manuelle.
        if (!_galerieOpen && !_galerieDismissed && !_landscapeMQ.matches) _showGalerieGyro(rotation);
      }, 500);
    }
  } else {
    if (_gyroDebounce) { clearTimeout(_gyroDebounce); _gyroDebounce = null; }
    if (absGamma < 35) _galerieDismissed = false; // revenu vertical → on réarme
  }
}

// Force le paysage : le WebAPK Android verrouille l'orientation portrait
// (intégrée à l'installation, unlock() ne fait que restaurer ce défaut).
// Seul plein écran + lock('landscape') contourne ce verrou à l'exécution.
function _enterFullscreenLandscape(ov) {
  try {
    var p = ov.requestFullscreen ? ov.requestFullscreen() : Promise.reject();
    Promise.resolve(p).then(function() {
      if (screen.orientation && screen.orientation.lock)
        return screen.orientation.lock('landscape');
    }).catch(function() {});
  } catch(_) {}
}

function _exitFullscreenLandscape() {
  try { if (screen.orientation && screen.orientation.unlock) screen.orientation.unlock(); } catch(_) {}
  try { if (document.fullscreenElement) document.exitFullscreen().catch(function() {}); } catch(_) {}
}

function _showGaleriePaysage() {
  if (!_allPhotos.length) {
    fetch(_PHOTOS_API + '/photos')
      .then(function(r) { return r.json(); })
      .then(function(d) {
        _allPhotos = d.photos || [];
        _galeriePhotos = _allPhotos;
        if (_galeriePhotos.length) _startGalerieAt(0);
      })
      .catch(function() {});
    return;
  }
  _galeriePhotos = _allPhotos;
  _startGalerieAt(0);
}

function _galerieClickHandler(e) {
  if (e.target && e.target.id === 'galerie-vote') return;
  _galerieDismissed = true; // fermeture manuelle : pas de réouverture tant qu'on reste en paysage
  _closeGaleriePaysage();
}

function _closeGaleriePaysage() {
  clearTimeout(_galerieTimer);
  _galerieOpen = false;
  var ov = document.getElementById('ov-galerie-paysage');
  if (ov) {
    ov.style.display = 'none';
    ov.removeEventListener('click', _galerieClickHandler);
    ov.removeEventListener('touchstart', _galerieTouchStart);
    ov.removeEventListener('touchend', _galerieTouchEnd);
    if (_gyroMode) _exitGyroMode(ov);
  }
  if (!_gyroMode) _exitFullscreenLandscape();
  _gyroMode = false;
}

// Sortie du plein écran par geste système (retour Android, Échap) →
// fermer aussi la galerie pour ne pas la laisser figée derrière.
document.addEventListener('fullscreenchange', function() {
  if (!document.fullscreenElement && _galerieOpen) _closeGaleriePaysage();
});

// ── Swipe pour naviguer ──────────────────────────────────────────
function _galerieTouchStart(e) {
  _touchStartX = e.changedTouches[0].clientX;
  _touchStartY = e.changedTouches[0].clientY;
}

function _galerieTouchEnd(e) {
  if (e.target && e.target.id === 'galerie-vote') return;
  var dx = e.changedTouches[0].clientX - _touchStartX;
  var dy = e.changedTouches[0].clientY - _touchStartY;
  var adx = Math.abs(dx), ady = Math.abs(dy);

  if (adx < 20 && ady < 20) {
    _galerieDismissed = true; // tap → fermer, sans réouverture tant qu'on reste en paysage
    _closeGaleriePaysage(); return;
  }

  // En mode gyro, le contenu est pivoté : l'axe visuel horizontal = axe Y écran
  // (inversé selon le sens de rotation). Hors gyro : axe X classique.
  var navDelta;
  if (_gyroMode) {
    if (ady > adx) navDelta = _gyroRotDir === 90 ? -dy : dy;
  } else {
    if (adx > ady) navDelta = -dx;
  }

  if (navDelta !== undefined && Math.abs(navDelta) > 50) {
    e.preventDefault(); // évite le click suivant
    _galerieNavigate(navDelta > 0 ? 1 : -1);
  }
}

function _galerieNavigate(dir) {
  if (!_galeriePhotos.length) return;
  clearTimeout(_galerieTimer);
  var len = _galeriePhotos.length;
  if (dir < 0) {
    // Précédente : _galerieIdx pointe sur la suivante, donc -2 pour revenir en arrière
    _galerieIdx = ((_galerieIdx - 2) % len + len) % len;
  }
  // dir > 0 : suivante, _galerieIdx pointe déjà dessus — rien à faire
  _galerieStep(false);
}

// Compteur de cœurs + état voté du bouton ❤️ du diaporama.
// photo référence l'objet de _allPhotos : votes y est tenu à jour par votePhoto.
function _refreshGalerieVoteBtn(btn, photo) {
  btn.textContent = '❤️ ' + (photo.votes || 0);
  btn.style.background = _getPhotoVotes()[photo.id] ? 'rgba(220,38,38,.55)' : 'rgba(255,255,255,.15)';
}

// Affiche la photo en plein écran (background-size: cover), sans rotation
// automatique : chaque photo conserve son orientation d'origine. La détection
// portrait/paysage (probe) a été retirée car elle pivotait à tort certaines
// photos paysage (orientation EXIF mal interprétée).
function _setGalerieImg(imgEl, url) {
  imgEl.style.top = '0';
  imgEl.style.left = '0';
  imgEl.style.right = '0';
  imgEl.style.bottom = '0';
  imgEl.style.width = '';
  imgEl.style.height = '';
  imgEl.style.transform = '';
  imgEl.style.backgroundSize = 'cover';
  imgEl.style.backgroundImage = 'url(\'' + url.replace(/'/g, "\\'") + '\')';
  imgEl.style.opacity = '1';
}

function _galerieStep(immediate) {
  if (!_galerieOpen || !_galeriePhotos.length) return;
  var photo = _galeriePhotos[_galerieIdx % _galeriePhotos.length];
  var imgEl = document.getElementById('galerie-img');
  if (!imgEl) return;

  function show() {
    var url = (typeof matCloudImg === 'function') ? matCloudImg(photo.url, 1400) : photo.url;
    _setGalerieImg(imgEl, url);

    var lieu   = document.getElementById('galerie-lieu');
    var auteur = document.getElementById('galerie-auteur');
    if (lieu)   lieu.textContent   = photo.lieu   || '';
    if (auteur) auteur.textContent = photo.auteur ? '— ' + photo.auteur : '';

    var voteBtn = document.getElementById('galerie-vote');
    if (voteBtn) {
      _refreshGalerieVoteBtn(voteBtn, photo);
      voteBtn.onclick = (function(p) {
        return function(e) {
          e.stopPropagation();
          votePhoto(p.id).then(function() { _refreshGalerieVoteBtn(voteBtn, p); });
        };
      }(photo));
    }

    if (_galeriePhotos.length > 1) {
      var next = _galeriePhotos[(_galerieIdx + 1) % _galeriePhotos.length];
      var pre = new Image();
      pre.src = (typeof matCloudImg === 'function') ? matCloudImg(next.url, 1400) : next.url;
    }

    _galerieIdx++;
    _galerieTimer = setTimeout(function() { _galerieStep(false); }, 5000);
  }

  if (immediate) {
    show();
  } else {
    imgEl.style.opacity = '0';
    setTimeout(show, 800);
  }
}

// ── Listener orientation (pour les appareils où la rotation est libre) ──
var _landscapeMQ = window.matchMedia('(orientation: landscape)');
function _onOrientationChange(e) {
  if (e.matches) {
    // Passage en paysage → diaporama plein écran (identique au bouton de la tuile).
    // Pas de réouverture si déjà ouvert, en mode gyro, ou si on vient de fermer
    // manuellement (tant qu'on n'est pas repassé en portrait).
    if (_galerieOpen || _gyroMode || _galerieDismissed) return;
    _showGaleriePaysage();
  } else {
    // Retour en portrait → on réarme le verrou et on ferme si encore ouvert.
    _galerieDismissed = false;
    if (_galerieOpen && !_gyroMode) _closeGaleriePaysage();
  }
}
if (_landscapeMQ.addEventListener) {
  _landscapeMQ.addEventListener('change', _onOrientationChange);
} else {
  _landscapeMQ.addListener(_onOrientationChange);
}

// ── Activation gyroscope ─────────────────────────────────────────
if (window.DeviceOrientationEvent) {
  window.addEventListener('deviceorientation', _onDeviceOrientation, { passive: true });
}
