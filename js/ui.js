/* ---------- interface, input, sound, menu, debrief ---------- */
const esc=t=>String(t).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const fmt=n=>(Math.round(n*10)/10).toString();
const SEL={site:'moon',mode:'medium',hints:false,daily:false};
const LIVE={state:'checking',events:[]};
let CODE='',lastTs=0,hudT=0,alarmT=0,mcT=40;

/* icons */
function ico(n,color){
  const st='stroke="currentColor" fill="none" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"';
  const P={power:`<path ${st} d="M13 2 4.5 13.5H11L10 22l9-12h-6.5z"/>`,air:`<path ${st} d="M3 9h10.5a2.7 2.7 0 1 0-2.7-2.7M3 14h14.5a2.7 2.7 0 1 1-2.7 2.7M3 19h6"/>`,
   food:`<path ${st} d="M5 19C5 10 10.5 4.5 20 4.5 20 13.5 14.5 19 5 19ZM5 19l8-8"/>`,suit:`<circle ${st} cx="12" cy="9" r="5"/><path ${st} d="M5 21c0-4 3-6 7-6s7 2 7 6"/>`,
   science:`<path ${st} d="M9 3h6M10 3v6L4.5 19a1.5 1.5 0 0 0 1.3 2h12.4a1.5 1.5 0 0 0 1.3-2L14 9V3M7.5 15h9"/>`,fit:`<path ${st} d="M12 21s-7-4.4-7-10a4 4 0 0 1 7-2.5A4 4 0 0 1 19 11c0 5.600-7 10-7 10Z"/>`,
   rad:`<svg></svg>`};
  if(n==='rad'){const c=document.createElement('canvas');return `<svg viewBox="0 0 24 24" aria-hidden="true" style="color:${color||'currentColor'}"><path fill="currentColor" d="${radPath()}"/><circle cx="12" cy="12" r="1.8" fill="currentColor"/></svg>`;}
  return `<svg viewBox="0 0 24 24" aria-hidden="true" style="color:${color||'currentColor'}">${P[n]}</svg>`;
}
function radPath(){const cx=12,cy=12,R=9.5,r=2.8;let d='';for(let k=0;k<3;k++){const a0=(k*120-120)*Math.PI/180,a1=(k*120-60)*Math.PI/180,P=(a,q)=>[(cx+q*Math.cos(a)).toFixed(2),(cy+q*Math.sin(a)).toFixed(2)];const A=P(a0,R),B=P(a1,R),C=P(a1,r),D=P(a0,r);d+=`M${A[0]} ${A[1]}A${R} ${R} 0 0 1 ${B[0]} ${B[1]}L${C[0]} ${C[1]}A${r} ${r} 0 0 0 ${D[0]} ${D[1]}Z`;}return d;}

/* sound */
const Snd={c:null,on:true,
  init(){if(this.c){if(this.c.state==='suspended')this.c.resume();return;}try{this.c=new(window.AudioContext||window.webkitAudioContext)();}catch(e){}},
  tone(f,d,type,v,slide,delay){if(!this.c||!this.on)return;const t=this.c.currentTime+(delay||0),o=this.c.createOscillator(),g=this.c.createGain();o.type=type||'sine';o.frequency.setValueAtTime(f,t);if(slide)o.frequency.exponentialRampToValueAtTime(Math.max(30,f+slide),t+d);g.gain.setValueAtTime(v||.07,t);g.gain.exponentialRampToValueAtTime(.0001,t+d);o.connect(g);g.connect(this.c.destination);o.start(t);o.stop(t+d+.03);},
  noise(d,v,f){if(!this.c||!this.on)return;const n=Math.floor(this.c.sampleRate*d),b=this.c.createBuffer(1,n,this.c.sampleRate),a=b.getChannelData(0);for(let i=0;i<n;i++)a[i]=(Math.random()*2-1)*(1-i/n);const s=this.c.createBufferSource();s.buffer=b;const fl=this.c.createBiquadFilter();fl.type='lowpass';fl.frequency.value=f||900;const g=this.c.createGain();g.gain.value=v||.1;s.connect(fl);fl.connect(g);g.connect(this.c.destination);s.start();},
  blip(){this.tone(660,.09,'square',.05);this.tone(990,.12,'square',.05,0,.08);},
  good(){[523,659,784,1047].forEach((f,i)=>this.tone(f,.16,'triangle',.07,0,i*.08));},
  bad(){this.tone(220,.3,'sawtooth',.07,-90);},
  step(){this.noise(.05,.05,500);},
  door(){this.noise(.35,.12,300);this.tone(140,.3,'sine',.07,-40);},
  clean(){this.noise(.3,.06,2500);},
  switch(on){this.tone(on?520:360,.08,'square',.05);},
  siren(){this.tone(880,.28,'sawtooth',.06,-120);this.tone(660,.28,'sawtooth',.06,120,.3);},
  rumble(){this.noise(1.2,.18,180);this.tone(70,1,'sine',.1,-20);}
};

/* toasts */
function toast(text,kind,src){
  const box=$('toasts'),d=document.createElement('div');d.className='toast '+(kind||'');
  d.innerHTML=(kind==='mc'?'<span class="who">MISSION CONTROL</span>':'')+'<span>'+text+'</span>'+(src?'<em>'+esc(src)+'</em>':'');
  box.appendChild(d);while(box.children.length>4)box.removeChild(box.firstChild);
  setTimeout(()=>{d.classList.add('out');setTimeout(()=>d.remove(),400);},kind==='mc'?7500:4200);
}
function tip(text){toast(esc(text),'tip');}

