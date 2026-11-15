/* Simulation core. No DOM in here, so a bot can play it headless and the balance can be tested. */
const SIM=(function(){
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
function mulberry(a){return function(){a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};}
function hashSeed(s){let h=2166136261;for(const c of String(s)){h^=c.charCodeAt(0);h=Math.imul(h,16777619);}return h>>>0;}
const WORLD={w:2000,h:1300},HAB={x:1000,y:640,r:125},ROOM={x:50,y:90,w:800,h:440},CELLAR={x:640,y:370,w:210,h:160};
/* Storm doses are scaled for a short mission. Everyday (cosmic ray) rates are the real measured daily values. */
const STORM_DOSE=[0,3,6,10],STORM_DUR=[0,16,20,26],SEV_NAME=['','small','strong','huge'];
const ZONE={out:{g:1,s:1},in:{g:.9,s:.4},cellar:{g:.8,s:.1}};
/* Game data (worlds, difficulty modes, real storm events, facts) lives in data.js */
const {SITES,MODES,ARCHIVE,GENERIC,TIPS}=DATA;
const Z_OF=G=>{if(G.scene==='out')return'out';const p=G.p;return(p.x>=CELLAR.x&&p.x<=CELLAR.x+CELLAR.w&&p.y>=CELLAR.y&&p.y<=CELLAR.y+CELLAR.h)?'cellar':'in';};
function shuffle(a,r){a=a.slice();for(let i=a.length-1;i>0;i--){const j=Math.floor(r()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;}

function newGame(o){
  const S=SITES[o.site],M=MODES[o.mode],r=mulberry(hashSeed(o.seed));
  const G={site:o.site,mode:o.mode,S,M,seed:o.seed,r,t:0,day:1,frac:0,scene:'out',
    p:{x:1090,y:870,face:'up',walk:0,moving:false,carry:0},target:null,act:null,
    res:{battery:M.battery0,air:85,food:70,dose:0,sci:0,suit:100,fit:100},
    sw:{scrub:true,lights:true,dish:false},filter:100,panels:[],trays:[],rocks:[],storms:[],sched:[],stations:[],ev:[],hist:[],histT:0,
    flags:{},counts:{rocks:0,exp:0,harv:0,exer:0,cleaned:0,fixed:0,planted:0},dist:0,
    starve:0,choke:0,pass:0,dustUntil:0,blackout:false,powered:true,flow:{gen:0,use:0},zone:'out',rate:0,over:null,
    budget:M.budget*S.budgetMul,hintsOn:!!o.hints||M.key==='easy',lowBat:false,peak:{dose:0}};
  for(let i=0;i<4;i++)G.panels.push({x:560+(i%2)*100,y:470+Math.floor(i/2)*90,dust:i===0?.5:.04*r(),fault:false});
  for(let i=0;i<3;i++)G.trays.push({state:i===0?'grow':'empty',prog:i===0?.5:0});
  /* rock sample sites: three clusters at different distances */
  const need=M.sci+3,sites=3,per=Math.ceil(need/sites);let n=0;
  for(let s=0;s<sites&&n<need;s++){
    let cx,cy,tries=0;
    do{const ang=r()*Math.PI*2,d=M.rockMin+(M.rockMax-M.rockMin)*((s+r()*.8)/sites);cx=HAB.x+Math.cos(ang)*d*1.25;cy=HAB.y+Math.sin(ang)*d*.85;tries++;}
    while((cx<140||cx>1860||cy<140||cy>1160||Math.hypot(cx-560,cy-470)<200)&&tries<60);
    cx=clamp(cx,140,1860);cy=clamp(cy,140,1160);
    for(let k=0;k<per&&n<need;k++,n++)G.rocks.push({id:'rock'+n,kind:'rock',scene:'out',x:cx+(r()-.5)*150,y:cy+(r()-.5)*110,r:34,got:false,seed:r()});
  }
  /* stations */
  const st=(id,scene,x,y,rr,kind,extra)=>G.stations.push(Object.assign({id,scene,x,y,r:rr,kind},extra));
  st('airlock-out','out',1000,790,52,'airlock',{label:'Habitat airlock'});
  G.panels.forEach((p,i)=>st('panel'+i,'out',p.x,p.y,50,'panel',{i,label:'Solar panel '+(i+1)}));
  st('airlock-in','in',450,520,55,'airlock',{label:'Airlock to outside'});
  st('scrub','in',450,140,60,'scrub',{label:'Air scrubber'});
  st('lab','in',140,170,62,'lab',{label:'Science lab'});
  st('comms','in',140,360,58,'comms',{label:'Radio to Earth'});
  st('lights','in',800,135,48,'lights',{label:'Grow lights'});
  for(let i=0;i<3;i++)st('tray'+i,'in',690,190+i*85,50,'tray',{i,label:'Garden tray '+(i+1)});
  st('bike','in',310,410,52,'bike',{label:'Exercise bike'});
  /* storms from real events */
  const pool=(o.live||[]).concat(ARCHIVE,GENERIC),used=new Set(),dayPool=[];
  for(let d=2;d<=M.days;d++)dayPool.push(d);
  const days=shuffle(dayPool,r).slice(0,M.storms.length).sort((a,b)=>a-b);
  M.storms.forEach((sev,i)=>{
    let c=pool.filter(e=>e.sev===sev&&!used.has(e.id)&&(M.key!=='easy'||e.speed==='slow'));
    if(!c.length)c=pool.filter(e=>e.sev===sev&&!used.has(e.id));
    if(!c.length)c=pool.filter(e=>e.sev===sev);
    const ev=c[Math.floor(r()*c.length)];used.add(ev.id);
    const fast=ev.speed==='fast';
    let lead=M.lead;
    if(fast)lead=S.key==='mars'?4:Math.max(6,Math.round(M.lead*.4));
    else if(S.key==='mars')lead=Math.max(6,Math.round(M.lead*.8));
    const at=(days[i]-1)*M.dayLen+M.dayLen*(.12+.7*r());
    G.storms.push({sev,ev,at,dur:STORM_DUR[sev],lead,fast,warned:false,warnAt:null,active:false,done:false,took:0,raw:0,shelter:0,inside:0,missed:false,sheltered:false});
  });
  /* radio outlook: which days the Sun looks busy (storm days are usually HIGH) */
  const ro=mulberry(hashSeed(o.seed+'outlook'));G.outlook={};
  for(let d=1;d<=M.days;d++){const has=G.storms.some(s=>Math.floor(s.at/M.dayLen)+1===d||Math.floor((s.at+s.dur)/M.dayLen)+1===d);G.outlook[d]=has?ro()<.9:ro()<.15;}
  /* breakdowns */
  const total=M.days*M.dayLen;
  for(let i=0;i<M.failures;i++){const type=i===1&&M.failures>=3?'filterClog':'panelFault';G.sched.push({t:M.dayLen*1.3+(total-M.dayLen*2.4)*((i+r())/M.failures),type,pi:Math.floor(r()*4),done:false});}
  if(M.dustStorm&&S.key==='mars')G.sched.push({t:total*(.35+.3*r()),type:'dustStorm',done:false});
  G.sched.sort((a,b)=>a.t-b.t);
  return G;
}
const stationsHere=G=>{const a=G.stations.filter(s=>s.scene===G.scene);if(G.scene==='out')for(const r of G.rocks)if(!r.got)a.push(r);return a;};
function stationAt(G,x,y){let best=null,bd=1e9;for(const s of stationsHere(G)){const d=Math.hypot(s.x-x,s.y-y),lim=s.kind==='rock'?36:s.r*.9+16;if(d<lim&&d<bd){best=s;bd=d;}}return best;}
function setTarget(G,x,y){
  if(G.over)return;
  const st=stationAt(G,x,y);
  if(st){G.target={x:st.x,y:st.y+(st.kind==='rock'?0:st.r*.4),st};return st;}
  if(G.scene==='in'){x=clamp(x,ROOM.x+20,ROOM.x+ROOM.w-20);y=clamp(y,ROOM.y+30,ROOM.y+ROOM.h-10);}
  else{x=clamp(x,60,WORLD.w-60);y=clamp(y,60,WORLD.h-60);}
  G.target={x,y,st:null};return null;
}
const sunAt=(G,t)=>{const f=(t%G.M.dayLen)/G.M.dayLen;return f<G.M.daylight?Math.sin(Math.PI*f/G.M.daylight):0;};
function fail(G,reason){if(G.over)return;G.over={win:false,reason};G.ev.push({k:'over',win:false,reason});}
function cancelAct(G){G.act=null;}

function startAct(G,st){
  if(G.act||G.over)return null;
  const M=G.M,res=G.res,sw=G.sw;
  const mk=(dur,label,kind,done,needPower)=>{G.act={st,t:0,dur,label,kind,done,needPower:!!needPower};return null;};
  switch(st.kind){
    case'panel':{const pn=G.panels[st.i];
      if(pn.fault)return mk(3,'Resetting the breaker','fix',()=>{pn.fault=false;G.counts.fixed++;G.ev.push({k:'fixed',st});});
      if(pn.dust<.1)return'This panel is already clean.';
      return mk(3.5,'Cleaning off the dust','clean',()=>{pn.dust=0;G.counts.cleaned++;G.flags.cleaned=1;G.ev.push({k:'cleaned',st});});}
    case'rock':
      if(st.got)return null;
      if(G.p.carry>=3)return'Your hands are full. Take samples to the lab first (you can carry 3).';
      return mk(1.2,'Collecting a sample','rock',()=>{st.got=true;G.p.carry++;G.counts.rocks++;G.flags.rock=1;G.ev.push({k:'rock',st});});
    case'airlock':
      if(G.scene==='out')return mk(1.6,'Entering the habitat','door',()=>{G.scene='in';G.p.x=450;G.p.y=470;G.p.face='up';G.target=null;G.flags.entered=1;G.ev.push({k:'door',inside:true});});
      if(res.suit<M.suitNeed)return'Your suit is still charging ('+Math.round(res.suit)+'%). Wait until it reaches '+M.suitNeed+'%.';
      return mk(1.6,'Going outside','door',()=>{G.scene='out';G.p.x=1000;G.p.y=840;G.p.face='down';G.target=null;G.ev.push({k:'door',inside:false});});
    case'scrub':
      if(G.filter<40)return mk(4,'Replacing the filter','fix',()=>{G.filter=100;G.counts.fixed++;G.ev.push({k:'fixed',st});});
      sw.scrub=!sw.scrub;G.ev.push({k:'switch',what:'scrubber',on:sw.scrub});return null;
    case'lights':sw.lights=!sw.lights;G.ev.push({k:'switch',what:'grow lights',on:sw.lights});return null;
    case'comms':
      if(!G.powered)return'No power for the radio!';
      sw.dish=!sw.dish;G.flags.dish=1;G.ev.push({k:'switch',what:'radio dish',on:sw.dish});return null;
    case'tray':{const tr=G.trays[st.i];
      if(tr.state==='empty')return mk(1.2,'Planting seeds','plant',()=>{tr.state='grow';tr.prog=0;G.flags.planted=1;G.counts.planted++;G.ev.push({k:'plant',st});});
      if(tr.state==='ripe')return mk(1.5,'Harvesting','harvest',()=>{tr.state='empty';res.food=Math.min(100,res.food+M.yield);G.counts.harv++;G.ev.push({k:'harvest',st,amt:M.yield});});
      return sw.lights?'Still growing. Plants need light and time.':'The grow lights are off. Plants stop growing in the dark!';}
    case'lab':
      if(G.p.carry<=0)return'Bring a rock sample from outside first.';
      if(!G.powered)return'No power for the lab!';
      return mk(5,'Running an experiment','lab',()=>{G.p.carry--;res.sci++;G.counts.exp++;G.flags.exp=1;G.ev.push({k:'science',st});},true);
    case'bike':
      return mk(8,'Exercising','exer',()=>{res.fit=Math.min(100,res.fit+45);G.counts.exer++;G.ev.push({k:'exercise',st});});
  }
  return null;
}
function interactNearest(G){
  let best=null,bd=1e9;
  for(const s of stationsHere(G)){const d=Math.hypot(s.x-G.p.x,s.y-G.p.y);if(d<s.r*1.05&&d<bd){best=s;bd=d;}}
  if(best){const why=startAct(G,best);if(why)G.ev.push({k:'tip',text:why});}
  else G.ev.push({k:'tip',text:'Walk up to something glowing first.'});
}
function step(G,dt,inp){
  if(G.over)return;
  inp=inp||{};const M=G.M,S=G.S,res=G.res,sw=G.sw;
  G.t+=dt;
  const day=Math.min(M.days,Math.floor(G.t/M.dayLen)+1);
  if(day!==G.day){G.day=day;G.ev.push({k:'day',day});if(sw.dish&&G.powered)G.ev.push({k:'outlook',day,high:!!G.outlook[day]});}
  G.frac=(G.t%M.dayLen)/M.dayLen;
  /* movement */
  let mx=inp.mx||0,my=inp.my||0;
  if(mx||my){G.target=null;G.act=null;const l=Math.hypot(mx,my);mx/=l;my/=l;}
  else if(G.target){
    const T=G.target;
    if(T.st){
      const d=Math.hypot(T.st.x-G.p.x,T.st.y-G.p.y);
      if(d<=T.st.r*.85){G.target=null;if(T.st.kind==='rock'&&T.st.got){}else{const why=startAct(G,T.st);if(why)G.ev.push({k:'tip',text:why});}}
    }
    if(G.target){const dx=T.x-G.p.x,dy=T.y-G.p.y,d=Math.hypot(dx,dy);if(d<5)G.target=null;else{mx=dx/d;my=dy/d;}}
  }
  if(inp.act)interactNearest(G);
  const sp=(G.scene==='out'?190:150)*(res.fit<25?.7:1)*(M.fitDrain?1:1);
  G.p.moving=!!(mx||my)&&!G.act;
  if(G.p.moving){
    const ox=G.p.x,oy=G.p.y;G.p.x+=mx*sp*dt;G.p.y+=my*sp*dt;
    G.p.face=Math.abs(mx)>Math.abs(my)?(mx>0?'right':'left'):(my>0?'down':'up');
    G.p.walk+=dt*sp/22;
    if(G.scene==='out'){
      G.p.x=clamp(G.p.x,60,WORLD.w-60);G.p.y=clamp(G.p.y,60,WORLD.h-60);
      const dx=G.p.x-HAB.x,dy=G.p.y-(HAB.y+20),d=Math.hypot(dx,dy),lim=HAB.r+16;
      if(d<lim&&!(G.p.y>HAB.y+HAB.r-10&&Math.abs(dx)<46)){G.p.x=HAB.x+dx/d*lim;G.p.y=HAB.y+20+dy/d*lim;}
    }else{
      G.p.x=clamp(G.p.x,ROOM.x+20,ROOM.x+ROOM.w-20);G.p.y=clamp(G.p.y,ROOM.y+30,ROOM.y+ROOM.h-10);
    }
    G.dist+=Math.hypot(G.p.x-ox,G.p.y-oy);if(G.dist>120)G.flags.moved=1;
  }
  /* timed action */
  if(G.act){
    const a=G.act;
    if(a.needPower&&!G.powered){G.act=null;G.ev.push({k:'tip',text:'The power went out and stopped your work.'});}
    else{a.t+=dt;if(a.t>=a.dur){G.act=null;a.done();}}
  }
  G.zone=Z_OF(G);G['t_'+G.zone]=(G['t_'+G.zone]||0)+dt;
  if(G.blackout)G.blackT=(G.blackT||0)+dt;
  /* power */
  const sun=sunAt(G,G.t),dustMul=G.t<G.dustUntil?.3:1;
  let gen=0;for(const pn of G.panels)if(!pn.fault)gen+=(1-pn.dust*.85)*sun;
  gen*=S.sun*dustMul;
  const growing=G.trays.some(t=>t.state==='grow'),labRun=G.act&&G.act.kind==='lab';
  let useFull=.25+(sw.scrub?.55:0)+(sw.lights?(growing?.4:.08):0)+(sw.dish?.2:0)+(labRun?.9:0);
  useFull*=M.cons;
  const was=G.blackout;
  G.blackout=res.battery<=.01&&gen<useFull;
  G.powered=!G.blackout;
  const use=G.blackout?Math.min(gen,.25*M.cons):useFull;
  res.battery=clamp(res.battery+(gen-use)*dt,0,M.cap);
  G.flow.gen=gen;G.flow.use=use;
  if(G.blackout&&!was)G.ev.push({k:'blackout'});
  if(!G.blackout&&was)G.ev.push({k:'power-back'});
  if(res.battery<15&&!G.lowBat){G.lowBat=true;G.ev.push({k:'lowbat'});}
  if(res.battery>30)G.lowBat=false;
  /* air */
  const eff=.5+.5*G.filter/100;
  let dAir=-M.breath;
  if(sw.scrub&&G.powered){dAir+=1.15*eff;G.filter=Math.max(0,G.filter-M.filterWear*dt);}
  res.air=clamp(res.air+dAir*dt,0,100);
  if(res.air<=0){G.choke+=dt;if(G.choke>=4)fail(G,'air');}else G.choke=Math.max(0,G.choke-dt);
  if(G.filter<40&&!G.filterWarned){G.filterWarned=true;G.ev.push({k:'filter'});}
  if(G.filter>60)G.filterWarned=false;
  /* food */
  res.food=Math.max(0,res.food-M.foodDrain*dt);
  if(res.food<=0){G.starve+=dt;if(G.starve>=25)fail(G,'food');}else G.starve=Math.max(0,G.starve-dt);
  /* suit */
  if(G.scene==='out'){res.suit=Math.max(0,res.suit-M.suit*(res.fit<25?1.3:1)*dt);if(res.suit<=0){G.pass+=dt;if(G.pass>=4)fail(G,'suit');}else G.pass=0;}
  else{res.suit=Math.min(100,res.suit+14*dt);G.pass=0;}
  if(M.fitDrain)res.fit=Math.max(0,res.fit-M.fitDrain*dt);
  /* dust and plants */
  for(const pn of G.panels)pn.dust=Math.min(1,pn.dust+M.dust*dt*(G.t<G.dustUntil?6:1));
  for(const tr of G.trays)if(tr.state==='grow'&&sw.lights&&G.powered){tr.prog+=dt/M.grow;if(tr.prog>=1){tr.state='ripe';G.ev.push({k:'ripe'});}}
  /* breakdowns */
  for(const s of G.sched){if(s.done||G.t<s.t)continue;s.done=true;
    if(s.type==='panelFault'){let k=s.pi;for(let n=0;n<4;n++){const pn=G.panels[(k+n)%4];if(!pn.fault){pn.fault=true;G.ev.push({k:'fault',what:'panel',i:(k+n)%4});break;}}}
    else if(s.type==='filterClog'){G.filter=Math.min(G.filter,22);G.ev.push({k:'fault',what:'filter'});}
    else if(s.type==='dustStorm'){G.dustUntil=G.t+25;G.ev.push({k:'duststorm'});}
  }
  /* storms */
  let stormRate=0;
  for(const s of G.storms){
    if(s.done)continue;
    if(!s.active){
      if(!s.warned&&G.t>=s.at-s.lead&&G.t<s.at&&sw.dish&&G.powered){s.warned=true;s.warnAt=G.t;G.ev.push({k:'warn',s});}
      if(G.t>=s.at){s.active=true;if(!s.warned)s.missed=true;G.ev.push({k:'storm-start',s});}
    }
    if(s.active){
      if(G.t>=s.at+s.dur){s.active=false;s.done=true;s.sheltered=s.shelter/s.dur>=.6;G.ev.push({k:'storm-end',s});}
      else stormRate+=STORM_DOSE[s.sev]/s.dur;
    }
  }
  /* radiation */
  const Z=ZONE[G.zone],gcr=S.gcr/M.dayLen;
  G.rate=gcr*Z.g+stormRate*Z.s;G.rateOut=gcr+stormRate;
  res.dose+=G.rate*dt;
  for(const s of G.storms)if(s.active){const r=STORM_DOSE[s.sev]/s.dur;s.took+=r*Z.s*dt;s.raw+=r*dt;if(G.zone==='cellar')s.shelter+=dt;if(G.zone!=='out')s.inside+=dt;}
  if(res.dose>G.budget)fail(G,'radiation');
  /* history */
  G.histT+=dt;if(G.histT>=1){G.histT=0;G.hist.push({t:G.t,battery:res.battery,air:res.air,food:res.food,dose:res.dose,sci:res.sci});}
  if(!G.over&&G.t>=M.days*M.dayLen){G.over={win:true};G.ev.push({k:'over',win:true});}
}
function objectives(G){
  const M=G.M,c=G.counts,o=[];
  o.push({id:'sci',text:'Study rock samples in the lab',cur:G.res.sci,need:M.sci});
  o.push({id:'harv',text:'Harvest crops from the garden',cur:c.harv,need:M.harv});
  if(M.exer)o.push({id:'exer',text:'Exercise on the bike',cur:c.exer,need:M.exer});
  o.push({id:'storm',text:'Shelter in the cellar during storms',cur:G.storms.filter(s=>s.sheltered).length,need:G.storms.length});
  o.forEach(x=>{x.done=x.cur>=x.need;});return o;
}
function stars(G){
  if(!G.over||!G.over.win)return 0;
  let n=1;const ob=objectives(G),sciDone=ob.find(x=>x.id==='sci').done;
  if(sciDone){n=2;if(ob.every(x=>x.done)&&G.res.dose<=G.budget*.9)n=3;}
  return n;
}
function hint(G){
  if(!G.hintsOn)return null;
  const f=G.flags,inOut=G.scene==='out';
  const stn=id=>G.stations.find(s=>s.id===id);
  if(!f.moved)return{text:'Tap or click the ground to walk there. (W A S D or arrow keys also work.)'};
  if(!f.cleaned&&inOut)return{text:'Dust blocks sunlight. Walk to the dusty solar panel and clean it.',at:stn('panel0')};
  if(!f.rock&&inOut){const r=G.rocks.filter(x=>!x.got).sort((a,b)=>Math.hypot(a.x-G.p.x,a.y-G.p.y)-Math.hypot(b.x-G.p.x,b.y-G.p.y))[0];return r?{text:'Grab a glowing rock sample. Your suit air drains outside, so watch the Suit bar.',at:r}:null;}
  if(!f.exp){
    if(inOut)return{text:G.p.carry>0?'Carry the sample inside. Walk to the airlock.':'Find a rock sample first.',at:G.p.carry>0?stn('airlock-out'):null};
    return G.p.carry>0?{text:'Put the sample in the lab. Experiments use power.',at:stn('lab')}:{text:'Go back outside for a rock sample.',at:stn('airlock-in')};
  }
  if(!f.planted&&!inOut)return{text:'Plant seeds in an empty tray. Food runs down all the time.',at:G.trays.find(t=>t.state==='empty')?stn('tray'+G.trays.findIndex(t=>t.state==='empty')):null};
  if(!f.dish&&!inOut)return{text:'Switch on the radio. Earth warns you about solar storms, but the radio uses power.',at:stn('comms')};
  if(G.t<G.M.dayLen*1.6&&!f.done){return{text:'Nice! When the siren sounds, run to the Storm Cellar in the bottom-right corner of the habitat.',at:null,last:true};}
  return null;
}
return{WORLD,HAB,ROOM,CELLAR,STORM_DOSE,SEV_NAME,SITES,MODES,ARCHIVE,GENERIC,TIPS,ZONE,newGame,step,setTarget,stationAt,stationsHere,startAct,interactNearest,objectives,stars,hint,sunAt,mulberry,hashSeed,clamp};
})();
