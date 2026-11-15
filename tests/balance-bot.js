/* Plays many simulated missions with a scripted bot to check game balance.
   Run: node tests/balance-bot.js 40   (40 missions per setting) */
const fs=require('fs');
const data=fs.readFileSync(__dirname+'/../js/data.js','utf8');
const src=fs.readFileSync(__dirname+'/../js/sim.js','utf8');
const SIM=new Function(data+src+';return SIM;')();
const {HAB,CELLAR}=SIM;
function dist(a,b){return Math.hypot(a.x-b.x,a.y-b.y);}
function play(site,mode,seed,pol){
  const G=SIM.newGame({site,mode,seed,live:[],hints:false});
  const M=G.M;let think=0;
  const st=id=>G.stations.find(s=>s.id===id);
  const go=s=>SIM.setTarget(G,s.x,s.y);
  const outlookHigh=()=>!!G.outlook[G.day];
  while(!G.over){
    SIM.step(G,.05,{});G.ev.length=0;
    think-=.05;if(think>0||G.act||G.target)continue;think=.1;
    const warned=G.storms.some(s=>(s.warned&&!s.done)||s.active&&pol.reactActive);
    const stormNow=G.storms.some(s=>s.active||(s.warned&&!s.done));
    // keep dish
    
    if(pol.dish==='high'){ const want=outlookHigh()||G.frac>.9; }
    if(stormNow&&pol.shelter){
      if(G.scene==='out'){go(st('airlock-out'));continue;}
      if(G.zone!=='cellar'){SIM.setTarget(G,CELLAR.x+100,CELLAR.y+80);continue;}
      continue;
    }
    // needs
    const dusty=G.panels.findIndex(p=>p.fault||p.dust>pol.dustAt);
    const rocksLeft=G.rocks.filter(r=>!r.got);
    const wantRock=G.res.sci+G.p.carry<M.sci&&rocksLeft.length>0&&(G.res.sci<M.sci);
    if(G.scene==='in'){
      const here=s=>dist(G.p,s)<s.r*1.0;
      if(pol.power){
        const growing=G.trays.some(x=>x.state==='grow');
        const wantLights=growing&&G.res.battery>(pol.lightMin||22);
        if(G.sw.lights!==wantLights){const s=st('lights');if(here(s))SIM.interactNearest(G);else go(s);continue;}
        const wantDish=pol.dish==='always'?(G.res.battery>(pol.dishMin||35)||outlookHigh()):pol.dish==='morning'?(G.frac<.1||(outlookHigh()&&G.res.battery>30)):false;
        if(G.sw.dish!==wantDish&&G.powered){const s=st('comms');if(here(s))SIM.interactNearest(G);else go(s);continue;}
      }
      if(!pol.power&&pol.dish==='always'&&!G.sw.dish&&G.powered){const c=st('comms');if(here(c))SIM.interactNearest(G);else go(c);continue;}
      if(G.filter<45){const s=st('scrub');if(here(s))SIM.interactNearest(G);else go(s);continue;}
      const ripe=G.trays.findIndex(t=>t.state==='ripe');if(ripe>=0){const s=st('tray'+ripe);if(here(s))SIM.interactNearest(G);else go(s);continue;}
      if(G.p.carry>0&&G.powered){const s=st('lab');if(here(s))SIM.interactNearest(G);else go(s);continue;}
      const emp=G.trays.findIndex(t=>t.state==='empty');if(emp>=0&&G.res.food<85&&pol.garden){const s=st('tray'+emp);if(here(s))SIM.interactNearest(G);else go(s);continue;}
      if(M.fitDrain&&pol.exercise&&G.res.fit<55){const s=st('bike');if(here(s))SIM.interactNearest(G);else go(s);continue;}
      if(pol.avoidOnHigh&&outlookHigh()&&G.sw.dish&&!dusty>=0){ /* stay in on a HIGH day unless maintenance */ }
      const goOut=(dusty>=0||wantRock)&&G.res.suit>=M.suitNeed&&!(pol.avoidOnHigh&&outlookHigh()&&dusty<0);
      if(goOut){const s=st('airlock-in');if(here(s))SIM.interactNearest(G);else go(s);continue;}
      continue;
    }
    // outside
    if(dusty>=0&&G.res.suit>25&&dist(G.panels[dusty],HAB)<500){go(st('panel'+dusty));continue;}
    if(wantRock&&G.p.carry<3&&G.res.suit>35){
      const r=rocksLeft.sort((a,b)=>dist(a,G.p)-dist(b,G.p))[0];
      if(!(pol.avoidOnHigh&&outlookHigh())||dist(r,HAB)<450){go(r);continue;}
    }
    go(st('airlock-out'));
  }
  return G;
}
const pols={
 smart:{power:1,dish:'always',shelter:1,dustAt:.35,garden:1,exercise:1,avoidOnHigh:1,reactActive:1},
 smartMorning:{power:1,dish:'morning',shelter:1,dustAt:.35,garden:1,exercise:1,avoidOnHigh:1,reactActive:1},
 smartNoOutlook:{power:1,dish:'always',shelter:1,dustAt:.35,garden:1,exercise:1,avoidOnHigh:0,reactActive:1},
 noDish:{power:1,dish:'never',shelter:1,dustAt:.35,garden:1,exercise:1,avoidOnHigh:0,reactActive:1},
 ignoreStorms:{dish:'never',shelter:0,dustAt:.35,garden:1,exercise:1,avoidOnHigh:0,reactActive:0},
 lazyMaint:{power:1,dish:'always',shelter:1,dustAt:2,garden:0,exercise:0,avoidOnHigh:0,reactActive:1},
};
const N=+process.argv[2]||60;
for(const site of ['moon','mars'])for(const mode of ['easy','medium','hard']){
  for(const [pn,pol] of Object.entries(pols)){
    const res={0:0,1:0,2:0,3:0},fails={};let dose=0,sci=0,minB=0;
    for(let i=0;i<N;i++){const G=play(site,mode,'s'+i,pol);const s=SIM.stars(G);res[s]++;if(G.over.reason)fails[G.over.reason]=(fails[G.over.reason]||0)+1;dose+=G.res.dose;sci+=G.res.sci;}
    console.log((site+' '+mode).padEnd(11),pn.padEnd(15),'stars',JSON.stringify(res).replace(/"/g,''),'fails',JSON.stringify(fails).replace(/"/g,''),'dose',(dose/N).toFixed(1),'/'+SIM.newGame({site,mode,seed:1,live:[]}).budget.toFixed(0),'sci',(sci/N).toFixed(1));
  }
}