/* messages for real storms */
function stormMsg(s){
  const e=s.ev,where=e.date?e.title+' ('+e.date+')':'A '+e.title.toLowerCase();
  return 'NASA’s DONKI log shows '+esc(where)+': a '+esc(e.cls)+' event from '+esc(e.region)+'. A '+SIM.SEV_NAME[s.sev]+' storm is on the way.';
}
function handleEvents(){
  for(const e of G.ev){
    switch(e.k){
      case'rock':sparkle(e.st.x,e.st.y,'140,230,255');floatText(G.p.x,G.p.y-84,'+1 sample','#8be3ff');Snd.blip();break;
      case'cleaned':sparkle(e.st.x,e.st.y,'255,240,160');floatText(e.st.x,e.st.y-50,'More power!','#ffd166');Snd.clean();break;
      case'fixed':sparkle(G.p.x,G.p.y-30);floatText(G.p.x,G.p.y-84,'Fixed!','#58e08c');Snd.good();break;
      case'door':Snd.door();FX.flash=.35;FX.foot.length=0;FX.parts.length=0;followCam(0,true);break;
      case'science':sparkle(G.p.x,G.p.y-30,'200,150,255');floatText(G.p.x,G.p.y-84,'+1 science','#c9b8ff');Snd.good();
        if(G.res.sci===1)toast('Every rock tells a story about how a world formed. Keep studying them.','mc','Mission goal');break;
      case'harvest':floatText(G.p.x,G.p.y-84,'+'+e.amt+' food','#6fd08a');sparkle(G.p.x,G.p.y-30,'120,230,150');Snd.good();break;
      case'plant':Snd.blip();break;
      case'exercise':floatText(G.p.x,G.p.y-84,'Stronger!','#f2607a');Snd.good();if(G.counts.exer===1)toast('Mice flown to the space station lost muscle and bone. A treatment targeting myostatin and activin A protected them. That is why astronauts exercise.','mc','NASA OSDR, study OSD-342');break;
      case'ripe':Snd.tone(784,.2,'triangle',.06);tip('A crop is ready to harvest!');break;
      case'switch':Snd.switch(e.on);tip('The '+e.what+' is now '+(e.on?'ON':'OFF')+'.');break;
      case'tip':tip(e.text);Snd.tone(300,.1,'square',.04);break;
      case'day':toast('<b>Day '+e.day+' of '+G.M.days+'</b>','day');Snd.tone(440,.2,'triangle',.06);Snd.tone(660,.3,'triangle',.06,0,.15);break;
      case'outlook':toast('Sun activity today looks '+(e.high?'<b>HIGH</b>. Stay close to the habitat.':'<b>LOW</b>. Good day for long trips.'),'mc',G.S.key==='mars'?'Sent from Earth about 12 minutes ago':'Sent from Earth');break;
      case'blackout':toast('<b>Blackout!</b> The battery is empty. Machines have stopped.','bad');Snd.bad();break;
      case'power-back':toast('Power is back.','tip');Snd.good();break;
      case'lowbat':toast('Battery is low. Turn off something you do not need.','warn');Snd.tone(300,.2,'square',.06);break;
      case'filter':toast('The air scrubber filter is wearing out. Replace it before the air drops.','warn');break;
      case'fault':if(e.what==='panel')toast('<b>Breaker tripped</b> on solar panel '+(e.i+1)+'. Walk outside and reset it.','bad');else toast('<b>The air filter clogged.</b> Replace it at the scrubber.','bad');Snd.bad();break;
      case'duststorm':toast('<b>Dust storm!</b> Sunlight drops for a while. Real Mars dust storms once ended the Opportunity rover’s mission.','warn','NASA Mars Exploration');break;
      case'warn':{const s=e.s;Snd.siren();toast(stormMsg(s),'mc',G.site==='mars'&&s.fast?'The message arrived late: a fast storm gives little notice':'Warning from Earth');break;}
      case'storm-start':FX.shake=1;FX.flash=.6;Snd.rumble();if(e.s.missed)toast('<b>Radiation alarm!</b> No warning came. '+(G.sw.dish?'Earth’s message was too late.':'Your radio was off.')+' Get to the cellar!','bad');break;
      case'storm-end':{const s=e.s;const real=s.ev.fact&&s.ev.fact[G.site];toast('Storm over. You took <b>'+fmt(s.took)+' mSv</b>. With no shelter it would have been '+fmt(s.raw*1)+' mSv.'+(real?' '+esc(real):''),s.sheltered?'good':'warn',s.ev.date?'Based on the real event on '+s.ev.date:'Based on typical flares logged by DONKI');if(s.sheltered)Snd.good();break;}
      case'over':UI.endTimer=2.2;if(e.win)Snd.good();else Snd.bad();break;
    }
  }
  G.ev.length=0;
}

/* HUD */
const METERS=[
 {k:'battery',label:'Battery',icon:'power',col:'--power'},{k:'air',label:'Air',icon:'air',col:'--air'},{k:'food',label:'Food',icon:'food',col:'--food'},
 {k:'dose',label:'Radiation',icon:'rad',col:'--rad'},{k:'sci',label:'Science',icon:'science',col:'--sci'},{k:'suit',label:'Suit air',icon:'suit',col:'--dish'},{k:'fit',label:'Fitness',icon:'fit',col:'--rad'}];
