(function(){const t=document.createElement("link").relList;if(t&&t.supports&&t.supports("modulepreload"))return;for(const a of document.querySelectorAll('link[rel="modulepreload"]'))n(a);new MutationObserver(a=>{for(const i of a)if(i.type==="childList")for(const o of i.addedNodes)o.tagName==="LINK"&&o.rel==="modulepreload"&&n(o)}).observe(document,{childList:!0,subtree:!0});function s(a){const i={};return a.integrity&&(i.integrity=a.integrity),a.referrerPolicy&&(i.referrerPolicy=a.referrerPolicy),a.crossOrigin==="use-credentials"?i.credentials="include":a.crossOrigin==="anonymous"?i.credentials="omit":i.credentials="same-origin",i}function n(a){if(a.ep)return;a.ep=!0;const i=s(a);fetch(a.href,i)}})();const f=document.getElementById("app"),O=document.getElementById("liveBadge");let k=null,m="overview",u=null;try{u=window.Telegram&&window.Telegram.WebApp}catch{u=null}if(u)try{u.ready(),u.expand&&u.expand(),u.setHeaderColor&&u.setHeaderColor("#0a0e0a"),u.setBackgroundColor&&u.setBackgroundColor("#0a0e0a"),u.disableVerticalSwipes&&u.disableVerticalSwipes()}catch{}function b(e){try{u&&u.HapticFeedback&&u.HapticFeedback.impactOccurred(e||"light")}catch{}}const H="mini_app_token";let h=localStorage.getItem(H)||"",$=!1;function K(e){const t=Object.assign({"Content-Type":"application/json",cache:"no-store"},e||{});return h&&(t.Authorization="Bearer "+h),t}async function d(e,t){const s=t||{},n=K(s.headers),a=await fetch(e,Object.assign({},s,{headers:n}));if(a.status===401)throw h="",localStorage.removeItem(H),$=!1,j("Session expired — enter PIN."),new Error("unauthorized");return a}function Y(e){return`<div class="card" style="max-width:320px;margin:8vh auto;text-align:center">
    <div class="logo" style="justify-content:center;margin-bottom:14px">
      <div class="mark">🔒</div><h2 style="margin-left:8px">Mini App</h2></div>
    <p style="color:var(--muted);margin-bottom:12px">Enter your PIN to open the dashboard</p>
    <input id="pinInput" type="password" inputmode="numeric" autocomplete="current-password"
      placeholder="••••" style="width:100%;padding:12px;border-radius:10px;border:1px solid var(--border);
      background:var(--card2);color:var(--text);font-size:18px;text-align:center;letter-spacing:4px;margin-bottom:12px">
    <button class="btn" id="pinBtn">Unlock</button>
    ${e?`<p style="color:var(--red);margin-top:10px;font-size:12px">${e}</p>`:""}
  </div>`}async function j(e){$=!0,f.innerHTML=Y(e);const t=document.getElementById("pinInput"),s=document.getElementById("pinBtn");t&&t.focus();const n=async()=>{const a=t&&t.value||"";if(a){s.disabled=!0,s.textContent="Checking…";try{const i=await fetch("/api/auth",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({pin:a})});i.ok?(h=(await i.json()).token||"",localStorage.setItem(H,h),y()):j("Wrong PIN — try again.")}catch{j("Could not reach auth.")}}};s&&(s.onclick=n),t&&t.addEventListener("keydown",a=>{a.key==="Enter"&&n()})}async function X(){try{if(!(await(await fetch("/api/auth/telegram",{cache:"no-store"})).json()).telegram_auth_available)return!1;let s="";try{s=window.Telegram&&window.Telegram.WebApp&&window.Telegram.WebApp.initData||""}catch{s=""}if(!s)return!1;const n=await fetch("/api/auth/telegram",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({initData:s})});if(!n.ok)return!1;const a=await n.json();return!a.ok||!a.token?!1:(h=a.token,localStorage.setItem(H,h),!0)}catch{return!1}}async function Z(){try{const t=await(await fetch("/api/auth",{cache:"no-store"})).json();if(await X()){$=!0,y();return}t.pin_set?h?y():j():(h="",$=!0,y())}catch{f.innerHTML=`<div class="loading">Can't reach server</div>`}}function E(e){return e>=1024?(e/1024).toFixed(1)+" GB":e+" MB"}const x=(e,t,s)=>`<div class="tile"><div class="label">${e}</div><div class="value"><span class="dot" style="background:${s}"></span>${t}</div></div>`;function A(e,t,s,n){const a=Math.max(0,Math.min(100,s));return`<div class="card"><h3>${e}</h3>
    <div class="row"><span>${t}</span></div>
    <div class="bar"><div class="bar-fill ${n?"amber":""}" style="width:${a}%"></div></div></div>`}function J(e,t){const s=typeof t=="object"&&t?t.state||"unknown":t||"unknown",n=s==="active",a=n?"var(--brand-bright)":"var(--red)",i=!!(typeof t=="object"&&t&&t.protected),o=typeof t=="object"&&t&&t.uptime?`<span class="muted"> ${re(t.uptime)}</span>`:"",v=i?`<div class="svc-right"><span class="svc-lock" title="Protected — cannot be stopped from here">🔒</span><div class="switch ${n?"on":""} disabled"></div></div>`:`<div class="svc-right"><div class="switch ${n?"on":""}" data-svc="${e}" data-action="${n?"stop":"start"}" title="${n?"Stop":"Start"}"></div></div>`;return`<div class="svc-item" data-svc-row="${e}"><span class="name">${e}</span>${o}
    <span class="state" style="color:${a}"><span class="dot" style="background:${a}"></span>${s}</span>${v}</div>`}function ee(e){return`<div class="svc">${Object.entries(e).map(([s,n])=>J(s,n)).join("")}</div>`}let C=new Set;async function te(e,t,s){if(!C.has(e)){C.add(e),s&&s.classList.add("busy");try{const n=await d(`/api/services/${encodeURIComponent(e)}/action`,{method:"POST",body:JSON.stringify({action:t})}),a=await n.json();if(n.ok)b("medium"),await y(!0);else{const i=a.error==="protected_service"?"Protected — cannot be changed from here":a.error||"HTTP "+n.status;b("error");const o=document.querySelector(`[data-svc-row="${CSS.escape(e)}"]`);o&&(o.style.opacity="0.5",setTimeout(()=>o.style.opacity="1",600))}}catch{b("error")}finally{C.delete(e),s&&s.classList.remove("busy")}}}function se(){document.querySelectorAll(".switch[data-svc]").forEach(e=>{e.dataset.wired||(e.dataset.wired="1",e.addEventListener("click",()=>{const t=e.dataset.svc,s=e.dataset.action;te(t,s,e)}))})}let S={definitions:{},instances:[],running:!1};function ne(e){const s={pending:["var(--muted)","pending"],running:["var(--amber)","running"],done:["var(--brand-bright)","done"],failed:["var(--red)","failed"],published:["var(--blue)","published"]}[e]||["var(--muted)",e||"?"];return`<span class="fl-status" style="color:${s[0]};border-color:${s[0]}">${s[1]}</span>`}function ae(e){const t=e.stages||[],s=t.map((o,v)=>`
    <div class="pl-stage">
      <span class="pl-stage-idx">${v+1}</span>
      <span class="pl-stage-role">${c(o.role)}</span>
      <span class="pl-stage-agent muted">${c(o.assignee||"")}</span>
      ${ne(o.status)}
    </div>`).join(""),n=e.status,a=n==="done"?"var(--brand-bright)":n==="stalled"?"var(--red)":"var(--amber)",i=n==="running"?`<button class="btn-mini" data-pl-advance="${e.pipeline_id}">⟳ Advance</button>`:"";return`<div class="card"><h3>${c(e.name)} · ${c(e.title)}</h3>
    <div class="row"><span class="muted">${e.pipeline_id}</span>
      <span class="state" style="color:${a}">${n}</span></div>
    <div class="pl-chain">${s}</div>
    <div class="row"><span class="muted">stage ${e.current_stage||0}/${t.length}</span>
      ${i}
      <button class="btn-mini" data-pl-refresh>⟳ Refresh</button></div>
  </div>`}function ie(){const e=S.definitions||{},t=Object.keys(e);return t.length?`<div class="card"><h3>Launch a Pipeline</h3>
    <div class="frm">
      <label class="fld"><span>Type</span><select id="plName">${t.map(n=>`<option value="${n}">${n} — ${c(e[n].description.slice(0,60))}</option>`).join("")}</select></label>
      <label class="fld"><span>Title</span><input id="plTitle" type="text" placeholder="e.g. Add payment webhook" /></label>
      <label class="fld"><span>Input / brief</span><textarea id="plInput" rows="2" placeholder="Context for the first stage (optional)"></textarea></label>
      <button class="btn" id="plLaunchBtn">🚀 Launch</button>
      <div class="fmsg" id="plMsg"></div>
    </div></div>`:""}function oe(){const e=document.getElementById("pipelineRoot");if(!e)return;const t=S.instances||[],s=t.length?t.map(ae).join(""):'<div class="card"><h3>No pipelines yet</h3><div class="loading">Launch one below.</div></div>';e.innerHTML=ie()+s;const n=document.getElementById("plLaunchBtn");n&&(n.onclick=ce),document.querySelectorAll("[data-pl-advance]").forEach(a=>{a.onclick=()=>le(a.dataset.plAdvance)})}async function q(){try{const e=await d("/api/pipelines",{cache:"no-store"});if(!e.ok)return;const t=await e.json();S.definitions=t.definitions||{},S.instances=t.pipelines||[],oe()}catch{}}async function ce(){const e=document.getElementById("plName").value,t=document.getElementById("plTitle").value.trim(),s=document.getElementById("plInput").value,n=document.getElementById("plMsg");if(!e||!t){n&&(n.innerHTML='<span style="color:var(--red)">Title required</span>');return}try{const a=await d("/api/pipelines",{method:"POST",body:JSON.stringify({name:e,title:t,input:s})}),i=await a.json();a.ok?(n&&(n.innerHTML=`<span style="color:var(--brand-bright)">Launched ${i.pipeline.pipeline_id} — stage 1 dispatched (${i.action})</span>`),document.getElementById("plTitle").value="",document.getElementById("plInput").value="",q()):n&&(n.innerHTML=`<span style="color:var(--red)">Error: ${i.error||a.status}</span>`)}catch{n&&(n.innerHTML='<span style="color:var(--red)">Could not launch</span>')}}async function le(e){try{const s=await(await d(`/api/pipelines/${encodeURIComponent(e)}/advance`,{method:"POST",body:JSON.stringify({})})).json();q()}catch{}}function re(e){const t=e.match(/(\d{2}):(\d{2}):\d{2}/);return t?`↑${t[1]}:${t[2]}`:""}function de(e){const t=e.services["hermes-gateway.service"],s=typeof t=="object"&&t?t.state:t,n=s==="active"?"var(--brand-bright)":"var(--red)",a=k.ram.total_mb?Math.round(e.ram.used_mb/e.ram.total_mb*100):0,i=e.disk&&e.disk.used_pct||0;return`<div class="grid">
    ${x("Gateway",s||"unknown",n)}
    ${x("Router",e.router.models+" models",e.router.live?"var(--brand-bright)":"var(--amber)")}
    ${x("Relay",e.relay.agents+" agents","var(--brand-bright)")}
  </div>
  ${ue()}
  ${A("Memory",E(e.ram.used_mb)+" / "+E(e.ram.total_mb),a,!1)}
  ${A("Disk",(e.disk&&e.disk.used)+" used",i,i>85)}
  ${ee(e.services)}
  <button class="btn" onclick="refreshData()">⟳ Refresh</button>`}function ue(){return`<div class="quickgrid">
    <div class="quick blue" onclick="goTab('models')"><span class="qic">🧠</span>Models</div>
    <div class="quick green" onclick="goTab('logs')"><span class="qic">📜</span>Live Logs</div>
    <div class="quick purple" onclick="goTab('relay')"><span class="qic">🤖</span>Fleet</div>
    <div class="quick amber" onclick="goTab('system')"><span class="qic">🖥️</span>System</div>
  </div>`}function G(e){b("light"),m==="logs"&&Q(),m==="relay"&&U(),m=e,document.querySelectorAll(".tab, .nav-item").forEach(t=>t.classList.toggle("active",t.dataset.tab===e)),P()}function pe(e){const t=typeof e=="string"?e:e&&e.id||"",s=typeof e=="object"&&e&&e.owned_by?e.owned_by:"router",n=typeof e=="object"&&e&&e.created?e.created:"";return`<div class="model-chip">
    <div class="mc-id">${c(t)}</div>
    <div class="mc-badges">
      <span class="mc-owned">${c(s)}</span>
      <span class="mc-avail" title="available"><span class="dot" style="background:var(--brand-bright)"></span></span>
    </div>
    ${n?`<div class="mc-created muted">${c(n)}</div>`:""}
  </div>`}function ve(e){return e.router.models?`<div class="card"><h3>Router Models (${e.router.models})</h3>
    <div class="models">${e.models.map(pe).join("")}</div></div>
    <button class="btn" onclick="refreshData()">⟳ Refresh</button>`:'<div class="loading">No model data</div>'}function me(e){const t=e.relay.roster&&e.relay.roster.agents||[],s=t.map(n=>`<div class="svc-item"><span class="name">${n.name}</span><span class="state" style="color:var(--brand-bright)">${n.role}</span></div>`).join("");return`<div class="card"><h3>GOD SPEED Community (${t.length} bots)</h3><div class="svc">${s}</div></div>
    ${fe()}
    ${ge()}
    <button class="btn" onclick="refreshData()">⟳ Refresh</button>`}let g={roles:[],pollTimer:null,dispatching:!1};function fe(){const e=g.roles;return`<div class="card"><h3>Dispatch a Job</h3>
    <div class="frm">
      <label class="fld"><span>Assignee</span>
        <select id="fleetAssignee">${e.length?e.map(s=>`<option value="${s.name}">${s.name} — ${s.role}</option>`).join(""):'<option value="">loading roles…</option>'}</select>
      </label>
      <label class="fld"><span>Title</span>
        <input id="fleetTitle" type="text" maxlength="2048" placeholder="Short task title" />
      </label>
      <label class="fld"><span>Goal / brief</span>
        <textarea id="fleetGoal" maxlength="2048" rows="3" placeholder="What should the bot accomplish?"></textarea>
      </label>
      <button class="btn" id="fleetDispatchBtn">🚀 Dispatch</button>
      <div class="fmsg" id="fleetDispatchMsg"></div>
    </div>
  </div>`}function ge(){return'<div class="card"><h3>Execution Timeline</h3><div class="fleet-timeline" id="fleetTimeline"><div class="loading">loading timeline…</div></div></div>'}const he={job_created:["var(--muted)","created"],job_claimed:["var(--amber)","claimed"],job_done:["var(--brand-bright)","done"],reply:["var(--teal)","reply"]};function ye(e){const t=he[e.kind]||["var(--blue)",e.kind||"event"],s=e.ts||"",n=e.agent||"?",a=e.job_id?`<span class="muted fl-jid">${e.job_id.slice(0,8)}</span>`:"",i=e.summary||"",o=e.kind==="job_created"?"📦":e.kind==="job_claimed"?"🤝":e.kind==="job_done"?"✅":"💬";return`<div class="fl-item">
    <div class="fl-line">
      <span class="fl-dot tl-dot" style="background:${t[0]};box-shadow:0 0 0 2px ${t[0]}33"></span>
      <div class="fl-body tl-body">
        <div class="fl-title">${o} ${c(i)} ${a}</div>
        <div class="fl-meta">
          <span class="fl-assignee">${c(n)}</span>
          <span class="fl-status" style="color:${t[0]};border-color:${t[0]}">${t[1]}</span>
          <span class="muted fl-ts">${c(s)}</span>
        </div>
      </div>
    </div>
  </div>`}async function be(){try{const e=await d("/api/fleet/roles",{cache:"no-store"});if(!e.ok)return;const t=await e.json();g.roles=t.roles||[];const s=document.getElementById("fleetAssignee");s&&g.roles.length&&(s.innerHTML=g.roles.map(n=>`<option value="${n.name}">${n.name} — ${n.role}</option>`).join(""))}catch{}}async function $e(){if(g.dispatching)return;const e=document.getElementById("fleetDispatchBtn"),t=document.getElementById("fleetDispatchMsg"),s=document.getElementById("fleetAssignee").value,n=document.getElementById("fleetTitle").value.trim(),a=document.getElementById("fleetGoal").value;if(!s||!n){t&&(t.innerHTML='<span style="color:var(--red)">Assignee and title required.</span>');return}e.disabled=!0,e.textContent="Dispatching…",g.dispatching=!0;try{const i=await d("/api/fleet/dispatch",{method:"POST",body:JSON.stringify({assignee:s,title:n,goal:a})}),o=await i.json();i.ok?(t&&(t.innerHTML=`<span style="color:var(--brand-bright)">Dispatched job <b>${o.job_id.slice(0,8)}</b> → ${s}</span>`),document.getElementById("fleetTitle").value="",document.getElementById("fleetGoal").value="",_()):t&&(t.innerHTML=`<span style="color:var(--red)">Error: ${o.error||i.status}</span>`)}catch{t&&(t.innerHTML='<span style="color:var(--red)">Could not reach dispatch.</span>')}e.disabled=!1,e.textContent="🚀 Dispatch",g.dispatching=!1}async function _(){const e=document.getElementById("fleetTimeline");if(e)try{const n=(await(await d("/api/fleet/timeline",{cache:"no-store"})).json()).events||[];e.innerHTML=n.length?n.map(ye).join(""):'<div class="loading">no fleet activity yet</div>'}catch{}}function we(){if(g.pollTimer)return;be(),_();const e=document.getElementById("fleetDispatchBtn");e&&(e.onclick=$e),g.pollTimer=setInterval(_,3e3)}function U(){g.pollTimer&&(clearInterval(g.pollTimer),g.pollTimer=null)}let r={sources:null,selected:null,running:!1,last:null};async function Te(){try{const e=await d("/api/osint/sources",{cache:"no-store"});if(!e.ok)return;const t=await e.json();r.sources=t||{},!r.selected&&Object.keys(r.sources).length&&(r.selected=Object.keys(r.sources)[0]),I()}catch{}}function Le(){const e=r.sources||{},t=Object.keys(e);if(!t.length)return'<div class="loading">No OSINT sources available</div>';const s=r.selected||t[0],n=e[s]||{desc:"",params:{},required_params:[]},a=Object.entries(n.params||{}).map(([i,o])=>{const v=(n.required_params||[]).includes(i),w=v?' <span style="color:var(--amber)">*</span>':"";let T;if(o.type==="bool")T=`<select id="op_${i}" class="osint-picker"><option value="false">No</option><option value="true">Yes</option></select>`;else if(o.choices)T=`<select id="op_${i}" class="osint-picker">${o.choices.map(L=>`<option value="${L}">${L}</option>`).join("")}</select>`;else{const L=o.desc||i;T=`<input id="op_${i}" class="osint-picker" type="text" placeholder="${L}" ${v?"required":""} />`}return`<label class="fld"><span>${i}${w}</span>${T}</label>`}).join("");return`<div class="card"><h3>Public Records Query</h3>
    <div class="frm">
      <label class="fld"><span>Source</span>
        <select id="osintSource" class="osint-picker">
          ${t.map(i=>`<option value="${i}" ${i===s?"selected":""}>${i}</option>`).join("")}
        </select>
      </label>
      <div class="osint-desc">${n.desc||""} <span class="src-tag">${s}</span></div>
      ${a}
      <button class="btn" id="osintRunBtn">🔎 Run Query</button>
      <div class="fmsg" id="osintMsg"></div>
    </div>
  </div>`}function ke(){const e=r.last;if(!e)return"";if(e.error)return`<div class="card"><h3>Query Error</h3><div style="color:var(--red);font-size:12px">${c(e.error)}</div></div>`;const t=e.rows||[];if(!t.length)return`<div class="card"><h3>No rows</h3><div class="osint-desc">Source returned 0 rows (${c(JSON.stringify(e.query||{}))})</div></div>`;const s=e.columns||Object.keys(t[0]||{}),n=s.map(i=>`<th>${c(i)}</th>`).join(""),a=t.map(i=>`<tr>${s.map(o=>`<td>${c(i[o]!=null?String(i[o]):"")}</td>`).join("")}</tr>`).join("");return`<div class="card"><h3>Results · ${e.count} rows · ${(e.took_ms/1e3).toFixed(1)}s</h3>
    <div class="stats-grid">
      <div class="stat-pill"><span>Source</span><span class="n">${c(e.source)}</span></div>
      <div class="stat-pill"><span>Rows</span><span class="n">${e.count}</span></div>
    </div>
    <div class="res-wrap"><table class="res"><thead><tr>${n}</tr></thead><tbody>${a}</tbody></table></div>
    <button class="save-btn" id="osintSaveBtn">💾 Save to collection</button>
    <div class="fmsg" id="osintSaveMsg"></div>
  </div>`}function I(){const e=document.getElementById("osintRoot");if(!e)return;e.innerHTML=Le()+ke();const t=document.getElementById("osintSource");t&&(t.onchange=()=>{r.selected=t.value,r.last=null,I()});const s=document.getElementById("osintRunBtn");s&&(s.onclick=Ee);const n=document.getElementById("osintSaveBtn");n&&(n.onclick=Se)}function je(){const e=(r.sources||{})[r.selected]||{params:{}},t={};for(const s of Object.keys(e.params||{})){const n=document.getElementById("op_"+s);if(!n)continue;const a=n.value;a!==""&&a!=null&&(t[s]=a)}return t}async function Ee(){if(r.running)return;const e=document.getElementById("osintRunBtn"),t=document.getElementById("osintMsg"),s=r.selected;if(!s)return;const n=je(),i=(((r.sources||{})[s]||{}).required_params||[]).filter(o=>!(o in n));if(i.length){t&&(t.innerHTML=`<span style="color:var(--red)">Missing required: ${i.join(", ")}</span>`);return}e.disabled=!0,e.textContent="Querying…",r.running=!0,t&&(t.innerHTML='<span style="color:var(--muted)">Running… (can take up to 60s)</span>');try{const o=new URLSearchParams(n).toString(),v=await d(`/api/osint/${s}?${o}`,{cache:"no-store"}),w=await v.json();v.ok?r.last=w:r.last={error:w.error||"HTTP "+v.status},I()}catch{r.last={error:"Could not reach backend"},I()}e.disabled=!1,e.textContent="🔎 Run Query",r.running=!1}async function Se(){const e=r.last,t=document.getElementById("osintSaveMsg");if(!e||!e.rows||!e.rows.length){t&&(t.innerHTML='<span style="color:var(--red)">No results to save</span>');return}try{const s=await d("/api/collection/ingest",{method:"POST",body:JSON.stringify({source:e.source,query:JSON.stringify(e.query||{}),payload:{columns:e.columns,rows:e.rows.slice(0,100),count:e.count,took_ms:e.took_ms}})}),n=await s.json();s.ok?t&&(t.innerHTML=`<span style="color:var(--brand-bright)">Saved #${n.id} to collection</span>`):t&&(t.innerHTML=`<span style="color:var(--red)">Error: ${n.error||s.status}</span>`)}catch{t&&(t.innerHTML='<span style="color:var(--red)">Could not reach backend</span>')}}let p={items:[],stats:null,search:"",view:"recent",timeline:[],entities:[]};const Ie=[{id:"recent",label:"Items"},{id:"timeline",label:"Timeline"},{id:"entities",label:"Entities"}];function Be(){return`<div class="ingest-subtabs">${Ie.map(e=>`
    <div class="ingest-subtab ${p.view===e.id?"active":""}" data-view="${e.id}">${e.label}</div>`).join("")}</div>`}function Me(e){const t=e&&e.source||"unknown",s=e&&e.query||"",n=e&&e.ts||"";let a="";try{const i=e&&e.payload;i==null?a="":typeof i=="string"?a=i.slice(0,160):a=JSON.stringify(i).slice(0,160)}catch{a=""}return`<div class="col-item">
    <div class="col-head">
      <span class="col-src">${c(t)}</span>
      <span class="col-ts">#${e&&e.id!=null?e.id:"?"} · ${c(n)}</span>
    </div>
    <div class="col-q">⚑ ${s?c(s):'<span class="muted">(no query)</span>'}</div>
    ${a?`<div class="col-p">${c(a)}${a.length>=160?"…":""}</div>`:""}
  </div>`}function R(){const e=p.stats||{total:0,by_source:{}},t=Object.entries(e.by_source||{}).map(([o,v])=>`<div class="stat-pill"><span>${c(o)}</span><span class="n">${v}</span></div>`).join(""),s=`<div class="card"><h3>Collection Stats</h3>
    <div class="stats-grid">
      <div class="stat-pill"><span>Total</span><span class="n">${e.total}</span></div>
      ${t||'<div class="stat-pill"><span>Sources</span><span class="n">0</span></div>'}
    </div>
  </div>`,n=`<div class="card"><h3>Search Collection</h3>
    <div class="frm">
      <input id="ingestSearch" class="osint-picker" type="text" placeholder="Search collected items…" value="${c(p.search)}" />
      <button class="btn" id="ingestSearchBtn">Search</button>
    </div>
  </div>`,a=`<div class="card" style="padding:10px">${Be()}</div>`;let i;if(p.view==="timeline")i=He();else if(p.view==="entities")i=xe();else{const o=p.items||[];i=`<div class="card"><h3>Recent Items (${o.length})</h3>
      ${o.length?o.map(Me).join(""):'<div class="loading">Nothing collected yet</div>'}
    </div>`}return s+n+a+i}function He(){const e=p.timeline||[];if(!e.length)return'<div class="card"><h3>Timeline</h3><div class="loading">No events yet — run OSINT queries and save them.</div></div>';const t=e.map(s=>{const n=(s.entities||[]).map(a=>`<span class="entity-chip">${c(a)}</span>`).join("");return`<div class="col-item">
      <div class="col-head">
        <span class="col-src">${c(s.source)}</span>
        <span class="col-ts">#${s.id} · ${c(s.ts)}</span>
      </div>
      <div class="col-q">⚑ ${c(s.query)}</div>
      ${n?`<div class="col-entities">${n}</div>`:""}
    </div>`}).join("");return`<div class="card"><h3>Timeline · ${e.length}</h3>${t}</div>`}function xe(){const e=p.entities||[];if(!e.length)return'<div class="card"><h3>Entities</h3><div class="loading">No entities extracted yet.</div></div>';const t=e.map(s=>{const n=(s.sources||[]).map(a=>`<span class="src-tag">${c(a)}</span>`).join(" ");return`<div class="ent-row">
      <span class="ent-name">${c(s.canonical)}</span>
      <span class="ent-count">${s.count}</span>
      <span class="ent-srcs">${n}</span>
    </div>`}).join("");return`<div class="card"><h3>Entities · ${e.length}</h3><div class="ent-list">${t}</div></div>`}async function Ce(){try{const[e,t]=await Promise.all([d("/api/collection/stats",{cache:"no-store"}),d("/api/collection/recent?limit=30",{cache:"no-store"})]);p.stats=await e.json();const s=await t.json();p.items=s.items||[];try{const i=await(await d("/api/collection/timeline",{cache:"no-store"})).json();p.timeline=i.events||[]}catch{}try{const i=await(await d("/api/collection/entities",{cache:"no-store"})).json();p.entities=i.entities||[]}catch{}const n=document.getElementById("ingestRoot");n&&(n.innerHTML=R(),W())}catch{}}function W(){const e=document.getElementById("ingestSearchBtn");e&&(e.onclick=B);const t=document.getElementById("ingestSearch");t&&t.addEventListener("keydown",s=>{s.key==="Enter"&&B()}),document.querySelectorAll(".ingest-subtab").forEach(s=>{s.onclick=()=>{p.view=s.dataset.view;const n=document.getElementById("ingestRoot");n&&(n.innerHTML=R(),W())}})}async function B(){const e=document.getElementById("ingestSearch"),t=e&&e.value||"";p.search=t;try{const n=await(await d("/api/collection/search?q="+encodeURIComponent(t),{cache:"no-store"})).json();p.items=n.items||[];const a=document.getElementById("ingestRoot");if(a){a.innerHTML=R();const i=document.getElementById("ingestSearchBtn");i&&(i.onclick=B);const o=document.getElementById("ingestSearch");o&&(o.value=t),o&&o.addEventListener("keydown",v=>{v.key==="Enter"&&B()})}}catch{}}function Oe(e){return`<div class="card"><h3>Services <span class="muted" style="text-transform:none;letter-spacing:0">— tap a switch to start/stop</span></h3><div class="svc">${Object.entries(e.services).map(([s,n])=>J(s,n)).join("")}</div></div>
    <div class="card"><h3>System</h3>
      <div class="row"><span>Memory</span><span class="muted">${E(e.ram.used_mb)} / ${E(e.ram.total_mb)}</span></div>
      <div class="row"><span>Disk</span><span class="muted">${e.disk.used} used</span></div>
      <div class="row"><span>Updated</span><span class="muted">${e.ts}</span></div>
    </div>
    <button class="btn" onclick="refreshData()">⟳ Refresh</button>`}async function _e(){const e=document.querySelector(".btn");e&&(e.textContent="⟳ Refreshing…"),await y(!0),e&&(e.textContent="⟳ Refresh")}let l={since:0,running:!1,paused:!1,streamTimer:null,hasLoaded:!1};function Pe(){return`<div class="card">
    <div class="loghead">
      <h3>Agent Log · stream</h3>
      <div class="logctl">
        <button class="btn-mini ${l.paused?"":"active"}" id="logPause">${l.paused?"▶ Resume":"⏸ Pause"}</button>
        <button class="btn-mini" id="logClear">Clear</button>
      </div>
    </div>
    <div class="logfeed" id="logFeed"><div class="loading">Connecting…</div></div>
  </div>`}function qe(e){const t=(e||"").toLowerCase();return t==="info"?"info":["warn","warning"].includes(t)?"warn":["err","error","critical","exception"].includes(t)?"err":""}function z(e){const t=e.match(/^(\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2},\d+)\s+(\w+)\s+(.*)$/);return t?`<div class="logline"><span class="ts">${t[1]}</span><span class="lv ${qe(t[2])}">${t[2]}</span><span class="msg">${t[3]}</span></div>`:`<div class="logline"><span class="msg">${e}</span></div>`}function c(e){return e.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;")}async function Re(){if(l.running)try{const e=await d("/api/logs?since="+l.since,{cache:"no-store"});if(!e.ok)throw new Error("bad");const t=await e.json();if(l.since=t.since||0,t.lines&&t.lines.length){const s=document.getElementById("logFeed");if(!s)return;const n=s.scrollHeight-s.scrollTop-s.clientHeight<24,a=document.createElement("div");for(a.innerHTML=t.lines.map(i=>z(c(i))).join(""),s.appendChild(a);s.children.length>800;)s.removeChild(s.firstChild);n&&!l.paused&&(s.scrollTop=s.scrollHeight)}}catch{const t=document.getElementById("logFeed");t&&!l.hasLoaded&&(t.innerHTML=`<div class="loading">Can't reach logs</div>`)}}function Ne(){l.running||(l.running=!0,l.hasLoaded=!1,d("/api/logs?since=0&limit=120",{cache:"no-store"}).then(e=>e.json()).then(e=>{l.hasLoaded=!0,l.since=e.since||0;const t=document.getElementById("logFeed");if(t){t.innerHTML=e.lines.map(a=>z(c(a))).join(""),t.scrollTop=t.scrollHeight;const s=document.getElementById("logPause");s&&(s.onclick=()=>{l.paused=!l.paused,s.textContent=l.paused?"▶ Resume":"⏸ Pause",s.classList.toggle("active",!l.paused)});const n=document.getElementById("logClear");n&&(n.onclick=()=>{t.innerHTML=""})}}).catch(()=>{const e=document.getElementById("logFeed");e&&(e.innerHTML=`<div class="loading">Can't reach logs</div>`)}),l.streamTimer=setInterval(Re,2500))}function Q(){l.running=!1,l.streamTimer&&(clearInterval(l.streamTimer),l.streamTimer=null)}function P(){if(!k){f.innerHTML='<div class="loading">Offline</div>';return}const e=k;m==="overview"?f.innerHTML=de(e):m==="models"?f.innerHTML=ve(e):m==="relay"?(f.innerHTML=me(e),we()):m==="osint"?(f.innerHTML='<div id="osintRoot"></div>',Te()):m==="ingest"?(f.innerHTML='<div id="ingestRoot"><div class="loading">Loading collection…</div></div>',Ce()):m==="system"?f.innerHTML=Oe(e):m==="pipelines"?(f.innerHTML='<div id="pipelineRoot"><div class="loading">Loading pipelines…</div></div>',q()):m==="logs"&&(f.innerHTML=Pe(),Ne()),se()}async function y(e){try{const t=await d("/api/health",{cache:"no-store"});if(!t.ok)throw new Error("bad status");const s=await t.json();let n=[];try{n=(await(await d("/api/models",{cache:"no-store"})).json()).models||[]}catch{}s.models=n,k=s,O.textContent="● live",e?m!=="logs"&&P():P()}catch{O.textContent="✗ offline",!e&&h&&(f.innerHTML=`<div class="loading">Can't reach backend</div>`)}}const F=document.getElementById("navToggle"),N=document.getElementById("sideNav"),M=document.getElementById("navBackdrop");function De(){N.classList.add("open"),M.classList.add("open")}function D(){N.classList.remove("open"),M.classList.remove("open")}F&&F.addEventListener("click",()=>{b("light"),N.classList.contains("open")?D():De()});M&&M.addEventListener("click",D);document.querySelectorAll(".nav-item").forEach(e=>{e.addEventListener("click",()=>{m==="logs"&&Q(),m==="relay"&&U(),D(),G(e.dataset.tab)})});function V(){const e=document.getElementById("navLiveText");e&&(e.textContent=O.textContent.replace("● ","").trim()||"live")}const Ae=y;y=async function(e){await Ae(e),V()};V();window.goTab=G;window.refreshData=_e;Z();setInterval(()=>{$&&y()},15e3);
