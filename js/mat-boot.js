/* ════════════════════════════════════════════════════════════
   MAT — Initialisation v3.7.3 (Phase 3)
   Séquence d'amorçage appelée au chargement de la page.
   DOIT Être CHARGÉ EN DERNIER — tous les autres modules doivent
   déjà avoir défini leurs fonctions globales.
   Copyright (c) 2024-2026 Commune de Mézières-lez-Cléry — Licence MIT
   ════════════════════════════════════════════════════════════ */

(function matInit(){
  // 0) Déverrouillage orientation — corrige le verrou WebAPK Android hérité
  //    du manifest "orientation: portrait" sur les installations existantes.
  try { if (screen.orientation && screen.orientation.unlock) screen.orientation.unlock(); } catch(e) {}

  // 1) Accessibilité & préférences utilisateur
  try { loadAccessibilite(); } catch(e){ console.warn('[init] loadAccessibilite', e); }
  try { refreshAllContextHelp(); } catch(e){}

  // 2) État initial des cartes (badge notif, push)
  try { updateNotifCardStatus(null); } catch(e){}
  try { refreshActusBadge(); } catch(e){}
  try { if (typeof refreshPhotosBadge === 'function') refreshPhotosBadge(); } catch(e){}

  // 3) Widgets header (asynchrones)
  try { loadHoraireExceptions(); } catch(e){}
  try { loadMeteo(); }         catch(e){ console.warn('[init] loadMeteo', e); }
  try { loadEvents(); }        catch(e){ console.warn('[init] loadEvents', e); }
  try { loadDechets(); }       catch(e){ console.warn('[init] loadDechets', e); }
  try { loadMairieStatus(); }  catch(e){ console.warn('[init] loadMairieStatus', e); }
  try { loadBusRemi(); }       catch(e){ console.warn('[init] loadBusRemi', e); }
  try { loadCarburant(); }     catch(e){ console.warn('[init] loadCarburant', e); }
  try { loadDateBadge(); }     catch(e){}

  // 4) Bouton install / bug
  try { updateInstallBtn(); }  catch(e){}
  try { updateInstallBanner(); } catch(e){}

  // 5) Fix viewport iPhone
  try { fixIOSViewportAfterKeyboard(); } catch(e){}

  // 6) Restauration état des formulaires
  try { restoreSignalFormState(); }  catch(e){}
  try { restoreContactFormState(); } catch(e){}
  try { restoreBugFormState(); }     catch(e){}

  // 7) Encart d'information / alerte
  try { loadMatInfoBanner(); } catch(e){}

  // 7b) Config fonctionnalités (réactions, RSVP…)
  fetch(window.MAT_API+'/config/features',{signal:matAbortTimeout(5000)})
    .then(function(r){ return r.json(); })
    .then(function(d){ window._matFeatures = d; })
    .catch(function(){}); // dégradé : window._matFeatures reste undefined → réactions activées

  // 7c) Photo MAT & MEL personnalisée (saison/occasion) — définie depuis l'admin
  fetch(window.MAT_API+'/config/mascotte',{signal:matAbortTimeout(5000)})
    .then(function(r){ return r.json(); })
    .then(function(d){ if (d && d.active && d.url && typeof applyMascotte === 'function') applyMascotte(d.url); })
    .catch(function(){}); // dégradé : image MAT & MEL par défaut conservée

  // 8) Protection email mairie (déobfuscation)
  try { initMailProtection(); } catch(e){}

  // 9) PHASE 3 — Chargement des données MEL externes en arrière-plan
  setTimeout(function(){
    try { if (typeof loadMelData === 'function') loadMelData(); }
    catch(e){ console.warn('[init] loadMelData', e); }
    try { if (typeof loadEventsLocaux === 'function') loadEventsLocaux(); }
    catch(e){ console.warn('[init] loadEventsLocaux', e); }
    try { if (typeof loadEnvLocal === 'function') loadEnvLocal(); }
    catch(e){ console.warn('[init] loadEnvLocal', e); }
  }, 150);

  // 10) Badge performances footer (non bloquant)
  try { if (typeof loadPerfBadge === 'function') loadPerfBadge(); } catch(e){}

  // 11) Onboarding (décalé pour ne pas bloquer l'affichage initial)
  setTimeout(function(){ try { initOnboarding(); } catch(e){} }, 800);

  // 12) Intervalles périodiques — suspendus en arrière-plan pour ménager
  //     batterie et data mobile (la PWA installée garderait sinon ses
  //     setInterval actifs même app en background).
  window._matTimers = window._matTimers || {};
  function _matStartTimers(){
    if (window._matTimers.dechets)     return; // déjà démarrés
    window._matTimers.dechets       = setInterval(function(){ try { loadDechets(); }       catch(e){} },  60000);
    window._matTimers.mairieStatus  = setInterval(function(){ try { loadMairieStatus(); }  catch(e){} },  60000);
    window._matTimers.busRemi       = setInterval(function(){ try { loadBusRemi(); }       catch(e){} },  60000);
    window._matTimers.meteo         = setInterval(function(){ try { loadMeteo(); }         catch(e){} }, 600000);
    window._matTimers.actusBadge    = setInterval(function(){ try { refreshActusBadge(); } catch(e){} }, 300000);
    window._matTimers.photosBadge   = setInterval(function(){ try { if (typeof refreshPhotosBadge === 'function') refreshPhotosBadge(); } catch(e){} }, 300000);
  }
  function _matStopTimers(){
    Object.keys(window._matTimers).forEach(function(k){
      clearInterval(window._matTimers[k]);
      delete window._matTimers[k];
    });
  }
  _matStartTimers();
  document.addEventListener('visibilitychange', function(){
    if (document.visibilityState === 'hidden') _matStopTimers();
    else _matStartTimers();
  });
})();

