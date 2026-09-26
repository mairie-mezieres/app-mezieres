/* ════════════════════════════════════════════════════════════
   MAT — Conseil municipal : décisions & projets v1.0.0
   Copyright (c) 2024-2026 Commune de Mézières-lez-Cléry — Licence MIT

   Onglets « Décisions » et « Projets » de l'overlay #ov-conseil, et bandeau
   d'accueil « Conseil du … ». Données : data/conseil.json, STATIQUE et
   versionné — aucune IA à l'exécution, aucun Redis, rien d'inventé : un
   champ null ou absent n'affiche rien.

   ⚠️ ADR-0032 — ce fichier est injecté par mat-boot.js : il ne peut tenir
   AUCUNE dépendance pour acquise. Tout appel externe (esc, matStore,
   ttsRead, safeHref…) passe par un typeof, avec repli local.
   ⚠️ Les couleurs des thèmes du JSON ne servent QUE d'accent (liseré,
   pastille) — jamais de couleur de texte (contraste AA non garanti).
   ════════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  var URL_JSON   = './data/conseil.json';
  var CLE_VU     = 'mat_conseil_vu';      // id de la dernière séance consultée
  var CLE_TAMPON = 'mat_conseil_tampon';  // id de la séance dont le tampon a joué
  /* Même dossier Drive que le lien « Comptes rendus du conseil municipal »
     de #ov-docs (index.html) — l'URL y est écrite en dur, sans constante. */
  var URL_CR = 'https://drive.google.com/drive/folders/1Cly3v5rrIo4wAkm2o8kfaWWjgqVsEVXq';

  var _data = null;      // JSON chargé et filtré (visibilité, doublons)
  var _echec = false;    // échec de chargement → messages de repli
  var _filtre = 'tout';  // filtre par thème de l'onglet Décisions

  /* ── Replis locaux (ADR-0032) ─────────────────────────────── */
  function _esc(s) {
    if (typeof esc === 'function') return esc(s);
    return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }
  function _lsGet(cle, dflt) {
    if (typeof matStore !== 'undefined' && matStore.get) return matStore.get(cle, dflt);
    try { return localStorage.getItem(cle) || dflt; } catch (_) { return dflt; }
  }
  function _lsSet(cle, val) {
    if (typeof matStore !== 'undefined' && matStore.set) { matStore.set(cle, val); return; }
    try { localStorage.setItem(cle, val); } catch (_) {}
  }

  /* ── Dates & montants ─────────────────────────────────────────
     ⛔ JAMAIS new Date('2026-08-31') : parsé en UTC, il rend le 30 août à
     Saint-Pierre-et-Miquelon comme à Tahiti. On découpe et on construit une
     date LOCALE (même règle que mat-jours-feries.js). */
  function _dateLocale(iso) {
    var p = String(iso || '').split('-');
    if (p.length !== 3) return null;
    var d = new Date(Number(p[0]), Number(p[1]) - 1, Number(p[2]));
    return isNaN(d.getTime()) ? null : d;
  }
  function _fmtDate(iso, opts, majuscule) {
    var d = _dateLocale(iso);
    if (!d) return '';
    var s = d.toLocaleDateString('fr-FR', opts);
    return majuscule ? s.charAt(0).toUpperCase() + s.slice(1) : s;
  }
  function _dateLongue(iso) {   // « Lundi 31 août 2026 »
    return _fmtDate(iso, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }, true);
  }
  function _dateJourMoisAnnee(iso) {  // « 31 août 2026 »
    return _fmtDate(iso, { day: 'numeric', month: 'long', year: 'numeric' });
  }
  function _dateJourMois(iso) {       // « 31 août »
    return _fmtDate(iso, { day: 'numeric', month: 'long' });
  }
  var _fmtEuro = null;
  function _euro(n) {
    if (typeof n !== 'number' || !isFinite(n)) return '';
    try {
      if (!_fmtEuro) _fmtEuro = new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' });
      return _fmtEuro.format(n);
    } catch (_) { return n.toFixed(2).replace('.', ',') + ' €'; }
  }

  /* ── Visibilité & anti-doublon ────────────────────────────────
     Mandat en cours uniquement : rien avant `depuis`, même présent dans le
     fichier. Séance visible = publie && date ≥ depuis. Projet visible =
     publie && au moins une séance source visible. Doublon d'id : la
     PREMIÈRE occurrence gagne, les suivantes sont ignorées + console.warn. */
  function _dedoublonner(liste, etiquette) {
    var vus = {}, resultat = [];
    (liste || []).forEach(function (e) {
      if (!e || !e.id) return;
      if (vus[e.id]) {
        try { console.warn('[conseil] id en double ignoré (' + etiquette + ') : ' + e.id); } catch (_) {}
        return;
      }
      vus[e.id] = true;
      resultat.push(e);
    });
    return resultat;
  }
  function _seancesVisibles() {
    if (!_data) return [];
    var depuis = _data.depuis || '';
    return _dedoublonner(_data.seances, 'séance')
      .filter(function (s) { return s.publie === true && s.date && s.date >= depuis; })
      .sort(function (a, b) { return a.date < b.date ? 1 : -1; });
  }
  function _projetsVisibles() {
    if (!_data) return [];
    var ids = {};
    _seancesVisibles().forEach(function (s) { ids[s.id] = true; });
    return _dedoublonner(_data.projets, 'projet').filter(function (p) {
      return p.publie === true && (p.sources || []).some(function (id) { return ids[id]; });
    });
  }
  function _derniereSeance() {
    var v = _seancesVisibles();
    return v.length ? v[0] : null;
  }

  /* ── Chargement ─────────────────────────────────────────────── */
  function _charger() {
    return fetch(URL_JSON).then(function (rep) {
      if (!rep.ok) throw new Error('HTTP ' + rep.status);
      return rep.json();
    }).then(function (json) {
      if (!json || json.schema !== 1 || !Array.isArray(json.seances)) throw new Error('schéma inattendu');
      _data = json;
      _echec = false;
    }).catch(function () {
      _data = null;
      _echec = true;
    });
  }

  /* ── Onglets ──────────────────────────────────────────────────
     Pilotés par classList uniquement ; AUCUNE entrée d'historique. */
  var ONGLETS = ['elus', 'decisions', 'projets'];
  function _ongletValide(id) { return ONGLETS.indexOf(id) !== -1 ? id : 'elus'; }

  window.matConseilOnglet = function (onglet) {
    onglet = _ongletValide(onglet);
    ONGLETS.forEach(function (id) {
      var tab = document.getElementById('conseil-tab-' + id);
      var pan = document.getElementById('conseil-panel-' + id);
      var actif = (id === onglet);
      if (tab) {
        tab.classList.toggle('is-active', actif);
        tab.setAttribute('aria-selected', actif ? 'true' : 'false');
        if (actif) tab.removeAttribute('tabindex'); else tab.setAttribute('tabindex', '-1');
      }
      if (pan) pan.classList.toggle('is-active', actif);
    });
    if (onglet === 'decisions') _peindreDecisions();
    if (onglet === 'projets') _peindreProjets();
  };

  /* Navigation clavier du tablist (flèches, Début, Fin) — délégation. */
  function _clavierTabs(e) {
    var tabs = ONGLETS.map(function (id) { return document.getElementById('conseil-tab-' + id); })
      .filter(Boolean);
    var idx = tabs.indexOf(e.target);
    if (idx === -1) return;
    var suivant = null;
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') suivant = (idx + 1) % tabs.length;
    else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') suivant = (idx - 1 + tabs.length) % tabs.length;
    else if (e.key === 'Home') suivant = 0;
    else if (e.key === 'End') suivant = tabs.length - 1;
    if (suivant === null) return;
    e.preventDefault();
    var id = tabs[suivant].getAttribute('data-conseil-tab');
    window.matConseilOnglet(id);
    try { tabs[suivant].focus(); } catch (_) {}
  }

  /* ── Rendu des onglets (échecs communs) ───────────────────────
     En cas d'échec de chargement : message + lien vers les comptes rendus
     officiels (règle §3) — et le bandeau d'accueil reste masqué. */
  function _htmlEchec() {
    return '<div class="conseil-echec">'
      + '<p>Les décisions ne sont pas disponibles pour le moment.</p>'
      + '<a href="' + URL_CR + '" target="_blank" rel="noopener noreferrer">Consulter les comptes rendus officiels ↗</a>'
      + '</div>';
  }
  function _peindreDecisions() {
    var pan = document.getElementById('conseil-panel-decisions');
    if (!pan) return;
    if (_echec) { pan.innerHTML = _htmlEchec(); return; }
    if (!_data) return; // encore en chargement : « Chargement… » du gabarit
    pan.innerHTML = _htmlDecisions();
    _apresRenduDecisions(pan);
  }
  function _peindreProjets() {
    var pan = document.getElementById('conseil-panel-projets');
    if (!pan) return;
    if (_echec) { pan.innerHTML = _htmlEchec(); return; }
    if (!_data) return;
    pan.innerHTML = _htmlProjets();
  }

  /* Renderers remplis par les étapes suivantes du développement. */
  function _htmlDecisions() { return '<div class="conseil-attente">Chargement…</div>'; }
  function _apresRenduDecisions() {}
  function _htmlProjets() { return '<div class="conseil-attente">Chargement…</div>'; }

  /* ── Bandeau d'accueil ────────────────────────────────────────
     Rempli à l'étape « accueil : bandeau dernier conseil ». */
  function _peindreBandeau() {}

  /* ── Délégation d'événements ──────────────────────────────────
     AUCUN texte utilisateur dans un onclick : tout passe par data-*. */
  function _clic(e) {
    var cible = e.target && e.target.closest ? e.target.closest('[data-conseil-tab],[data-conseil-action],[data-conseil-filtre]') : null;
    if (!cible) return;
    var tab = cible.getAttribute('data-conseil-tab');
    if (tab) { window.matConseilOnglet(tab); return; }
    var filtre = cible.getAttribute('data-conseil-filtre');
    if (filtre) { _appliquerFiltre(filtre); return; }
    var action = cible.getAttribute('data-conseil-action');
    if (action) _action(action, cible);
  }
  function _appliquerFiltre() {}
  function _action() {}

  window.matConseilInit = function () {
    document.addEventListener('click', _clic);
    document.addEventListener('keydown', function (e) {
      if (e.target && e.target.classList && e.target.classList.contains('conseil-tab')) _clavierTabs(e);
    });
    _charger().then(function () {
      _peindreBandeau();
      /* Si l'overlay est déjà ouvert sur un onglet en attente de données. */
      var pd = document.getElementById('conseil-panel-decisions');
      var pp = document.getElementById('conseil-panel-projets');
      if (pd && pd.classList.contains('is-active')) _peindreDecisions();
      if (pp && pp.classList.contains('is-active')) _peindreProjets();
      if (_echec) {
        if (pd) pd.innerHTML = _htmlEchec();
        if (pp) pp.innerHTML = _htmlEchec();
      }
    });
  };
})();
