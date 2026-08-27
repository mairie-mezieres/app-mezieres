const { chromium } = require('playwright');
const AxeBuilder = require('@axe-core/playwright').default;
const EXE='/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
const E=[['openSignal','#ov-signal'],['openContact','#ov-contact'],['openBug','#ov-bug'],['openIdees','#ov-idees'],['openAccessibilite','#ov-accessibilite'],['openMel','#ov-mel']];
(async()=>{const n=await chromium.launch({executablePath:EXE});
for(const [fn,sel] of E){const c=await n.newContext({viewport:{width:1280,height:900}});const p=await c.newPage();
 await p.addInitScript(()=>localStorage.setItem('mat_onboarded_v3','1'));
 await p.goto('http://127.0.0.1:4173/',{waitUntil:'domcontentloaded'});
 await p.waitForFunction(f=>typeof window[f]==='function',fn);
 for(let i=0;i<8;i++){await p.evaluate(f=>window[f](),fn);await p.waitForTimeout(600);
  if(await p.evaluate(s=>getComputedStyle(document.querySelector(s)).visibility==='visible',sel))break;}
 await p.waitForTimeout(1000);
 const d=await p.evaluate(s=>{const r=document.querySelector(s);
  const lb=r.getAttribute('aria-labelledby');const t=lb?document.getElementById(lb):null;
  const ch=Array.from(r.querySelectorAll('input,textarea,select')).filter(e=>e.type!=='hidden'&&e.getBoundingClientRect().width>0);
  return{nom:t?t.textContent.trim().slice(0,40):null,champs:ch.length,
   sansLbl:ch.filter(c=>!(c.labels&&c.labels.length)&&!(c.getAttribute('aria-label')||'').trim()&&!c.getAttribute('aria-labelledby')).length};},sel);
 const r=await new AxeBuilder({page:p}).include(sel).withTags(['wcag2a','wcag2aa','wcag21a','wcag21aa']).analyze();
 console.log(`${sel.padEnd(18)} nom=${String(d.nom).padEnd(26)} champs=${d.champs} sansÉtiquette=${d.sansLbl}  violations=${r.violations.length}${r.violations.length?' → '+r.violations.map(v=>v.id+'('+v.nodes.length+')').join(','):''}`);
 await c.close();}
await n.close();})();
