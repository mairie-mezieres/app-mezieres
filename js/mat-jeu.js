/* ════════════════════════════════════════════════════════════
   MAT — Le jeu du moment v1.0.0
   Copyright (c) 2024-2026 Commune de Mézières-lez-Cléry — Licence MIT

   UN SEUL MODULE, TROIS RÔLES. Il sert la tuile de l'accueil, le lanceur
   `/jeu` et la page `/jeu/archives`. C'est délibéré : le chemin du manifeste,
   les clés de stockage et la façon de résoudre « quel est le jeu courant »
   ne doivent exister QU'UNE FOIS. Trois copies auraient divergé au premier
   changement de jeu — c'est la classe d'erreur qui a déjà mordu ce dépôt
   (associations, fibre, arbre MEL).

   ⛔ AUCUNE DONNÉE NE SORT DE L'APPAREIL. Pas de statistique de partie, pas
   d'identifiant, pas de classement, aucun appel au backend. Le seul état
   persistant est local : `jeu-vu` (l'identifiant du dernier jeu ouvert) et
   le meilleur score, écrit par le jeu lui-même dans sa propre clé.

   ⚠️ CHANGER DE JEU NE DOIT TOUCHER AUCUN CODE. Tout vient de
   `jeux/jeux.json` : titre, saison, résumé, fichier, vignette, date. Si vous
   vous surprenez à écrire « la-hotte » ailleurs que dans ce manifeste, c'est
   que quelque chose est à corriger ici.
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
  var CLE_VU    = 'jeu-vu';         // identifiant du dernier jeu ouvert
  var CLE_CACHE = 'mat_jeu_cache';  // miroir local du manifeste (hors-ligne)

  /* ── Petits utilitaires ──────────────────────────────────── */

  function _texte(el, s) { if (el) el.textContent = s; }

  function _frDate(iso) {
    var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(iso || ''));
    if (!m) return String(iso || '');
    var MOIS = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet',
      'août', 'septembre', 'octobre', 'novembre', 'décembre'];
    return parseInt(m[3], 10) + ' ' + MOIS[parseInt(m[2], 10) - 1] + ' ' + m[1];
  }

  // Date du jour au format AAAA-MM-JJ, en heure LOCALE. `toISOString()` donnerait
  // l'UTC : en France, un jeu publié « aujourd'hui » resterait invisible jusqu'à
  // 2 h du matin pendant l'heure d'été.
  function _aujourdhui() {
    var d = new Date(), p = function (n) { return (n < 10 ? '0' : '') + n; };
    return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate());
  }

  /* ── Le manifeste ────────────────────────────────────────── */

  function _valide(m) {
    if (!m || typeof m !== 'object' || !Array.isArray(m.jeux)) return null;
    var jeux = m.jeux.filter(function (j) { return j && j.id && j.fichier; });
    if (!jeux.length) return null;
    return { courant: String(m.courant || jeux[0].id), jeux: jeux };
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

  function courant(m) {
    if (!m) return null;
    for (var i = 0; i < m.jeux.length; i++) {
      if (String(m.jeux[i].id) === m.courant) return m.jeux[i];
    }
    return m.jeux[0];
  }

  function precedents(m) {
    if (!m) return [];
    return m.jeux.filter(function (j) { return String(j.id) !== m.courant; });
  }

  /* Le manifeste écrit ses chemins depuis la racine du site (« /jeux/x.html »),
     parce que c'est ce qu'un rédacteur écrit naturellement. On les résout ici,
     en tolérant les deux formes — avec ou sans barre oblique initiale. */
  function fichierUrl(jeu) {
    var f = String((jeu && jeu.fichier) || '');
    if (/^https?:/i.test(f)) return f;             // jamais utilisé aujourd'hui, mais explicite
    return RACINE + f.replace(/^\/+/, '');
  }

  function vignetteUrl(jeu) {
    var v = String((jeu && jeu.vignette) || '');
    if (!v) return '';
    if (/^https?:/i.test(v)) return v;
    return RACINE + v.replace(/^\/+/, '');
  }

  /* ── La pastille « Nouveau » ─────────────────────────────────
     RÈGLE : la mémoire de l'appareil est l'IDENTIFIANT du dernier jeu ouvert,
     pas une date. Une date ferait réapparaître la pastille sur toute la
     commune si la mairie corrigeait une coquille dans « publie » — pour un
     jeu que tout le monde a déjà vu. L'identifiant, lui, ne change que quand
     le jeu change, ce qui est exactement la règle demandée.
     La date ne sert qu'à une chose : ne rien annoncer avant la date de
     publication, pour qu'un jeu puisse être déposé à l'avance. */
  function estNouveau(m) {
    var j = courant(m);
    if (!j) return false;
    if (String(j.publie || '') > _aujourdhui()) return false;   // publié plus tard
    try { return localStorage.getItem(CLE_VU) !== String(j.id); }
    catch (_) { return false; }   // stockage refusé : ne rien promettre
  }

  function marquerVu(id) {
    try { localStorage.setItem(CLE_VU, String(id)); } catch (_) {}
  }

  /* ── Hors-ligne : demander au service worker de garder le jeu ──
     Le service worker précache déjà le jeu courant à son installation. Ceci
     couvre l'autre cas, le plus fréquent : un nouveau jeu publié alors que le
     service worker en place ne bougera pas avant la prochaine version. Le jeu
     est alors mis en cache à sa première ouverture — donc jouable en mode
     avion ensuite, sans qu'une ligne de code ait eu à changer. */
  function precacher(url) {
    try {
      var sw = navigator.serviceWorker;
      if (sw && sw.controller) sw.controller.postMessage({ action: 'CACHE_JEU', url: url });
    } catch (_) {}
  }

  /* ════════════════ RÔLE 1 — la tuile de l'accueil ════════════ */

  /* ⚠️ LA TUILE NE NOMME PAS LE JEU. Ni son titre, ni sa saison : on les
     découvre en l'ouvrant. Elle porte un libellé fixe, « Le jeu du moment »,
     et la seule chose qui y varie est la pastille — décidée par le manifeste.
     Le titre et la saison, eux, restent affichés par le lanceur `/jeu`.

     Conséquence pour les tests : rien de visible ne prouve que le module a
     tourné. D'où `data-jeu-pret`, posé après hydratation — sans quoi un test
     mesurerait l'état AVANT que la pastille soit décidée, et conclurait au
     hasard. */
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
      marquerVu(j.id);      // la pastille de l'accueil s'éteint ici
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
      var liste = precedents(m);
      hote.textContent = '';

      if (!liste.length) {
        var p = document.createElement('p');
        p.className = 'vide';
        p.textContent = m
          ? 'Le premier jeu est encore à l’affiche : il n’y a pas encore d’archives. '
            + 'Revenez à la saison prochaine.'
          : 'La liste des jeux n’a pas pu être chargée. Vérifiez votre connexion.';
        hote.appendChild(p);
        return;
      }

      // Le plus récemment publié en tête. Comparaison de chaînes AAAA-MM-JJ :
      // ce format se trie correctement tel quel.
      liste.sort(function (a, b) { return String(b.publie || '').localeCompare(String(a.publie || '')); });

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
        if (j.publie) {
          var d = document.createElement('span');
          d.className = 'publie';
          d.textContent = 'Publié le ' + _frDate(j.publie);
          txt.appendChild(d);
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

  // Exposé pour les tests et pour le plan du site. Aucune de ces fonctions
  // n'écrit ailleurs que dans le localStorage de l'appareil.
  window.matJeu = {
    charger: charger,
    courant: courant,
    precedents: precedents,
    estNouveau: estNouveau,
    fichierUrl: fichierUrl,
    marquerVu: marquerVu,
    hydraterTuile: hydraterTuile,
    CLE_VU: CLE_VU,
    CLE_CACHE: CLE_CACHE
  };
})();
