(()=>{
const TONES={HORIZON:[587.33,880,1174.66],PULSE:[783.99,783.99,1046.5],ZEN:[440,554.37,659.25]};
const toneKeys=Object.keys(TONES);
const S={u24:JSON.parse(localStorage.getItem('qc_24h')??'true'),sec:JSON.parse(localStorage.getItem('qc_sec')??'true'),toneIdx:Number(localStorage.getItem('qc_tone')??0),timers:[],alarms:JSON.parse(localStorage.getItem('qc_alarms')??'[]'),ring:false,iv:null,lastM:''};

// Build 60 analog dial ticks
const tickGroup=document.getElementById('clock-ticks');
for(let i=0;i<60;i++){
  const isHour=i%5===0,ang=(i*6)*Math.PI/180,r1=isHour?100:106,r2=112;
  const line=document.createElementNS('http://www.w3.org/2000/svg','line');
  line.setAttribute('x1',130+r1*Math.sin(ang));line.setAttribute('y1',130-r1*Math.cos(ang));
  line.setAttribute('x2',130+r2*Math.sin(ang));line.setAttribute('y2',130-r2*Math.cos(ang));
  line.setAttribute('stroke',isHour?'#cbd5e1':'#334155');
  line.setAttribute('stroke-width',isHour?'2.6':'1.2');
  line.setAttribute('stroke-linecap','round');
  tickGroup.appendChild(line);
}

let ctx=null;
function chime(){
  try{
    if(!ctx)ctx=new(window.AudioContext||window.webkitAudioContext)();
    if(ctx.state==='suspended')ctx.resume();
    const t=ctx.currentTime,notes=TONES[toneKeys[S.toneIdx]];
    notes.forEach((f,i)=>{
      const o=ctx.createOscillator(),g=ctx.createGain();
      o.type=S.toneIdx===2?'triangle':'sine';
      o.frequency.setValueAtTime(f,t+i*.13);
      g.gain.setValueAtTime(.001,t+i*.13);
      g.gain.exponentialRampToValueAtTime(.28,t+i*.13+.03);
      g.gain.exponentialRampToValueAtTime(.0001,t+i*.13+.5);
      o.connect(g);g.connect(ctx.destination);o.start(t+i*.13);o.stop(t+i*.13+.52);
    });
  }catch{}
}

function alertOn(msg){
  document.getElementById('alarm-banner-text').textContent=msg;
  document.getElementById('alarm-banner').classList.remove('hidden');
  if(!S.ring){S.ring=true;chime();S.iv=setInterval(chime,1450);}
}
document.getElementById('dismiss-alert-btn').onclick=()=>{
  S.ring=false;clearInterval(S.iv);
  document.getElementById('alarm-banner').classList.add('hidden');
  S.timers.forEach(t=>t.ringing=false);renderT();
};

// Navigation Tabs
document.querySelectorAll('.tab-btn').forEach(btn=>{
  btn.onclick=()=>{
    document.querySelectorAll('.tab-btn').forEach(b=>b.classList.remove('active'));
    btn.classList.add('active');
    const view=btn.dataset.view,grid=document.getElementById('main-grid');
    grid.classList.toggle('single-view',view!=='all');
    document.querySelectorAll('[data-section]').forEach(sec=>{
      sec.classList.toggle('hidden',view!=='all'&&sec.dataset.section!==view);
    });
  };
});

const b24=document.getElementById('toggle-24h'),bSec=document.getElementById('toggle-seconds'),bTone=document.getElementById('tone-btn');
function syncTop(){
  b24.classList.toggle('active',S.u24);b24.textContent=S.u24?'24H':'12H';
  bSec.classList.toggle('active',S.sec);
  bTone.textContent=`TONE: ${toneKeys[S.toneIdx]}`;
}
b24.onclick=()=>{S.u24=!S.u24;localStorage.setItem('qc_24h',JSON.stringify(S.u24));syncTop();clk();};
bSec.onclick=()=>{S.sec=!S.sec;localStorage.setItem('qc_sec',JSON.stringify(S.sec));syncTop();clk();};
bTone.onclick=()=>{S.toneIdx=(S.toneIdx+1)%toneKeys.length;localStorage.setItem('qc_tone',S.toneIdx);syncTop();chime();};
document.getElementById('test-sound-btn').onclick=chime;

const fmtZ=(d,z)=>new Intl.DateTimeFormat('en-GB',{hour:'2-digit',minute:'2-digit',hour12:!S.u24,timeZone:z}).format(d);
function clk(){
  const n=new Date(),rawH=n.getHours(),mNum=n.getMinutes(),sNum=n.getSeconds(),ms=n.getMilliseconds();
  // Smooth analog hands
  const secDeg=(sNum+ms/1000)*6,minDeg=(mNum+sNum/60)*6,hrDeg=((rawH%12)+mNum/60)*30;
  document.getElementById('hand-sec').setAttribute('transform',`rotate(${secDeg} 130 130)`);
  document.getElementById('hand-min').setAttribute('transform',`rotate(${minDeg} 130 130)`);
  document.getElementById('hand-hour').setAttribute('transform',`rotate(${hrDeg} 130 130)`);

  let h=rawH;const m=String(mNum).padStart(2,'0'),s=String(sNum).padStart(2,'0'),ap=document.getElementById('live-ampm');
  if(S.u24){ap.classList.add('hidden');h=String(h).padStart(2,'0');}
  else{ap.classList.remove('hidden');ap.textContent=h>=12?'PM':'AM';h=String(h%12||12).padStart(2,'0');}
  document.getElementById('live-time').textContent=S.sec?`${h}:${m}:${s}`:`${h}:${m}`;
  document.getElementById('live-date').textContent=new Intl.DateTimeFormat('en-GB',{weekday:'long',day:'numeric',month:'short',year:'numeric'}).format(n);
  document.getElementById('tz-ny').textContent=fmtZ(n,'America/New_York');
  document.getElementById('tz-tokyo').textContent=fmtZ(n,'Asia/Tokyo');
  document.getElementById('tz-utc').textContent=fmtZ(n,'UTC');

  const hm=`${String(rawH).padStart(2,'0')}:${m}`,st=`${n.toDateString()}-${hm}`;
  if(sNum===0&&S.lastM!==st){
    S.alarms.forEach(a=>{if(a.en&&a.time===hm){S.lastM=st;alertOn(`ALARM (${a.time}) — ${a.label||'Time up!'}`);}});
  }
}

const fmtD=sec=>{const s=Math.max(0,Math.ceil(sec)),h=Math.floor(s/3600),m=Math.floor((s%3600)/60),r=s%60;return h>0?`${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(r).padStart(2,'0')}`:`${String(m).padStart(2,'0')}:${String(r).padStart(2,'0')}`;};
function addT(sec,lbl){
  if(!sec||sec<=0)return;
  if(!ctx)ctx=new(window.AudioContext||window.webkitAudioContext)();
  S.timers.push({id:Date.now()+Math.random(),label:lbl||`${Math.round(sec/60)}m Timer`,total:sec,rem:sec,run:true,end:Date.now()+sec*1000,ringing:false});
  renderT();
}
document.querySelectorAll('.preset').forEach(b=>b.onclick=()=>addT(Number(b.dataset.sec),b.textContent));
document.getElementById('custom-timer-form').onsubmit=e=>{
  e.preventDefault();
  const l=document.getElementById('timer-label-input').value.trim(),m=Number(document.getElementById('timer-min-input').value)||0,s=Number(document.getElementById('timer-sec-input').value)||0;
  if(m*60+s>0){addT(m*60+s,l||`${m}m ${s}s`);document.getElementById('timer-label-input').value='';}
};
function renderT(){
  const c=document.getElementById('timers-list');
  if(!S.timers.length){c.innerHTML='<div class="muted">Tap a preset above or create a custom countdown.</div>';return;}
  c.innerHTML='';
  const circ=2*Math.PI*19;
  S.timers.forEach(t=>{
    const pct=Math.max(0,Math.min(1,t.rem/t.total)),offset=circ*(1-pct);
    const r=document.createElement('div');r.className=`item${t.ringing?' ringing':''}`;
    r.innerHTML=`<div class="item-left"><svg class="ring-svg" viewBox="0 0 46 46"><circle cx="23" cy="23" r="19" fill="none" stroke="#1e293b" stroke-width="4"/><circle cx="23" cy="23" r="19" fill="none" stroke="#38bdf8" stroke-width="4" stroke-dasharray="${circ}" stroke-dashoffset="${offset}" stroke-linecap="round"/></svg><div><div class="item-title">${t.label}</div><div class="item-val">${fmtD(t.rem)}</div></div></div>`;
    const ac=document.createElement('div');ac.className='btn-group';
    const bPlus=document.createElement('button');bPlus.className='icon-btn';bPlus.textContent='+1m';
    bPlus.onclick=()=>{t.total+=60;t.rem+=60;if(t.run)t.end+=60000;renderT();};
    const bToggle=document.createElement('button');bToggle.className='icon-btn';bToggle.textContent=t.run?'Pause':'Start';
    bToggle.onclick=()=>{if(t.run){t.rem=Math.max(0,(t.end-Date.now())/1000);t.run=false;}else{if(t.rem<=0)t.rem=t.total;t.end=Date.now()+t.rem*1000;t.run=true;t.ringing=false;}renderT();};
    const bDel=document.createElement('button');bDel.className='icon-btn';bDel.textContent='✕';
    bDel.onclick=()=>{S.timers=S.timers.filter(x=>x.id!==t.id);renderT();};
    ac.append(bPlus,bToggle,bDel);r.append(ac);c.append(r);
  });
}

document.getElementById('alarm-form').onsubmit=e=>{
  e.preventDefault();
  const tv=document.getElementById('alarm-time-input').value,lv=document.getElementById('alarm-label-input').value.trim();
  if(!tv)return;
  if(!ctx)ctx=new(window.AudioContext||window.webkitAudioContext)();
  S.alarms.push({id:Date.now()+Math.random(),time:tv,label:lv||'VR Alarm',en:true});
  localStorage.setItem('qc_alarms',JSON.stringify(S.alarms));document.getElementById('alarm-label-input').value='';renderA();
};
function renderA(){
  const c=document.getElementById('alarms-list');
  if(!S.alarms.length){c.innerHTML='<div class="muted">No alarms scheduled.</div>';return;}
  c.innerHTML='';
  S.alarms.forEach(a=>{
    const r=document.createElement('div');r.className='item';
    r.innerHTML=`<div><div class="item-title">${a.label}</div><div class="item-val">${a.time}</div></div>`;
    const ac=document.createElement('div');ac.className='btn-group';
    const b1=document.createElement('button');b1.className=`icon-btn${a.en?' on-pill':''}`;b1.textContent=a.en?'ON':'OFF';
    b1.onclick=()=>{a.en=!a.en;localStorage.setItem('qc_alarms',JSON.stringify(S.alarms));renderA();};
    const b2=document.createElement('button');b2.className='icon-btn';b2.textContent='✕';
    b2.onclick=()=>{S.alarms=S.alarms.filter(x=>x.id!==a.id);localStorage.setItem('qc_alarms',JSON.stringify(S.alarms));renderA();};
    ac.append(b1,b2);r.append(ac);c.append(r);
  });
}

let swR=false,swS=0,swE=0,laps=[];
const swD=document.getElementById('sw-display'),swB=document.getElementById('sw-start-btn'),swL=document.getElementById('sw-lap-btn'),swX=document.getElementById('sw-reset-btn'),swLC=document.getElementById('sw-laps');
const fmtSW=ms=>{const cs=Math.floor(ms/10),c=String(cs%100).padStart(2,'0'),ts=Math.floor(cs/100),s=String(ts%60).padStart(2,'0'),m=String(Math.floor(ts/60)).padStart(2,'0');return`${m}:${s}.${c}`;};
swB.onclick=()=>{if(!swR){swR=true;swS=Date.now()-swE;swB.textContent='Pause';swL.disabled=false;}else{swR=false;swE=Date.now()-swS;swB.textContent='Start';swL.disabled=true;}};
swL.onclick=()=>{if(!swR)return;laps.unshift(`Lap ${laps.length+1} · ${fmtSW(Date.now()-swS)}`);swLC.innerHTML=laps.slice(0,5).map(l=>`<span class="lap-tag">${l}</span>`).join('');};
swX.onclick=()=>{swR=false;swE=0;laps=[];swB.textContent='Start';swL.disabled=true;swD.textContent='00:00.00';swLC.innerHTML='';};

syncTop();clk();renderT();renderA();
setInterval(clk,60);
setInterval(()=>{let u=false,n=Date.now();S.timers.forEach(t=>{if(t.run){const l=(t.end-n)/1000;if(l<=0){t.rem=0;t.run=false;t.ringing=true;alertOn(`TIMER COMPLETE · ${t.label}`);}else t.rem=l;u=true;}});if(u)renderT();},200);
setInterval(()=>{if(swR)swD.textContent=fmtSW(Date.now()-swS);},35);
})();
