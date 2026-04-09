/* ════════════════════════════════════════════════════════════
   MAT — Trombinoscope Conseil Municipal v3.7.0
   ════════════════════════════════════════════════════════════ */

const ELUS = [
  {nom:"Romuald GENTY",age:43,prof:"Officier Sapeur-Pompier Professionnel",mandats:"3 Mandats",hameau:"Le Bourg",role:"Maire",pole:"Pôle Finances",img:"Romuald GENTY 43 ans - 2 Mandats - Officier Sapeur-Pompier Professionnel - Le Bourg.jpg"},
  {nom:"Sandra BARET",age:50,prof:"Directrice d'établissements sociaux et médico-sociaux",mandats:"2 Mandats",hameau:"Manthelon",role:"1ère adjointe",pole:"Pôle Social et Environnement",img:"Sandra BARET 50 ans - 2 Mandats - Directrice d établissements sociaux et médico sociaux - Manthelon.jpg"},
  {nom:"Damien BOUGRÉ",age:49,prof:"Chef de service Jeunesse, Réussite et Parentalité",mandats:"2 Mandats",hameau:"Mézières",role:"2ème adjoint",pole:"Pôle Vie Scolaire",img:"Damien BOUGR\u00c9 49 ans - 2 Mandats - Chef de service Jeunesse, R\u00e9ussite et Parentalit\u00e9 - M\u00e9zi\u00e8res.jpg"},
  {nom:"Stéphanie GREUIN",age:43,prof:"Hypnothérapeute",mandats:"2 Mandats",hameau:"",role:"3ème adjointe",pole:"Pôle Relation Entreprise",img:"St\u00e9phanie GREUIN-Hypnoth\u00e9ratpeute-43-2 Mandats.jpg"},
  {nom:"Stéphane MAROIS",age:55,prof:"Officier Sapeur-Pompier Professionnel",mandats:"3 Mandats",hameau:"La Grange",role:"4ème adjoint",pole:"Pôle Voirie et Sécurité",img:"St\u00e9phane MAROIS 55 ans - 3 Mandats - Officier Sapeur-Pompier Professionnel - La grange.jpg"},
  {nom:"Fabrice AUFFRET",age:47,prof:"Responsable Informatique",mandats:"3 Mandats",hameau:"Le Bourg",role:"Conseiller municipal",pole:"",img:"Fabrice AUFFRET 47 ans - 3 Mandats - Responsable Informatique - Le Bourg.jpg"},
  {nom:"Katia COURTOIS",age:53,prof:"Greffier",mandats:"3 Mandats",hameau:"Manthelon",role:"Conseillère municipale",pole:"",img:"Katia COURTOIS 53 ans - 3 Mandats - Greffier - Manthelon.jpg"},
  {nom:"Christophe DESCHAMPS",age:59,prof:"Agent de maîtrise",mandats:"5 Mandats",hameau:"Rolland",role:"Conseiller municipal",pole:"",img:"Christophe DESCHAMPS 59 ans - 5 Mandats - Agent de ma\u00eetrise - Rolland.jpg"},
  {nom:"Amandine BUREAU",age:42,prof:"Vigneronne",mandats:"1 Mandat",hameau:"Le Buisson",role:"Conseillère municipale",pole:"",img:"Amandine BUREAU 42 ans - Vigneronne - 1 Mandat - Le Buisson.jpg"},
  {nom:"Bruno MAILLARY",age:65,prof:"Retraité",mandats:"2 Mandats",hameau:"Rolland",role:"Conseiller municipal",pole:"",img:"Bruno MAILLARY 65 ans - 2 Mandat - Retrait\u00e9 - Rolland.jpg"},
  {nom:"Caroline BAILLIOT-LEROY",age:46,prof:"Assistante de direction, Secteur Assurance",mandats:"1 Mandat",hameau:"",role:"Conseillère municipale",pole:"",img:"Caroline BAILLOT-LEROY - 46 ans - 1 Mandat - Assistante de direction Secteur Assurance Nuisance.jpg"},
  {nom:"Elodie FRANCOIS",age:39,prof:"Ingénieur Paysage et Environnement",mandats:"1 Mandat",hameau:"Le Bréau",role:"Conseillère municipale",pole:"",img:"Elodie FRANCOIS 39 ans - Ing\u00e9nieur Paysage et Environnement - 1 Mandat - Le Br\u00e9au.jpg"},
  {nom:"Léane FARINA-JAVOY",age:24,prof:"Exploitante Agricole",mandats:"1 Mandat",hameau:"Le Bréau",role:"Conseillère municipale",pole:"",img:"L\u00e9ane FARINA JAVOY 24 ans - Exploitante Agricole - 1 Mandat - Le Br\u00e9au.jpg"},
  {nom:"Romain LOTHE",age:37,prof:"Chef d'équipe Gros Œuvre",mandats:"1 Mandat",hameau:"Manthelon",role:"Conseiller municipal",pole:"",img:"Romain LOTHE 37 ans - Chef d \u00e9quipe Gros oeuvre - 1 Mandat - Manthelon.jpg"},
  {nom:"Sarah MARECHAL",age:49,prof:"Officiante de cérémonie laïque",mandats:"2 Mandats",hameau:"Rolland",role:"Conseillère municipale",pole:"",img:"Sarah MARECHAL 49 ans - 2 Mandats - Officiante de c\u00e9r\u00e9monie la\u00efque - Rolland.jpg"},
];

