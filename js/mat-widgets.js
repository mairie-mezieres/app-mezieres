/* ════════════════════════════════════════════════════════════
   MAT — Widgets header v3.7.0
   Météo, déchets, bus Rémi, mairie, prochain événement
   ════════════════════════════════════════════════════════════ */

// ── Météo ─────────────────────────────────────────────────
const METEO_ICONS = {0:'☀️',1:'🌤️',2:'⛅',3:'☁️',45:'🌫️',48:'🌫️',51:'🌦️',53:'🌦️',55:'🌧️',61:'🌧️',63:'🌧️',65:'🌧️',71:'❄️',73:'❄️',75:'❄️',80:'🌦️',81:'🌧️',82:'⛈️',95:'⛈️',99:'⛈️'};
const METEO_DESC  = {0:'Ciel dégagé',1:'Principalement dégagé',2:'Partiellement nuageux',3:'Couvert',45:'Brouillard',48:'Brouillard givrant',51:'Bruine légère',53:'Bruine modérée',55:'Bruine dense',61:'Pluie légère',63:'Pluie modérée',65:'Pluie forte',71:'Neige légère',73:'Neige modérée',75:'Neige forte',80:'Averses légères',81:'Averses modérées',82:'Averses violentes',95:'Orage',99:'Orage fort'};

async function loadMeteo() {
  try {
    const fr = await fetch(METEO_URL, { cache: 'no-store' });
    if (!fr.ok) throw new Error('HTTP ' + fr.status);
    const d = await fr.json();
    const cur = (d.forecast || {}).current || {};
    const vigilance = d.vigilance || null;
    const code = cur.weather_code;
    const temp = Math.round(cur.temperature_2m != null ? cur.temperature_2m : 0);
    const vent = Math.round(cur.wind_speed_10m != null ? cur.wind_speed_10m : 0);
    document.getElementById('meteo-ico').textContent = METEO_ICONS[code] || '🌡️';
    document.getElementById('meteo-temp').innerHTML = '<strong style="font-size:1.2rem;color:var(--cream)">'+temp+'°C</strong>';

    // Pluie à venir dans les 3h
    const hrly=(d.forecast||{}).hourly||{};
    const nowH=new Date();
    const hTimes=(hrly.time||[]),hPrec=(hrly.precipitation||[]),hProb=(hrly.precipitation_probability||[]),hCode=(hrly.weather_code||[]);
    let rainSoon=null;
    for(let hi=0;hi<hTimes.length;hi++){
      const t=new Date(hTimes[hi]),diff=(t-nowH)/60000;
      if(diff>=0&&diff<=180){
        if((hPrec[hi]||0)>0.1||(hProb[hi]||0)>=40){
          rainSoon={prob:hProb[hi]||0,mm:hPrec[hi]||0,label:METEO_DESC[hCode[hi]]||''};break;
        }
      }
    }
    const rainTxt=rainSoon?' · 🌧️ Pluie dans 3h ('+rainSoon.prob+'%)':'';
    document.getElementById('meteo-desc').textContent=(METEO_DESC[code]||'Météo')+' · Vent '+vent+' km/h'+rainTxt;
    const badge = document.getElementById('meteo-alerte');
    badge.textContent = (vigilance && Number(vigilance.level||0) >= 2) ? '⚠️ Vigilance '+(vigilance.color_label||'') : "✅ Pas d'alerte";
    badge.style.display = 'inline-flex';
    window._meteoData = d;
  } catch (e) {
    var offline = !navigator.onLine;
    document.getElementById('meteo-temp').innerHTML = '<span class="meteo-loading">'+(offline?'📡 Hors ligne':'Météo indisponible')+'</span>';
    document.getElementById('meteo-desc').textContent = offline?'Reconnectez-vous pour actualiser':'';
    document.getElementById('meteo-alerte').style.display = 'none';
  }
}