function buildHud(){
  $('meters').innerHTML=METERS.map(m=>`<div class="m" data-m="${m.k}"><span class="mi">${ico(m.icon,'var('+m.col+')')}</span><div class="mb"><div class="mt"><span class="ml">${m.label}</span><span class="mv"></span></div><div class="bar"><i style="background:var(${m.col})"></i></div><div class="ms"></div></div></div>`).join('');
}
function hudUpdate(){
  if(!G)return;
  const M=G.M,r=G.res;
  const set=(k,pct,val,sub,danger)=>{const el=document.querySelector('[data-m="'+k+'"]');if(!el)return;el.querySelector('i').style.width=clamp(pct,0,100)+'%';el.querySelector('.mv').textContent=val;el.querySelector('.ms').textContent=sub||'';el.classList.toggle('low',!!danger);};
  const net=G.flow.gen-G.flow.use;
  set('battery',r.battery/M.cap*100,Math.round(r.battery)+'%',(net>=0?'▲ charging ':'▼ draining ')+fmt(Math.abs(net)/M.cap*100)+'%/s',r.battery<15);
  set('air',r.air,Math.round(r.air),G.blackout||!G.sw.scrub?'Scrubber OFF':'Scrubber on',r.air<25);
  set('food',r.food,Math.round(r.food),'Crew eats every day',r.food<20);
  const zn={out:'Outside: fully exposed',in:'Inside: walls help a little',cellar:'In cellar: safest'}[G.zone];
  set('dose',r.dose/G.budget*100,fmt(r.dose)+' / '+fmt(G.budget)+' mSv',zn,r.dose>G.budget*.8);
  set('sci',r.sci/M.sci*100,r.sci+' / '+M.sci,G.p.carry?'Carrying '+G.p.carry+' rock'+(G.p.carry>1?'s':''):'',false);
  set('suit',r.suit,Math.round(r.suit)+'%',G.scene==='out'?'Draining outside':'Recharging inside',G.scene==='out'&&r.suit<30);
  set('fit',r.fit,Math.round(r.fit),r.fit<25?'Weak! Use the bike':'',r.fit<25);
  document.querySelector('[data-m="fit"]').hidden=!M.fitDrain;
  document.querySelector('[data-m="suit"]').classList.toggle('dim',G.scene==='in'&&r.suit>=99);
  const dayLeft=Math.ceil(M.dayLen*(1-G.frac));
  const S=SIM.sunAt(G,G.t);
  $('clock').innerHTML='<b>Day '+G.day+'</b> of '+M.days+' <span class="sun">'+(S>.02?'Sun up':'Night')+' · '+dayLeft+'s left</span>';
  /* tasks */
  const ob0=SIM.objectives(G);$('tasks').innerHTML='<button class="th" data-act="tasks" aria-expanded="'+$('tasks').classList.contains('open')+'">Mission tasks \u00B7 '+ob0.filter(x=>x.done).length+'/'+ob0.length+' done</button>'+ob0.map(o=>`<div class="t${o.done?' done':''}"><span class="ck">${o.done?'✓':''}</span><span class="tx">${o.text}</span><span class="tn">${Math.min(o.cur,o.need)}/${o.need}</span></div>`).join('');
  /* alert */
  const warn=G.storms.find(s=>s.warned&&!s.active&&!s.done),act=G.storms.find(s=>s.active),al=$('alert');
  if(act){
    const safe=G.zone==='cellar';al.hidden=false;al.className='alert '+(safe?'safe':'danger');
    al.innerHTML=safe?'<b>Solar storm hitting. You are safe in the cellar.</b><span>Stay put until it ends: '+Math.ceil(act.at+act.dur-G.t)+'s</span>':'<b>SOLAR STORM HITTING! Get to the Storm Cellar!</b><span>'+(G.scene==='out'?'Run to the airlock, then to the cellar in the bottom-right corner.':'The cellar is in the bottom-right corner.')+'</span>';
  }else if(warn){
    const safe=G.zone==='cellar';al.hidden=false;al.className='alert '+(safe?'safe':'warn');
    al.innerHTML='<b>Solar storm in '+Math.max(0,Math.ceil(warn.at-G.t))+' seconds</b><span>'+(safe?'You are in the cellar. Stay here.':'Run to the Storm Cellar!')+'</span>';
  }else al.hidden=true;
  /* hint and action bar */
  const h=SIM.hint(G),hb=$('hint');
  if(h&&h.text&&!G.act){hb.hidden=false;hb.innerHTML='<span class="who">MISSION CONTROL</span>'+esc(h.text);}else hb.hidden=true;
  const ab=$('actbar');
  if(G.act){ab.hidden=false;ab.querySelector('span').textContent=G.act.label+'…';ab.querySelector('i').style.width=(G.act.t/G.act.dur*100)+'%';}else ab.hidden=true;
  $('bSound').setAttribute('aria-pressed',String(Snd.on));$('bSound').textContent=Snd.on?'Sound on':'Sound off';
}

