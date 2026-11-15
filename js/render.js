/* ---------- canvas world: drawing ---------- */
const $=id=>document.getElementById(id);
const clamp=SIM.clamp;
const cv=$('cv'),ctx=cv.getContext('2d');
let W=800,H=500,DPR=1,G=null;
const UI={mode:'menu',cine:null,paused:false,hover:null,mouse:null,endTimer:0};
const cam={x:1000,y:700,z:1};
const FX={parts:[],floats:[],streaks:[],foot:[],shake:0,flash:0,t:0,footT:0};
const reduceMotion=window.matchMedia&&matchMedia('(prefers-reduced-motion: reduce)').matches;
const CACHE={};
function resize(){
  const r=$('stage').getBoundingClientRect();
  W=Math.max(280,Math.round(r.width));H=Math.max(280,Math.round(r.height));DPR=Math.min(2,window.devicePixelRatio||1);
  cv.width=Math.round(W*DPR);cv.height=Math.round(H*DPR);
}
const VIEW={cx:400,cy:250,padL:0,padT:0};
const w2s=(x,y)=>({x:(x-cam.x)*cam.z+VIEW.cx,y:(y-cam.y)*cam.z+VIEW.cy});
function layoutView(){
  const phone=W<760;
  VIEW.padL=(!phone&&G&&G.scene==='in')?232:0;
  VIEW.padT=phone?132:0;
  VIEW.cx=VIEW.padL+(W-VIEW.padL)/2;VIEW.cy=VIEW.padT+(H-VIEW.padT)/2;
}
function rr(x,y,w,h,r){ctx.beginPath();ctx.moveTo(x+r,y);ctx.arcTo(x+w,y,x+w,y+h,r);ctx.arcTo(x+w,y+h,x,y+h,r);ctx.arcTo(x,y+h,x,y,r);ctx.arcTo(x,y,x+w,y,r);ctx.closePath();}
function trefoilPath(cx,cy,R,r){
  ctx.beginPath();
  for(let k=0;k<3;k++){
    const a0=(k*120-120)*Math.PI/180,a1=(k*120-60)*Math.PI/180,P=(a,q)=>[cx+q*Math.cos(a),cy+q*Math.sin(a)];
    const A=P(a0,R),B=P(a1,R),C=P(a1,r),D=P(a0,r);
    ctx.moveTo(A[0],A[1]);ctx.arc(cx,cy,R,a0,a1);ctx.lineTo(C[0],C[1]);ctx.arc(cx,cy,r,a1,a0,true);ctx.closePath();
  }
}

/* ground and floor, drawn once */
function makeGround(site){
  const c=document.createElement('canvas');c.width=SIM.WORLD.w;c.height=SIM.WORLD.h;const g=c.getContext('2d'),r=SIM.mulberry(site==='moon'?11:22);
  const P=site==='moon'?{base:'#6b707d',dark:'#454a57',light:'#939aa9',rim:'#a7aebd'}:{base:'#a65a3b',dark:'#6f3a27',light:'#cf8559',rim:'#dc9a6c'};
  g.fillStyle=P.base;g.fillRect(0,0,c.width,c.height);
  for(let i=0;i<70;i++){const x=r()*c.width,y=r()*c.height,R=60+r()*220,gr=g.createRadialGradient(x,y,0,x,y,R);const d=r()<.5;gr.addColorStop(0,d?P.dark:P.light);gr.addColorStop(1,'rgba(0,0,0,0)');g.globalAlpha=.12+r()*.1;g.fillStyle=gr;g.fillRect(x-R,y-R,R*2,R*2);}
  g.globalAlpha=1;
  for(let i=0;i<3200;i++){g.fillStyle=r()<.5?P.dark:P.light;g.globalAlpha=.12+r()*.28;g.fillRect(r()*c.width,r()*c.height,1+r()*2.6,1+r()*2.2);}
  g.globalAlpha=1;
  for(let i=0;i<34;i++){
    const x=80+r()*(c.width-160),y=80+r()*(c.height-160),R=16+r()*r()*110;
    if(Math.hypot(x-SIM.HAB.x,y-SIM.HAB.y)<260)continue;
    g.fillStyle='rgba(0,0,0,.20)';g.beginPath();g.ellipse(x+R*.08,y+R*.08,R*1.02,R*.82,0,0,7);g.fill();
    const gr=g.createRadialGradient(x-R*.2,y-R*.2,R*.1,x,y,R);gr.addColorStop(0,P.base);gr.addColorStop(1,P.dark);
    g.fillStyle=gr;g.beginPath();g.ellipse(x,y,R,R*.8,0,0,7);g.fill();
    g.strokeStyle=P.rim;g.lineWidth=Math.max(2,R*.08);g.globalAlpha=.75;g.beginPath();g.ellipse(x,y,R,R*.8,0,Math.PI*.95,Math.PI*1.65);g.stroke();g.globalAlpha=1;
  }
  for(let i=0;i<150;i++){const x=r()*c.width,y=r()*c.height;if(Math.hypot(x-SIM.HAB.x,y-SIM.HAB.y)<170)continue;const R=3+r()*7;g.fillStyle='rgba(0,0,0,.25)';g.beginPath();g.ellipse(x+2,y+2,R,R*.7,0,0,7);g.fill();g.fillStyle=r()<.5?P.dark:P.light;g.beginPath();g.ellipse(x,y,R,R*.7,0,0,7);g.fill();}
  /* worn path from lander to habitat and panels */
  g.strokeStyle='rgba(255,255,255,.07)';g.lineWidth=36;g.lineCap='round';g.beginPath();g.moveTo(1190,880);g.quadraticCurveTo(1120,850,1000,800);g.moveTo(1000,820);g.quadraticCurveTo(800,760,640,540);g.stroke();
  return c;
}
function makeFloor(){
  const c=document.createElement('canvas');c.width=900;c.height=580;const g=c.getContext('2d');
  g.fillStyle='#18233a';g.fillRect(0,0,900,580);
  g.fillStyle='#1d2b45';g.fillRect(50,90,800,440);
  g.strokeStyle='rgba(120,150,200,.12)';g.lineWidth=1;
  for(let x=50;x<=850;x+=50){g.beginPath();g.moveTo(x,90);g.lineTo(x,530);g.stroke();}
  for(let y=90;y<=530;y+=50){g.beginPath();g.moveTo(50,y);g.lineTo(850,y);g.stroke();}
  /* cellar floor */
  g.fillStyle='#3a2f2a';g.fillRect(640,370,210,160);
  for(let i=0;i<140;i++){g.fillStyle=i%2?'#4a3c34':'#2e2521';g.globalAlpha=.7;g.fillRect(645+Math.random()*195,375+Math.random()*145,3+Math.random()*5,2+Math.random()*3);}
  g.globalAlpha=1;
  /* walkway stripes */
  g.fillStyle='rgba(255,200,60,.14)';for(let y=200;y<520;y+=24)g.fillRect(447,y,6,12);
  return c;
}

/* sun and shadows */
function sunInfo(){
  const s=SIM.sunAt(G,G.t),a=Math.PI*Math.min(1,G.frac/G.M.daylight);
  return{s,a,dx:-Math.cos(a),k:G.site==='moon'?1.2:.85};
}
function shade(x,y,rx,ry,h){
  const S=sunInfo();if(S.s<.03)return;
  const len=h*(1.7-S.s*.9)*S.k;
  ctx.fillStyle='rgba(0,0,0,'+(.34*Math.min(1,S.s*1.8)).toFixed(3)+')';
  ctx.beginPath();ctx.ellipse(x+S.dx*len*.55,y+len*.22,rx+Math.abs(S.dx)*len*.35,ry,0,0,7);ctx.fill();
}

