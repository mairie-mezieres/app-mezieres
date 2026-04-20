/* ════════════════════════════════════════════════════════════
   MAT — Initialisation v3.7.2 (Phase 3)
   Séquence d'amorçage appelée au chargement de la page.
   DOIT Être CHARGÉ EN DERNIER — tous les autres modules doivent
   déjà avoir défini leurs fonctions globales.
   ════════════════════════════════════════════════════════════ */

(function matInit(){
  // 1) Accessibilité & préférences utilisateur
  try { loadAccessibilite(); } catch(e){ console.warn('[init] loadAccessibilite', e); }
  try { refreshAllContextHelp(); } catch(e){}

  // 2) État initial des cartes (badge notif, push)
  try { updateNotifCardStatus(null); } catch(e){}
  try { refreshActusBadge(); } catch(e){}

  // 3) Widgets header (asynchrones)
  try { loadMeteo(); }         catch(e){ console.warn('[init] loadMeteo', e); }
  try { loadEvents(); }        catch(e){ console.warn('[init] loadEvents', e); }
  try { loadDechets(); }       catch(e){ console.warn('[init] loadDechets', e); }
  try { loadMairieStatus(); }  catch(e){ console.warn('[init] loadMairieStatus', e); }
  try { loadBusRemi(); }       catch(e){ console.warn('[init] loadBusRemi', e); }
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

  // 8) Protection email mairie (déobfuscation)
  try { initMailProtection(); } catch(e){}

  // 9) PHASE 3 — Chargement des données MEL externes en arrière-plan
  //    MEL fonctionne déjà avec le fallback embarqué, donc non-bloquant.
  //    Délai de 150 ms pour laisser le rendu initial se stabiliser.
  setTimeout(function(){
    try { if (typeof loadMelData === 'function') loadMelData(); }
    catch(e){ console.warn('[init] loadMelData', e); }
  }, 150);

  // 10) Onboarding (décalé pour ne pas bloquer l'affichage initial)
  setTimeout(function(){ try { initOnboarding(); } catch(e){} }, 800);

  // 11) Intervalles périodiques
  setInterval(function(){ try { loadDechets(); }      catch(e){} },  60000);  // 1 min
  setInterval(function(){ try { loadMairieStatus(); } catch(e){} },  60000);  // 1 min
  setInterval(function(){ try { loadBusRemi(); }      catch(e){} },  60000);  // 1 min
  setInterval(function(){ try { loadMeteo(); }        catch(e){} }, 600000);  // 10 min
  setInterval(function(){ try { refreshActusBadge(); } catch(e){} }, 300000); // 5 min
})();

// Chargement dynamique du module post-installation (prompt notifications)
(function(){
  var s = document.createElement('script');
  s.src = 'js/mat-pwa-notif.js?v=3.7.5';
  document.head.appendChild(s);
})();

// Chargement dynamique du module rappels collecte déchets + guide tri
(function(){
  var s = document.createElement('script');
  s.src = 'js/mat-dechets-notif.js?v=3.7.9';
  document.head.appendChild(s);
})();

// Chargement dynamique du module jours fériés dans l'agenda
(function(){
  var s = document.createElement('script');
  s.src = 'js/mat-jours-feries.js?v=3.7.9';
  document.head.appendChild(s);
})();

// Chargement dynamique du module eau (nappe + restrictions) dans la météo
(function(){
  var s = document.createElement('script');
  s.src = 'js/mat-eau6.js?v=3.8.7';
  document.head.appendChild(s);
})();