function loadMeteoDetail() {
  var d = window._meteoData;
  var el = document.getElementById('meteo-detail');
  if (!d) { el.innerHTML = '<div style="text-align:center;padding:20px;color:var(--muted)">Données météo non disponibles.</div>'; return; }
  var forecast = d.forecast || {}, cur = forecast.current || {}, days = forecast.daily || {}, vigilance = d.vigilance || null;
  var JOURS = ['Dim','Lun','Mar','Mer','Jeu','Ven','Sam'];
  var html = '<div style="background:white;border-radius:14px;padding:12px;margin-bottom:14px;border:1px solid var(--border)"><div style="font-size:0.82rem;font-weight:900;color:var(--text)">'
    + ((vigilance && Number(vigilance.level||0) >= 2) ? '⚠️ Alerte en cours : vigilance '+(vigilance.color_label||'') : '✅ Aucune alerte météo en cours')
    + '</div><div style="font-size:0.72rem;color:var(--muted);margin-top:4px">'
    + ((vigilance && vigilance.main_text) ? vigilance.main_text : 'Situation météo normale sur la commune.')
    + '</div></div>';

  var NORM_MAX=[5,7,12,16,20,24,26,26,22,17,10,6];
  var NORM_MIN=[0,1,3,6,10,13,15,15,11,8,4,1];
  var moisN=new Date().getMonth();
  function wDir(deg){if(deg==null)return '';var d=['N','NE','E','SE','S','SO','O','NO'];return d[Math.round((deg||0)/45)%8];}

  var hrly2=forecast.hourly||{};
  var hT2=(hrly2.time||[]),hP2=(hrly2.precipitation||[]),hPr2=(hrly2.precipitation_probability||[]),hC2=(hrly2.weather_code||[]),hA2=(hrly2.apparent_temperature||[]),hW2=(hrly2.wind_speed_10m||[]);
  var nowH2=new Date();

  var rain3h=null;
  for(var hi=0;hi<hT2.length;hi++){var t2=new Date(hT2[hi]),df=(t2-nowH2)/60000;if(df>=0&&df<=180){if((hP2[hi]||0)>0.1||(hPr2[hi]||0)>=40){rain3h={prob:hPr2[hi]||0,mm:hP2[hi]||0,desc:METEO_DESC[hC2[hi]]||''};break;}}}

  var pluie24h=days.precipitation_sum&&days.precipitation_sum[0]!=null?parseFloat(days.precipitation_sum[0]).toFixed(1):'–';
  var rafaleMax24=days.wind_gusts_10m_max&&days.wind_gusts_10m_max[0]!=null?Math.round(days.wind_gusts_10m_max[0]):'–';
  var ventDirCur=wDir(cur.wind_direction_10m);

  var next3={};
  if(hT2.length){for(var hi=0;hi<hT2.length;hi++){var t3=new Date(hT2[hi]);if(t3>=nowH2){next3={temp:hA2[hi]!=null?Math.round(hA2[hi]):null,wind:hW2[hi]!=null?Math.round(hW2[hi]):null,prob:hPr2[hi]||0,desc:METEO_DESC[hC2[hi]]||'',ico:METEO_ICONS[hC2[hi]]||'🌡️'};break;}}}

  var ressenti=cur.apparent_temperature!=null?Math.round(cur.apparent_temperature):'–';

  var tAjMax=days.temperature_2m_max&&days.temperature_2m_max[1]!=null?Math.round(days.temperature_2m_max[1]):null;
  var tAjMin=days.temperature_2m_min&&days.temperature_2m_min[1]!=null?Math.round(days.temperature_2m_min[1]):null;
  function fmtE(v,n){if(v==null)return '';var e=v-n;return (e>=0?'+':'')+e+'° vs norm.';}
  var eMax=fmtE(tAjMax,NORM_MAX[moisN]), eMin=fmtE(tAjMin,NORM_MIN[moisN]);
  var eMaxC=tAjMax!=null?(tAjMax-NORM_MAX[moisN]>=0?'#dc2626':'#2563eb'):'';
  var eMinC=tAjMin!=null?(tAjMin-NORM_MIN[moisN]>=0?'#dc2626':'#2563eb'):'';

  // Bloc 1 : Météo dans les 3h
  html += '<div style="background:linear-gradient(135deg,#e0f2fe,#f0f9ff);border-radius:14px;padding:12px 14px;margin-bottom:12px;border:1px solid #bae6fd">'
    + '<div style="font-size:0.6rem;font-weight:900;text-transform:uppercase;letter-spacing:0.08em;color:#0369a1;margin-bottom:6px">⏰ Météo dans les 3 prochaines heures</div>';
  if(rain3h){
    html += '<div style="display:flex;align-items:center;gap:8px">'
      + '<span style="font-size:1.4rem">🌧️</span>'
      + '<div><div style="font-size:0.88rem;font-weight:900;color:#0369a1">Pluie probable ('+rain3h.prob+'%)</div>'
      + '<div style="font-size:0.72rem;color:#0c4a6e">'+rain3h.mm+' mm prévu · '+rain3h.desc+'</div></div></div>';
  } else if(next3.temp!=null){
    html += '<div style="display:flex;align-items:center;gap:10px">'
      + '<span style="font-size:1.4rem">'+next3.ico+'</span>'
      + '<div>'
      + '<div style="font-size:0.88rem;font-weight:900;color:#0369a1">'+next3.desc+'</div>'
      + '<div style="font-size:0.72rem;color:#0c4a6e">Ressenti '+next3.temp+'°C · Vent '+next3.wind+' km/h</div>'
      + '</div></div>';
  } else {
    html += '<div style="font-size:0.82rem;color:#0369a1">Pas de précipitations attendues</div>';
  }
  html += '</div>';

  // Tendances
  var nowH3 = new Date(), idxNow = -1, idx3hBefore = -1;
  for (var hi = 0; hi < hT2.length; hi++) {
    var tH = new Date(hT2[hi]);
    var diffMin = (tH - nowH3) / 60000;
    if (diffMin >= -10 && diffMin <= 60 && idxNow === -1) idxNow = hi;
    if (diffMin >= -200 && diffMin <= -160 && idx3hBefore === -1) idx3hBefore = hi;
  }
  var hrlyHum  = (forecast.hourly||{}).relative_humidity_2m || [];
  var hrlyPres = (forecast.hourly||{}).surface_pressure || (forecast.hourly||{}).pressure_msl || [];
  var hrlyWGst = (forecast.hourly||{}).wind_gusts_10m || [];
  var hrlyPrec = hP2;

  function tendance(valNow, valBefore, seuilFort, seuilMod) {
    if (valBefore == null || valNow == null) return {ico:'', lbl:'', col:'var(--muted)'};
    var diff = valNow - valBefore;
    var absDiff = Math.abs(diff);
    if (absDiff < seuilMod * 0.3) return {ico:'➡', lbl:'Stable', col:'#6b7280'};
    if (diff > 0) {
      if (absDiff >= seuilFort) return {ico:'⬆', lbl:'Hausse importante', col:'#dc2626'};
      return {ico:'↗', lbl:'Hausse modérée', col:'#f59e0b'};
    } else {
      if (absDiff >= seuilFort) return {ico:'⬇', lbl:'Baisse forte', col:'#2563eb'};
      return {ico:'↘', lbl:'Baisse modérée', col:'#60a5fa'};
    }
  }

  var pluieCur3h = idxNow !== -1 ? (hrlyPrec[idxNow] || 0) : null;
  var pluieBef3h = idx3hBefore !== -1 ? (hrlyPrec[idx3hBefore] || 0) : null;
  var rafCur   = idxNow !== -1 ? hrlyWGst[idxNow] : null;
  var rafBef   = idx3hBefore !== -1 ? hrlyWGst[idx3hBefore] : null;
  var presCur  = cur.pressure_msl || null;
  var presBef  = idx3hBefore !== -1 ? hrlyPres[idx3hBefore] : null;
  var humCur   = cur.relative_humidity_2m || null;
  var humBef   = idx3hBefore !== -1 ? hrlyHum[idx3hBefore] : null;

  var tPluie = tendance(pluieCur3h, pluieBef3h, 2, 0.5);
  var tRaf   = tendance(rafCur, rafBef, 20, 5);
  var tPres  = tendance(presCur, presBef, 5, 1.5);
  var tHum   = tendance(humCur, humBef, 15, 5);

  function tBadge(t) {
    if (!t.ico) return '';
    return '<span style="font-size:1rem;font-weight:900;color:'+t.col+';margin-left:6px;display:inline-block;line-height:1;" title="'+t.lbl+'">'+t.ico+'</span>'
      + '<div style="font-size:0.55rem;font-weight:700;color:'+t.col+';margin-top:2px">'+t.lbl+'</div>';
  }

  // Bloc 2 : Grille 4 encarts avec tendances
  html += '<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:12px">'
    + '<div style="background:white;border-radius:12px;padding:10px 12px;border:1px solid var(--border)">'
    + '<div style="font-size:0.58rem;color:var(--muted);font-weight:700">🌧️ Cumul pluie 24h</div>'
    + '<div style="font-size:0.95rem;font-weight:800;color:var(--text);margin-top:2px">'+pluie24h+' mm'+tBadge(tPluie)+'</div></div>'
    + '<div style="background:white;border-radius:12px;padding:10px 12px;border:1px solid var(--border)">'
    + '<div style="font-size:0.58rem;color:var(--muted);font-weight:700">🌪️ Rafale max 24h</div>'
    + '<div style="font-size:0.95rem;font-weight:800;color:var(--text);margin-top:2px">'+rafaleMax24+' km/h '+ventDirCur+tBadge(tRaf)+'</div></div>'
    + '<div style="background:white;border-radius:12px;padding:10px 12px;border:1px solid var(--border)">'
    + '<div style="font-size:0.58rem;color:var(--muted);font-weight:700">📊 Pression</div>'
    + '<div style="font-size:0.95rem;font-weight:800;color:var(--text);margin-top:2px">'+Math.round(cur.pressure_msl||0)+' hPa'+tBadge(tPres)+'</div></div>'
    + '<div style="background:white;border-radius:12px;padding:10px 12px;border:1px solid var(--border)">'
    + '<div style="font-size:0.58rem;color:var(--muted);font-weight:700">💧 Humidité</div>'
    + '<div style="font-size:0.95rem;font-weight:800;color:var(--text);margin-top:2px">'+(cur.relative_humidity_2m||0)+'%'+tBadge(tHum)+'</div></div>'
    + '</div>';

  // Bloc 3 : Ressenti + écarts normales
  html += '<div style="background:white;border-radius:12px;padding:10px 14px;margin-bottom:14px;border:1px solid var(--border)">'
    + '<div style="display:flex;gap:16px;flex-wrap:wrap;align-items:center">'
    + '<div><div style="font-size:0.58rem;color:var(--muted);font-weight:700">Ressenti actuel</div><div style="font-size:1rem;font-weight:900;color:var(--text)">'+ressenti+'°C</div></div>'
    + (eMax?'<div><div style="font-size:0.58rem;color:var(--muted);font-weight:700">Écart max j.</div><div style="font-size:0.95rem;font-weight:900;color:'+eMaxC+'">'+eMax+'</div></div>':'')
    + (eMin?'<div><div style="font-size:0.58rem;color:var(--muted);font-weight:700">Écart min j.</div><div style="font-size:0.95rem;font-weight:900;color:'+eMinC+'">'+eMin+'</div></div>':'')
    + '</div></div>';

  // 10 jours scrollable
  html+='<div style="overflow-x:auto;-webkit-overflow-scrolling:touch;margin-bottom:14px"><div style="display:flex;gap:8px;min-width:max-content;padding-bottom:4px">';
  var nD=Math.min((days.time||[]).length,11);
  for(var i=1;i<nD;i++){
    var dt=days.time[i]?new Date(days.time[i]):new Date();
    var jr=i===1?'Auj.':i===2?'Dem.':JOURS[dt.getDay()]+' '+dt.getDate();
    var co=(days.weather_code||[])[i]||0;
    var tx=Math.round((days.temperature_2m_max||[])[i]||0);
    var tn=Math.round((days.temperature_2m_min||[])[i]||0);
    var rx=Math.round((days.apparent_temperature_max||[])[i]!=null?(days.apparent_temperature_max||[])[i]:tx);
    var pl=parseFloat((days.precipitation_sum||[])[i]||0).toFixed(1);
    var uv=(days.uv_index_max||[])[i]!=null?(days.uv_index_max||[])[i]:'-';
    var wd=wDir((days.wind_direction_10m_dominant||[])[i]);
    var gust=(days.wind_gusts_10m_max||[])[i]!=null?Math.round((days.wind_gusts_10m_max||[])[i]):'–';
    var nmD=new Date(); nmD.setDate(nmD.getDate()+(i-1)); var nmM=nmD.getMonth();
    var em=NORM_MAX[nmM]!=null?tx-NORM_MAX[nmM]:null;
    var emTxt=em!=null?'<div style="font-size:0.55rem;color:'+(em>=0?'#dc2626':'#2563eb')+';margin-top:1px">'+(em>=0?'+':'')+em+'° norm</div>':'';
    html+='<div style="background:white;border-radius:12px;padding:10px 7px;text-align:center;border:1px solid var(--border);min-width:80px">'
      +'<div style="font-size:0.6rem;font-weight:900;color:var(--muted);margin-bottom:2px">'+jr+'</div>'
      +'<div style="font-size:1.5rem">'+(METEO_ICONS[co]||'🌡️')+'</div>'
      +'<div style="font-size:0.76rem;font-weight:800;color:var(--text);margin-top:2px">'+tx+'°/'+tn+'°</div>'
      +'<div style="font-size:0.58rem;color:#6b7280">Res. '+rx+'°</div>'
      +emTxt
      +'<div style="font-size:0.58rem;color:var(--muted);margin-top:1px">'+(METEO_DESC[co]||'')+'</div>'
      +'<div style="font-size:0.58rem;color:#2563eb">🌧️ '+pl+' mm</div>'
      +'<div style="font-size:0.58rem;color:#ca8a04">🌞 UV '+uv+'</div>'
      +'<div style="font-size:0.58rem;color:#6b7280">💨 '+gust+' '+wd+'</div>'
      +'</div>';
  }
  html+='</div></div>';
  html+='<div style="font-size:0.62rem;color:var(--muted);text-align:center">Source : Open-Meteo · Vigilance : Météo-France</div>';
  el.innerHTML = html;
}