/* characters */
function astro(x,y,o){
  const hopA=o.moving?Math.abs(Math.sin(o.walk))*(o.hop||4):0,by=y-hopA,sw=o.moving?Math.sin(o.walk)*4:0,f=o.face||'down';
  ctx.fillStyle='rgba(0,0,0,.3)';ctx.beginPath();ctx.ellipse(x,y+2,13,5.5,0,0,7);ctx.fill();
  const body=o.suit||'#eef2f9',edge='#8d99b0';
  if(f==='up'||f==='left'||f==='right'){ctx.fillStyle='#aab3c6';ctx.strokeStyle=edge;ctx.lineWidth=1.2;const bx=f==='left'?x+4:f==='right'?x-20:x-9;rr(bx,by-33,f==='up'?18:16,18,4);ctx.fill();ctx.stroke();}
  if(!o.sit){ctx.fillStyle='#d9e0ee';ctx.strokeStyle=edge;rr(x-8,by-13+sw*.5,7,13,3);ctx.fill();ctx.stroke();rr(x+1,by-13-sw*.5,7,13,3);ctx.fill();ctx.stroke();}
  ctx.fillStyle=body;ctx.strokeStyle=edge;ctx.lineWidth=1.4;rr(x-10,by-31,20,20,6);ctx.fill();ctx.stroke();
  if(f!=='up'){ctx.fillStyle=o.chest||'#ff6a2b';rr(x-5,by-26,10,6,2);ctx.fill();ctx.fillStyle='#5b6682';ctx.fillRect(x-3,by-18,2,2);ctx.fillRect(x+1,by-18,2,2);}
  ctx.fillStyle=body;ctx.beginPath();ctx.ellipse(x-12,by-22+sw*.4,4,6,0,0,7);ctx.fill();ctx.stroke();ctx.beginPath();ctx.ellipse(x+12,by-22-sw*.4,4,6,0,0,7);ctx.fill();ctx.stroke();
  ctx.fillStyle='#f7f9fd';ctx.strokeStyle=edge;ctx.beginPath();ctx.arc(x,by-40,11.5,0,7);ctx.fill();ctx.stroke();
  if(f!=='up'){
    const vx=f==='left'?-4:f==='right'?4:0,gr=ctx.createLinearGradient(x,by-46,x,by-32);gr.addColorStop(0,'#ffd98a');gr.addColorStop(1,'#c97a1c');
    ctx.fillStyle=gr;ctx.beginPath();ctx.ellipse(x+vx,by-39,f==='down'?8:5.5,6.4,0,0,7);ctx.fill();
    ctx.fillStyle='rgba(255,255,255,.55)';ctx.beginPath();ctx.ellipse(x+vx-2,by-41,2.5,1.6,-.5,0,7);ctx.fill();
  }else{ctx.fillStyle='#ff6a2b';ctx.beginPath();ctx.arc(x,by-46,2,0,7);ctx.fill();}
  for(let i=0;i<(o.carry||0);i++){const rx=x-12+i*12,ry=by-60+Math.sin(FX.t*3+i)*1.5;ctx.fillStyle='#8c92a3';ctx.strokeStyle='#4d5262';ctx.beginPath();ctx.arc(rx,ry,5.5,0,7);ctx.fill();ctx.stroke();ctx.fillStyle='#8be3ff';ctx.fillRect(rx-1,ry-2,2,2);}
}