(function(){
  var s = document.createElement('script');
  s.src = 'js/mat-pwa-notif.js?v=4.3.0';
  document.head.appendChild(s);
})();

(function(){
  var s = document.createElement('script');
  s.src = 'js/mat-dechets-notif.js?v=4.3.1';
  document.head.appendChild(s);
})();

(function(){
  var s = document.createElement('script');
  s.src = 'js/mat-jours-feries.js?v=4.2.3';
  document.head.appendChild(s);
})();

(function(){
  var s = document.createElement('script');
  s.src = 'js/mat-sondages.js?v=4.3.1';
  s.onload = function() {
    setTimeout(function() {
      try { if (typeof loadSondages === 'function') loadSondages(); } catch(e) {}
    }, 400);
  };
  document.head.appendChild(s);
})();

/* ══════════════════════════════════════════════════════════════════════
   CHARGEMENT À LA DEMANDE — voir ADR-0041

   Quatre modules ne servent QU'UN écran, et la plupart des habitants ne
   l'ouvriront jamais. Les injecter au démarrage, c'est les télécharger,
   les analyser et les exécuter à chaque lancement pour rien : 136 Ko
   bruts, dont 98 Ko pour la seule carte 3D — plus que tout le reste de
   l'accueil réuni.

   Le relais ci-dessous prend la place de la fonction d'ouverture. Au
   premier appel, il charge le module (qui redéfinit la fonction, donc le
   relais disparaît de lui-même), puis lui passe la main avec ses
   arguments. Les appels suivants vont directement au vrai code.

   ⛔ NE DIFFÉRER QU'UN MODULE SANS EFFET DE BORD AU CHARGEMENT. Les
   quatre ci-dessous ne sont que des définitions. `mat-eau8.js` ne l'est
   PAS et ne doit pas le devenir : il ENVELOPPE `loadMeteoDetail` au
   chargement, donc son ordre par rapport à `mat-widgets.js` est
   signifiant — le différer le ferait envelopper une fonction déjà
   appelée, ou aucune.

   ⚠️ Un module chargé ici arrive APRÈS les autres, dans un ordre qui
   n'est plus garanti : il ne peut rien tenir pour acquis (ADR-0032).

   ⚠️ Ces fichiers restent dans `PRECACHE_URLS` du service worker : pour
   un habitant qui a installé l'application, ils sont déjà là et
   l'ouverture est instantanée, y compris hors connexion. Le gain porte
   sur la PREMIÈRE visite — celle que mesure l'éco-index, et la seule que
   connaîtront ceux qui n'installent pas.
   ══════════════════════════════════════════════════════════════════ */

window._matModules = window._matModules || {};

