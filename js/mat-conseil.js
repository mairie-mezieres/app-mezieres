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

  /* ── Onglet Décisions ─────────────────────────────────────── */

  /* Couleur d'accent du JSON : validée avant toute injection en style —
     et JAMAIS utilisée comme couleur de texte (contraste non garanti). */
  function _accent(theme) {
    var t = _data && _data.themes && _data.themes[theme];
    var c = t && t.couleur;
    return (typeof c === 'string' && /^#[0-9A-Fa-f]{3,8}$/.test(c)) ? c : '';
  }
  function _themeIco(theme) {
    var t = _data && _data.themes && _data.themes[theme];
    return t && t.ico ? t.ico : '🏛️';
  }

  /* Sceau civique décoratif — SVG pur, variante blanche pour la carte verte.
     Ce n'est PAS le tampon officiel de la mairie : façade stylisée (fronton
     « MAIRIE », toit à deux cheminées, porte en arc, perron). */
  function _sceauSvg() {
    return '<svg class="conseil-sceau" viewBox="0 0 200 200" aria-hidden="true" focusable="false">'
      + '<defs><path id="cm-arc-h" d="M 100,100 m -74,0 a 74,74 0 1,1 148,0"/>'
      + '<path id="cm-arc-b" d="M 100,100 m -74,0 a 74,74 0 1,0 148,0"/></defs>'
      + '<circle cx="100" cy="100" r="96" fill="none" stroke="#fff" stroke-width="5"/>'
      + '<circle cx="100" cy="100" r="88" fill="none" stroke="#d4a843" stroke-width="1.6"/>'
      + '<circle cx="100" cy="100" r="60" fill="none" stroke="#d4a843" stroke-width="1.6"/>'
      + '<text font-family="Nunito,sans-serif" font-size="14.5" font-weight="900" fill="#fff" letter-spacing="2.5">'
      + '<textPath href="#cm-arc-h" startOffset="50%" text-anchor="middle">CONSEIL MUNICIPAL</textPath></text>'
      + '<text font-family="Nunito,sans-serif" font-size="11.5" font-weight="800" fill="#a7f3d0" letter-spacing="1.4">'
      + '<textPath href="#cm-arc-b" startOffset="50%" text-anchor="middle">MÉZIÈRES-LEZ-CLÉRY</textPath></text>'
      + '<text x="24" y="104" font-size="10" fill="#d4a843">★</text>'
      + '<text x="166" y="104" font-size="10" fill="#d4a843">★</text>'
      + '<g stroke-linejoin="round">'
      + '<rect x="66" y="66" width="6" height="12" fill="#fff"/><rect x="128" y="66" width="6" height="12" fill="#fff"/>'
      + '<path d="M 60,84 L 74,70 L 126,70 L 140,84 Z" fill="#a7f3d0"/>'
      + '<rect x="62" y="84" width="76" height="46" fill="none" stroke="#fff" stroke-width="3"/>'
      + '<line x1="66.5" y1="84" x2="66.5" y2="130" stroke="#d4a843" stroke-width="1.4"/>'
      + '<line x1="133.5" y1="84" x2="133.5" y2="130" stroke="#d4a843" stroke-width="1.4"/>'
      + '<path d="M 82,84 L 100,72 L 118,84 Z" fill="#1a3d2b" stroke="#fff" stroke-width="2.6"/>'
      + '<text x="100" y="82.6" font-family="Nunito,sans-serif" font-size="6.2" font-weight="900" fill="#fff" text-anchor="middle" letter-spacing="1">MAIRIE</text>'
      + '<line x1="62" y1="106" x2="138" y2="106" stroke="#fff" stroke-width="1.4"/>'
      + '<g fill="#fff"><rect x="70" y="90" width="7" height="12" rx="1"/><rect x="123" y="90" width="7" height="12" rx="1"/></g>'
      + '<g fill="none" stroke="#a7f3d0" stroke-width="1.2"><line x1="68" y1="90" x2="68" y2="102"/><line x1="79" y1="90" x2="79" y2="102"/><line x1="121" y1="90" x2="121" y2="102"/><line x1="132" y1="90" x2="132" y2="102"/></g>'
      + '<rect x="96" y="90" width="8" height="11" rx="1" fill="#fff"/>'
      + '<g stroke="#fff" stroke-width="1.2"><line x1="96" y1="101" x2="90" y2="108"/><line x1="104" y1="101" x2="110" y2="108"/></g>'
      + '<path d="M 90,108 L 84,105.5 L 90,103 Z" fill="#d4a843"/><path d="M 110,108 L 116,105.5 L 110,103 Z" fill="#d4a843"/>'
      + '<path d="M 94,130 L 94,116 A 6,6 0 0 1 106,116 L 106,130 Z" fill="#fff"/>'
      + '<path d="M 72,130 L 72,116 A 5,5 0 0 1 82,116 L 82,130 Z" fill="none" stroke="#fff" stroke-width="2.2"/>'
      + '<path d="M 118,130 L 118,116 A 5,5 0 0 1 128,116 L 128,130 Z" fill="none" stroke="#fff" stroke-width="2.2"/>'
      + '<rect x="88" y="130" width="24" height="3.4" fill="#a7f3d0"/><rect x="84" y="133.4" width="32" height="3.4" fill="#a7f3d0"/><rect x="80" y="136.8" width="40" height="3.4" fill="#a7f3d0"/>'
      + '<line x1="52" y1="140" x2="52" y2="124" stroke="#fff" stroke-width="2" stroke-linecap="round"/>'
      + '<circle cx="52" cy="119" r="6.5" fill="#a7f3d0"/></g></svg>';
  }

  function _badgeResultat(dec) {
    if (dec.resultat === 'prise_acte') return '📝 Le conseil en a pris acte';
    if (dec.resultat === 'avis_favorable') {
      return dec.unanimite ? '👍 Avis favorable à l’unanimité' : '👍 Avis favorable';
    }
    if (dec.resultat === 'adopte') {
      return dec.unanimite ? '✅ Adopté à l’unanimité' : '✅ Adopté à la majorité';
    }
    return '';
  }
  function _texteVote(v) {
    if (!v || typeof v.pour !== 'number') return '';
    var parts = [v.pour + ' pour'];
    if (v.contre > 0) parts.push(v.contre + ' contre');
    if (v.abstention > 0) parts.push(v.abstention + ' abstention' + (v.abstention > 1 ? 's' : ''));
    return parts.join(' · ');
  }
  function _ligneMontant(m) {
    if (!m || typeof m.valeur !== 'number') return '';
    var libelles = { recette: 'Recette : ', depense: 'Coût pour la commune : ', subvention: 'Subventions versées : ' };
    var lib = libelles[m.nature];
    if (!lib) return '';
    return '<div class="conseil-dec-montant">💶 ' + lib + _euro(m.valeur) + '</div>';
  }

  function _carteDecision(dec) {
    var accent = _accent(dec.theme);
    var badge = _badgeResultat(dec);
    var h = '<article class="conseil-dec" data-theme="' + _esc(dec.theme || '') + '"'
      + (accent ? ' style="border-left-color:' + accent + '"' : '') + '>'
      + '<div class="conseil-dec-tete"><span class="conseil-dec-ico" aria-hidden="true">' + _themeIco(dec.theme) + '</span>'
      + '<h4 class="conseil-dec-titre">' + _esc(dec.titre) + '</h4></div>';
    if (dec.en_clair) h += '<p class="conseil-dec-clair">' + _esc(dec.en_clair) + '</p>';
    if (badge) {
      h += '<div class="conseil-dec-badge">' + badge;
      if (dec.resultat === 'adopte' && !dec.unanimite) {
        var votes = _texteVote(dec.vote);
        if (votes) h += '<span class="conseil-dec-votes">' + votes + '</span>';
      }
      h += '</div>';
    }
    h += _ligneMontant(dec.montant);
    if (dec.lien_elus === true) {
      h += '<button type="button" class="conseil-dec-elus" data-conseil-action="elus">👥 Voir les élus</button>';
    }
    if (dec.num) h += '<div class="conseil-dec-num">Délibération ' + _esc(dec.num) + '</div>';
    return h + '</article>';
  }

  function _blocDecisionsMaire(seance) {
    var dm = seance.decisions_maire || [];
    if (!dm.length) return '';
    var h = '<div class="conseil-dm">'
      + '<div class="conseil-dm-titre">Décisions du Maire</div>'
      + '<div class="conseil-dm-sous">Prises par délégation du conseil (délibération 2026/25) et présentées en séance</div>'
      + '<ul class="conseil-dm-liste">';
    dm.forEach(function (d) {
      /* Aucun total, ni cumulé ni par séance (règle §4.1-5). */
      h += '<li data-theme="' + _esc(d.theme || '') + '">'
        + '<span class="conseil-dm-date">' + _dateJourMois(d.date) + '</span>'
        + '<span class="conseil-dm-objet">' + _esc(d.objet) + '</span>'
        + (typeof d.montant === 'number' ? '<span class="conseil-dm-montant">' + _euro(d.montant) + '</span>' : '')
        + '</li>';
    });
    return h + '</ul></div>';
  }

  function _htmlPied() {
    return '<div class="conseil-pied">'
      + '<p>Résumé des comptes rendus officiels. Seuls les documents officiels font foi.</p>'
      + '<a href="' + URL_CR + '" target="_blank" rel="noopener noreferrer">Consulter les comptes rendus officiels ↗</a>'
      + '</div>';
  }

  function _htmlDecisions() {
    var seances = _seancesVisibles();
    if (!seances.length) {
      return '<div class="conseil-echec"><p>Aucune séance publiée pour le moment.</p></div>' + _htmlPied();
    }
    var derniere = seances[0];
    var decs = _dedoublonner(derniere.decisions, 'décision');

    /* 1. Carte « Dernier compte rendu » — le seul élément spectaculaire. */
    var h = '<div class="conseil-cr">'
      + '<div class="conseil-sceau-wrap">' + _sceauSvg() + '</div>'
      + '<div class="conseil-cr-txt">'
      + '<div class="conseil-cr-sur">Dernier compte rendu</div>'
      + '<div class="conseil-cr-date">' + _dateLongue(derniere.date) + '</div>'
      + (derniere.resume ? '<p class="conseil-cr-resume">' + _esc(derniere.resume) + '</p>' : '')
      + '<div class="conseil-cr-nb">🗳️ ' + decs.length + ' décision' + (decs.length > 1 ? 's' : '') + '</div>';
    var proch = _dateLocale(_data.prochaine_seance);
    var auj = new Date(); auj.setHours(0, 0, 0, 0);
    if (proch && proch >= auj) {
      h += '<div class="conseil-cr-prochain">📅 Prochain conseil : '
        + _fmtDate(_data.prochaine_seance, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
        + '. Les séances sont publiques.</div>';
    }
    if (typeof ttsRead === 'function' && 'speechSynthesis' in window) {
      h += '<button type="button" class="conseil-ecouter" data-conseil-action="ecouter">🔊 Écouter</button>';
    }
    h += '</div></div>';

    /* 2. Filtre par thème. */
    var themes = (_data.themes && typeof _data.themes === 'object') ? Object.keys(_data.themes) : [];
    if (themes.length) {
      h += '<div class="conseil-filtres" role="group" aria-label="Filtrer les décisions par thème">'
        + '<button type="button" class="conseil-filtre is-active" data-conseil-filtre="tout" aria-pressed="true">Tout</button>';
      themes.forEach(function (cle) {
        var t = _data.themes[cle] || {};
        h += '<button type="button" class="conseil-filtre" data-conseil-filtre="' + _esc(cle) + '" aria-pressed="false">'
          + (t.ico ? t.ico + ' ' : '') + _esc(t.label || cle) + '</button>';
      });
      h += '</div>';
    }

    /* 3-5. Séances en accordéons ouverts par défaut (règle MAT). */
    seances.forEach(function (s) {
      h += '<details class="conseil-seance" open>'
        + '<summary class="conseil-seance-titre"><span>Conseil du ' + _dateJourMoisAnnee(s.date) + '</span>'
        + (s.document === 'cr_partiel' ? '<span class="conseil-seance-partiel">Compte rendu partiel</span>' : '')
        + '<span class="conseil-seance-chev" aria-hidden="true">›</span></summary>'
        + '<div class="conseil-seance-corps">'
        + _dedoublonner(s.decisions, 'décision').map(_carteDecision).join('')
        + '</div>'
        + _blocDecisionsMaire(s)
        + '</details>';
    });

    return h + _htmlPied();
  }

  /* Animation « coup de tampon » : ~300 ms, UNE fois par nouvelle séance,
     jamais sous prefers-reduced-motion (le point 1 validé a écarté le mode
     simplifié, qui n'existe pas dans l'app). */
  function _apresRenduDecisions(pan) {
    var derniere = _derniereSeance();
    if (derniere) {
      var joue = _lsGet(CLE_TAMPON, '');
      var reduit = false;
      try { reduit = window.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (_) {}
      if (joue !== derniere.id) {
        if (!reduit) {
          var w = pan.querySelector('.conseil-sceau-wrap');
          if (w) w.classList.add('conseil-tampon-anim');
        }
        _lsSet(CLE_TAMPON, derniere.id);
      }
    }
    if (_filtre !== 'tout') _appliquerFiltre(_filtre);
  }

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
  /* Filtre par thème : bascule de classes, sans re-rendu (les accordéons
     gardent leur état). Une séance dont plus rien n'est visible est masquée. */
  function _appliquerFiltre(filtre) {
    _filtre = filtre;
    var pan = document.getElementById('conseil-panel-decisions');
    if (!pan) return;
    pan.querySelectorAll('.conseil-filtre').forEach(function (b) {
      var actif = b.getAttribute('data-conseil-filtre') === filtre;
      b.classList.toggle('is-active', actif);
      b.setAttribute('aria-pressed', actif ? 'true' : 'false');
    });
    pan.querySelectorAll('.conseil-dec, .conseil-dm-liste li').forEach(function (el) {
      el.classList.toggle('conseil-hors-filtre', filtre !== 'tout' && el.getAttribute('data-theme') !== filtre);
    });
    pan.querySelectorAll('.conseil-dm').forEach(function (dm) {
      var reste = dm.querySelector('.conseil-dm-liste li:not(.conseil-hors-filtre)');
      dm.classList.toggle('conseil-hors-filtre', !reste);
    });
    pan.querySelectorAll('.conseil-seance').forEach(function (s) {
      var reste = s.querySelector('.conseil-dec:not(.conseil-hors-filtre), .conseil-dm:not(.conseil-hors-filtre)');
      s.classList.toggle('conseil-hors-filtre', !reste);
    });
  }

  /* Lecture vocale de la carte « Dernier compte rendu » : le résumé puis
     les titres des décisions. Réutilise ttsRead/ttsStop (mat-utils) — un
     second clic pendant la lecture l'arrête, comme les actualités. */
  function _texteEcoute() {
    var s = _derniereSeance();
    if (!s) return '';
    var morceaux = ['Conseil municipal du ' + _dateJourMoisAnnee(s.date) + '.'];
    if (s.resume) morceaux.push(s.resume);
    _dedoublonner(s.decisions, 'décision').forEach(function (d) { if (d.titre) morceaux.push(d.titre + '.'); });
    return morceaux.join(' ');
  }
  function _majBoutonEcoute(enCours) {
    var b = document.querySelector('.conseil-ecouter');
    if (b) b.textContent = enCours ? '⏹ Arrêter' : '🔊 Écouter';
  }
  function _action(action) {
    if (action === 'elus') { window.matConseilOnglet('elus'); return; }
    if (action === 'ecouter') {
      if (typeof speechSynthesis !== 'undefined' && speechSynthesis.speaking) {
        if (typeof ttsStop === 'function') ttsStop();
        return;
      }
      if (typeof ttsRead === 'function') {
        ttsRead(_texteEcoute(), 'Conseil municipal');
        _majBoutonEcoute(true);
      }
    }
  }

  window.matConseilInit = function () {
    document.addEventListener('click', _clic);
    /* Fin de lecture (naturelle ou arrêt) → le bouton repasse à « Écouter ». */
    document.addEventListener('mat-tts', function (e) {
      if (e.detail && e.detail.state === 'end') _majBoutonEcoute(false);
    });
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