/* outside pieces */
function drawHab(){
  const{x,y,r}=SIM.HAB;
  shade(x,y+r*.55,r*.95,r*.55,60);
  ctx.fillStyle='#707a90';ctx.beginPath();ctx.ellipse(x,y+24,r+8,r*.93,0,0,7);ctx.fill();
  const g=ctx.createRadialGradient(x-r*.4,y-r*.5,8,x,y,r*1.15);g.addColorStop(0,'#f6f8fd');g.addColorStop(.5,'#c9d1e0');g.addColorStop(1,'#7f8aa0');
  ctx.fillStyle=g;ctx.beginPath();ctx.ellipse(x,y,r,r*.9,0,0,7);ctx.fill();
  ctx.strokeStyle='rgba(60,72,100,.32)';ctx.lineWidth=2;
  for(let i=0;i<8;i++){const a=i*Math.PI/4;ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x+Math.cos(a)*r,y+Math.sin(a)*r*.9);ctx.stroke();}
  ctx.beginPath();ctx.ellipse(x,y,r*.38,r*.34,0,0,7);ctx.stroke();ctx.beginPath();ctx.ellipse(x,y,r*.7,r*.63,0,0,7);ctx.stroke();
  const lit=G.powered;
  for(let i=0;i<6;i++){const a=Math.PI*(.15+i*.14),wx=x+Math.cos(a)*r*.82-0,wy=y+Math.sin(a)*r*.7;ctx.fillStyle=lit?'#ffd66e':'#37405a';rr(wx-7,wy-5,14,9,3);ctx.fill();}
  ctx.fillStyle='#f2f5fb';ctx.beginPath();ctx.arc(x,y-4,12,0,7);ctx.fill();ctx.strokeStyle='#7f8aa0';ctx.stroke();
  const blink=(Math.sin(FX.t*4)>0);ctx.fillStyle=blink?'#ff5a4e':'#7a2d2d';ctx.beginPath();ctx.arc(x,y-4,4,0,7);ctx.fill();
  /* airlock tube */
  ctx.fillStyle='#b4bdd0';ctx.strokeStyle='#6d778d';ctx.lineWidth=2;rr(x-40,y+r*.78,80,58,10);ctx.fill();ctx.stroke();
  ctx.fillStyle='#232c42';rr(x-22,y+r*.78+18,44,36,6);ctx.fill();
  ctx.fillStyle='#ffcf3a';for(let i=0;i<4;i++){ctx.save();ctx.translate(x-20+i*11,y+r*.78+6);ctx.rotate(-.6);ctx.fillRect(0,0,6,5);ctx.restore();}
  ctx.fillStyle=G.zone==='out'?'#58e08c':'#f0b84a';ctx.beginPath();ctx.arc(x,y+r*.78+50,3,0,7);ctx.fill();
}
function drawPanel(i){
  const p=G.panels[i],w=84,h=54,x=p.x,y=p.y,S=sunInfo();
  shade(x,y+h*.35,w*.55,h*.35,26);
  ctx.strokeStyle='#4f586f';ctx.lineWidth=5;ctx.beginPath();ctx.moveTo(x,y+h/2-6);ctx.lineTo(x,y+h/2+14);ctx.stroke();
  ctx.fillStyle='#39425a';ctx.beginPath();ctx.ellipse(x,y+h/2+15,14,5,0,0,7);ctx.fill();
  ctx.save();ctx.translate(x,y);ctx.transform(1,0,-.2,1,0,0);
  ctx.fillStyle='#d3dbea';rr(-w/2,-h/2,w,h,5);ctx.fill();
  const gr=ctx.createLinearGradient(-w/2,-h/2,w/2,h/2);gr.addColorStop(0,'#2a5cae');gr.addColorStop(1,'#16356e');
  ctx.fillStyle=gr;rr(-w/2+4,-h/2+4,w-8,h-8,3);ctx.fill();
  ctx.strokeStyle='rgba(180,210,255,.45)';ctx.lineWidth=1;
  for(let k=1;k<5;k++){ctx.beginPath();ctx.moveTo(-w/2+4+k*(w-8)/5,-h/2+4);ctx.lineTo(-w/2+4+k*(w-8)/5,h/2-4);ctx.stroke();}
  for(let k=1;k<3;k++){ctx.beginPath();ctx.moveTo(-w/2+4,-h/2+4+k*(h-8)/3);ctx.lineTo(w/2-4,-h/2+4+k*(h-8)/3);ctx.stroke();}
  if(S.s<.5){ctx.fillStyle='rgba(5,10,30,'+(.55*(1-S.s*2)).toFixed(2)+')';rr(-w/2+4,-h/2+4,w-8,h-8,3);ctx.fill();}
  if(p.dust>.02){ctx.fillStyle=(G.site==='mars'?'rgba(196,130,90,':'rgba(190,185,170,')+(p.dust*.82).toFixed(2)+')';rr(-w/2+4,-h/2+4,w-8,h-8,3);ctx.fill();}
  if(p.fault){ctx.fillStyle='rgba(60,0,10,.55)';rr(-w/2+4,-h/2+4,w-8,h-8,3);ctx.fill();ctx.strokeStyle='#ff4d5e';ctx.lineWidth=4;ctx.beginPath();ctx.moveTo(-18,-12);ctx.lineTo(18,12);ctx.moveTo(18,-12);ctx.lineTo(-18,12);ctx.stroke();}
  ctx.restore();
  if(p.fault&&Math.sin(FX.t*6)>0){ctx.fillStyle='#ff4d5e';ctx.beginPath();ctx.arc(x+w/2-4,y-h/2-8,5,0,7);ctx.fill();}
  else if(p.dust>.45){ctx.fillStyle='#f0b84a';ctx.beginPath();ctx.arc(x+w/2-4,y-h/2-8,4,0,7);ctx.fill();}
}
function drawRock(r){
  const pulse=.5+.5*Math.sin(FX.t*3+r.seed*9),R=13+r.seed*5;
  shade(r.x,r.y+4,R,R*.5,14);
  const gl=ctx.createRadialGradient(r.x,r.y,2,r.x,r.y,34+pulse*6);gl.addColorStop(0,'rgba(120,230,255,.34)');gl.addColorStop(1,'rgba(120,230,255,0)');ctx.fillStyle=gl;ctx.beginPath();ctx.arc(r.x,r.y,40,0,7);ctx.fill();
  ctx.beginPath();for(let i=0;i<8;i++){const a=i/8*Math.PI*2,k=R*(.78+((Math.sin(r.seed*40+i*2.3)+1)/2)*.4);const px=r.x+Math.cos(a)*k,py=r.y+Math.sin(a)*k*.75;i?ctx.lineTo(px,py):ctx.moveTo(px,py);}ctx.closePath();
  const g=ctx.createLinearGradient(r.x-R,r.y-R,r.x+R,r.y+R);g.addColorStop(0,'#a8aebd');g.addColorStop(1,'#4b505e');ctx.fillStyle=g;ctx.fill();ctx.strokeStyle='#2f3340';ctx.lineWidth=1.5;ctx.stroke();
  ctx.fillStyle='#8be3ff';ctx.fillRect(r.x-3,r.y-2,3,3);ctx.fillRect(r.x+3,r.y+1,2,2);
}
function drawLander(){
  const x=1200,y=900;
  shade(x,y+10,70,30,40);
  ctx.fillStyle='rgba(20,15,10,.35)';ctx.beginPath();ctx.ellipse(x,y+14,78,40,0,0,7);ctx.fill();
  ctx.strokeStyle='#8a91a4';ctx.lineWidth=6;for(const[dx,dy]of[[-54,26],[54,26],[-34,-6],[34,-6]]){ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x+dx,y+dy);ctx.stroke();ctx.fillStyle='#5d6477';ctx.beginPath();ctx.ellipse(x+dx,y+dy+2,10,4,0,0,7);ctx.fill();}
  const g=ctx.createLinearGradient(x-40,y-50,x+40,y+10);g.addColorStop(0,'#e8c35c');g.addColorStop(1,'#a77e22');ctx.fillStyle=g;ctx.strokeStyle='#6e5314';ctx.lineWidth=2;
  ctx.beginPath();for(let i=0;i<8;i++){const a=i/8*Math.PI*2+Math.PI/8;const px=x+Math.cos(a)*44,py=y-14+Math.sin(a)*34;i?ctx.lineTo(px,py):ctx.moveTo(px,py);}ctx.closePath();ctx.fill();ctx.stroke();
  ctx.fillStyle='#2b3350';ctx.beginPath();ctx.ellipse(x,y-18,16,11,0,0,7);ctx.fill();ctx.fillStyle='#e9edf6';ctx.font='bold 11px Chakra Petch,sans-serif';ctx.textAlign='center';ctx.fillText(G.S.key==='moon'?'MOON':'MARS',x,y+6);
}
function drawDish(){
  const x=1300,y=520;shade(x,y+14,22,10,40);
  ctx.fillStyle='#59627a';rr(x-12,y,24,26,4);ctx.fill();
  ctx.strokeStyle='#9aa4bb';ctx.lineWidth=5;ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x,y-34);ctx.stroke();
  const a=G.sw.dish&&G.powered?FX.t*1.2:.6;
  ctx.save();ctx.translate(x,y-40);ctx.rotate(Math.sin(a)*.5);ctx.fillStyle='#e5eaf5';ctx.strokeStyle='#8d99b0';ctx.lineWidth=2;ctx.beginPath();ctx.ellipse(0,0,34,15,-.3,0,7);ctx.fill();ctx.stroke();ctx.fillStyle='#aab4c9';ctx.beginPath();ctx.ellipse(0,0,24,9,-.3,0,7);ctx.fill();ctx.restore();
  if(G.sw.dish&&G.powered){for(let k=0;k<3;k++){const ph=(FX.t*1.4+k*.33)%1;ctx.strokeStyle='rgba(255,255,255,'+(.8*(1-ph)).toFixed(2)+')';ctx.lineWidth=2.5;ctx.beginPath();ctx.arc(x+16,y-62,10+ph*34,-Math.PI*.75,-Math.PI*.1);ctx.stroke();}}
}
function drawPointerRing(x,y,col){ctx.strokeStyle=col;ctx.lineWidth=4;ctx.globalAlpha=.5+.4*Math.sin(FX.t*5);ctx.beginPath();ctx.ellipse(x,y+8,58,30,0,0,7);ctx.stroke();ctx.globalAlpha=1;}

