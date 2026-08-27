/* ════════════════════════════════════════════════════════════
   MAT — « Le saviez-vous ? » v1.3.0
   Un fait sur la commune par jour, avec sa source, et une
   question à laquelle on répond.
   Copyright (c) 2024-2026 Commune de Mézières-lez-Cléry — Licence MIT
   ════════════════════════════════════════════════════════════

   ⛔ RÈGLE ABSOLUE — aucune IA n'écrit le fait affiché.

   Le contenu vient de `data/saviez-vous.json`, versionné dans le dépôt et
   relu par la mairie, ou des générateurs `SV_CALCULES` ci-dessous qui sont
   de l'arithmétique pure. Un LLM peut aider à RÉDIGER le corpus en amont ;
   il n'intervient JAMAIS à l'exécution. Même raison d'être que la constante
   ASSOCIATIONS côté backend et que l'ADR-0003 (conseils santé déterministes
   par seuil plutôt que générés) : sur des informations que l'habitant va
   croire, on ne joue pas aux dés. Voir ADR-0012.

   Corollaire de rédaction : on n'affiche JAMAIS une affirmation fausse.
   L'entrée pose une QUESTION, et seule la révélation porte du contenu
   factuel. Un vrai/faux classique afficherait la contre-vérité à l'écran ;
   celui-ci ne le peut pas par construction.
*/

