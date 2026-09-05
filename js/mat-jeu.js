/* ════════════════════════════════════════════════════════════
   MAT — Le jeu du moment v2.0.0
   Copyright (c) 2024-2026 Commune de Mézières-lez-Cléry — Licence MIT

   UN SEUL MODULE, TROIS RÔLES. Il sert la tuile de l'accueil, le lanceur
   `/jeu` et la page `/jeu/archives`. C'est délibéré : le chemin du manifeste,
   les clés de stockage et la façon de résoudre « quel est le jeu courant »
   ne doivent exister QU'UNE FOIS. Trois copies auraient divergé au premier
   changement de saison — c'est la classe d'erreur qui a déjà mordu ce dépôt
   (associations, fibre, arbre MEL).

   ⚠️ v2 — LE JEU CHANGE TOUT SEUL. Il n'y a plus de champ `courant` : chaque
   jeu porte une période `debut`/`fin` en JJ-MM, **sans année**, donc elle se
   répète d'elle-même chaque année. Personne n'a rien à faire le 1er décembre.
   `forcer` permet d'épingler un jeu hors calendrier (et de remettre `null`).

   ⛔ CE QUI SORT DE L'APPAREIL, ET RIEN D'AUTRE : le fait qu'on ait OUVERT le
   jeu, une fois par appareil et par jour, sur le même canal que les autres
   écrans de l'application (`/stats/track`, service « jeu »). Ni score, ni
   durée, ni nombre de parties, ni ce qui se passe pendant. Le comptage a lieu
   ICI, dans le lanceur, AVANT que le jeu démarre : les fichiers de jeu restent
   sans réseau, et `tests/e2e/jeu.spec.js` le vérifie.

   ⚠️ CHANGER DE JEU NE DOIT TOUCHER AUCUN CODE. Tout vient de
   `jeux/jeux.json`. Si vous vous surprenez à écrire « la-hotte » ailleurs que
   dans ce manifeste, c'est que quelque chose est à corriger ici.
   ════════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  /* ── Où vit l'application ────────────────────────────────────
     Le module est chargé depuis trois profondeurs différentes (`/`,
     `/jeu/`, `/jeu/archives/`). Une URL relative écrite en dur y désignerait
     trois fichiers différents. On déduit donc la racine du site de l'adresse
     du script lui-même : `…/js/mat-jeu.js` → un cran au-dessus de `js/`.
     Cela vaut aussi pour une commune qui répliquerait l'app dans un
     sous-répertoire (kit « Partager »). */
  var RACINE = (function () {
    var s = document.currentScript;
    var src = s && s.src;
    if (src) {
      try { return new URL('../', src).href; } catch (_) { /* repli ci-dessous */ }
    }
    return new URL('/', location.href).href;
  })();

  var MANIFESTE = RACINE + 'jeux/jeux.json';
  var CLE_VU    = 'jeu-vu';          // identifiant du dernier jeu ouvert
  var CLE_CACHE = 'mat_jeu_cache';   // miroir local du manifeste (hors-ligne)
  var CLE_STAT  = 'mat_jeu_compte';  // jour du dernier comptage (une seule clé)

  /* ── Petits utilitaires ──────────────────────────────────── */

  function _texte(el, s) { if (el) el.textContent = s; }

  // Date du jour au format AAAA-MM-JJ, en heure LOCALE. `toISOString()` donnerait
  // l'UTC : en France, un jeu qui prend l'affiche « aujourd'hui » resterait
  // invisible jusqu'à 2 h du matin pendant l'heure d'été.
  function _aujourdhui(d) {
    d = d || new Date();
    var p = function (n) { return (n < 10 ? '0' : '') + n; };
    return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate());
  }

  /* ── Les périodes ────────────────────────────────────────────
     « 21-10 » → 1021, pour comparer deux dates sans se soucier de l'année.
     Une période peut enjamber le 31 décembre (01-12 → 28-02) : d'où les deux
     branches. */
  function _repere(jjmm) {
    var p = String(jjmm || '').split('-');
    var j = parseInt(p[0], 10), m = parseInt(p[1], 10);
    if (!isFinite(j) || !isFinite(m)) return null;
    return m * 100 + j;
  }

  function periodeContient(jeu, date) {
    var d = _repere(jeu && jeu.debut), f = _repere(jeu && jeu.fin);
    if (d === null || f === null) return false;
    var dt = date || new Date();
    var auj = (dt.getMonth() + 1) * 100 + dt.getDate();
    return d <= f ? (auj >= d && auj <= f) : (auj >= d || auj <= f);
  }

  /* ── Le manifeste ────────────────────────────────────────── */

  function _valide(m) {
    if (!m || typeof m !== 'object' || !Array.isArray(m.jeux)) return null;
    var jeux = m.jeux.filter(function (j) { return j && j.id && j.fichier; });
    if (!jeux.length) return null;
    return { forcer: m.forcer || null, jeux: jeux };
  }

  function _lireCache() {
    try { return _valide(JSON.parse(localStorage.getItem(CLE_CACHE) || 'null')); }
    catch (_) { return null; }
  }

  function _ecrireCache(m) {
    try { localStorage.setItem(CLE_CACHE, JSON.stringify(m)); } catch (_) {}
  }

  /* Va chercher le manifeste, et retombe sur le miroir local si le réseau
     manque. Ne rejette jamais : l'appelant reçoit `null` au pire, et affiche
     ce qu'il peut. */
  function charger() {
    return fetch(MANIFESTE, { cache: 'no-store' })
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (d) {
        var m = _valide(d);
        if (m) { _ecrireCache(m); return m; }
        return _lireCache();
      })
      .catch(function () { return _lireCache(); });
  }

  /* Le jeu du jour. `forcer` l'emporte ; sinon la première période qui
     contient la date ; sinon le premier de la liste — on préfère un jeu de
     repli à un écran vide si le calendrier laissait un trou. */
  function courant(m, date) {
    if (!m) return null;
    if (m.forcer) {
      for (var i = 0; i < m.jeux.length; i++) {
        if (String(m.jeux[i].id) === String(m.forcer)) return m.jeux[i];
      }
    }
    for (var k = 0; k < m.jeux.length; k++) {
      if (periodeContient(m.jeux[k], date)) return m.jeux[k];
    }
    return m.jeux[0];
  }

  /* Les autres jeux du manifeste — ceux des saisons passées et à venir. Ils
     restent tous jouables : c'est ce que promet la page d'archives. */
  function autres(m, date) {
    if (!m) return [];
    var c = courant(m, date);
    return m.jeux.filter(function (j) { return !c || String(j.id) !== String(c.id); });
  }

  /* Le manifeste écrit ses chemins depuis la racine du site (« /jeux/x.html »),
     parce que c'est ce qu'un rédacteur écrit naturellement. On les résout ici,
     en tolérant les deux formes — avec ou sans barre oblique initiale. */
  function _url(chemin) {
    var f = String(chemin || '');
    if (!f) return '';
    if (/^https?:/i.test(f)) return f;
    return RACINE + f.replace(/^\/+/, '');
  }
  function fichierUrl(jeu) { return _url(jeu && jeu.fichier); }
  function vignetteUrl(jeu) { return _url(jeu && jeu.vignette); }

  /* ── La pastille « Nouveau » ─────────────────────────────────
     RÈGLE : la mémoire de l'appareil est l'IDENTIFIANT du dernier jeu ouvert.
     La pastille s'allume donc exactement quand la période bascule, et
     s'éteint à l'ouverture. Aucune date à tenir à jour, et rien à faire le
     jour de la bascule.
     ⚠️ Surtout pas une date de publication : la corriger d'une coquille
     rallumerait la pastille sur toute la commune, pour un jeu déjà vu. */
  function estNouveau(m, date) {
    var j = courant(m, date);
    if (!j) return false;
    try { return localStorage.getItem(CLE_VU) !== String(j.id); }
    catch (_) { return false; }   // stockage refusé : ne rien promettre
  }

  function marquerVu(id) {
    try { localStorage.setItem(CLE_VU, String(id)); } catch (_) {}
  }

  /* ── Comptage de l'ouverture ─────────────────────────────────
     Même canal que les autres écrans de l'application : `POST /stats/track`
     avec un nom de service. La mairie le retrouve dans le tableau de bord et
     dans le mail quotidien, à côté de MEL, de l'agenda et des déchets.

     ⛔ CE QUI EST COMPTÉ : l'ouverture, une fois par appareil et par jour.
     Le chiffre du jour est donc un NOMBRE DE PERSONNES, pas un nombre de
     clics — sans quoi trois parties d'affilée en feraient trois.
     ⛔ CE QUI N'EST PAS COMPTÉ : le score, la durée, le nombre de parties,
     le jeu joué. Rien de ce qui se passe pendant la partie ne sort.
     ⚠️ Aucun identifiant n'est CRÉÉ ici : on réutilise celui que
     l'application a déjà posé, s'il existe. Quelqu'un qui arrive par un QR
     code sans avoir jamais ouvert l'app est compté sans identifiant.
     ⚠️ Une seule clé, qui porte le jour — et non une clé par jour, qui
     s'empilerait indéfiniment dans le stockage. */
  function compterOuverture() {
    var jour = _aujourdhui();
    try {
      if (localStorage.getItem(CLE_STAT) === jour) return;
      localStorage.setItem(CLE_STAT, jour);
    } catch (_) { return; }   // stockage refusé : on préfère ne pas compter que compter en double

    var api = (typeof window !== 'undefined' && window.MAT_API) || '';
    if (!api) return;

    var dev = null;
    try { dev = localStorage.getItem('mat_device_id_v1'); } catch (_) {}

    var entetes = { 'Content-Type': 'application/json' };
    if (dev) entetes['x-device-id'] = dev;

    try {
      fetch(api + '/stats/track', {
        method: 'POST',
        headers: entetes,
        body: JSON.stringify(dev ? { service: 'jeu', deviceId: dev } : { service: 'jeu' }),
        keepalive: true      // la page part vers le jeu juste après
      }).catch(function () {});
    } catch (_) {}
  }

  /* ── Hors-ligne : demander au service worker de garder le jeu ──
     Le service worker précache tous les jeux du manifeste à son installation.
     Ceci couvre l'autre cas : un jeu ajouté au manifeste alors que le service
     worker en place ne rejouera pas son `install`. Il est alors mis en cache
     à sa première ouverture. */
  function precacher(url) {
    try {
      var sw = navigator.serviceWorker;
      if (sw && sw.controller) sw.controller.postMessage({ action: 'CACHE_JEU', url: url });
    } catch (_) {}
  }

  /* ════════════════ RÔLE 1 — la tuile de l'accueil ════════════
     ⚠️ LA TUILE NE NOMME PAS LE JEU. Ni son titre, ni sa saison : on les
     découvre en l'ouvrant. Elle porte un libellé fixe, « Le jeu du moment »,
     et la seule chose qui y varie est la pastille.
     Conséquence pour les tests : rien de visible ne prouve que le module a
     tourné. D'où `data-jeu-pret`, posé après hydratation — sans quoi un test
     mesurerait l'état AVANT que la pastille soit décidée. */

  function hydraterTuile(m) {
    var lien = document.querySelector('[data-jeu-tuile]');
    if (!lien) return;

    var neuf = estNouveau(m);
    var badge = lien.querySelector('[data-jeu-badge]');
    if (badge) badge.hidden = !neuf;

    // La pastille est un renfort visuel ; l'information, elle, est dans le nom
    // accessible du lien. Un habitant qui n'y voit pas — ou qui ne distingue
    // pas le rouge — apprend la nouveauté de la même façon que les autres.
    lien.setAttribute('aria-label',
      'Le jeu du moment' + (neuf ? '. Nouveau jeu disponible' : ''));

    lien.setAttribute('data-jeu-pret', '1');
  }

  function initTuile() {
    if (!document.querySelector('[data-jeu-tuile]')) return;
    var cache = _lireCache();
    if (cache) hydraterTuile(cache);        // affichage immédiat, y compris hors ligne
    charger().then(hydraterTuile);          // puis mise à jour si le réseau répond
  }

  /* ════════════════ RÔLE 2 — le lanceur `/jeu` ════════════════
     `/jeu` est imprimée sur des affiches et des QR codes : elle ne changera
     jamais. Sur un hébergement statique, une adresse fixe qui sert un fichier
     variable impose une indirection — c'est ce que fait cette page. Voir
     docs/adr/0037. */

  function initLanceur() {
    var hote = document.querySelector('[data-jeu-lanceur]');
    if (!hote) return;

    var etat = document.querySelector('[data-jeu-etat]');

    function partir(m) {
      var j = courant(m);
      if (!j) {
        _texte(etat, 'Le jeu du moment n’a pas pu être chargé. '
          + 'Vérifiez votre connexion, puis réessayez.');
        return;
      }
      _texte(document.querySelector('[data-jeu-titre]'), j.titre || j.id);
      _texte(document.querySelector('[data-jeu-saison]'), j.saison || '');
      var url = fichierUrl(j);
      marquerVu(j.id);        // la pastille de l'accueil s'éteint ici
      compterOuverture();     // …et la mairie sait combien de gens ont joué
      precacher(url);
      // `replace` et non `assign` : le retour arrière ramène à l'application,
      // et non dans une boucle lanceur → jeu → lanceur.
      location.replace(url);
    }

    var cache = _lireCache();
    charger().then(function (m) { partir(m || cache); });
  }

  /* ════════════════ RÔLE 3 — les archives ════════════════════ */

  function initArchives() {
    var hote = document.querySelector('[data-jeu-archives]');
    if (!hote) return;

    function rendre(m) {
      var liste = autres(m);
      hote.textContent = '';

      if (!liste.length) {
        var p = document.createElement('p');
        p.className = 'vide';
        p.textContent = m
          ? 'Il n’y a qu’un seul jeu pour l’instant, et il est à l’affiche.'
          : 'La liste des jeux n’a pas pu être chargée. Vérifiez votre connexion.';
        hote.appendChild(p);
        return;
      }

      var ul = document.createElement('ul');
      ul.className = 'jeux';
      liste.forEach(function (j) {
        var li = document.createElement('li');
        var a = document.createElement('a');
        a.className = 'jeu';
        a.href = fichierUrl(j);

        var vign = vignetteUrl(j);
        if (vign) {
          var img = document.createElement('img');
          img.src = vign;
          img.alt = '';               // décorative : le titre juste à côté porte l'information
          img.loading = 'lazy';
          img.className = 'vignette';
          // ⚠️ Une vignette absente ne doit pas laisser une icône d'image cassée :
          // le manifeste peut en déclarer une avant qu'elle soit déposée.
          img.addEventListener('error', function () { img.remove(); });
          a.appendChild(img);
        }

        var txt = document.createElement('span');
        txt.className = 'txt';

        var t = document.createElement('span');
        t.className = 'titre';
        t.textContent = j.titre || j.id;
        txt.appendChild(t);

        if (j.saison) {
          var s = document.createElement('span');
          s.className = 'saison';
          s.textContent = j.saison;
          txt.appendChild(s);
        }
        if (j.resume) {
          var r = document.createElement('span');
          r.className = 'resume';
          r.textContent = j.resume;
          txt.appendChild(r);
        }

        a.appendChild(txt);
        a.setAttribute('aria-label', 'Jouer à ' + (j.titre || j.id)
          + (j.saison ? ' — ' + j.saison : ''));
        li.appendChild(a);
        ul.appendChild(li);
      });
      hote.appendChild(ul);
    }

    var cache = _lireCache();
    if (cache) rendre(cache);
    charger().then(function (m) { rendre(m || cache); });
  }

  /* ── Amorçage ─────────────────────────────────────────────── */

  function init() { initTuile(); initLanceur(); initArchives(); }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  // Exposé pour les tests et pour le plan du site. `courant`, `autres`,
  // `estNouveau` et `periodeContient` acceptent une date : c'est ce qui permet
  // de vérifier la bascule sur les 365 jours de l'année sans toucher l'horloge.
  window.matJeu = {
    charger: charger,
    courant: courant,
    autres: autres,
    periodeContient: periodeContient,
    estNouveau: estNouveau,
    fichierUrl: fichierUrl,
    vignetteUrl: vignetteUrl,
    marquerVu: marquerVu,
    hydraterTuile: hydraterTuile,
    CLE_VU: CLE_VU,
    CLE_CACHE: CLE_CACHE,
    CLE_STAT: CLE_STAT
  };
})();