// ── Mairie ────────────────────────────────────────────────
function loadMairieStatus(){
  var nowParis=new Date(new Date().toLocaleString('en-US',{timeZone:'Europe/Paris'}));
  var day=nowParis.getDay(), mins=nowParis.getHours()*60+nowParis.getMinutes();
  function setStatus(main,sub,badge){
    document.getElementById('mairie-status').textContent=main;
    document.getElementById('mairie-desc').textContent=sub;
    document.getElementById('mairie-badge').textContent=badge;
  }
  if(day===1){
    if(mins>=14*60&&mins<17*60+30) return setStatus('Ouverte','Accueil ouvert jusqu\'à 17h30','Lundi');
    if(mins<14*60) return setStatus('Fermée','Ouvre aujourd\'hui à 14h','Lundi');
  }
  if(day===5){
    if(mins>=8*60+30&&mins<11*60+30) return setStatus('Ouverte','Accueil ouvert jusqu\'à 11h30','Vendredi');
    if(mins<8*60+30) return setStatus('Fermée','Ouvre aujourd\'hui à 8h30','Vendredi');
  }
  if(day===3) return setStatus('Sur RDV','Mercredi uniquement sur rendez-vous','Mercredi');
  if(day===0||day===6) return setStatus('Fermée','Prochaine ouverture lundi à 14h','Week-end');
  if(day===1&&mins>=17*60+30) return setStatus('Fermée','Prochaine ouverture mercredi sur RDV','Mairie');
  if(day===2) return setStatus('Fermée','Prochaine ouverture mercredi sur RDV','Mairie');
  if(day===4) return setStatus('Fermée','Prochaine ouverture vendredi à 8h30','Mairie');
  if(day===5&&mins>=11*60+30) return setStatus('Fermée','Prochaine ouverture lundi à 14h','Mairie');
  setStatus('Fermée','Horaires : lun 14h-17h30 · mer sur RDV · ven 8h30-11h30','Horaires');
}

