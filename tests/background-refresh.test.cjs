const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const source=fs.readFileSync(path.join(__dirname,'../frontend/dist/assets/index-CGOpgHD2.js'),'utf8');
const start=source.indexOf('let Ie="";async function R(e)');
const end=source.indexOf('const je=',start);
assert.ok(start>=0&&end>start);
let version=0, redraws=0,badgeUpdates=0;
const input={value:'unfinished message',focused:true},scroll={top:42};
const ctx=vm.createContext({
 m:'chat',E:null,H:'test-auth',b:{innerHTML:''},fe:{textContent:''},
 p:async url=>({ok:true,json:async()=>url==='/api/health'?{services:{gateway:{uptime:++version}},ram:{used:version},router:{requests:version},disk:{used:1}}:{models:['model']}}),
 re:()=>badgeUpdates++,
 we:()=>{redraws++;input.value='';input.focused=false;scroll.top=0;}
});
vm.runInContext(source.slice(start,end),ctx);
(async()=>{
 for(const tab of ['chat','settings','models','memory','agents','logs','pipelines','review','relay','osint','ingest','browser-agent']){
  ctx.m=tab;
  await ctx.R(true);await ctx.R(true);
  assert.equal(redraws,0,'background update must not replace active '+tab+' DOM');
  assert.equal(input.value,'unfinished message');assert.equal(input.focused,true);assert.equal(scroll.top,42);
 }
 assert.ok(badgeUpdates>0);assert.ok(ctx.E.ram.used>0,'live health data still updates');
 ctx.m='overview';await ctx.R(true);assert.equal(redraws,1,'overview metrics continue live rendering');
 ctx.m='system';await ctx.R(true);assert.equal(redraws,2,'system metrics continue live rendering');
 ctx.m='chat';await ctx.R(false);assert.equal(redraws,3,'explicit refresh remains available');
 console.log('PASS: background refresh preserves interactive tabs, draft/focus/scroll; live metrics and explicit refresh remain active.');
})().catch(e=>{console.error(e);process.exitCode=1;});