function matChargerModule(src){
  if (window._matModules[src]) return window._matModules[src];
  window._matModules[src] = new Promise(function(ok, ko){
    var s = document.createElement('script');
    s.src = src;
    s.onload  = function(){ ok(); };
    s.onerror = function(){
      // On oublie la promesse échouée : une coupure réseau ponctuelle ne
      // doit pas condamner l'écran pour le reste de la session.
      delete window._matModules[src];
      ko(new Error('échec de chargement : ' + src));
    };
    document.head.appendChild(s);
  });
  return window._matModules[src];
}

// Pastille « Chargement… » — sans elle, appuyer sur « Mon village en 3D »
// ne produit RIEN de visible le temps du téléchargement, ce qui se lit
// comme un bouton mort. `role="status"` pour que ce soit aussi annoncé.
function matAttente(actif){
  var el = document.getElementById('mat-attente');
  if (!actif){ if (el) el.remove(); return; }
  if (el) return;
  el = document.createElement('div');
  el.id = 'mat-attente';
  el.className = 'mat-attente';
  el.setAttribute('role', 'status');
  document.body.appendChild(el);
  // Le texte est posé APRÈS l'insertion : une zone `role="status"` déjà
  // remplie à l'insertion n'est pas annoncée de façon fiable.
  requestAnimationFrame(function(){
    var e = document.getElementById('mat-attente');
    if (e) e.textContent = 'Chargement…';
  });
}

function matDifferer(src, noms){
  noms.forEach(function(nom){
    var relais = function(){
      var args = arguments, self = this;
      matAttente(true);
      matChargerModule(src).then(function(){
        matAttente(false);
        var f = window[nom];
        // `f !== relais` : le module s'est bien chargé mais n'a pas défini la
        // fonction. Sans ce garde-fou, on se rappellerait soi-même en boucle.
        if (typeof f === 'function' && f !== relais) return f.apply(self, args);
        throw new Error(nom + ' non défini après ' + src);
      }).catch(function(e){
        matAttente(false);
        window[nom] = relais;   // réarmement pour une nouvelle tentative
        console.warn('[mat] ' + e.message);
        if (typeof alertMAT === 'function') {
          alertMAT('Cet écran n’a pas pu être chargé. Vérifiez votre connexion, puis réessayez.',
                   'Chargement impossible', '📶');
        }
      });
    };
    window[nom] = relais;
  });
}

matDifferer('js/mat-associations.js?v=4.2.4',  ['openAssociations', 'openSubvention']);
matDifferer('js/mat-entreprises.js?v=1.2.1',   ['openEntreprises']);
matDifferer('js/mat-guide-arrivee.js?v=1.0.8', ['openGuideArrivee']);
// Carte 3D — le module fait 98 Ko à lui seul. La bibliothèque MapLibre
// (~1 Mo) reste chargée par le module lui-même, à la première ouverture
// (ADR-0018) : ce sont deux paliers, pas un seul.
matDifferer('js/mat-carte3d.js?v=1.11.0',       ['matOuvrirCarte3D']);

(function(){
  var s = document.createElement('script');
  s.src = 'js/mat-eau8.js?v=4.3.0';
  document.head.appendChild(s);
})();

(function(){
  var s = document.createElement('script');
  s.src = 'js/mat-plui.js?v=1.2.1';
  s.onload = function(){ try { if (typeof refreshPluiBadge === 'function') refreshPluiBadge(); } catch(e){} };
  document.head.appendChild(s);
})();

// « Le saviez-vous ? » — chargé en différé : la ligne n'est pas urgente, et
// le corpus (data/saviez-vous.json) ne doit pas concurrencer les widgets
// d'accueil au premier rendu. Le module s'auto-efface s'il ne trouve pas
// de conteneur .sv-bloc ou si le corpus est indisponible.
(function(){
  var s = document.createElement('script');
  s.src = 'js/mat-saviez-vous.js?v=1.5.0';
  s.onload = function(){ try { if (typeof matSaviezVousInit === 'function') matSaviezVousInit(); } catch(e){} };
  document.head.appendChild(s);
})();

/* `mat-guide-arrivee.js` et `mat-carte3d.js` étaient injectés ici. Ils sont
   désormais chargés à la première ouverture de leur écran, par `matDifferer`
   plus haut. Voir ADR-0041. */