/* input */
const keys=new Set();let actKey=false;
addEventListener('keydown',e=>{
  if(UI.mode!=='play'&&UI.mode!=='cine')return;
  if(e.target&&/INPUT|TEXTAREA|SELECT/.test(e.target.tagName))return;
  Snd.init();
  if(['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Space'].includes(e.code))e.preventDefault();
  if(e.code==='KeyE'||e.code==='Space'||e.code==='Enter')actKey=true;
  if(e.code==='KeyP'||e.code==='Escape'){if(UI.mode==='play')setPause(!UI.paused);}
  if(e.code==='KeyM'){Snd.on=!Snd.on;}
  keys.add(e.code);
});
addEventListener('keyup',e=>keys.delete(e.code));
addEventListener('blur',()=>keys.clear());
document.addEventListener('visibilitychange',()=>{if(document.hidden&&UI.mode==='play')setPause(true);});
function readInput(){
  let mx=0,my=0;
  if(keys.has('KeyA')||keys.has('ArrowLeft'))mx--;if(keys.has('KeyD')||keys.has('ArrowRight'))mx++;
  if(keys.has('KeyW')||keys.has('ArrowUp'))my--;if(keys.has('KeyS')||keys.has('ArrowDown'))my++;
  const a=actKey;actKey=false;return{mx,my,act:a};
}
function canvasPoint(e){const r=cv.getBoundingClientRect();const sx=(e.clientX-r.left)*(W/r.width),sy=(e.clientY-r.top)*(H/r.height);return{x:(sx-VIEW.cx)/cam.z+cam.x,y:(sy-VIEW.cy)/cam.z+cam.y};}
cv.addEventListener('pointerdown',e=>{
  Snd.init();
  if(UI.mode==='cine'){return;}
  if(UI.mode!=='play'||UI.paused||!G||G.over)return;
  const p=canvasPoint(e);SIM.setTarget(G,p.x,p.y);
});
cv.addEventListener('pointermove',e=>{if(UI.mode!=='play'||!G||e.pointerType==='touch')return;const p=canvasPoint(e);const s=SIM.stationAt(G,p.x,p.y);UI.hover=s&&!s.got?s:null;});
cv.addEventListener('pointerleave',()=>{UI.hover=null;});

/* flow */
function setPause(v){UI.paused=v;$('pause').hidden=!v;if(v)keys.clear();}
function makeCode(site,mode,num){return(site==='moon'?'M':'R')+mode[0].toUpperCase()+'-'+num;}
function parseCode(s){const m=/^\s*([MR])([EMH])-?(\d{3,8})\s*$/i.exec(s||'');return m?{site:m[1].toUpperCase()==='M'?'moon':'mars',mode:{E:'easy',M:'medium',H:'hard'}[m[2].toUpperCase()],num:m[3]}:null;}
function startMission(site,mode,num,opts){
  opts=opts||{};
  CODE=makeCode(site,mode,num);
  G=SIM.newGame({site,mode,seed:CODE,live:LIVE.state==='live'?LIVE.events:[],hints:SEL.hints});
  CACHE.ground=CACHE.ground||{};CACHE.ground[site]=CACHE.ground[site]||makeGround(site);CACHE.floor=CACHE.floor||makeFloor();
  FX.parts.length=0;FX.floats.length=0;FX.foot.length=0;FX.streaks.length=0;FX.shake=0;FX.flash=0;
  $('menu').hidden=true;$('debrief').hidden=true;$('play').hidden=false;$('toasts').innerHTML='';
  $('pause').hidden=true;UI.paused=false;UI.endTimer=0;UI.hover=null;
  buildHud();resize();followCam(0,true);
  Snd.init();UI.tasksAuto=false;$('tasks').classList.add('open');UI.shown=false;
  if(opts.skip){UI.mode='play';$('cineWrap').hidden=true;}
  else{UI.mode='cine';UI.cine={t:0};$('cineWrap').hidden=false;$('cineText').dataset.k='';}
  $('hud').hidden=UI.mode==='cine';
  document.title='Junior Astronaut Mission Trainer';
  scrollTo(0,0);
}
function endCine(){UI.mode='play';$('cineWrap').hidden=true;$('hud').hidden=false;Snd.good();
  toast('You landed! Click or tap anywhere to walk. Keep an eye on the meters on the left.','mc',G.S.name+' mission, '+G.M.name+' mode');}
function backToMenu(){UI.mode='menu';G=null;$('play').hidden=true;$('debrief').hidden=true;$('menu').hidden=false;scrollTo(0,0);}

/* loop */
function loop(ts){
  requestAnimationFrame(loop);
  const dt=Math.min(.05,(ts-lastTs)/1000||0);lastTs=ts;
  if(UI.mode==='cine'){
    UI.cine.t+=dt;FX.t+=dt;resize2();drawCine(UI.cine.t);
    if(UI.cine.t>=CINE_LEN)endCine();
    return;
  }
  if(UI.mode!=='play'||!G)return;
  resize2();
  if(!UI.paused){
    const inp=readInput();
    const wasWalk=G.p.moving;
    SIM.step(G,dt,inp);
    handleEvents();
    updateFx(dt);
    if(G.p.moving&&Math.floor(G.p.walk*2)!==UI.lastStep){UI.lastStep=Math.floor(G.p.walk*2);if(Math.floor(G.p.walk*2)%2===0)Snd.step();}
    if(G.p.moving&&G.act)G.act=null;
    /* siren and Earth chatter */
    const alarm=G.storms.some(s=>(s.warned&&!s.done)||s.active);
    if(alarm){alarmT-=dt;if(alarmT<=0){alarmT=1.2;Snd.siren();}}else alarmT=0;
    if(G.sw.dish&&G.powered&&!alarm){mcT-=dt;if(mcT<=0){mcT=55;const t=SIM.TIPS[Math.floor(Math.random()*SIM.TIPS.length)];toast(esc(t.t),'mc',t.src);}}
    if(!UI.tasksAuto&&G.t>10){UI.tasksAuto=true;$('tasks').classList.remove('open');}
    if(G.over){UI.endTimer-=dt;if(UI.endTimer<=0&&!UI.shown){UI.shown=true;showDebrief();}}
  }
  followCam(dt,false);
  drawWorld();
  hudT-=dt;if(hudT<=0){hudT=.1;hudUpdate();}
}
let _rw=0,_rh=0;
function resize2(){const r=$('stage').getBoundingClientRect();if(Math.abs(r.width-_rw)>1||Math.abs(r.height-_rh)>1){_rw=r.width;_rh=r.height;resize();}}
addEventListener('resize',()=>{_rw=0;});
requestAnimationFrame(loop);

