(()=>{
'use strict';
/* ================= YouTube Playables SDK (safe if missing) ================= */
const YT=window.ytgame, yt=f=>{try{f()}catch(e){}};
const L={tap:'TAP TO HOP',hint:'Swipe sideways · Escape the eagle!',over:'GAME OVER',best:'Best',rec:'NEW RECORD!',again:'Tap to play again',died:'YOU LOST',score:'Score',left:'Continues left',watch:'WATCH AD TO CONTINUE',restart:'RESTART (SCORE 0)',adTitle:'PLAYABLES AD',adEnds:'Ad ends in',adReward:'Reward: continue with your score'};

const cv=document.getElementById('c'),g=cv.getContext('2d');
let W,H,T,D,HH,baseY,bz,zbDz;const K=0.028;
let camx=0,camz=0,camF=0,camA=0,time=0,paused=false,audioOn=true,soundOn=true;
let state='menu',rows=new Map(),gen,px,pz,pxv,pzv,hv,hop,queue,onLog,logOff,score,runCoins,started,dead,shake=0,pop=0,overT=0,newRec=false,parts=[],view=0,sky=[135,206,250];
let revives=0,offer=false,ended=false,adT=0;const MAX_REV=3,AD_TIME=5;
const save={best:0,coins:0,skin:0,own:1};

/* ================= Palettes / skins ================= */
const BI=[
{g:[104,196,84],g2:[116,208,94],sky:[135,206,250],leaf:[52,150,70],trunk:[130,88,52],k:0},
{g:[232,196,116],g2:[240,206,130],sky:[255,214,160],leaf:[78,160,84],trunk:[78,160,84],k:1},
{g:[236,244,252],g2:[222,234,246],sky:[170,200,235],leaf:[44,118,104],trunk:[110,80,60],k:2},
{g:[170,206,120],g2:[182,216,132],sky:[255,196,220],leaf:[255,150,185],trunk:[120,78,60],k:0}];
const CC=[[230,70,70],[70,130,230],[245,190,50],[150,90,210],[60,190,140],[240,120,40]];
const DIRT=[122,86,56];
const SK=[['White',0,[245,245,240],[230,60,60]],['Chick',10,[255,214,70],[255,130,40]],
['Pinky',30,[255,150,190],[255,70,120]],['Blue',60,[120,200,255],[40,120,220]],['Ninja',100,[60,60,70],[255,200,60]]];
const owned=i=>(save.own>>i)&1;

/* ================= Persistence ================= */
function persist(){const s=JSON.stringify(save);if(YT)yt(()=>YT.game.saveData(s));else try{localStorage.setItem('vh',s)}catch(e){}}
function load(cb){
 const ok=s=>{try{if(s)Object.assign(save,JSON.parse(s))}catch(e){}view=save.skin;cb()};
 if(YT){try{YT.game.loadData().then(ok).catch(()=>ok())}catch(e){ok()}}
 else{let s=null;try{s=localStorage.getItem('vh')}catch(e){}ok(s)}
}

/* ================= Audio (synthesized) ================= */
let ac,nb;
const silent=()=>paused||document.hidden; // YouTube pause or tab/app minimized
function actx(){if(!ac){try{ac=new(window.AudioContext||window.webkitAudioContext)()}catch(e){}}if(ac&&ac.state==='suspended'&&!silent())ac.resume();return ac}

/* ================= Background music (audio/music.ogg, looped) =================
   Rules: plays only while a run is in progress (state 'play'); paused on death, on ad, on YouTube pause,
   when the app is minimized/hidden, and when the system or in-game sound is off.
   Rewinds to 0:00 on Game Over so every new run starts the song from the beginning. */
const MUSIC_VOL=.45;
let unlocked=false,musicBusy=false,musicRetryAt=0;
const music=(()=>{try{const a=new Audio('music.ogg');a.loop=true;a.preload='auto';a.volume=MUSIC_VOL;return a}catch(e){return null}})();
function musicSync(){
 if(ac){ // also freeze/unfreeze the SFX audio context
  if(silent()){if(ac.state==='running')ac.suspend().catch(()=>{})}
  else if(ac.state==='suspended'&&unlocked)ac.resume().catch(()=>{});
 }
 if(!music)return;
 const want=state==='play'&&!silent()&&audioOn&&soundOn;
 if(want){
  if(unlocked&&music.paused&&!musicBusy&&performance.now()>=musicRetryAt){
   musicBusy=true;
   try{const p=music.play();if(p&&p.then)p.then(()=>{musicBusy=false}).catch(()=>{musicBusy=false;musicRetryAt=performance.now()+1000});else musicBusy=false}
   catch(e){musicBusy=false;musicRetryAt=performance.now()+1000}
  }
 }else if(!music.paused)music.pause();
}
function musicRewind(){if(music){try{music.currentTime=0}catch(e){}}}
function musicStop(){if(music){if(!music.paused)music.pause();musicRewind()}}
function tone(f,d,type,v,f2){
 if(!soundOn||!audioOn)return;const a=actx();if(!a)return;const t=a.currentTime,o=a.createOscillator(),n=a.createGain();
 o.type=type||'square';o.frequency.setValueAtTime(f,t);if(f2)o.frequency.exponentialRampToValueAtTime(f2,t+d);
 n.gain.setValueAtTime(v||.06,t);n.gain.exponentialRampToValueAtTime(.001,t+d);o.connect(n);n.connect(a.destination);o.start(t);o.stop(t+d);
}
function noise(d,v){
 if(!soundOn||!audioOn)return;const a=actx();if(!a)return;
 if(!nb){nb=a.createBuffer(1,a.sampleRate*.5,a.sampleRate);const q=nb.getChannelData(0);for(let i=0;i<q.length;i++)q[i]=Math.random()*2-1}
 const s=a.createBufferSource(),n=a.createGain();s.buffer=nb;n.gain.setValueAtTime(v||.12,a.currentTime);n.gain.exponentialRampToValueAtTime(.001,a.currentTime+d);
 s.connect(n);n.connect(a.destination);s.start();
}
const PENT=[0,2,4,7,9];
function sfxHop(back){const n=score;tone(back?180:330*Math.pow(2,(PENT[n%5]+12*((n/5|0)%2))/12),.09,'square',.05)}
function sfxCoin(){tone(880,.08,'square',.05);setTimeout(()=>tone(1320,.14,'square',.05),70)}
function sfxMile(){[523,659,784,1047].forEach((f,i)=>setTimeout(()=>tone(f,.12,'triangle',.08),i*70))}

/* ================= World ================= */
function resize(){
 const dpr=Math.min(window.devicePixelRatio||1,2);W=innerWidth;H=innerHeight;cv.width=W*dpr;cv.height=H*dpr;g.setTransform(dpr,0,0,dpr,0,0);
 T=Math.min(W/8,H/9.5);D=T*.62;HH=T*.8;baseY=H*.66;
 let q=(H*.96-baseY)/D;bz=-q/(1+q*K);q=(H+80-baseY)/D;zbDz=-q/(1+q*K);
}
addEventListener('resize',resize);

function makeRow(z){
 const b=Math.max(0,Math.floor(z/40))%4,d=Math.min(1,z/250);let t='g';
 if(z>2){const r=Math.random(),p=gen.prev;
  if(p==='g')t=gen.run>=3?(r<.65?'r':'w'):(r<.5?'r':r<.7+d*.08?'w':'g');
  else if(p==='r')t=(gen.run<4&&r<.5)?'r':(r<.82?'g':'w');
  else t=(gen.run<3&&r<.55)?'w':'g';}
 gen.run=t===gen.prev?gen.run+1:1;
 const row={t,b,trees:[],objs:[],coin:null,dir:1};
 if(t==='g'){
  let last=false;
  for(let x=-4;x<=4;x++){const tr=z!==0&&x!==gen.safe&&!last&&Math.random()<(z<3?.1:.2);last=tr;if(tr)row.trees.push({x,s:.85+Math.random()*.4})}
  for(let x=5;x<=14;x++){if(Math.random()<.55)row.trees.push({x,s:.9+Math.random()*.6});if(Math.random()<.55)row.trees.push({x:-x,s:.9+Math.random()*.6})}
  if(z>2&&Math.random()<.16){const c=Math.floor(Math.random()*9)-4;if(!row.trees.some(q=>q.x===c))row.coin=c}
 }else{
  gen.safe=Math.max(-3,Math.min(3,gen.safe+Math.floor(Math.random()*5)-2));
  gen.dir=Math.random()<.2?gen.dir:-gen.dir;const dir=row.dir=gen.dir;
  if(t==='r'){
   const n=2+(Math.random()*3|0),sp=26/n,off=Math.random()*1.5,v=dir*(1.8+Math.random()*1.5+d*2.2);
   for(let i=0;i<n;i++)row.objs.push({x:-13+i*sp+off,w:Math.random()<.25?2.6:1.5,v,c:CC[Math.random()*CC.length|0]});
   if(Math.random()<.08)row.coin=Math.floor(Math.random()*9)-4;
  }else{
   const n=d>.5?4:5,sp=26/n,off=Math.random()*1.5,v=dir*(1.1+Math.random()*.9+d*1.2);
   for(let i=0;i<n;i++)row.objs.push({x:-13+i*sp+off,w:2+(Math.random()*2|0),v});
  }
 }
 gen.prev=t;return row;
}
function ensure(z){while(gen.z<z){gen.z++;rows.set(gen.z,makeRow(gen.z))}}
function reset(){
 rows.clear();gen={z:-14,prev:'g',run:0,safe:0,dir:1};
 px=pxv=0;pz=pzv=0;hv=.3;hop=null;queue=null;onLog=null;logOff=0;score=0;runCoins=0;started=false;
 camx=0;camz=camF=camA=0;dead=null;shake=0;parts=[];newRec=false;revives=0;offer=false;ended=false;adT=0;ensure(40);musicRewind();
}

/* ================= Gameplay ================= */
function tryHop(dx,dz){
 if(state!=='play')return;
 if(hop){queue=[dx,dz];return}
 let tx=Math.max(-4,Math.min(4,Math.round(px)+dx)),tz=pz+dz;
 const r=rows.get(tz);if(!r)return;
  hop={fx:px,fz:pz,tx,tz,t:0};onLog=null;started=true;sfxHop(dz<0);
}
function land(){
 px=hop.tx;pz=hop.tz;hop=null;const r=rows.get(pz);
 if(r.t==='w'){const o=r.objs.find(o=>Math.abs(o.x-px)<o.w/2+.1);if(o){onLog=o;logOff=px-o.x}else{pxv=px;pzv=pz;return die('water')}}
 if(pz>score){score=pz;pop=1;if(score%25===0){sfxMile();pop=1.6}}
 if(r.coin!==null&&r.coin===px){r.coin=null;runCoins++;sfxCoin();const p=P(px,pz,.6);spawn(p[0],p[1],'#ffd23f',12)}
 if(queue){const q=queue;queue=null;tryHop(q[0],q[1])}
}
function die(c){
 if(state!=='play')return;
 state='dead';dead={cause:c,t:0};overT=0;shake=.6;hop=null;queue=null;musicSync();
 const p=P(pxv,pzv,.4);
 if(c==='car'){noise(.3,.14);tone(120,.3,'sawtooth',.09,40)}
 else if(c==='eagle'){tone(900,.45,'sawtooth',.06,200)}
 else{noise(.4,.1);tone(400,.3,'sine',.1,100)}
 spawn(p[0],p[1],c==='car'||c==='eagle'?'#ffffff':'#5aaaf0',28);
 if(revives<MAX_REV&&ADS.ready()){offer=true;ended=false}else endRun(); // no ad available -> no offer, straight to game over // up to 3 continue offers per run
}
function endRun(){
 offer=false;ended=true;musicStop();
 newRec=score>save.best;if(newRec)save.best=score;save.coins+=runCoins;persist();
 yt(()=>YT.engagement.sendScore({value:score}));
}
function restartNow(){endRun();reset();state='play'}
/* Ad adapter using the official YouTube Playables SDK: ytgame.ads.requestRewardedAd(rewardId) -> Promise<boolean>.
   The SDK has no "is an ad ready?" check, so the offer shows when the API exists; if the request errors, no ad is shown and the game goes to Game Over.
   Testing outside YouTube: open the page with ?demoAd=1 to use a simulated 5s ad. */
const DEMO=/[?&]demoAd=1/.test(location.search),REWARD_ID='continue-run';
const ADS={
 ready(){try{return DEMO||!!(YT&&YT.ads&&typeof YT.ads.requestRewardedAd==='function')}catch(e){return false}},
 show(earned,notEarned,failed){try{YT.ads.requestRewardedAd(REWARD_ID).then(r=>r?earned():notEarned()).catch(failed)}catch(e){failed()}}
};
function startAd(){
 if(!ADS.ready()){endRun();return}
 state='ad';adT=0;musicSync();tone(660,.1,'triangle',.06);
 if(!DEMO)ADS.show(
  ()=>{if(state==='ad')revive()},                 // reward earned: continue with same score
  ()=>{if(state==='ad')state='dead'},             // ad closed early: back to the offer panel
  ()=>{if(state==='ad'){state='dead';endRun()}}); // no ad / error: nothing shown, Game Over
}
function revive(){
 revives++;offer=false;ensure(Math.ceil(camz+34));
 const z0=Math.max(Math.round(pz),Math.ceil(camz+bz+3));let nz=z0,nx=0;
 for(let z=z0;z<=gen.z;z++){const r=rows.get(z);if(!r||r.t!=='g')continue;
  let b=null;for(let x=-4;x<=4;x++){if(r.trees.some(q=>q.x===x))continue;if(b===null||Math.abs(x-px)<Math.abs(b-px))b=x}
  if(b!==null){nz=z;nx=b;break}}
 px=pxv=nx;pz=pzv=nz;hop=null;queue=null;onLog=null;dead=null;shake=0;state='play';musicSync();
 const q=P(pxv,pzv,.4);spawn(q[0],q[1],'#9dff9d',20);sfxMile();
}
function act(dx,dz){
 if(state==='menu'||(state==='dead'&&ended&&overT>.45)){reset();state='play'}
 tryHop(dx,dz);
}
function spawn(x,y,c,n){for(let i=0;i<n;i++){const a=Math.random()*6.28,s=80+Math.random()*260;parts.push({x,y,vx:Math.cos(a)*s,vy:Math.sin(a)*s-200,l:.6+Math.random()*.5,s:(3+Math.random()*5)*T/50,c})}}

function update(dt){
 time+=dt;
 if(state==='ad'&&DEMO){adT+=dt;if(adT>=AD_TIME)revive()}
 for(let z=Math.floor(camz-12);z<=Math.ceil(camz+30);z++){const r=rows.get(z);if(r)for(const o of r.objs){o.x+=o.v*dt;if(o.v>0&&o.x>13)o.x-=26;else if(o.v<0&&o.x<-13)o.x+=26}}
 if(state==='play'){
  if(hop){hop.t+=dt/.115;if(hop.t>=1)land()}
  if(state==='play'&&!hop&&onLog){px=onLog.x+logOff;if(Math.abs(px)>5.3)die('drift')}
 }
 if(state==='play'||state==='dead'){
  if(state==='play'){
   if(hop){pxv=hop.fx+(hop.tx-hop.fx)*hop.t;pzv=hop.fz+(hop.tz-hop.fz)*hop.t}else{pxv=px;pzv=pz}
   const r=rows.get(Math.round(pzv));
   if(r&&r.t==='r'&&!(hop&&Math.sin(Math.PI*hop.t)>.7))for(const o of r.objs)if(Math.abs(o.x-pxv)<o.w/2+.28){die('car');break}
   if(state==='play'&&!hop&&pz<camz+bz+.3)die('eagle');
  }else{dead.t+=dt;overT+=dt}
 }
 if(started&&state==='play')camA+=(.7+Math.min(1,score/250)*.9)*dt;
 camA=Math.max(camA,camz-1.2);camF+=(pzv-camF)*Math.min(1,dt*6);
 camz=Math.max(camz,camF,camA);camx+=(pxv*.85-camx)*Math.min(1,dt*4);
 ensure(Math.ceil(camz+34));
 const tg=BI[Math.max(0,Math.floor(camz/40))%4].sky;for(let i=0;i<3;i++)sky[i]+=(tg[i]-sky[i])*Math.min(1,dt*1.5);
 shake=Math.max(0,shake-dt*2);pop=Math.max(0,pop-dt*4);
 for(const p of parts){p.x+=p.vx*dt;p.y+=p.vy*dt;p.vy+=900*dt;p.l-=dt}
 parts=parts.filter(p=>p.l>0);
}

/* ================= Voxel rendering (Chicken Crossing) ================= */
const shc=new Map();
function sh(c,f){const k=c[0]+','+c[1]+','+c[2]+','+f;let s=shc.get(k);if(!s){s='rgb('+Math.min(255,c[0]*f|0)+','+Math.min(255,c[1]*f|0)+','+Math.min(255,c[2]*f|0)+')';shc.set(k,s)}return s}
function P(x,z,h){const dz=z-camz,sc=1/(1+K*dz);return[W/2+(x-camx)*T*sc,baseY-dz*sc*D-h*HH*sc]}
function quad(a,b,c,d,col){g.fillStyle=col;g.beginPath();g.moveTo(a[0],a[1]);g.lineTo(b[0],b[1]);g.lineTo(c[0],c[1]);g.lineTo(d[0],d[1]);g.closePath();g.fill()}
function box(x,z,w,d,h0,h1,c){
 const x0=x-w/2,x1=x+w/2,z0=z-d/2,z1=z+d/2;
 if(x1<camx)quad(P(x1,z0,h0),P(x1,z1,h0),P(x1,z1,h1),P(x1,z0,h1),sh(c,.68));
 else if(x0>camx)quad(P(x0,z0,h0),P(x0,z1,h0),P(x0,z1,h1),P(x0,z0,h1),sh(c,.68));
 quad(P(x0,z0,h0),P(x1,z0,h0),P(x1,z0,h1),P(x0,z0,h1),sh(c,.86));
 quad(P(x0,z0,h1),P(x1,z0,h1),P(x1,z1,h1),P(x0,z1,h1),sh(c,1.12));
}
function tree(x,z,s,B,gh){
 if(B.k===1){box(x,z,.32,.32,gh,gh+.9*s,B.leaf);box(x-.3,z,.28,.2,gh+.35*s,gh+.5*s,B.leaf);box(x-.38,z,.16,.2,gh+.35*s,gh+.75*s,B.leaf)}
 else if(B.k===2){box(x,z,.22,.22,gh,gh+.35,B.trunk);box(x,z,.9*s,.9*s,gh+.3,gh+.65,B.leaf);box(x,z,.65*s,.65*s,gh+.65,gh+.95,B.leaf);box(x,z,.4*s,.4*s,gh+.95,gh+1.25,B.leaf);box(x,z,.2,.2,gh+1.25,gh+1.4,[255,255,255])}
 else{box(x,z,.26,.26,gh,gh+.45,B.trunk);box(x,z,.9*s,.9*s,gh+.4,gh+.4+.5*s,B.leaf);box(x,z,.55*s,.55*s,gh+.4+.5*s,gh+.4+.8*s,B.leaf)}
}
function car(o,z){
 const d=o.v>0?1:-1,w=o.w,h=.06,x=o.x;
 box(x,z,w,.62,h,h+.18,[40,40,48]);box(x,z,w-.1,.7,h+.14,h+.5,o.c);
 if(w>2){box(x-d*.35,z,w-1.0,.74,h+.5,h+1.05,[232,232,238]);box(x+d*(w/2-.45),z,.8,.7,h+.5,h+.8,[190,225,245])}
 else box(x-d*.1,z,w*.5,.62,h+.5,h+.82,[190,225,245]);
 box(x+d*(w/2-.02),z,.08,.5,h+.2,h+.32,[255,240,150]);
}
function log(o,z){box(o.x,z,o.w,.78,-.2,.12,[150,100,56]);box(o.x,z,o.w-.3,.62,.12,.17,[176,124,72])}
function drawRow(z,r){
 const B=BI[r.b],h=r.t==='g'?.3:r.t==='r'?.04:-.18;
 const sc=1/(1+K*(z+.5-camz)),half=W/(2*T*sc)+4,xa=Math.floor(camx-half),xb=Math.ceil(camx+half);
 const a=P(xa,z-.5,h),b=P(xb,z-.5,h),c=P(xb,z+.5,h),d=P(xa,z+.5,h),lo=P(xa,z-.5,-.6),lo2=P(xb,z-.5,-.6);
 if(r.t==='g'){const m=h-.16;quad(lo,lo2,P(xb,z-.5,m),P(xa,z-.5,m),sh(DIRT,1));quad(P(xa,z-.5,m),P(xb,z-.5,m),b,a,sh(B.g,.8));quad(a,b,c,d,sh(B.g,1));
  for(let x=xa;x<xb;x++)if(((x+z)&1)===0)quad(P(x-.5,z-.5,h),P(x+.5,z-.5,h),P(x+.5,z+.5,h),P(x-.5,z+.5,h),sh(B.g2,1))}
 else if(r.t==='r'){quad(lo,lo2,b,a,sh([60,64,72],.8));quad(a,b,c,d,sh([74,78,88],1));
  const pr=rows.get(z-1);if(pr&&pr.t==='r')for(let x=xa;x<xb;x++)if(x%2===0)quad(P(x-.45,z-.53,h+.01),P(x+.45,z-.53,h+.01),P(x+.45,z-.47,h+.01),P(x-.45,z-.47,h+.01),'#d8d8dc')}
 else{quad(lo,lo2,b,a,sh([30,100,170],1));quad(a,b,c,d,sh([64,156,230],1));
  const off=(time*.6*r.dir)%4;for(let x=Math.floor(xa/4)*4;x<xb;x+=4){const xx=x+off+((z*7)%4+4)%4;quad(P(xx,z-.1,h+.01),P(xx+1.6,z-.1,h+.01),P(xx+1.6,z-.02,h+.01),P(xx,z-.02,h+.01),'#8ccaf5')}}
 if(r.t==='g'){for(const q of r.trees)if(Math.abs(q.x-camx)<half)tree(q.x,z,q.s,B,h)}
 else for(const o of r.objs){if(Math.abs(o.x-camx)>half)continue;r.t==='r'?car(o,z):log(o,z)}
 if(r.coin!==null){const w=.5*Math.abs(Math.cos(time*4))+.08,y=h+.3+Math.sin(time*3+z)*.06;box(r.coin,z,w,.12,y,y+.5,[255,205,60])}
}
function baseH(r){return!r?.3:r.t==='g'?.3:r.t==='r'?.04:.12}
function drawPlayer(){
 let f=1,h,pr=Math.round(pzv),hb=baseH(rows.get(pr));
 if(hop){hb=baseH(rows.get(hop.fz))+(baseH(rows.get(hop.tz))-baseH(rows.get(hop.fz)))*hop.t;h=hb+Math.sin(Math.PI*hop.t)*.55}
 else h=hb+(state==='menu'?.04+Math.sin(time*4)*.04:0);
 if(dead){
  if(dead.cause==='car')f=.16;
  else if(dead.cause==='water'||dead.cause==='drift'){if(dead.t>.35)return;h=hb-dead.t*2.2}
  else if(dead.cause==='eagle'&&dead.t>.5)h=.5+(dead.t-.5)*7-.65;
 }
 const S=SK[state==='menu'?view:save.skin],bd=S[2],cm=S[3],x=pxv,z=pzv,sd=Math.max(0,.3-(h-hb)*.3);
 if(f===1){const s=.3*(1-(h-hb)*.4);quad(P(x-s,z-s,hb+.01),P(x+s,z-s,hb+.01),P(x+s,z+s,hb+.01),P(x-s,z+s,hb+.01),'rgba(0,0,0,'+sd+')')}
 box(x,z+.38,.2,.16,h+.28*f,h+.42*f,[255,170,40]);
 box(x,z,.62,.62,h,h+.62*f,bd);
 box(x-.36,z,.1,.4,h+.1*f,h+.42*f,bd.map(v=>v*.85));box(x+.36,z,.1,.4,h+.1*f,h+.42*f,bd.map(v=>v*.85));
 box(x,z-.36,.3,.12,h+.3*f,h+.58*f,bd);
 box(x,z+.05,.16,.3,h+.62*f,h+.8*f,cm);
 if(dead&&dead.cause==='eagle')eagle(x,z,h+.65);
}
function eagle(x,z,h){
 const fl=Math.sin(time*30)*.25;
 box(x-.95,z,1.2,.5,h+.1+fl,h+.22+fl,[70,45,30]);box(x+.95,z,1.2,.5,h+.1+fl,h+.22+fl,[70,45,30]);
 box(x,z,.5,.8,h,h+.4,[100,66,42]);box(x,z+.5,.3,.3,h+.15,h+.5,[250,250,250]);box(x,z+.68,.14,.12,h+.2,h+.3,[255,190,40]);
}

/* ================= UI ================= */
function txt(s,x,y,sz,col,al){g.font='900 '+sz+'px system-ui,Arial,sans-serif';g.textAlign=al||'center';g.textBaseline='middle';g.lineJoin='round';g.lineWidth=sz*.2;g.strokeStyle='#1b1b2f';g.strokeText(s,x,y);g.fillStyle=col||'#fff';g.fillText(s,x,y)}
function title(s,x,y,sz){g.font='900 '+sz+'px system-ui,Arial,sans-serif';g.textAlign='center';g.textBaseline='middle';for(let i=Math.ceil(sz*.12);i>0;i--){g.fillStyle=i>sz*.06?'#7a2e12':'#a8431a';g.fillText(s,x+i*.6,y+i)}g.lineJoin='round';g.lineWidth=sz*.1;g.strokeStyle='#1b1b2f';g.strokeText(s,x,y);g.fillStyle='#ffd23f';g.fillText(s,x,y)}
function coinIcon(x,y,s){g.fillStyle='#b8860b';g.fillRect(x-s/2,y-s/2,s,s);g.fillStyle='#ffd23f';g.fillRect(x-s/2+s*.14,y-s/2+s*.14,s*.72,s*.72)}
const hit=(r,x,y)=>x>=r.x&&x<=r.x+r.w&&y>=r.y&&y<=r.y+r.h;
function rects(){const y=H*.88;return{snd:{x:W-60,y:12,w:48,h:48},l:{x:W/2-160,y:y-32,w:64,h:64},r:{x:W/2+96,y:y-32,w:64,h:64},m:{x:W/2-90,y:y-32,w:180,h:64}}}
function arrow(r,dir){g.fillStyle='rgba(0,0,0,.35)';g.fillRect(r.x,r.y,r.w,r.h);g.fillStyle='#fff';const cx=r.x+r.w/2,cy=r.y+r.h/2;g.beginPath();g.moveTo(cx+dir*10,cy-14);g.lineTo(cx-dir*10,cy);g.lineTo(cx+dir*10,cy+14);g.fill()}
function sndIcon(r){
 const on=soundOn&&audioOn,cx=r.x+r.w/2,cy=r.y+r.h/2;g.fillStyle='rgba(0,0,0,.35)';g.fillRect(r.x,r.y,r.w,r.h);g.fillStyle='#fff';
 g.fillRect(cx-13,cy-5,7,10);g.beginPath();g.moveTo(cx-6,cy-5);g.lineTo(cx+2,cy-12);g.lineTo(cx+2,cy+12);g.lineTo(cx-6,cy+5);g.fill();
 g.lineWidth=3;g.strokeStyle=on?'#fff':'#ff5a5a';g.beginPath();
 if(on){g.arc(cx+2,cy,8,-.9,.9);g.moveTo(cx+2+15*Math.cos(.9),cy+15*Math.sin(.9));g.arc(cx+2,cy,15,.9,-.9,true)}else{g.moveTo(cx+6,cy-9);g.lineTo(cx+16,cy+9);g.moveTo(cx+16,cy-9);g.lineTo(cx+6,cy+9)}
 g.stroke();
}
function ui(){
 const R=rects(),ss=Math.min(W,H)*.14,pul=1+Math.sin(time*5)*.05;
 sndIcon(R.snd);coinIcon(30,36,20);txt(String(save.coins+(state==='menu'||ended?0:runCoins)),48,36,24,'#fff','left');
 if(state==='play'){
  g.save();g.translate(W/2,H*.09);const sc=1+pop*.35;g.scale(sc,sc);txt(String(score),0,0,ss,'#fff');g.restore();
  txt(L.best+' '+save.best,W/2,H*.09+ss*.78,Math.max(14,ss*.2),'#ffe9a8');
 }
 if(state==='play'&&pzv<camz+bz+3){
  const a=.25+.2*Math.sin(time*14),gr=g.createLinearGradient(0,H*.7,0,H);gr.addColorStop(0,'rgba(255,0,0,0)');gr.addColorStop(1,'rgba(255,30,30,'+a+')');g.fillStyle=gr;g.fillRect(0,H*.7,W,H*.3);
  txt('!',pxv>camx?W*.15:W*.85,H*.8,ss*1.3,'#ff4040');
 }
 if(state==='menu'){
  let ts=Math.min(W*.2,H*.12);g.font='900 '+ts+'px system-ui,Arial,sans-serif';const tw=g.measureText('CROSSING').width;if(tw>W*.86)ts*=W*.86/tw;
  title('CHICKEN',W/2,H*.15,ts);title('CROSSING',W/2,H*.15+ts*.95,ts);
  g.save();g.translate(W/2,H*.68);g.scale(pul,pul);txt(L.tap,0,0,Math.min(W*.07,H*.05)+4,'#fff');g.restore();
  txt(L.hint,W/2,H*.75,Math.min(W*.04,H*.03)+3,'#fff');
  if(save.best)txt(L.best+' '+save.best,W/2,H*.8,Math.min(W*.045,H*.034)+3,'#ffe9a8');
  arrow(R.l,-1);arrow(R.r,1);const lk=!owned(view);
  g.fillStyle='rgba(0,0,0,.35)';g.fillRect(R.m.x,R.m.y,R.m.w,R.m.h);
  txt(SK[view][0],W/2,R.m.y+(lk?20:32),20,'#fff');
  if(lk){coinIcon(W/2-26,R.m.y+46,14);txt(String(SK[view][1]),W/2-14,R.m.y+46,16,save.coins>=SK[view][1]?'#9dff9d':'#ff9d9d','left');}
 }
 if(state==='dead'&&ended&&dead.t>.4){
  const a=Math.min(.55,(dead.t-.4)*1.2),u=Math.min(W,H),t=u*.09,sz=u*.22,b=u*.065,c=u*.055,gp=u*.045,ag=u*.05;
  const tot=t+sz*.85+b+(runCoins?c:0)+ag+gp*(runCoins?4:3);
  let y=H/2-tot/2;
  g.fillStyle='rgba(10,10,30,'+a+')';g.fillRect(0,0,W,H);g.globalAlpha=Math.min(1,(dead.t-.4)*3);
  txt(L.over,W/2,y+t/2,t,'#ff8a65');y+=t+gp;
  txt(String(score),W/2,y+sz*.42,sz,'#fff');y+=sz*.85+gp;
  txt(newRec?L.rec:L.best+' '+save.best,W/2,y+b/2,b,newRec?'#ffd23f':'#ffe9a8');y+=b+gp;
  if(runCoins){coinIcon(W/2-c*1.2,y+c/2,c*.9);txt('+'+runCoins,W/2-c*.6,y+c/2,c,'#ffd23f','left');y+=c+gp}
  if(overT>.45){g.save();g.translate(W/2,y+gp+ag/2);g.scale(pul,pul);txt(L.again,0,0,ag,'#fff');g.restore()}
  g.globalAlpha=1;
 }
 if(state==='dead'&&offer&&dead.t>.5)drawOffer();
 if(state==='ad'&&DEMO)drawAd();
}
/* ---- Continue panel + ad overlay ---- */
function rr(x,y,w,h,r){g.beginPath();g.moveTo(x+r,y);g.arcTo(x+w,y,x+w,y+h,r);g.arcTo(x+w,y+h,x,y+h,r);g.arcTo(x,y+h,x,y,r);g.arcTo(x,y,x+w,y,r);g.closePath()}
const fit=(s,maxW,sz)=>Math.min(sz,maxW/(s.length*.64));
function offerRects(){
 const w=W>H?W*.5:W*.88,h=Math.max(H*.5,Math.min(H*.92,250)),x=(W-w)/2,y=(H-h)/2,bh=h*.17;
 return{x,y,w,h,b1:{x:x+w*.08,y:y+h*.52,w:w*.84,h:bh},b2:{x:x+w*.08,y:y+h*.76,w:w*.84,h:bh*.9}};
}
function drawOffer(){
 const O=offerRects(),f=Math.min(1,(dead.t-.5)*3),u=Math.min(O.w,O.h),cx=W/2,pul=1+Math.sin(time*5)*.03;
 g.save();
 g.globalAlpha=.5*f;rr(O.x,O.y,O.w,O.h,u*.07);g.fillStyle='#14143c';g.fill();g.lineWidth=4;g.strokeStyle='#ffffff';g.stroke();
 g.globalAlpha=f;
 txt(L.died,cx,O.y+O.h*.11,u*.12,'#ff8a65');
 txt(L.score+' '+score,cx,O.y+O.h*.27,u*.11,'#fff');
 txt(L.left+' '+(MAX_REV-revives)+'/'+MAX_REV,cx,O.y+O.h*.4,u*.06,'#ffe9a8');
 const a=O.b1;g.save();g.translate(a.x+a.w/2,a.y+a.h/2);g.scale(pul,pul);g.translate(-a.w/2,-a.h/2);
 g.globalAlpha=.92*f;rr(0,0,a.w,a.h,a.h*.28);g.fillStyle='#2ea84a';g.fill();g.lineWidth=3;g.strokeStyle='#1b1b2f';g.stroke();g.globalAlpha=f;
 g.fillStyle='#fff';g.beginPath();g.moveTo(a.h*.38,a.h*.28);g.lineTo(a.h*.38,a.h*.72);g.lineTo(a.h*.74,a.h*.5);g.fill();
 txt(L.watch,a.h*.9+(a.w-a.h*.9)/2,a.h/2,fit(L.watch,a.w-a.h*1.1,a.h*.4),'#fff');g.restore();
 const b=O.b2;g.globalAlpha=.92*f;rr(b.x,b.y,b.w,b.h,b.h*.28);g.fillStyle='#d9534f';g.fill();g.lineWidth=3;g.strokeStyle='#1b1b2f';g.stroke();g.globalAlpha=f;
 txt(L.restart,b.x+b.w/2,b.y+b.h/2,fit(L.restart,b.w*.9,b.h*.42),'#fff');
 g.restore();
}
function drawAd(){
 const cx=W/2,vw=Math.min(W*.92,H*.5*16/9),vh=vw*9/16,vx=cx-vw/2,vy=H/2-vh/2-14,left=Math.max(0,AD_TIME-adT);
 g.fillStyle='rgba(0,0,0,.92)';g.fillRect(0,0,W,H);
 g.save();rr(vx,vy,vw,vh,12);g.clip();
 const gr=g.createLinearGradient(vx,vy,vx+vw,vy+vh);gr.addColorStop(0,'#1e3c72');gr.addColorStop(1,'#7a2e8a');g.fillStyle=gr;g.fillRect(vx,vy,vw,vh);
 for(let i=0;i<7;i++){const s=vh*(.08+.03*(i%3)),x=vx+((time*(40+i*18)+i*97)%(vw+s))-s,y=vy+vh*(.12+.12*i)%vh;g.fillStyle='rgba(255,255,255,.18)';g.fillRect(x,y,s,s)}
 txt(L.adTitle,cx,vy+vh/2,fit(L.adTitle,vw*.8,vw*.1),'#ffd23f');
 g.restore();
 g.lineWidth=3;g.strokeStyle='#fff';rr(vx,vy,vw,vh,12);g.stroke();
 g.fillStyle='#ffd23f';rr(vx+10,vy+10,34,20,5);g.fill();txt('Ad',vx+27,vy+20,14,'#1b1b2f');
 g.fillStyle='rgba(255,255,255,.25)';rr(vx,vy+vh+14,vw,8,4);g.fill();
 g.fillStyle='#2ea84a';rr(vx,vy+vh+14,Math.max(8,vw*Math.min(1,adT/AD_TIME)),8,4);g.fill();
 txt(L.adEnds+' '+Math.ceil(left)+'s',cx,vy+vh+48,Math.max(16,vw*.055),'#fff');
 txt(L.adReward,cx,vy+vh+78,Math.max(12,vw*.04),'#ffe9a8');
}
function render(){
 g.fillStyle='rgb('+sky.map(Math.round)+')';g.fillRect(0,0,W,H);
 g.save();if(shake>0)g.translate((Math.random()-.5)*shake*24,(Math.random()-.5)*shake*24);
 const zt=Math.min(Math.ceil(camz+24),gen.z),zb=Math.floor(camz+zbDz)-1,pr=Math.round(pzv);
 for(let z=zt;z>=zb;z--){const r=rows.get(z);if(!r)continue;drawRow(z,r);if(z===pr)drawPlayer()}
 g.restore();
 for(const p of parts){g.globalAlpha=Math.min(1,p.l*2);g.fillStyle=p.c;g.fillRect(p.x,p.y,p.s,p.s)}g.globalAlpha=1;
 const fg=g.createLinearGradient(0,0,0,H*.22),sc='rgb('+sky.map(Math.round)+')';fg.addColorStop(0,sc);fg.addColorStop(1,'rgba('+sky.map(Math.round)+',0)');g.fillStyle=fg;g.fillRect(0,0,W,H*.22);
 ui();
}

/* ================= Input ================= */
let pd=null;
function pickSkin(d){view=(view+d+SK.length)%SK.length;if(owned(view)){save.skin=view;persist()}tone(520,.06,'square',.05)}
function buySkin(){const c=SK[view][1];if(!owned(view)&&save.coins>=c){save.coins-=c;save.own|=1<<view;save.skin=view;persist();sfxCoin()}else tone(110,.12,'square',.06)}
cv.addEventListener('pointerdown',e=>{
 actx();unlocked=true;const R=rects(),x=e.clientX,y=e.clientY;
 if(hit(R.snd,x,y)){soundOn=!soundOn;pd=null;musicSync();return}
 if(state==='ad'){pd=null;return}
 if(state==='dead'&&offer){
  if(dead.t>.5){const O=offerRects();if(hit(O.b1,x,y))startAd();else if(hit(O.b2,x,y))restartNow()}
  pd=null;return}
 if(state==='menu'){
  if(hit(R.l,x,y)){pickSkin(-1);pd=null;return}
  if(hit(R.r,x,y)){pickSkin(1);pd=null;return}
  if(hit(R.m,x,y)&&!owned(view)){buySkin();pd=null;return}
  if(!owned(view)){view=save.skin}
 }
 pd={x,y,done:false,fired:false};
 if(e.pointerType==='mouse'){pd.fired=true;act(0,1)} // mouse: hop on press
 musicSync();
});
addEventListener('pointermove',e=>{
 if(!pd||pd.done)return;const dx=e.clientX-pd.x,dy=e.clientY-pd.y;
 if(Math.hypot(dx,dy)>26){pd.done=true;Math.abs(dx)>Math.abs(dy)?act(dx>0?1:-1,0):act(0,dy<0?1:-1);musicSync()}
});
addEventListener('pointerup',()=>{unlocked=true;if(pd&&!pd.done&&!pd.fired)act(0,1);pd=null;musicSync()});
addEventListener('pointercancel',()=>{pd=null});
addEventListener('contextmenu',e=>e.preventDefault());
addEventListener('keydown',e=>{
 if(e.repeat)return;actx();unlocked=true;const k=e.key.toLowerCase();let m=null;
 if(state==='ad')return;
 if(state==='dead'&&offer){
  if(dead.t>.5){if(k==='enter'||k===' '){e.preventDefault();startAd()}else if(k==='r'||k==='escape')restartNow()}
  musicSync();return}
 if(k==='arrowup'||k==='w'||k===' '||k==='enter')m=[0,1];else if(k==='arrowleft'||k==='a')m=[-1,0];
 else if(k==='arrowright'||k==='d')m=[1,0];else if(k==='arrowdown'||k==='s')m=[0,-1];
 if(m){e.preventDefault();if(state==='menu'&&!owned(view))view=save.skin;act(m[0],m[1])}
 musicSync();
});

/* ================= Game loop and platform integration ================= */
yt(()=>{audioOn=YT.system.isAudioEnabled();YT.system.onAudioEnabledChange(v=>{audioOn=v;musicSync()});YT.system.onPause(()=>{paused=true;musicSync()});YT.system.onResume(()=>{paused=false;musicSync()})});
document.addEventListener('visibilitychange',musicSync); // minimized / app in background = pause
addEventListener('pagehide',musicSync);
let last=0,first=true;
function frame(ts){
 requestAnimationFrame(frame);musicSync();
 if(paused||document.hidden){last=ts;return}
 const dt=Math.min(.05,(ts-last)/1000||0);last=ts;update(dt);render();
 if(first){first=false;yt(()=>YT.game.firstFrameReady())}
}
resize();reset();
load(()=>{yt(()=>YT.game.gameReady())});
requestAnimationFrame(frame);
})();