/* inside pieces */
function drawInterior(){
  ctx.drawImage(CACHE.floor,0,0);
  /* back wall with windows showing the sky */
  ctx.fillStyle='#0f1727';ctx.fillRect(0,0,900,90);
  ctx.fillStyle='#2b3957';ctx.fillRect(40,84,820,10);
  for(let i=0;i<4;i++){
    const wx=90+i*200;
    const sky=G.site==='moon'?'#05060c':'#b66a42';
    ctx.fillStyle=sky;rr(wx,18,120,54,8);ctx.fill();
    if(G.site==='moon'){ctx.fillStyle='#fff';for(let k=0;k<8;k++)ctx.fillRect(wx+8+(k*37)%100,22+(k*13)%40,1.5,1.5);}
    const s=SIM.sunAt(G,G.t);
    if(s>0){ctx.fillStyle='rgba(255,240,190,'+(.9*Math.min(1,s*2)).toFixed(2)+')';ctx.beginPath();ctx.arc(wx+20+Math.min(1,G.frac/G.M.daylight)*80,60-s*30,7,0,7);ctx.fill();}
    else{ctx.fillStyle='rgba(0,0,20,.5)';rr(wx,18,120,54,8);ctx.fill();}
    if(G.storms.some(x=>x.active)){ctx.fillStyle='rgba(255,80,100,'+(.2+.15*Math.sin(FX.t*8)).toFixed(2)+')';rr(wx,18,120,54,8);ctx.fill();}
    ctx.strokeStyle='#5d6c90';ctx.lineWidth=4;rr(wx,18,120,54,8);ctx.stroke();
  }
  /* cellar walls */
  const C=SIM.CELLAR;
  ctx.fillStyle='#5d4c40';ctx.fillRect(C.x-14,C.y-14,C.w+28,14);ctx.fillRect(C.x-14,C.y-14,14,C.h+14);
  ctx.fillStyle='#4a3b31';for(let i=0;i<9;i++)ctx.fillRect(C.x-14+i*24,C.y-14,20,10);
  ctx.fillStyle='#e8b64a';trefoilPath(C.x+C.w-34,C.y+34,19,6);ctx.fill();ctx.beginPath();ctx.arc(C.x+C.w-34,C.y+34,4,0,7);ctx.fill();
  ctx.fillStyle='#f3d9a8';ctx.font='bold 13px Chakra Petch,sans-serif';ctx.textAlign='left';ctx.fillText('STORM CELLAR',C.x+12,C.y+22);
  ctx.font='11px Atkinson Hyperlegible,sans-serif';ctx.fillStyle='#c9ab7c';ctx.fillText('Thick regolith walls',C.x+12,C.y+38);
  if(G.zone==='cellar'&&G.storms.some(s=>s.active)){ctx.strokeStyle='rgba(88,224,140,'+(.5+.4*Math.sin(FX.t*5)).toFixed(2)+')';ctx.lineWidth=5;ctx.strokeRect(C.x+2,C.y+2,C.w-4,C.h-4);ctx.fillStyle='#58e08c';ctx.font='bold 16px Chakra Petch,sans-serif';ctx.fillText('SAFE',C.x+12,C.y+C.h-14);}
  /* airlock hatch */
  ctx.fillStyle='#10192b';rr(395,505,110,40,8);ctx.fill();ctx.strokeStyle='#ffcf3a';ctx.lineWidth=3;ctx.setLineDash([10,8]);rr(395,505,110,40,8);ctx.stroke();ctx.setLineDash([]);
  ctx.fillStyle=G.res.suit>=G.M.suitNeed?'#58e08c':'#f0b84a';ctx.beginPath();ctx.arc(450,512,4,0,7);ctx.fill();
  ctx.fillStyle='#9aa7c4';ctx.font='bold 11px Chakra Petch,sans-serif';ctx.textAlign='center';ctx.fillText('AIRLOCK',450,534);
  /* items by depth */
  const items=[];
  items.push({y:190,f:drawLab},{y:150,f:drawScrub},{y:380,f:drawComms},{y:140,f:drawLights},{y:420,f:drawBike},{y:480,f:drawBunks});
  for(let i=0;i<3;i++)items.push({y:190+i*85,f:()=>drawTray(i)});
  items.push({y:G.p.y,f:()=>astro(G.p.x,G.p.y,{face:G.p.face,walk:G.p.walk,moving:G.p.moving,carry:G.p.carry,hop:G.S.hop*2})});
  items.sort((a,b)=>a.y-b.y).forEach(i=>i.f());
}
function drawLab(){
  const x=140,y=170,run=G.act&&G.act.kind==='lab';
  ctx.fillStyle='rgba(0,0,0,.3)';rr(x-62,y+22,128,16,8);ctx.fill();
  ctx.fillStyle='#46536f';rr(x-62,y-10,124,46,6);ctx.fill();ctx.fillStyle='#6a7a9b';rr(x-62,y-14,124,12,5);ctx.fill();
  ctx.fillStyle='#10182b';rr(x-52,y-52,46,38,4);ctx.fill();ctx.strokeStyle='#7e8fb4';ctx.lineWidth=2;rr(x-52,y-52,46,38,4);ctx.stroke();
  ctx.strokeStyle=run?'#7ff0b0':'#3d9c70';ctx.lineWidth=2;ctx.beginPath();for(let i=0;i<=8;i++){const px=x-47+i*5,py=y-33+Math.sin(i*1.4+(run?FX.t*8:0))*8*(run?1:.4);i?ctx.lineTo(px,py):ctx.moveTo(px,py);}ctx.stroke();
  ctx.fillStyle='#cfd6e6';ctx.fillRect(x+10,y-34,10,22);ctx.fillRect(x+6,y-14,18,5);ctx.fillStyle='#8be3ff';ctx.beginPath();ctx.arc(x+15,y-38,5,0,7);ctx.fill();
  ctx.fillStyle='rgba(160,230,255,.85)';ctx.beginPath();ctx.moveTo(x+36,y-12);ctx.lineTo(x+52,y-12);ctx.lineTo(x+48,y-26);ctx.lineTo(x+40,y-26);ctx.closePath();ctx.fill();
  if(run){ctx.strokeStyle='rgba(127,240,176,'+(.4+.4*Math.sin(FX.t*10)).toFixed(2)+')';ctx.lineWidth=3;rr(x-66,y-56,132,96,10);ctx.stroke();}
}
function drawScrub(){
  const x=450,y=140,on=G.sw.scrub&&G.powered;
  ctx.fillStyle='rgba(0,0,0,.3)';rr(x-48,y+30,96,12,6);ctx.fill();
  ctx.strokeStyle='#5d6c90';ctx.lineWidth=6;ctx.beginPath();ctx.moveTo(x-20,y-44);ctx.lineTo(x-20,y-70);ctx.moveTo(x+20,y-44);ctx.lineTo(x+20,y-70);ctx.stroke();
  ctx.fillStyle='#3f4c69';rr(x-46,y-44,92,78,8);ctx.fill();ctx.strokeStyle='#7e8fb4';ctx.lineWidth=2;rr(x-46,y-44,92,78,8);ctx.stroke();
  ctx.fillStyle='#161f33';ctx.beginPath();ctx.arc(x,y-8,26,0,7);ctx.fill();
  ctx.save();ctx.translate(x,y-8);ctx.rotate(on?FX.t*(G.filter<40?3:9):0);ctx.fillStyle=on?'#8be3ff':'#566080';for(let i=0;i<4;i++){ctx.rotate(Math.PI/2);ctx.beginPath();ctx.ellipse(0,-12,6,12,0,0,7);ctx.fill();}ctx.restore();
  ctx.fillStyle=on?'#58e08c':'#ff5a4e';ctx.beginPath();ctx.arc(x+34,y-34,4,0,7);ctx.fill();
  ctx.fillStyle='#10182b';rr(x-34,y+20,68,8,3);ctx.fill();ctx.fillStyle=G.filter<40?'#ff5a4e':G.filter<65?'#f0b84a':'#58e08c';rr(x-34,y+20,68*G.filter/100,8,3);ctx.fill();
  if(G.filter<40&&Math.sin(FX.t*6)>0){ctx.fillStyle='#ff5a4e';ctx.font='bold 12px Chakra Petch,sans-serif';ctx.textAlign='center';ctx.fillText('FILTER WORN',x,y-52);}
}
function drawComms(){
  const x=140,y=360,on=G.sw.dish&&G.powered;
  ctx.fillStyle='rgba(0,0,0,.3)';rr(x-60,y+22,120,14,7);ctx.fill();
  ctx.fillStyle='#46536f';rr(x-58,y-8,116,40,6);ctx.fill();ctx.fillStyle='#6a7a9b';rr(x-58,y-12,116,10,5);ctx.fill();
  ctx.fillStyle='#10182b';rr(x-34,y-58,68,44,5);ctx.fill();ctx.strokeStyle='#7e8fb4';ctx.lineWidth=2;rr(x-34,y-58,68,44,5);ctx.stroke();
  if(on){ctx.strokeStyle='#8be3ff';ctx.lineWidth=2;ctx.beginPath();for(let i=0;i<=16;i++){const px=x-28+i*3.5,py=y-36+Math.sin(i*.9+FX.t*7)*8*Math.sin(i/16*Math.PI);i?ctx.lineTo(px,py):ctx.moveTo(px,py);}ctx.stroke();
    ctx.fillStyle='#ff5a4e';ctx.font='bold 10px Chakra Petch,sans-serif';ctx.textAlign='center';ctx.fillText('ON AIR',x,y-18);}
  else{ctx.fillStyle='#46536f';ctx.font='bold 11px Chakra Petch,sans-serif';ctx.textAlign='center';ctx.fillText('RADIO OFF',x,y-34);}
  ctx.strokeStyle='#cfd6e6';ctx.lineWidth=3;ctx.beginPath();ctx.arc(x+42,y+6,9,Math.PI,0);ctx.stroke();ctx.fillStyle='#cfd6e6';ctx.fillRect(x+31,y+4,4,9);ctx.fillRect(x+49,y+4,4,9);
}
function drawLights(){
  const x=800,y=135,on=G.sw.lights&&G.powered;
  ctx.fillStyle='#3f4c69';rr(x-22,y-34,44,66,6);ctx.fill();ctx.strokeStyle='#7e8fb4';ctx.lineWidth=2;rr(x-22,y-34,44,66,6);ctx.stroke();
  ctx.fillStyle='#10182b';rr(x-8,y-18,16,36,6);ctx.fill();ctx.fillStyle=on?'#c58bff':'#6d7893';rr(x-8,on?y-18:y+2,16,16,6);ctx.fill();
  ctx.fillStyle=on?'#f0d36a':'#59607a';ctx.beginPath();ctx.arc(x,y-27,4,0,7);ctx.fill();
}
function drawTray(i){
  const tr=G.trays[i],x=690,y=190+i*85,on=G.sw.lights&&G.powered;
  ctx.fillStyle='rgba(0,0,0,.28)';rr(x-52,y+16,104,10,5);ctx.fill();
  if(on&&tr.state==='grow'){const g=ctx.createRadialGradient(x,y-6,4,x,y-6,70);g.addColorStop(0,'rgba(200,120,255,.30)');g.addColorStop(1,'rgba(200,120,255,0)');ctx.fillStyle=g;ctx.beginPath();ctx.arc(x,y-6,74,0,7);ctx.fill();}
  ctx.fillStyle='#58606f';rr(x-50,y-4,100,26,6);ctx.fill();ctx.fillStyle='#3a2a22';rr(x-45,y-1,90,16,4);ctx.fill();
  if(tr.state==='empty'){ctx.strokeStyle='rgba(255,255,255,.35)';ctx.setLineDash([5,5]);ctx.lineWidth=2;rr(x-45,y-1,90,16,4);ctx.stroke();ctx.setLineDash([]);}
  else{
    const n=5,pr=tr.state==='ripe'?1:tr.prog;
    for(let k=0;k<n;k++){const px=x-36+k*18,h=6+pr*24,sway=Math.sin(FX.t*1.5+k)*(on?1.2:.3);
      ctx.strokeStyle='#3f9a4c';ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(px,y+8);ctx.lineTo(px+sway,y+8-h);ctx.stroke();
      ctx.fillStyle=tr.state==='ripe'?'#d9506a':'#5fd070';ctx.beginPath();ctx.ellipse(px+sway-4,y+8-h,5+pr*4,3+pr*2,-.5,0,7);ctx.fill();ctx.beginPath();ctx.ellipse(px+sway+4,y+8-h+2,5+pr*4,3+pr*2,.5,0,7);ctx.fill();}
    if(tr.state==='ripe'){ctx.fillStyle='rgba(255,230,120,'+(.5+.4*Math.sin(FX.t*5)).toFixed(2)+')';ctx.font='bold 14px Chakra Petch,sans-serif';ctx.textAlign='center';ctx.fillText('READY',x,y-24);}
    else if(!on){ctx.fillStyle='#ff9c8e';ctx.font='bold 11px Chakra Petch,sans-serif';ctx.textAlign='center';ctx.fillText('needs light',x,y-20);}
    else{ctx.fillStyle='#10182b';rr(x-30,y-22,60,6,3);ctx.fill();ctx.fillStyle='#c58bff';rr(x-30,y-22,60*tr.prog,6,3);ctx.fill();}
  }
}
function drawBike(){
  const x=310,y=410;ctx.fillStyle='rgba(0,0,0,.3)';ctx.beginPath();ctx.ellipse(x,y+26,44,8,0,0,7);ctx.fill();
  ctx.strokeStyle='#9aa7c4';ctx.lineWidth=4;ctx.beginPath();ctx.arc(x-24,y+10,16,0,7);ctx.arc(x+24,y+10,16,0,7);ctx.stroke();
  ctx.strokeStyle='#ff6a2b';ctx.lineWidth=5;ctx.beginPath();ctx.moveTo(x-24,y+10);ctx.lineTo(x,y-14);ctx.lineTo(x+24,y+10);ctx.moveTo(x,y-14);ctx.lineTo(x-8,y-26);ctx.moveTo(x+10,y-4);ctx.lineTo(x+16,y-26);ctx.stroke();
  const run=G.act&&G.act.kind==='exer';ctx.save();ctx.translate(x,y+10);ctx.rotate(run?FX.t*8:0);ctx.strokeStyle='#cfd6e6';ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(-8,0);ctx.lineTo(8,0);ctx.stroke();ctx.restore();
}
function drawBunks(){
  const x=110,y=470;
  ctx.fillStyle='rgba(0,0,0,.28)';rr(x-60,y+14,130,12,6);ctx.fill();
  for(let k=0;k<2;k++){const bx=x-56+k*66;ctx.fillStyle='#46536f';rr(bx,y-26,58,44,6);ctx.fill();ctx.fillStyle=k?'#3b7fb8':'#b8603b';rr(bx+3,y-23,52,22,5);ctx.fill();}
  astro(x-26,y-2,{face:'down',sit:true,chest:'#b8603b',suit:'#e9eef8'});
  astro(x+40,y-2,{face:'down',sit:true,chest:'#3b7fb8',suit:'#e9eef8'});
  if(Math.sin(FX.t*.9)>.92){ctx.fillStyle='#fff';ctx.font='bold 14px Chakra Petch,sans-serif';ctx.textAlign='center';ctx.fillText('Go, '+(G.S.key==='moon'?'team':'crew')+'!',x+6,y-70);}
}