/* menu */
function renderMenu(){
  const S=SIM.SITES,M=SIM.MODES;
  $('siteBtns').innerHTML=['moon','mars'].map(k=>`<button class="pick site ${k}${SEL.site===k?' on':''}" data-site="${k}" aria-pressed="${SEL.site===k}"><span class="planet ${k}"></span><span class="pt"><b>${S[k].name}</b><span>${S[k].place}</span><span class="pd">${S[k].blurb}</span></span></button>`).join('');
  $('modeBtns').innerHTML=['easy','medium','hard'].map(k=>`<button class="pick mode${SEL.mode===k?' on':''}" data-mode="${k}" aria-pressed="${SEL.mode===k}"><b>${M[k].name}</b><span class="rank">${M[k].rank}</span><span class="pd">${M[k].blurb}</span><span class="lv">${'<i></i>'.repeat(k==='easy'?1:k==='medium'?2:3)}</span></button>`).join('');
  $('hintsChk').checked=SEL.hints||SEL.mode==='easy';$('hintsChk').disabled=SEL.mode==='easy';
  $('liveBadge').innerHTML=liveBadgeHTML();
  $('apiState').textContent=API_KEY?'Your key is kept for this browser tab only and is never saved in the page.':'No key entered. NASA\u2019s shared demo key is used, which can be slow or limited.';
  $('apiForget').hidden=!API_KEY;
}
function liveBadgeHTML(){
  if(LIVE.state==='live')return '<span class="dot live"></span>Live: '+LIVE.events.length+' real flares from the last 30 days came straight from NASA DONKI just now.';
  if(LIVE.state==='archive')return '<span class="dot arc"></span>Archived: real past storms saved inside this page. '+esc(LIVE.msg||'The live NASA feed is not connected.');
  return '<span class="dot"></span>Checking NASA DONKI for live flares…';
}
document.addEventListener('click',e=>{
  const b=e.target.closest('button,[data-act]');if(!b)return;
  if(b.dataset.site){SEL.site=b.dataset.site;renderMenu();Snd.init();return;}
  if(b.dataset.mode){SEL.mode=b.dataset.mode;renderMenu();return;}
  const a=b.dataset.act;
  if(a==='launch'){Snd.init();const c=parseCode($('codeIn').value);const num=c?c.num:String(1000+Math.floor(Math.random()*9000));startMission(c?c.site:SEL.site,c?c.mode:SEL.mode,num);}
  else if(a==='daily'){Snd.init();const d=new Date();startMission(SEL.site,SEL.mode,String(d.getUTCFullYear())+String(d.getUTCMonth()+1).padStart(2,'0')+String(d.getUTCDate()).padStart(2,'0'));}
  else if(a==='apikey'){const v=$('apiIn').value.trim();
    if(!/^[A-Za-z0-9]{20,60}$/.test(v)){LIVE.state='archive';LIVE.events=[];LIVE.msg='That does not look like a NASA key. Keys are about 40 letters and numbers.';renderMenu();return;}
    API_KEY=v;try{sessionStorage.setItem('nasaKey',v);}catch(e){}$('apiIn').value='';loadLive(v);}
  else if(a==='apiforget'){API_KEY='';try{sessionStorage.removeItem('nasaKey');}catch(e){}$('apiIn').value='';LIVE.state='archive';LIVE.events=[];LIVE.msg='Key removed.';renderMenu();}
  else if(a==='skip'){UI.cine.t=CINE_LEN;}
  else if(a==='resume')setPause(false);
  else if(a==='restart')startMission(G.site,G.mode,CODE.split('-')[1],{skip:true});
  else if(a==='quit')backToMenu();
  else if(a==='replay'){const c=parseCode(b.dataset.code);startMission(c.site,c.mode,c.num,{skip:true});}
  else if(a==='fresh'){startMission(b.dataset.site,b.dataset.mode,String(1000+Math.floor(Math.random()*9000)));}
  else if(a==='menu')backToMenu();
  else if(a==='pause')setPause(true);
  else if(a==='sound'){Snd.init();Snd.on=!Snd.on;}
  else if(a==='tasks')$('tasks').classList.toggle('open');
  else if(a==='copy'){const t=b.dataset.code;(navigator.clipboard&&navigator.clipboard.writeText?navigator.clipboard.writeText(t):Promise.reject()).then(()=>{b.textContent='Copied!';},()=>{b.textContent=t;});}
});