function buildTrombi(){
  const grid = document.getElementById('trombi-grid');
  if(!grid) return;
  grid.innerHTML = ELUS.map((e,i) => {
    const isMaire = e.role === 'Maire';
    const isAdjoint = e.role.includes('adjoint');
    const badgeClass = isMaire ? 'trombi-badge is-maire' : isAdjoint ? 'trombi-badge is-adjoint' : 'trombi-badge';
    const badgeLabel = isMaire ? '⭐ Maire' : isAdjoint ? e.role : 'Conseiller·e';
    const prenomNom = e.nom.split(' ');
    const prenom = prenomNom[0];
    const nomCourt = prenomNom.slice(1).join(' ');
    return `<div class="trombi-item" onclick="openTrombi(${i})" role="button" tabindex="0">
      <div class="trombi-photo-wrap">
        <img class="trombi-photo" src="${encodeURIComponent(e.img).replace(/%20/g,' ')}" alt="${e.nom}" onerror="this.onerror=null;this.src='mat-header.png'">
        <div class="${badgeClass}">${badgeLabel}</div>
      </div>
      <div class="trombi-name" title="${e.nom}">${prenom}<br><span style="font-weight:700;color:var(--muted)">${nomCourt}</span></div>
    </div>`;
  }).join('');
}

function openTrombi(idx){
  const e = ELUS[idx];
  try{
    const eluKey='elu_'+(e.nom||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,'_').substring(0,25);
    fetch('https://chatbot-mairie-mezieres.onrender.com/stats/track',{method:'POST',headers:{'Content-Type':'application/json','x-device-id':getMatDeviceId()},body:JSON.stringify({service:eluKey})});
  }catch(_){}
  const modal = document.getElementById('trombi-modal');
  const card = document.getElementById('trombi-card');
  document.getElementById('trombi-big-img').src = e.img;
  document.getElementById('trombi-nom').textContent = e.nom;
  document.getElementById('trombi-role-badge').textContent = e.role;
  document.getElementById('trombi-pole').textContent = e.pole ? '🏷️ ' + e.pole : '';
  document.getElementById('trombi-age').textContent = e.age + ' ans';
  document.getElementById('trombi-prof').textContent = e.prof;
  document.getElementById('trombi-mandats').textContent = e.mandats;
  const hWrap = document.getElementById('trombi-hameau-wrap');
  if(e.hameau){ document.getElementById('trombi-hameau').textContent = e.hameau; hWrap.style.display='flex'; }
  else { hWrap.style.display='none'; }
  modal.style.display='flex';
  // Animation wahou : spring scale + shimmer
  card.style.transform='scale(0.7) rotate(-2deg)';
  card.style.opacity='0';
  requestAnimationFrame(()=>{
    requestAnimationFrame(()=>{
      card.style.transform='scale(1) rotate(0deg)';
      card.style.opacity='1';
    });
  });
  const img = document.getElementById('trombi-big-img');
  img.style.filter='brightness(1.2) saturate(1.4)';
  setTimeout(()=>{ img.style.transition='filter 0.8s ease'; img.style.filter='brightness(1) saturate(1)'; },250);
}

function closeTrombi(e){
  if(e.target === document.getElementById('trombi-modal')) closeTrombiBtn();
}
function closeTrombiBtn(){
  const card = document.getElementById('trombi-card');
  card.style.transform='scale(0.8)';
  card.style.opacity='0';
  setTimeout(()=>{ document.getElementById('trombi-modal').style.display='none'; },250);
}
