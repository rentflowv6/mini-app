const vm=require('node:vm'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const source=fs.readFileSync(path.join(__dirname,'../frontend/dist/assets/index-CGOpgHD2.js'),'utf8');
const start=source.indexOf('if(k&&typeof k.setBottomBarColor');
const end=source.indexOf('function D(e)',start);
assert.ok(start>=0&&end>start,'native bottom-bar initialization present');
const code=source.slice(start,end);
for(const scenario of ['modern','old','browser','throws']){
 const calls=[];const k=scenario==='browser'?null:{isVersionAtLeast:v=>scenario!=='old',setBottomBarColor:c=>{if(scenario==='throws')throw Error('unsupported');calls.push(c)}};
 vm.runInNewContext(code,{k});assert.deepEqual(calls,scenario==='modern'?['#060a08']:[]);
}
console.log('PASS: native bottom-bar dark colour and safe compatibility guards.');