/* debrief */
function chartSVG(h){
  const Wd=620,Ht=240,L=44,R=92,T=12,B=28,pw=Wd-L-R,ph=Ht-T-B,total=G.M.days*G.M.dayLen;
  const X=t=>L+t/total*pw,Y=v=>T+(1-v)*ph;
  const series=[['Air','var(--air)',x=>x.air/100],['Food','var(--food)',x=>x.food/100],['Battery','var(--power)',x=>x.battery/G.M.cap],['Radiation','var(--rad)',x=>Math.min(1,x.dose/G.budget)]];
  let g='';
  for(const s of G.storms)g+=`<rect x="${X(s.at)}" y="${T}" width="${Math.max(3,X(s.at+s.dur)-X(s.at))}" height="${ph}" fill="var(--rad)" opacity=".16"/>`;
  for(const t of[0,.25,.5,.75,1])g+=`<line x1="${L}" x2="${Wd-R}" y1="${Y(t)}" y2="${Y(t)}" stroke="var(--line)"/><text x="${L-8}" y="${Y(t)+4}" text-anchor="end" font-size="11" fill="var(--muted)">${t*100}%</text>`;
  for(let d=0;d<=G.M.days;d+=1)g+=`<text x="${X(d*G.M.dayLen)}" y="${Ht-8}" text-anchor="middle" font-size="11" fill="var(--muted)">${d}</text>`;
  const pts=[{t:0,battery:G.M.battery0,air:85,food:70,dose:0}].concat(h);
  const ends=[];
  const lines=series.map(([n,c,f])=>{const p=pts.map(x=>X(x.t).toFixed(1)+','+Y(f(x)).toFixed(1)).join(' '),last=pts[pts.length-1];ends.push({n,c,y:Y(f(last)),x:X(last.t)});return `<polyline points="${p}" fill="none" stroke="${c}" stroke-width="2.6" stroke-linejoin="round" stroke-linecap="round"/>`;}).join('');
  ends.sort((a,b)=>a.y-b.y);for(let i=1;i<ends.length;i++)if(ends[i].y-ends[i-1].y<14)ends[i].y=ends[i-1].y+14;
  const labels=ends.map(e=>`<circle cx="${e.x}" cy="${e.y}" r="4" fill="${e.c}"/><text x="${e.x+8}" y="${e.y+4}" font-size="12" font-weight="700" fill="${e.c}">${e.n}</text>`).join('');
  return `<svg class="chart" viewBox="0 0 ${Wd} ${Ht}" role="img" aria-label="Air, food, battery and radiation over the mission. Shaded bands are solar storms.">${g}${lines}${labels}<text x="${L+pw/2}" y="${Ht}" text-anchor="middle" font-size="11" fill="var(--muted)">Day</text></svg>`;
}
function showDebrief(){
  UI.mode='debrief';$('play').hidden=true;
  const win=G.over.win,n=SIM.stars(G),M=G.M,S=G.S,ob=SIM.objectives(G);
  const raw=G.storms.reduce((a,s)=>a+s.raw,0),took=G.storms.reduce((a,s)=>a+s.took,0);
  const why={air:'The habitat ran out of air. The scrubber needs power and a fresh filter, and both can run out.',suit:'Your suit air ran out outside. The Suit bar drains fast, so plan short trips and come back to recharge.',food:'The crew ran out of food. Crops need light, power and time, so plant early.',radiation:'The crew passed the radiation safety line and Mission Control called everyone home early. Taking shelter during storms is how real crews stay under their limits.'};
  const head=win?(n===3?'Perfect mission! Everyone is home, healthy and well stocked.':n===2?'Mission complete, and the science goal is done.':'Mission complete. The crew is safe. Try for more science next time.'):'The mission ended early on Day '+G.day+'.';
  const lessons=[];
  if(!win)lessons.push(why[G.over.reason]);
  if(G.storms.length){
    const un=G.storms.filter(s=>s.missed),sh=G.storms.filter(s=>s.sheltered).length;
    lessons.push('You sheltered for '+sh+' of '+G.storms.length+' storms. Walls and the cellar cut your storm dose from about '+fmt(raw)+' mSv to '+fmt(took)+' mSv.');
    if(un.length)lessons.push(un.length+' storm'+(un.length>1?'s':'')+' came with no warning. '+(G.site==='mars'?'On Mars, messages take 3 to 22 minutes, so fast storms can beat the radio.':'Keeping the radio on costs power, but it buys you time.'));
    const fast=G.storms.find(s=>s.fast&&s.warned);if(fast)lessons.push('Some storms send particles very fast, so the warning was short. Staying close to the habitat on HIGH-activity days gives you time to react.');
  }
  if(G.blackT>3)lessons.push('The base had no power for '+Math.round(G.blackT)+' seconds. Real planners keep a battery reserve for the night and for storms.');
  if(G.counts.cleaned<2&&win)lessons.push('Dusty panels lose power. Cleaning them is one of the cheapest ways to get energy.');
  if(!lessons.length)lessons.push('Every choice cost something: time, air, power or radiation. Balancing them is exactly what mission planners do.');
  const faced=G.storms.filter(s=>s.done||s.active).map(s=>`<tr><td>Day ${Math.floor(s.at/M.dayLen)+1}</td><td>${esc(s.ev.title)}${s.ev.date?' ('+esc(s.ev.date)+')':''}<br><span class="muted">${esc(s.ev.cls)} · ${esc(s.ev.region)}</span></td><td>${s.warned?'Warned, '+Math.round(s.at-s.warnAt)+'s notice':'No warning'}</td><td>${fmt(s.took)} of ${fmt(s.raw)} mSv</td><td>${s.sheltered?'In the cellar':s.inside/s.dur>.5?'Inside':'Outside'}</td></tr>`).join('');
  const nextMode=M.key==='easy'?'medium':M.key==='medium'?'hard':null;
  const tipsHTML=SIM.TIPS.slice(0,4).map(t=>`<li>${esc(t.t)} <span class="muted">(${esc(t.src)})</span></li>`).join('');
  $('debrief').innerHTML=`<div class="wrap">
   <div class="top"><div class="brand">${patch()}<span>JUNIOR ASTRONAUT MISSION TRAINER</span></div></div>
   <div class="card stack" style="gap:12px"><span class="label">Mission debrief · ${S.name} · ${M.name} (${M.rank})</span>
    <h1 style="font-size:clamp(26px,5vw,40px)">${esc(head)}</h1>
    <div class="stars" role="img" aria-label="${n} of 3 stars">${[1,2,3].map(i=>starSVG(i<=n)).join('')}</div>
    <p class="muted">1 star: survive every day. 2 stars: also reach the science goal. 3 stars: finish every task and stay under 90% of the radiation limit.</p>
    <div class="bigstat"><div class="dl"><span class="label">Science</span><span class="v" style="color:var(--sci)">${G.res.sci} / ${M.sci}</span></div>
     <div class="dl"><span class="label">Radiation</span><span class="v" style="color:var(--rad)">${fmt(G.res.dose)} / ${fmt(G.budget)} mSv</span></div>
     <div class="dl"><span class="label">Air left</span><span class="v" style="color:var(--air)">${Math.round(G.res.air)}</span></div>
     <div class="dl"><span class="label">Food left</span><span class="v" style="color:var(--food)">${Math.round(G.res.food)}</span></div></div>
    <div class="row-actions"><button class="btn" data-act="replay" data-code="${CODE}">Replay the same storms</button><button class="btn ghost" data-act="fresh" data-site="${G.site}" data-mode="${G.mode}">New ${S.short} mission</button>${nextMode?`<button class="btn ghost" data-act="fresh" data-site="${G.site}" data-mode="${nextMode}">Try ${SIM.MODES[nextMode].name}</button>`:''}<button class="btn ghost" data-act="menu">Main screen</button></div>
    <div class="codebox"><span class="label">Mission code</span><b>${CODE}</b><button class="btn ghost small" data-act="copy" data-code="${CODE}">Copy</button><span class="muted">Share it. Anyone who enters it faces the same storms and rock sites.</span></div></div>
   <div class="two"><div class="card stack" style="gap:10px"><h3>Tasks</h3>${ob.map(o=>`<div class="t${o.done?' done':''}"><span class="ck">${o.done?'✓':''}</span><span class="tx">${o.text}</span><span class="tn">${Math.min(o.cur,o.need)}/${o.need}</span></div>`).join('')}</div>
    <div class="card stack" style="gap:10px"><h3>What this mission taught</h3><ul class="plain">${lessons.map(l=>`<li>${esc(l)}</li>`).join('')}</ul></div></div>
   <div class="card stack" style="gap:10px"><h3>Your mission, day by day</h3><div class="chartwrap">${chartSVG(G.hist)}</div><p class="muted" style="font-size:14px">Shaded bands are solar storms. Radiation only goes up. The other lines fall if you spend more than you make.</p></div>
   <div class="card stack" style="gap:10px"><h3>The real storms you faced</h3>${faced?`<div class="tablewrap"><table><thead><tr><th>When</th><th>Real NASA event</th><th>Warning</th><th>Dose you took</th><th>Where you were</th></tr></thead><tbody>${faced}</tbody></table></div>`:'<p class="muted">The mission ended before any storm hit.</p>'}</div>
   <div class="card stack" style="gap:8px"><h3>Real NASA science behind the game</h3><ul class="plain">${tipsHTML}</ul></div>
   ${dataPanel()}</div>`;
  $('debrief').hidden=false;scrollTo(0,0);UI.shown=false;
}
function starSVG(on){return `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2.5l2.9 6 6.6.9-4.8 4.6 1.2 6.5L12 17.300 6.100 20.500l1.200-6.500L2.500 9.400l6.600-.9z" fill="${on?'var(--suit)':'none'}" stroke="${on?'var(--suit)':'var(--line)'}" stroke-width="1.6" stroke-linejoin="round"/></svg>`;}
function patch(){return `<svg width="30" height="30" viewBox="0 0 30 30" aria-hidden="true"><circle cx="15" cy="15" r="13.5" fill="#131C2E" stroke="#FF6A2B" stroke-width="2"/><ellipse cx="15" cy="15" rx="12" ry="4.5" fill="none" stroke="#A3B0C7" stroke-width="1.2" transform="rotate(-25 15 15)"/><circle cx="15" cy="15" r="5" fill="#EAF0F8"/><circle cx="23" cy="9" r="1.8" fill="#FF6A2B"/></svg>`;}