// ── Déchets ───────────────────────────────────────────────
function getWeekNumber(d){const j=new Date(d.getFullYear(),0,1);return Math.ceil((((d-j)/86400000)+j.getDay()+1)/7);}
function loadDechets(){
  const now=new Date(), tz={timeZone:'Europe/Paris'};
  const hP=parseInt(new Intl.DateTimeFormat('fr-FR',{...tz,hour:'numeric',hour12:false}).format(now));
  const jour=parseInt(new Intl.DateTimeFormat('fr-FR',{...tz,day:'numeric'}).format(now));
  const moisP=parseInt(new Intl.DateTimeFormat('fr-FR',{...tz,month:'numeric'}).format(now));
  const annee=parseInt(new Intl.DateTimeFormat('fr-FR',{...tz,year:'numeric'}).format(now));
  const dateP=new Date(annee,moisP-1,jour), dowP=dateP.getDay(), semPaire=getWeekNumber(dateP)%2===0;
  const FERIES_FIXES=['01-01','05-01','05-08','07-14','08-15','11-01','11-11','12-25'];
  const FERIES_DATES=['2025-04-21','2025-05-29','2025-06-09','2026-04-06','2026-05-14','2026-05-25'];
  const mmdd=String(moisP).padStart(2,'0')+'-'+String(jour).padStart(2,'0');
  const iso=annee+'-'+String(moisP).padStart(2,'0')+'-'+String(jour).padStart(2,'0');
  const ferie=FERIES_FIXES.includes(mmdd)||FERIES_DATES.includes(iso);
  let bTxt='',bUrg=false;
  if(dowP===0){bTxt='🗑️ Sortir le bac noir ce soir !';bUrg=true;}
  else if(dowP===1&&hP<8){bTxt='🗑️ Bac noir : collecte ce matin';bUrg=true;}
  else if(dowP===1&&semPaire&&hP>=8){bTxt='♻️ Sortir le bac jaune ce soir !';bUrg=true;}
  else if(dowP===2&&semPaire&&hP<8){bTxt='♻️ Bac jaune : collecte ce matin';bUrg=true;}
  else{const j2lun=dowP===1?7:(8-dowP)%7||7;if(j2lun===1){bTxt='🗑️ Bac noir demain — sortir ce soir';bUrg=true;}else{bTxt='🗑️ Prochain bac noir : lundi matin';}}
  const omEl=document.getElementById('om-text');
  if(omEl){omEl.innerHTML=bTxt;omEl.style.color=bUrg?'#fcd34d':'rgba(216,243,220,0.85)';}
  const isH=moisP>=10||moisP<=3, matO=isH?10:9, apF=isH?17:18;
  const isJourOuv=dowP>=1&&dowP<=6&&!ferie;
  let dTxt='',dOuv=false;
  if(!isJourOuv){dTxt=ferie?'Déchetterie fermée (jour férié)':'Déchetterie fermée (ouvre lundi à '+matO+'h)';}
  else if(hP<matO){dTxt='Déchetterie fermée — ouvre à '+matO+'h';}
  else if(hP<12){dOuv=true;dTxt='Déchetterie ouverte — ferme à 12h';}
  else if(hP<14){dTxt='Déchetterie fermée — ouvre à 14h';}
  else if(hP<apF){dOuv=true;dTxt='Déchetterie ouverte — ferme à '+apF+'h';}
  else{dTxt='Déchetterie fermée — ouvre '+(dowP<6?'demain':'lundi')+' à '+matO+'h';}
  const dEl=document.getElementById('dechetterie-text'), dIco=document.getElementById('dech-ico');
  if(dEl){dEl.textContent=dTxt;dEl.style.color=dOuv?'#86efac':'rgba(216,243,220,0.75)';}
  if(dIco){dIco.textContent=dOuv?'🟢':'🔴';}
}