(function () {
  'use strict';

  var SV_URL       = './data/saviez-vous.json?v=1.4.0';
  var SV_ETAT_KEY  = 'mat_sv_v1';       // { jour, id, reponse }
  var SV_GRAINE    = 20260802;          // graine fixe : l'ordre ne doit jamais changer
  // Mise en service. La rotation compte les jours DEPUIS cette date, pour que
  // le premier jour affiché soit bien la première entrée de l'ordre éditorial.
  var SV_ORIGINE   = Date.UTC(2026, 7, 2);

  // Coordonnées de la commune — mêmes valeurs que js/mat-eau8.js (_EAU_LAT/_EAU_LON).
  var SV_LAT = 47.822;
  var SV_LON = 1.808;

  var _corpus = null;     // liste ordonnée, construite une fois
  var _entree = null;     // entrée du jour
  var _ouvert = false;

  // ── Outils ────────────────────────────────────────────────

  // Nombre de jours écoulés depuis la mise en service, ancré sur Paris —
  // surtout pas l'heure locale de l'appareil (c'est le piège de l'ADR-0007).
  //
  // ⚠️ On compte depuis une ORIGINE, pas depuis le 1er janvier. Avec un
  // quantième d'année, le premier jour affiché aurait été le 213e du corpus —
  // c'est-à-dire la fin du cycle, là où les catégories les plus fournies se
  // retrouvent seules. L'ordre éditorial de _ordonner() n'aurait alors servi
  // à rien. Compter depuis l'origine garantit qu'on entre par le début.
  // Corollaire : le passage d'une année à l'autre ne provoque plus de saut.
  function _jourDepuisOrigine() {
    try {
      var tz = { timeZone: 'Europe/Paris' };
      var f = function (opt) {
        return parseInt(new Intl.DateTimeFormat('fr-FR', Object.assign({}, tz, opt)).format(new Date()), 10);
      };
      var j = f({ day: 'numeric' }), m = f({ month: 'numeric' }), a = f({ year: 'numeric' });
      var n = Math.floor((Date.UTC(a, m - 1, j) - SV_ORIGINE) / 86400000);
      return n >= 0 ? n : 0;
    } catch (e) {
      return 0;
    }
  }

  // Clé de jour « AAAA-MM-JJ » à Paris, pour ne rejouer qu'une fois par jour.
  function _cleDuJour() {
    try {
      var p = new Intl.DateTimeFormat('fr-CA', {
        timeZone: 'Europe/Paris', year: 'numeric', month: '2-digit', day: '2-digit'
      }).format(new Date());
      return p;
    } catch (e) {
      return String(_jourDepuisOrigine());
    }
  }

  // Générateur pseudo-aléatoire déterministe (LCG). Une graine fixe garantit
  // que l'ordre du corpus est le MÊME pour tout le village et d'une version à
  // l'autre — c'est ce qui fait du fait du jour un sujet de conversation.
  function _melange(liste, graine) {
    var a = liste.slice(), s = graine >>> 0;
    for (var i = a.length - 1; i > 0; i--) {
      s = (s * 1664525 + 1013904223) >>> 0;
      var j = s % (i + 1);
      var t = a[i]; a[i] = a[j]; a[j] = t;
    }
    return a;
  }

  function _nombre(n) {
    // Espace insécable fine comme séparateur de milliers (typographie française).
    return String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  }

  // Distance orthodromique depuis la commune, en kilomètres (haversine).
  function _distance(lat, lon) {
    var R = 6371.0088, r = Math.PI / 180;
    var dLat = (lat - SV_LAT) * r, dLon = (lon - SV_LON) * r;
    var h = Math.sin(dLat / 2) * Math.sin(dLat / 2)
          + Math.cos(SV_LAT * r) * Math.cos(lat * r) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
    return 2 * R * Math.asin(Math.sqrt(h));
  }

  // ── Entrées calculées ─────────────────────────────────────
  // Arithmétique pure : le calcul EST la preuve, il n'y a rien à croire.
  // Chacune doit rester vraie sans réseau et sans donnée externe, pour que
  // tout le monde voie la même chose le même jour.

  var SV_CALCULES = [
    {
      id: 'calc-orleans',
      categorie: 'decouverte',
      build: function () {
        var d = _distance(47.8975, 1.9099);
        return {
          question: 'À vol d’oiseau, Mézières-lez-Cléry est-elle à moins de 15 km de la cathédrale d’Orléans ?',
          reponse: true,
          explication: 'Oui : ' + _nombre(d) + ' km à vol d’oiseau. Par la route, comptez une vingtaine de minutes.',
          source: 'Calcul de distance orthodromique depuis les coordonnées de la commune (47,822 N — 1,808 E)',
          url: ''
        };
      }
    },
    {
      id: 'calc-paris',
      categorie: 'decouverte',
      build: function () {
        var d = _distance(48.8530, 2.3499);
        return {
          question: 'Paris est-elle à plus de 150 km de Mézières à vol d’oiseau ?',
          reponse: false,
          explication: 'Non : ' + _nombre(d) + ' km seulement séparent Mézières de Notre-Dame de Paris.',
          source: 'Calcul de distance orthodromique depuis les coordonnées de la commune (47,822 N — 1,808 E)',
          url: ''
        };
      }
    },
    {
      id: 'calc-equateur',
      categorie: 'decouverte',
      build: function () {
        var d = SV_LAT * 111.319;
        return {
          question: 'Mézières est-elle plus proche de l’équateur que du pôle Nord ?',
          reponse: false,
          explication: 'Non : ' + _nombre(d) + ' km jusqu’à l’équateur, contre '
            + _nombre(_distance(90, 0)) + ' km jusqu’au pôle Nord. Nous sommes dans la moitié nord de l’hémisphère.',
          source: 'Calcul depuis la latitude de la commune (47,822 N), un degré de latitude valant 111,319 km',
          url: ''
        };
      }
    },
    {
      id: 'calc-newyork',
      categorie: 'decouverte',
      build: function () {
        var d = _distance(40.7128, -74.0060);
        return {
          question: 'New York est-elle à plus de 5 000 km de Mézières ?',
          reponse: true,
          explication: 'Oui : ' + _nombre(d) + ' km à vol d’oiseau. Un avion de ligne met environ huit heures.',
          source: 'Calcul de distance orthodromique depuis les coordonnées de la commune (47,822 N — 1,808 E)',
          url: ''
        };
      }
    },
    {
      id: 'calc-montstmichel',
      categorie: 'decouverte',
      build: function () {
        var d = _distance(48.6360, -1.5115);
        return {
          question: 'Le Mont-Saint-Michel est-il à moins de 300 km de Mézières ?',
          reponse: true,
          explication: 'Oui : ' + _nombre(d) + ' km à vol d’oiseau.',
          source: 'Calcul de distance orthodromique depuis les coordonnées de la commune (47,822 N — 1,808 E)',
          url: ''
        };
      }
    },
    {
      id: 'calc-lune',
      categorie: 'decouverte',
      build: function () {
        return {
          question: 'La Lune est-elle à environ 300 000 km de Mézières ?',
          reponse: false,
          explication: 'Non — elle est bien plus loin : 384 400 km en moyenne. Son orbite étant elliptique, '
            + 'la distance varie de 356 500 km au périgée à 406 700 km à l’apogée.',
          source: 'IMCCE / Observatoire de Paris — éphémérides du système solaire',
          url: 'https://www.imcce.fr/'
        };
      }
    },
    {
      id: 'calc-rotation',
      categorie: 'decouverte',
      build: function () {
        // Vitesse d'entraînement par la rotation terrestre à cette latitude :
        // circonférence du parallèle ÷ durée du jour sidéral.
        var v = (40075.017 * Math.cos(SV_LAT * Math.PI / 180)) / 23.9344696;
        return {
          question: 'Assis dans son fauteuil à Mézières, se déplace-t-on à plus de 1 000 km/h ?',
          reponse: true,
          explication: 'Oui : ' + _nombre(v) + ' km/h. C’est la vitesse à laquelle la rotation de la Terre '
            + 'nous emporte à cette latitude — moins vite qu’à l’équateur, où elle atteint 1 674 km/h.',
          source: 'Calcul depuis la latitude de la commune (47,822 N) — circonférence équatoriale 40 075 km, jour sidéral 23 h 56 min 4 s',
          url: ''
        };
      }
    },
    {
      id: 'calc-tour-parallele',
      categorie: 'decouverte',
      build: function () {
        var c = 40075.017 * Math.cos(SV_LAT * Math.PI / 180);
        return {
          question: 'En marchant plein est sans jamais dévier, faudrait-il parcourir plus de 30 000 km pour revenir à Mézières ?',
          reponse: false,
          explication: 'Non : ' + _nombre(c) + ' km suffiraient. Le tour du monde à la latitude de Mézières est '
            + 'nettement plus court qu’à l’équateur, où il faudrait faire 40 075 km.',
          source: 'Calcul depuis la latitude de la commune (47,822 N) — circonférence équatoriale 40 075 km',
          url: ''
        };
      }
    },
    {
      id: 'calc-degre-longitude',
      categorie: 'decouverte',
      build: function () {
        var d = 111.319 * Math.cos(SV_LAT * Math.PI / 180);
        return {
          question: 'Un degré de longitude représente-t-il la même distance à Mézières qu’à l’équateur ?',
          reponse: false,
          explication: 'Non : ' + _nombre(d) + ' km ici, contre 111 km à l’équateur. Les méridiens se rapprochent '
            + 'en montant vers le pôle, alors qu’un degré de latitude, lui, vaut 111 km partout.',
          source: 'Calcul depuis la latitude de la commune (47,822 N), un degré de longitude valant 111,319 km à l’équateur',
          url: ''
        };
      }
    },
    {
      id: 'calc-greenwich',
      categorie: 'decouverte',
      build: function () {
        var d = SV_LON * 111.319 * Math.cos(SV_LAT * Math.PI / 180);
        return {
          question: 'Mézières est-elle à plus de 100 km à l’est du méridien de Greenwich ?',
          reponse: true,
          explication: 'Oui : ' + _nombre(d) + ' km. La commune est à 1,808° de longitude est — le méridien de '
            + 'référence passe donc nettement à l’ouest, du côté du Mans.',
          source: 'Calcul depuis les coordonnées de la commune (47,822 N — 1,808 E)',
          url: ''
        };
      }
    },
    {
      id: 'calc-antipode',
      categorie: 'decouverte',
      build: function () {
        var lat = -SV_LAT, lon = SV_LON - 180;
        var d = _distance(lat, lon);
        return {
          question: 'En creusant tout droit sous Mézières, ressortirait-on en Australie ?',
          reponse: false,
          explication: 'Non, et de loin : l’antipode se situe par 47,8° de latitude SUD et 178,2° de longitude OUEST, '
            + 'en plein océan, à ' + _nombre(d) + ' km en passant par la surface. C’est bien plus à l’est que '
            + 'l’Australie, qui s’arrête à 154° de longitude est.',
          source: 'Calcul de l’antipode et de la distance orthodromique depuis les coordonnées de la commune (47,822 N — 1,808 E)',
          url: ''
        };
      }
    },
    {
      id: 'calc-ferie',
      categorie: 'pratique',
      build: function () {
        // S'appuie sur js/mat-jours-feries.js, chargé au boot par mat-boot.js.
        if (typeof _getFeriesForYear !== 'function') return null;
        try {
          var tz = { timeZone: 'Europe/Paris' };
          var an = parseInt(new Intl.DateTimeFormat('fr-FR', Object.assign({}, tz, { year: 'numeric' })).format(new Date()), 10);
          var feries = _getFeriesForYear(an);
          var n = feries && feries.length ? feries.length : 0;
          if (!n) return null;
          return {
            question: 'La France compte-t-elle plus de 10 jours fériés dans l’année ?',
            reponse: n > 10,
            explication: 'En ' + an + ', le calendrier en compte ' + n + '. Ils apparaissent en couleur dans l’agenda de MAT.',
            source: 'Code du travail, article L3133-1 — calcul des dates par MAT (Pâques comprise)',
            url: 'https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000033024562'
          };
        } catch (e) { return null; }
      }
    }
  ];

  // ── Construction du corpus ────────────────────────────────

  // Ordre de passage des catégories, du plus surprenant au plus aride.
  // C'est un choix ÉDITORIAL, pas technique : un mélange aveugle faisait
  // tomber l'urbanisme — 18 entrées sur 75, soit près d'une sur quatre — dès
  // les premiers jours. « Faut-il une déclaration pour une fenêtre de toit »
  // est une information utile, mais c'est une mauvaise entrée en matière.
  // On ouvre donc sur ce qui étonne (distances, Lune), puis l'histoire de la
  // commune, l'app elle-même, le patrimoine et la vie communale ; les règles
  // d'urbanisme ferment la marche.
  //
  // `histoire` et `patrimoine` ont été séparées de `decouverte` en août 2026 :
  // les faire entrer dans `decouverte` les aurait placées AVANT les entrées
  // calculées, qui sont concaténées après le corpus fixe — c'est-à-dire en tête
  // de rotation, à rebours de la règle « une nouvelle entrée se met à la fin de
  // sa catégorie ». Deux catégories neuves coûtaient moins cher qu'une exception.
  var SV_ORDRE_CATEGORIES = [
    'decouverte', 'histoire', 'mat', 'patrimoine', 'vie-communale',
    'environnement', 'pratique', 'transports', 'sante', 'dechets',
    'intercommunalite', 'habitat', 'demarches', 'urbanisme'
  ];

  // Tour de rôle entre catégories : une entrée de chacune, puis on recommence.
  // Deux entrées de même catégorie ne peuvent donc pas se suivre tant qu'il
  // reste de la matière ailleurs. Les catégories épuisées sortent du tour, si
  // bien que les plus fournies se retrouvent en fin de cycle — assumé : mieux
  // vaut de l'urbanisme au bout de trois mois qu'au premier jour.
  function _ordonner(entrees) {
    var paquets = {}, ordre = [];
    entrees.forEach(function (e) {
      var c = e.categorie || 'divers';
      if (!paquets[c]) { paquets[c] = []; }
      paquets[c].push(e);
    });
    // Catégories connues d'abord, dans l'ordre voulu ; les inconnues ensuite,
    // par ordre alphabétique pour rester déterministe si le corpus en ajoute.
    var cles = SV_ORDRE_CATEGORIES.filter(function (c) { return paquets[c]; })
      .concat(Object.keys(paquets).sort().filter(function (c) {
        return SV_ORDRE_CATEGORIES.indexOf(c) === -1;
      }));
    // À l'INTÉRIEUR d'une catégorie, on garde l'ordre de déclaration du corpus.
    // Un mélange y avait été essayé puis retiré : il plaçait au premier jour une
    // question sur les jours fériés en France, alors que la rubrique porte sur la
    // commune. L'ouverture d'un rendez-vous quotidien ne se joue pas aux dés — et
    // un ordre explicite est aussi ce qui permet à la mairie de relire le corpus
    // en sachant ce qui passera quand.

    var reste = true;
    for (var tour = 0; reste; tour++) {
      reste = false;
      for (var i = 0; i < cles.length; i++) {
        var p = paquets[cles[i]];
        if (tour < p.length) { ordre.push(p[tour]); reste = true; }
      }
    }
    return ordre;
  }

  function _construire(json) {
    var fixes = (json && Array.isArray(json.entrees)) ? json.entrees : [];
    var calc = SV_CALCULES.map(function (c) {
      return { id: c.id, _build: c.build, categorie: c.categorie || 'decouverte' };
    });
    return _ordonner(fixes.concat(calc));
  }

  // Résout l'entrée du jour. Si une entrée calculée ne peut pas se construire
  // (donnée absente), on avance DÉTERMINISTIQUEMENT jusqu'à la suivante —
  // jamais au hasard, sinon deux habitants verraient deux faits différents.
  function _entreeDuJour(liste) {
    if (!liste.length) return null;
    var depart = _jourDepuisOrigine() % liste.length;
    for (var k = 0; k < liste.length; k++) {
      var e = liste[(depart + k) % liste.length];
      if (!e) continue;
      if (typeof e._build === 'function') {
        var r = null;
        try { r = e._build(); } catch (_) { r = null; }
        if (r) { r.id = e.id; return r; }
        continue;
      }
      if (e.question && e.explication && e.source) return e;
    }
    return null;
  }

  // ── Mémoire locale ────────────────────────────────────────

  // La réponse mémorisée ne vaut que pour LE fait du jour. On vérifie aussi
  // l'identifiant : si le corpus est réordonné entre deux ouvertures — ce qui
  // arrive à chaque enrichissement — l'habitant verrait sinon la révélation
  // d'une question à laquelle il n'a pas répondu.
  function _etat() {
    var s = matStore.get(SV_ETAT_KEY, null);
    if (!s || s.jour !== _cleDuJour()) return null;
    if (_entree && s.id && s.id !== _entree.id) return null;
    return s;
  }

  function _memoriser(reponse) {
    matStore.set(SV_ETAT_KEY, {
      jour: _cleDuJour(),
      id: _entree ? _entree.id : '',
      reponse: reponse
    });
  }

  // ── Rendu ─────────────────────────────────────────────────

  function _conteneurs() {
    return Array.prototype.slice.call(document.querySelectorAll('.sv-bloc'));
  }

  function _ligneRepliee() {
    var deja = _etat();
    return '<button type="button" class="sv-ligne" aria-expanded="false" onclick="matSaviezVousBascule()">'
      + '<span class="sv-ligne-ico" aria-hidden="true">🤔</span>'
      + '<span class="sv-ligne-txt">Le saviez-vous ?</span>'
      + (deja ? '<span class="sv-ligne-fait" aria-hidden="true">✓</span>' : '')
      + '<span class="sv-ligne-chev" aria-hidden="true">›</span>'
      + '</button>';
  }

  function _corpsHtml() {
    if (!_entree) {
      return '<div class="sv-corps"><div class="sv-vide">Le fait du jour n’est pas disponible.</div></div>';
    }
    var deja = _etat();
    var h = '<div class="sv-corps" id="sv-corps">'
      + '<div class="sv-question">' + esc(_entree.question) + '</div>';

    if (!deja) {
      h += '<div class="sv-choix">'
        + '<button type="button" class="sv-btn" onclick="matSaviezVousRepondre(true)">Oui</button>'
        + '<button type="button" class="sv-btn" onclick="matSaviezVousRepondre(false)">Non</button>'
        + '</div>';
    }
    h += '<div class="sv-reveal" id="sv-reveal" role="status" aria-live="polite" aria-atomic="true">'
      + (deja ? _revelationHtml(deja.reponse) : '')
      + '</div></div>';
    return h;
  }

  function _revelationHtml(reponseDonnee) {
    if (!_entree) return '';
    var bon = (reponseDonnee === _entree.reponse);
    var verdict = _entree.reponse ? 'Oui.' : 'Non.';
    var h = '<div class="sv-verdict ' + (bon ? 'sv-ok' : 'sv-ko') + '">'
      + (bon ? '✅ Bien vu — ' : '💡 Eh non — ') + esc(verdict) + '</div>'
      + '<div class="sv-expli">' + esc(_entree.explication) + '</div>';

    var src = esc(_entree.source);
    if (_entree.url && typeof safeHref === 'function' && safeHref(_entree.url)) {
      h += '<div class="sv-source">Source : <a href="' + esc(_entree.url)
         + '" target="_blank" rel="noopener noreferrer">' + src + ' ↗</a></div>';
    } else {
      h += '<div class="sv-source">Source : ' + src + '</div>';
    }
    h += '<div class="sv-part" id="sv-part"></div>';
    return h;
  }

  function _peindre() {
    var html = _ligneRepliee() + (_ouvert ? _corpsHtml() : '');
    _conteneurs().forEach(function (el) {
      el.innerHTML = html;
      var b = el.querySelector('.sv-ligne');
      if (b) b.setAttribute('aria-expanded', _ouvert ? 'true' : 'false');
      if (_ouvert) {
        var c = el.querySelector('.sv-corps');
        if (c && b) { c.id = ''; b.removeAttribute('aria-controls'); }
      }
    });
    // aria-controls n'est posé que sur le premier conteneur rendu, pour ne pas
    // dupliquer un id dans le document (mobile et desktop coexistent au DOM).
    var premier = document.querySelector('.sv-bloc .sv-corps');
    if (premier) {
      premier.id = 'sv-corps';
      var btn = premier.parentNode.querySelector('.sv-ligne');
      if (btn) btn.setAttribute('aria-controls', 'sv-corps');
    }
  }

  // ── Compteur « X % ont répondu comme vous » ───────────────
  // Best-effort : sans réseau, la ligne reste simplement absente. On ne dit
  // jamais « 0 % » — une donnée manquante ne doit pas se lire comme une valeur.

  function _majPart(d, maReponse) {
    if (!d) return;
    var oui = Number(d.oui) || 0, non = Number(d.non) || 0, tot = oui + non;
    if (tot < 5) return;   // sous 5 réponses, un pourcentage ne veut rien dire
    var comme = maReponse ? oui : non;
    var pct = Math.round((comme / tot) * 100);
    document.querySelectorAll('#sv-part, .sv-part').forEach(function (el) {
      el.textContent = pct + ' % des Macérien(ne)s ont répondu comme vous.';
    });
  }

  function _envoyer(reponse) {
    if (!_entree || !window.MAT_API) return;
    var id = encodeURIComponent(_entree.id || '');
    if (!id) return;
    matFetch(window.MAT_API + '/saviezvous/' + id, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-device-id': getMatDeviceId() },
      body: JSON.stringify({ reponse: reponse ? 'oui' : 'non' })
    }, 8000)
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (d) { _majPart(d, reponse); })
      .catch(function () { /* hors ligne : le pourcentage reste absent */ });
  }

  // ── API publique ──────────────────────────────────────────

  window.matSaviezVousBascule = function () {
    _ouvert = !_ouvert;
    _peindre();
    if (_ouvert) {
      try { trackStat('saviez_vous'); } catch (e) {}
      // Si l'habitant a déjà répondu aujourd'hui, on récupère le compteur.
      var deja = _etat();
      if (deja && _entree && window.MAT_API) {
        matFetch(window.MAT_API + '/saviezvous/' + encodeURIComponent(_entree.id), {
          headers: { 'x-device-id': getMatDeviceId() }
        }, 8000)
          .then(function (r) { return r.ok ? r.json() : null; })
          .then(function (d) { _majPart(d, deja.reponse); })
          .catch(function () {});
      }
    }
  };

  window.matSaviezVousRepondre = function (reponse) {
    if (!_entree || _etat()) return;
    _memoriser(reponse);
    _peindre();
    var z = document.querySelector('.sv-reveal');
    if (z) z.innerHTML = _revelationHtml(reponse);
    _envoyer(reponse);
    try { trackStat('saviez_vous_reponse'); } catch (e) {}
  };

  // Inventaire complet du corpus, dans l'ORDRE RÉEL de passage — la page de
  // revue de la mairie (revue-saviez-vous.html) s'en sert pour relire ce qui
  // sera affiché, et quand. On l'expose ici plutôt que de réimplémenter
  // l'ordonnancement côté page : une deuxième implémentation finirait par
  // diverger, et la revue mentirait alors sur ce que verront les habitants.
  // C'est la même raison qui interdit une seconde liste d'associations.
  //
  // Les entrées calculées sont résolues telles qu'elles le seraient
  // aujourd'hui ; celles qui ne peuvent pas l'être sont renvoyées avec
  // `indisponible: true` plutôt que masquées, pour que le relecteur le voie.
  window.matSaviezVousInventaire = function () {
    return matFetch(SV_URL, { cache: 'no-cache' }, 8000)
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (json) {
        return _construire(json).map(function (e, i) {
          if (typeof e._build !== 'function') {
            return { rang: i, calculee: false, entree: e };
          }
          var r = null;
          try { r = e._build(); } catch (_) { r = null; }
          if (!r) {
            return {
              rang: i, calculee: true, indisponible: true,
              entree: { id: e.id, categorie: e.categorie, question: '', explication: '', source: '', url: '' }
            };
          }
          r.id = e.id;
          r.categorie = e.categorie;
          return { rang: i, calculee: true, entree: r };
        });
      });
  };

  // Date à laquelle une entrée de rang N passera, en repartant de l'origine.
  // Exposée pour que la revue n'ait pas à redéclarer SV_ORIGINE.
  window.matSaviezVousDatePassage = function (rang, taille) {
    var aujourdhui = _jourDepuisOrigine();
    var prochain = rang;
    if (taille > 0 && rang < aujourdhui) {
      // Prochain passage : on avance d'un nombre entier de cycles.
      prochain = rang + Math.ceil((aujourdhui - rang) / taille) * taille;
    }
    return {
      jour: prochain,
      date: new Date(SV_ORIGINE + prochain * 86400000),
      dejaVue: rang < aujourdhui,          // son premier passage est derrière nous
      aujourdhui: prochain === aujourdhui
    };
  };

  window.matSaviezVousInit = function () {
    if (!_conteneurs().length) return;
    if (_corpus) { _peindre(); return; }
    matFetch(SV_URL, { cache: 'no-cache' }, 8000)
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (json) {
        _corpus = _construire(json);
        _entree = _entreeDuJour(_corpus);
        if (_entree) _peindre();
      })
      .catch(function () { /* corpus indisponible : la ligne ne s'affiche pas */ });
  };
})();