/* NASA data panel (menu and debrief) */
function dataPanel(){
  const stat={v:'Checked against a SpaceWeatherLive top-50 flare list (date, sunspot region)',gle:'Date confirmed in published papers on the first ground level enhancement of Cycle 25',news:'Confirmed in NASA and press reports'};
  const rows=SIM.ARCHIVE.map(e=>`<tr><td>${esc(e.date)}</td><td>${esc(e.cls)}</td><td>${esc(e.region)}</td><td>${esc(e.title)}</td><td>${stat[e.status]}</td></tr>`).join('');
  return `<section class="sec" id="data"><h2>The real NASA science inside</h2>
  <p class="muted" style="max-width:72ch">Everyday radiation numbers are real measurements. Storm sizes are scaled so a short mission has real risk. The page says plainly which data is live and which is saved.</p>
  <div class="two">
   <div class="card stack" style="gap:10px"><h3>Where the numbers come from</h3><ul class="plain">
    <li><b>Solar flares and storms:</b> NASA’s <a href="https://ccmc.gsfc.nasa.gov/tools/DONKI/" target="_blank" rel="noopener">DONKI</a> (Space Weather Database Of Notifications, Knowledge, Information). Each mission draws its storms from real events logged there.</li>
    <li><b>Moon radiation, 1.37 mSv a day:</b> measured on the lunar surface by China’s Chang’e 4 lander. About 2.6 times the space station’s cosmic ray dose (<a href="https://www.sci.news/space/radiation-dose-rates-lunar-surface-08893.html" target="_blank" rel="noopener">report</a>).</li>
    <li><b>Mars radiation, 0.64 mSv a day:</b> measured on the Martian surface by NASA’s Curiosity rover (RAD instrument). About 1.84 mSv a day on the way there (<a href="https://www.space.com/23875-mars-radiation-life-manned-mission.html" target="_blank" rel="noopener">report</a>).</li>
    <li><b>Storm at Mars, Sept 2017:</b> radiation on the Martian surface doubled (<a href="https://www.jpl.nasa.gov/news/large-solar-storm-sparks-global-aurora-and-doubles-radiation-levels-on-the-martian-surface/" target="_blank" rel="noopener">NASA JPL</a>).</li>
    <li><b>Exercise:</b> <a href="https://osdr.nasa.gov/bio/repo/data/studies/OSD-342" target="_blank" rel="noopener">OSDR study OSD-342</a>, mice on the space station, muscle and bone loss (NASA Open Science Data Repository).</li>
    <li><b>Food:</b> the Canadian Space Agency’s <a href="https://www.asc-csa.gc.ca/eng/youth-educators/toolkits/food-production/" target="_blank" rel="noopener">food production toolkit</a> says growing food in space can relate to astronaut health and nutrition.</li>
    <li><b>Radio delay:</b> about 1.3 seconds from the Moon, 3 to 22 minutes from Mars.</li></ul></div>
   <div class="card stack" style="gap:10px"><h3>What is simplified</h3><ul class="plain">
    <li>Storm doses are game-scaled. The safety line (${SIM.MODES.easy.budget} to ${SIM.MODES.hard.budget} mSv depending on mode) stands in for NASA’s real career limit of 600 mSv.</li>
    <li>Shielding is a simple model. Thick walls stop solar storm particles well but galactic cosmic rays much less, so the cellar helps a lot in storms and only a little on quiet days.</li>
    <li>One game day is 60 seconds.</li>
    <li>Live data: this page tries NASA’s DONKI service. If your browser can reach it, real flares from the last 30 days join the pool and are labelled <b>Live</b>. If not, it uses the archive below and says so.</li>
    <li><b>Next to connect:</b> RadLab (ISS radiation dose rates, documented at visualization.osdr.nasa.gov/radlab/api), Mars Trek terrain, Mars rover photos and the Astronomy Picture of the Day. These are not used in this build.</li></ul></div></div>
  <div class="card stack" style="gap:8px"><h3>Archived real events in this build</h3><div class="tablewrap"><table><thead><tr><th>Date</th><th>Class as first reported</th><th>Region</th><th>What happened</th><th>How it was checked</th></tr></thead><tbody>${rows}</tbody></table></div>
  <p class="muted" style="font-size:14px">Newer NOAA data rescales some older flare classes upward, so listings may differ. Flares marked M-class are typical events from DONKI’s logs, not one specific day.</p></div></section>`;
}
let API_KEY='';
try{API_KEY=sessionStorage.getItem('nasaKey')||'';}catch(e){}
async function loadLive(key){
  LIVE.state='checking';LIVE.msg='';if(UI.mode==='menu')renderMenu();
  try{
    const f=d=>d.toISOString().slice(0,10),end=new Date(),start=new Date(Date.now()-30*864e5),ctl=new AbortController(),tm=setTimeout(()=>ctl.abort(),7000);
    const k=key||API_KEY||'DEMO_KEY';
    const res=await fetch('https://api.nasa.gov/DONKI/FLR?startDate='+f(start)+'&endDate='+f(end)+'&api_key='+encodeURIComponent(k),{signal:ctl.signal});clearTimeout(tm);
    if(res.status===401||res.status===403)throw new Error('key');
    if(res.status===429)throw new Error('rate');
    if(!res.ok)throw new Error('bad');
    const data=await res.json();
    const ev=(Array.isArray(data)?data:[]).filter(x=>x&&/^[MX]/.test(x.classType||'')&&x.peakTime).slice(-10).map(x=>{const L=x.classType[0],num=parseFloat(x.classType.slice(1))||1;
      return{id:'live-'+x.flrID,live:true,cls:x.classType,sev:L==='M'?1:num>=5?3:2,speed:L==='X'?'fast':'slow',region:x.activeRegionNum?'AR '+x.activeRegionNum:'an active region',
        date:new Date(x.peakTime).toLocaleDateString('en-GB',{day:'numeric',month:'short',year:'numeric',timeZone:'UTC'}),title:'A real flare from the last 30 days',blurb:'NASA DONKI logged this '+x.classType+' flare very recently.'};});
    if(!ev.length)throw new Error('none');
    LIVE.state='live';LIVE.events=ev;LIVE.msg='';
  }catch(err){
    LIVE.state='archive';LIVE.events=[];
    LIVE.msg={key:'NASA did not accept that key. Check it for typos.',rate:'NASA says too many requests. Enter your own free key to fix this.',none:'NASA answered but had no recent M or X flares, so the saved events are used.'}[err.message]||'Could not reach NASA from this page (blocked or offline).';
  }
  if(UI.mode==='menu')renderMenu();
}
$('dataSlot').innerHTML=dataPanel();
$('apiIn').addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();document.querySelector('[data-act="apikey"]').click();}});
renderMenu();loadLive();
window.GAME={get G(){return G;},UI,SIM,FX,cam,startMission,SEL,Snd};
