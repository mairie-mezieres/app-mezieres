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
  s.src = 'js/mat-pwa-notif.js?v=4.2.6';
  document.head.appendChild(s);
})();

(function(){
  var s = document.createElement('script');
  s.src = 'js/mat-dechets-notif.js?v=4.2.8';
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

(function(){
  var s = document.createElement('script');
  s.src = 'js/mat-associations.js?v=4.2.3';
  document.head.appendChild(s);
})();

(function(){
  var s = document.createElement('script');
  s.src = 'js/mat-entreprises.js?v=1.2.1';
  document.head.appendChild(s);
})();

(function(){
  var s = document.createElement('script');
  s.src = 'js/mat-eau8.js?v=4.2.8';
  document.head.appendChild(s);
})();