/* effects */
function addPart(x,y,vx,vy,life,size,col,g){FX.parts.push({x,y,vx,vy,life,max:life,size,col,g:g||0});}
function dustPuff(x,y,n){if(reduceMotion)return;const c=G.site==='mars'?'200,140,100':'200,200,210';for(let i=0;i<(n||2);i++)addPart(x+(Math.random()-.5)*10,y+2,(Math.random()-.5)*26,-8-Math.random()*14,.7+Math.random()*.4,3+Math.random()*4,c,-10);}
function sparkle(x,y,col){for(let i=0;i<14;i++){const a=Math.random()*7,s=40+Math.random()*80;addPart(x,y,Math.cos(a)*s,Math.sin(a)*s-30,.6+Math.random()*.4,2+Math.random()*2.4,col||'255,230,120',60);}}
function floatText(x,y,text,col){FX.floats.push({x,y,text,col:col||'#fff',life:1.6});}
function updateFx(dt){
  FX.t+=dt;
  for(const p of FX.parts){p.life-=dt;p.x+=p.vx*dt;p.y+=p.vy*dt;p.vy+=p.g*dt;}
  FX.parts=FX.parts.filter(p=>p.life>0);
  for(const f of FX.floats){f.life-=dt;f.y-=26*dt;}
  FX.floats=FX.floats.filter(f=>f.life>0);
  FX.shake=Math.max(0,FX.shake-dt*2.2);FX.flash=Math.max(0,FX.flash-dt*2);
  if(G&&G.p.moving&&G.scene==='out'){FX.footT-=dt;if(FX.footT<=0){FX.footT=.22;FX.foot.push({x:G.p.x+(FX.foot.length%2?5:-5),y:G.p.y+2,a:1});if(FX.foot.length>140)FX.foot.shift();dustPuff(G.p.x,G.p.y,1);}}
  for(const f of FX.foot)f.a=Math.max(0,f.a-dt*.02);
  const storming=G&&G.storms.some(s=>s.active);
  if(storming&&!reduceMotion&&G.scene==='out'&&FX.streaks.length<110){for(let i=0;i<4;i++)FX.streaks.push({x:Math.random()*(W+200),y:-20-Math.random()*H*.4,v:700+Math.random()*500,l:30+Math.random()*50});}
  for(const s of FX.streaks){s.x-=s.v*.45*dt;s.y+=s.v*dt;}
  FX.streaks=FX.streaks.filter(s=>s.y<H+60&&storming);
}