function loadDechetsDetail(){
  var el=document.getElementById('dechets-content');
  el.innerHTML='<div style="background:white;border-radius:14px;padding:14px;border:1px solid var(--border);margin-bottom:12px">'
    +'<div style="font-size:0.86rem;font-weight:900;color:var(--forest);margin-bottom:8px">🗑️ Collecte des ordures</div>'
    +'<div style="font-size:0.78rem;color:var(--muted);line-height:1.7">Bac noir (ordures ménagères) : chaque <strong>lundi matin</strong>. Sortez-le le dimanche soir.<br>'
    +'Bac jaune (recyclables) : un <strong>lundi sur deux</strong> (semaines paires). Sortez-le le lundi soir précédent.</div>'
    +'</div>'
    +'<div style="background:white;border-radius:14px;padding:14px;border:1px solid var(--border);margin-bottom:12px">'
    +'<div style="font-size:0.86rem;font-weight:900;color:var(--forest);margin-bottom:8px">🏭 Réseau des déchetteries</div>'
    +'<div style="font-size:0.78rem;color:var(--muted);line-height:1.7">Déchetterie de Cléry-Saint-André — lundi au samedi (sauf jours fériés)<br>'
    +'🕐 <strong>Hiver (oct-mars)</strong> : 10h-12h et 14h-17h<br>'
    +'🕐 <strong>Été (avr-sep)</strong> : 9h-12h et 14h-18h</div>'
    +'</div>';
}