/* main draw */
function viewZoom(){
  const aw=W-VIEW.padL,ah=H-VIEW.padT;
  if(G.scene==='in')return Math.max(Math.min(aw/940,ah/600),Math.min(1.1,aw/660));
  return clamp(Math.min(aw,ah*1.7)/1500,.55,1);
}
function followCam(dt,snap){
  layoutView();
  const z=viewZoom();cam.z=snap?z:cam.z+(z-cam.z)*Math.min(1,dt*6);
  let tx=G.p.x,ty=G.p.y-20,vw=(W-VIEW.padL)/cam.z,vh=(H-VIEW.padT)/cam.z;
  const B=G.scene==='in'?{x:0,y:0,w:900,h:580}:{x:0,y:0,w:SIM.WORLD.w,h:SIM.WORLD.h};
  tx=vw>=B.w?B.w/2:clamp(tx,B.x+vw/2,B.x+B.w-vw/2);
  ty=vh>=B.h?B.h/2:clamp(ty,B.y+vh/2,B.y+B.h-vh/2);
  const k=snap?1:Math.min(1,dt*5);cam.x+=(tx-cam.x)*k;cam.y+=(ty-cam.y)*k;
}
function drawWorld(){
  ctx.setTransform(1,0,0,1,0,0);ctx.fillStyle=G.scene==='in'?'#0b1020':'#05070d';ctx.fillRect(0,0,cv.width,cv.height);
  let sx=0,sy=0;if(FX.shake>0&&!reduceMotion){sx=(Math.random()-.5)*FX.shake*14;sy=(Math.random()-.5)*FX.shake*14;}
  ctx.setTransform(DPR*cam.z,0,0,DPR*cam.z,DPR*(VIEW.cx-cam.x*cam.z+sx),DPR*(VIEW.cy-cam.y*cam.z+sy));
  if(G.scene==='in')drawInterior();else drawOutside();
  /* particles and text */
  for(const p of FX.parts){ctx.fillStyle='rgba('+p.col+','+(Math.max(0,p.life/p.max)*.8).toFixed(2)+')';ctx.beginPath();ctx.arc(p.x,p.y,p.size*(G.scene==='in'?1:(1.3-p.life/p.max*.4)),0,7);ctx.fill();}
  for(const f of FX.floats){ctx.globalAlpha=Math.min(1,f.life*1.4);ctx.fillStyle='#0b1220';ctx.font='bold 20px Chakra Petch,sans-serif';ctx.textAlign='center';ctx.fillText(f.text,f.x+1.5,f.y+1.5);ctx.fillStyle=f.col;ctx.fillText(f.text,f.x,f.y);ctx.globalAlpha=1;}
  /* hovered or nearby label */
  const hov=(UI.hover&&UI.hover.scene===G.scene&&!UI.hover.got)?UI.hover:nearest();
  if(hov&&!G.act)stationLabel(hov);
  if(G.act)actionRing();
  if(G.target&&!G.target.st&&!G.p.moving===false){ctx.strokeStyle='rgba(255,255,255,.7)';ctx.lineWidth=2;ctx.beginPath();ctx.ellipse(G.target.x,G.target.y,10+Math.sin(FX.t*8)*2,5,0,0,7);ctx.stroke();}
  /* screen space */
  ctx.setTransform(DPR,0,0,DPR,0,0);
  overlays();pointers();
}
function nearest(){
  let best=null,bd=1e9;for(const s of SIM.stationsHere(G)){const d=Math.hypot(s.x-G.p.x,s.y-G.p.y);if(d<s.r*1.05&&d<bd){best=s;bd=d;}}return best;
}
function stationLabel(s){
  const label=s.kind==='rock'?'Rock sample':s.label;
  let sub='';
  if(s.kind==='panel'){const p=G.panels[s.i];sub=p.fault?'Tripped: reset it':p.dust>.1?'Dusty: '+Math.round(p.dust*100)+'% covered':'Clean';}
  else if(s.kind==='scrub')sub=G.filter<40?'Filter worn: replace':G.sw.scrub?'ON (tap to switch off)':'OFF (tap to switch on)';
  else if(s.kind==='lights')sub=G.sw.lights?'ON (tap to switch off)':'OFF (tap to switch on)';
  else if(s.kind==='comms')sub=G.sw.dish?'ON (tap to switch off)':'OFF: no storm warnings';
  else if(s.kind==='tray'){const t=G.trays[s.i];sub=t.state==='empty'?'Plant seeds':t.state==='ripe'?'Harvest!':'Growing '+Math.round(t.prog*100)+'%';}
  else if(s.kind==='lab')sub=G.p.carry>0?'Run an experiment':'Needs a rock sample';
  else if(s.kind==='bike')sub='Keep bones and muscles strong';
  else if(s.kind==='airlock')sub=G.scene==='out'?'Go inside':(G.res.suit<G.M.suitNeed?'Suit charging '+Math.round(G.res.suit)+'%':'Go outside');
  else if(s.kind==='rock')sub='Tap to collect';
  ctx.font='bold 14px Chakra Petch,sans-serif';const w1=ctx.measureText(label).width;ctx.font='12px Atkinson Hyperlegible,sans-serif';const w2=ctx.measureText(sub).width;
  const w=Math.max(w1,w2)+20,x=s.x,y=s.y-(s.kind==='rock'?36:s.r*.9+32);
  ctx.fillStyle='rgba(11,18,32,.9)';ctx.strokeStyle='#ff6a2b';ctx.lineWidth=1.5;rr(x-w/2,y-20,w,38,8);ctx.fill();ctx.stroke();
  ctx.fillStyle='#fff';ctx.font='bold 14px Chakra Petch,sans-serif';ctx.textAlign='center';ctx.fillText(label,x,y-4);ctx.fillStyle='#a3b0c7';ctx.font='12px Atkinson Hyperlegible,sans-serif';ctx.fillText(sub,x,y+11);
}
function actionRing(){
  const a=G.act,p=G.p,pr=a.t/a.dur,x=p.x,y=p.y-76;
  ctx.fillStyle='rgba(11,18,32,.9)';ctx.beginPath();ctx.arc(x,y,17,0,7);ctx.fill();
  ctx.strokeStyle='rgba(255,255,255,.2)';ctx.lineWidth=5;ctx.beginPath();ctx.arc(x,y,12,0,7);ctx.stroke();
  ctx.strokeStyle='#ff6a2b';ctx.lineWidth=5;ctx.lineCap='round';ctx.beginPath();ctx.arc(x,y,12,-Math.PI/2,-Math.PI/2+pr*Math.PI*2);ctx.stroke();
}
function drawOutside(){
  ctx.drawImage(CACHE.ground[G.site],0,0);
  for(const f of FX.foot){ctx.fillStyle='rgba(0,0,0,'+(f.a*.28).toFixed(3)+')';ctx.beginPath();ctx.ellipse(f.x,f.y,4,2,0,0,7);ctx.fill();}
  /* shelter pointer ring */
  const items=[];
  items.push({y:SIM.HAB.y+SIM.HAB.r*.8,f:drawHab},{y:900,f:drawLander},{y:560,f:drawDish});
  G.panels.forEach((p,i)=>items.push({y:p.y+20,f:()=>drawPanel(i)}));
  for(const r of G.rocks)if(!r.got)items.push({y:r.y,f:()=>drawRock(r)});
  items.push({y:G.p.y,f:()=>astro(G.p.x,G.p.y,{face:G.p.face,walk:G.p.walk,moving:G.p.moving,carry:G.p.carry,hop:G.S.hop*5})});
  items.sort((a,b)=>a.y-b.y).forEach(i=>i.f());
  const h=SIM.hint(G);if(h&&h.at&&h.at.scene==='out')drawPointerRing(h.at.x,h.at.y,'#ffd166');
}
function overlays(){
  const S=sunInfo();
  if(G.scene==='out'){
    const night=1-clamp(S.s*3.2,0,1);
    if(night>0.02){ctx.fillStyle='rgba(6,10,36,'+(night*.62).toFixed(3)+')';ctx.fillRect(0,0,W,H);}
    if(S.s>.01&&S.s<.3){ctx.fillStyle='rgba(255,120,40,'+((.3-S.s)*.35).toFixed(3)+')';ctx.fillRect(0,0,W,H);}
    if(G.site==='mars'){ctx.fillStyle='rgba(255,150,90,.06)';ctx.fillRect(0,0,W,H);}
    if(G.t<G.dustUntil){ctx.fillStyle='rgba(196,130,80,.38)';ctx.fillRect(0,0,W,H);}
  }
  if(G.blackout){ctx.fillStyle='rgba(2,4,12,.55)';ctx.fillRect(0,0,W,H);if(Math.sin(FX.t*3)>0){ctx.fillStyle='rgba(255,60,60,.1)';ctx.fillRect(0,0,W,H);}}
  const storm=G.storms.find(s=>s.active);
  if(storm){
    const gr=ctx.createRadialGradient(W/2,H/2,Math.min(W,H)*.25,W/2,H/2,Math.max(W,H)*.75);
    const amt=G.scene==='out'?.5:.22;gr.addColorStop(0,'rgba(255,40,80,0)');gr.addColorStop(1,'rgba(255,40,80,'+(amt+.15*Math.sin(FX.t*6)).toFixed(2)+')');ctx.fillStyle=gr;ctx.fillRect(0,0,W,H);
    ctx.strokeStyle='rgba(255,215,90,.8)';ctx.lineWidth=2;ctx.beginPath();for(const s of FX.streaks){ctx.moveTo(s.x,s.y);ctx.lineTo(s.x+s.l*.45,s.y-s.l);}ctx.stroke();
  }
  if(FX.flash>0){ctx.fillStyle='rgba(255,255,255,'+(FX.flash*.5).toFixed(2)+')';ctx.fillRect(0,0,W,H);}
}
function pointers(){
  const ptr=(wx,wy,col,label)=>{
    const s=w2s(wx,wy),m=46;
    const on=s.x>m&&s.x<W-m&&s.y>m&&s.y<H-m;
    ctx.fillStyle=col;ctx.strokeStyle='#0b1220';ctx.lineWidth=3;
    if(on){const bob=Math.sin(FX.t*6)*5;ctx.beginPath();ctx.moveTo(s.x,s.y-44+bob);ctx.lineTo(s.x-11,s.y-62+bob);ctx.lineTo(s.x+11,s.y-62+bob);ctx.closePath();ctx.stroke();ctx.fill();
      if(label){ctx.font='bold 13px Chakra Petch,sans-serif';ctx.textAlign='center';ctx.lineWidth=4;ctx.strokeText(label,s.x,s.y-70+bob);ctx.fillText(label,s.x,s.y-70+bob);}}
    else{const a=Math.atan2(s.y-VIEW.cy,s.x-VIEW.cx),ex=clamp(VIEW.cx+Math.cos(a)*W,m+VIEW.padL,W-m),ey=clamp(VIEW.cy+Math.sin(a)*H,m+30+VIEW.padT,H-m);ctx.save();ctx.translate(ex,ey);ctx.rotate(a);ctx.beginPath();ctx.moveTo(14,0);ctx.lineTo(-10,-11);ctx.lineTo(-10,11);ctx.closePath();ctx.stroke();ctx.fill();ctx.restore();}
  };
  const alarm=G.storms.some(s=>s.active||(s.warned&&!s.done));
  if(alarm&&G.zone!=='cellar'){
    if(G.scene==='out'){const a=G.stations.find(s=>s.id==='airlock-out');ptr(a.x,a.y,'#ff5a6e','SHELTER');}
    else ptr(SIM.CELLAR.x+SIM.CELLAR.w/2,SIM.CELLAR.y+SIM.CELLAR.h/2,'#ff5a6e','CELLAR');
  }else{const h=SIM.hint(G);if(h&&h.at&&h.at.scene===G.scene&&G.scene==='in')ptr(h.at.x,h.at.y,'#ffd166',null);else if(h&&h.at&&h.at.scene==='out'&&G.scene==='out')ptr(h.at.x,h.at.y,'#ffd166',null);}
}