// ── Bus Rémi ─────────────────────────────────────────────
// Vacances scolaires zone B 2025-2026
const VACANCES_SCOLAIRES = [
  ['2025-10-18','2025-11-03'],
  ['2025-12-20','2026-01-05'],
  ['2026-02-07','2026-02-23'],
  ['2026-04-04','2026-04-20'],
  ['2026-07-04','2026-08-31'],
];

function isVacancesScolaires() {
  const now = new Date(new Date().toLocaleString('en-US',{timeZone:'Europe/Paris'}));
  const iso = now.toISOString().slice(0,10);
  return VACANCES_SCOLAIRES.some(function(p){ return iso >= p[0] && iso <= p[1]; });
}

const BUS_HORAIRES = {
  mairie: {
    orleans_scolaire: ['06:44','14:20'],
    orleans_vacances: ['06:52','14:13'],
    nouan_scolaire:   ['12:57','18:08'],
    nouan_vacances:   ['18:06','18:31','19:05']
  },
  breau: {
    orleans_scolaire: ['06:46','07:35','09:26'],
    orleans_vacances: ['06:54','09:26'],
    nouan_scolaire:   ['18:06','18:31','19:05'],
    nouan_vacances:   ['18:06','18:31','19:05']
  }
};

function getNextBus(times) {
  if (!times || !times.length) return null;
  const now = new Date(new Date().toLocaleString('en-US',{timeZone:'Europe/Paris'}));
  const nowMins = now.getHours()*60 + now.getMinutes();
  for (var i=0; i<times.length; i++) {
    var parts = times[i].split(':');
    var busMins = parseInt(parts[0])*60 + parseInt(parts[1]);
    if (busMins > nowMins) {
      var diff = busMins - nowMins;
      if (diff <= 30) return { time: times[i], label: 'dans ' + diff + ' min' };
      return { time: times[i], label: times[i] };
    }
  }
  return null;
}