/* landing cinematic */
const CINE_LEN=10.5;
function drawCine(t){
  ctx.setTransform(DPR,0,0,DPR,0,0);
  const moon=G.site==='moon';
  const sky=ctx.createLinearGradient(0,0,0,H);sky.addColorStop(0,'#02030a');sky.addColorStop(1,'#0b1230');ctx.fillStyle=sky;ctx.fillRect(0,0,W,H);
  const r=SIM.mulberry(5);ctx.fillStyle='#fff';for(let i=0;i<120;i++){ctx.globalAlpha=.3+r()*.7;ctx.fillRect(r()*W,r()*H*(t<3.4?1:.65),1+r()*1.4,1+r()*1.4);}ctx.globalAlpha=1;
  const planet=(x,y,R,c1,c2)=>{const g=ctx.createRadialGradient(x-R*.35,y-R*.35,R*.1,x,y,R);g.addColorStop(0,c1);g.addColorStop(1,c2);ctx.fillStyle=g;ctx.beginPath();ctx.arc(x,y,R,0,7);ctx.fill();};
  const ease=x=>x<0?0:x>1?1:x*x*(3-2*x);
  if(t<3.6){
    const k=ease(t/3.4),ER=Math.min(W,H)*.36;
    const ex=-ER*.2-k*ER*.6,ey=H*.62+k*ER*.3;
    planet(ex,ey,ER,'#6fb7ff','#0c2a66');
    ctx.fillStyle='rgba(70,200,120,.55)';ctx.beginPath();ctx.ellipse(ex+ER*.45,ey-ER*.2,ER*.18,ER*.12,.5,0,7);ctx.ellipse(ex+ER*.2,ey+ER*.3,ER*.2,ER*.1,-.3,0,7);ctx.fill();
    ctx.strokeStyle='rgba(120,190,255,.45)';ctx.lineWidth=6;ctx.beginPath();ctx.arc(ex,ey,ER+4,-1,.4);ctx.stroke();
    const DR=Math.min(W,H)*(.06+.18*k),dx=W*.78,dy=H*.3;
    if(moon)planet(dx,dy,DR,'#e3e6ee','#6a707e');else planet(dx,dy,DR,'#e08a58','#7a3a22');
    const rx=W*.18+k*(dx-W*.18-DR*.9),ry=H*.62-Math.sin(k*Math.PI*.8)*H*.28-k*(H*.62-dy)*.8;
    ctx.strokeStyle='rgba(255,200,120,.35)';ctx.lineWidth=3;ctx.setLineDash([2,8]);ctx.beginPath();ctx.moveTo(W*.18,H*.62);ctx.quadraticCurveTo(W*.4,H*.1,rx,ry);ctx.stroke();ctx.setLineDash([]);
    ctx.save();ctx.translate(rx,ry);ctx.rotate(.9);ctx.fillStyle='#e9edf6';rr(-6,-16,12,30,4);ctx.fill();ctx.fillStyle='#ff6a2b';ctx.beginPath();ctx.moveTo(-6,-16);ctx.lineTo(0,-28);ctx.lineTo(6,-16);ctx.fill();ctx.fillStyle='#ffb347';ctx.beginPath();ctx.moveTo(-4,14);ctx.lineTo(0,14+14+Math.random()*6);ctx.lineTo(4,14);ctx.fill();ctx.restore();
  }else{
    const k=ease((t-3.4)/4.4),gy=H*.78;
    const gr=ctx.createLinearGradient(0,gy-80,0,H);gr.addColorStop(0,moon?'#80869a':'#c07048');gr.addColorStop(1,moon?'#3e4352':'#6a3220');
    ctx.fillStyle=moon?'#555b6c':'#8d4a30';ctx.beginPath();ctx.moveTo(0,gy-30);for(let x=0;x<=W;x+=40)ctx.lineTo(x,gy-30-Math.sin(x*.01+1)*26-Math.sin(x*.027)*12);ctx.lineTo(W,H);ctx.lineTo(0,H);ctx.fill();
    ctx.fillStyle=gr;ctx.fillRect(0,gy,W,H-gy);
    const r2=SIM.mulberry(9);for(let i=0;i<22;i++){const cx=r2()*W,cy=gy+10+r2()*(H-gy-10),R=10+r2()*34;ctx.fillStyle='rgba(0,0,0,.2)';ctx.beginPath();ctx.ellipse(cx,cy,R,R*.35,0,0,7);ctx.fill();}
    const lx=W*.5,ly=-80+k*(gy-10+80-60)+(t>7.8?0:0),land=t>=7.8;
    const sc=Math.min(1.4,Math.min(W,H)/420);
    if(!land){ctx.fillStyle='rgba(0,0,0,'+(.15+.2*k).toFixed(2)+')';ctx.beginPath();ctx.ellipse(lx,gy+20,40*sc*(.5+k*.6),10*sc*(.5+k*.6),0,0,7);ctx.fill();}
    const fy=land?gy-10:ly;
    ctx.save();ctx.translate(lx,fy);ctx.scale(sc,sc);
    if(!land){const fl=18+Math.random()*14;const g2=ctx.createLinearGradient(0,10,0,10+fl*2);g2.addColorStop(0,'#fff3b0');g2.addColorStop(.5,'#ff9a3c');g2.addColorStop(1,'rgba(255,80,0,0)');ctx.fillStyle=g2;ctx.beginPath();ctx.moveTo(-9,8);ctx.lineTo(0,10+fl*2);ctx.lineTo(9,8);ctx.fill();}
    ctx.strokeStyle='#8a91a4';ctx.lineWidth=4;for(const dx of[-34,34]){ctx.beginPath();ctx.moveTo(dx*.4,-8);ctx.lineTo(dx,22);ctx.stroke();ctx.fillStyle='#5d6477';ctx.fillRect(dx-8,21,16,4);}
    const gb=ctx.createLinearGradient(-28,-40,28,10);gb.addColorStop(0,'#e8c35c');gb.addColorStop(1,'#a77e22');ctx.fillStyle=gb;ctx.strokeStyle='#6e5314';ctx.lineWidth=2;rr(-28,-36,56,42,12);ctx.fill();ctx.stroke();
    ctx.fillStyle='#2b3350';rr(-12,-30,24,16,6);ctx.fill();ctx.restore();
    if(t>7.2){const p=ease((t-7.2)/1.2);for(let i=0;i<26;i++){const a=i/26*Math.PI*2,d=p*(60+(i%5)*26)*sc;ctx.fillStyle='rgba('+(moon?'190,190,200':'200,140,100')+','+((1-p)*.55).toFixed(2)+')';ctx.beginPath();ctx.arc(lx+Math.cos(a)*d*1.8,gy+16+Math.sin(a)*d*.18,8+p*14,0,7);ctx.fill();}}
    if(t>8.4){const wp=ease((t-8.4)/1.6);astro(lx+40*sc+wp*80*sc,gy+14,{face:'right',walk:t*7,moving:wp<1,hop:G.S.hop*5});}
  }
  const el=$('cineText');
  let txt,sub;
  if(t<3.6){txt=moon?'Launch from Earth':'Launch from Earth';sub=moon?'The trip to the Moon takes about 3 days.':'The trip to Mars takes about 7 months.';}
  else if(t<7.6){txt='Landing at '+G.S.place;sub=moon?'Radio messages take about 1.3 seconds each way.':'Radio messages take 3 to 22 minutes each way.';}
  else{txt='Welcome to '+G.S.name;sub='Your crew is resting. You are the one who works outside. Keep everyone alive for '+G.M.days+' days.';}
  if(el.dataset.k!==txt){el.dataset.k=txt;el.innerHTML='<b>'+txt+'</b><span>'+sub+'</span>';}
}