function loadBusRemi() {
  var el  = document.getElementById('bus-strip-stops');
  var pel = document.getElementById('bus-periode');
  if (!el) return;

  var vac = isVacancesScolaires();
  var H   = BUS_HORAIRES;
  if (pel) pel.textContent = '';

  var mOrl = getNextBus(vac ? H.mairie.orleans_vacances : H.mairie.orleans_scolaire);
  var bOrl = getNextBus(vac ? H.breau.orleans_vacances  : H.breau.orleans_scolaire);

  var html = '';
  if (mOrl) html += '<span class="bus-stop-row"><span class="bus-stop-name">Mairie</span> → Orléans <span class="bus-next">' + mOrl.label + '</span></span>';
  if (bOrl) html += '<span class="bus-stop-row"><span class="bus-stop-name">Le Bréau</span> → Orléans <span class="bus-next">' + bOrl.label + '</span></span>';
  if (!html) html = '<span class="bus-loading">Plus de bus vers Orléans aujourd\'hui</span>';

  el.innerHTML = html;
}

// ── Prochain événement (header) ──────────────────────────
const MONTHS = ['jan','fév','mar','avr','mai','jun','jul','aoû','sep','oct','nov','déc'];

async function loadEvents(){
  try{
    var evts=await ensureAgendaEvents();
    var first=evts.length?evts[0]:null;
    if(!first){
      document.getElementById('next-event-date').textContent='Aucune date';
      document.getElementById('next-event-name').textContent='Aucune manifestation à venir';
      document.getElementById('next-event-days').textContent='Ouvrir l\'agenda';
      return;
    }
    var diff=Math.ceil((first.start-new Date())/(1000*60*60*24));
    var diffTxt=diff<=0?'Aujourd\'hui':diff===1?'Demain':'Dans '+diff+' j.';
    document.getElementById('next-event-date').textContent=first.start.getDate()+' '+MONTHS[first.start.getMonth()];
    document.getElementById('next-event-name').textContent=first.summary;
    document.getElementById('next-event-days').textContent=diffTxt;
  }catch(e){
    var offline = !navigator.onLine;
    document.getElementById('next-event-date').textContent = offline?'📡 Hors ligne':'Indisponible';
    document.getElementById('next-event-name').textContent = offline?'Agenda non dispo':'Agenda';
    document.getElementById('next-event-days').textContent = offline?'Reconnectez-vous':'Réessayez plus tard';
  }
}
