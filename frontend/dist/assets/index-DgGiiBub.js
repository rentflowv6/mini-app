(function(){const t=document.createElement("link").relList;if(t&&t.supports&&t.supports("modulepreload"))return;for(const a of document.querySelectorAll('link[rel="modulepreload"]'))n(a);new MutationObserver(a=>{for(const i of a)if(i.type==="childList")for(const o of i.addedNodes)o.tagName==="LINK"&&o.rel==="modulepreload"&&n(o)}).observe(document,{childList:!0,subtree:!0});function s(a){const i={};return a.integrity&&(i.integrity=a.integrity),a.referrerPolicy&&(i.referrerPolicy=a.referrerPolicy),a.crossOrigin==="use-credentials"?i.credentials="include":a.crossOrigin==="anonymous"?i.credentials="omit":i.credentials="same-origin",i}function n(a){if(a.ep)return;a.ep=!0;const i=s(a);fetch(a.href,i)}})();const g=document.getElementById("app"),H=document.getElementById("liveBadge");let L=null,m="overview",u=null;try{u=window.Telegram&&window.Telegram.WebApp}catch{u=null}if(u)try{u.ready(),u.expand&&u.expand(),u.setHeaderColor&&u.setHeaderColor("#0a0e0a"),u.setBackgroundColor&&u.setBackgroundColor("#0a0e0a"),u.disableVerticalSwipes&&u.disableVerticalSwipes()}catch{}function N(e){try{u&&u.HapticFeedback&&u.HapticFeedback.impactOccurred(e||"light")}catch{}}const S="mini_app_token";let h=localStorage.getItem(S)||"",b=!1;function Q(e){const t=Object.assign({"Content-Type":"application/json",cache:"no-store"},e||{});return h&&(t.Authorization="Bearer "+h),t}async function d(e,t){const s=t||{},n=Q(s.headers),a=await fetch(e,Object.assign({},s,{headers:n}));if(a.status===401)throw h="",localStorage.removeItem(S),b=!1,k("Session expired — enter PIN."),new Error("unauthorized");return a}function U(e){return`<div class="card" style="max-width:320px;margin:8vh auto;text-align:center">
    <div class="logo" style="justify-content:center;margin-bottom:14px">
      <div class="mark">🔒</div><h2 style="margin-left:8px">Mini App</h2></div>
    <p style="color:var(--muted);margin-bottom:12px">Enter your PIN to open the dashboard</p>
    <input id="pinInput" type="password" inputmode="numeric" autocomplete="current-password"
      placeholder="••••" style="width:100%;padding:12px;border-radius:10px;border:1px solid var(--border);
      background:var(--card2);color:var(--text);font-size:18px;text-align:center;letter-spacing:4px;margin-bottom:12px">
    <button class="btn" id="pinBtn">Unlock</button>
    ${e?`<p style="color:var(--red);margin-top:10px;font-size:12px">${e}</p>`:""}
  </div>`}async function k(e){b=!0,g.innerHTML=U(e);const t=document.getElementById("pinInput"),s=document.getElementById("pinBtn");t&&t.focus();const n=async()=>{const a=t&&t.value||"";if(a){s.disabled=!0,s.textContent="Checking…";try{const i=await fetch("/api/auth",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({pin:a})});i.ok?(h=(await i.json()).token||"",localStorage.setItem(S,h),y()):k("Wrong PIN — try again.")}catch{k("Could not reach auth.")}}};s&&(s.onclick=n),t&&t.addEventListener("keydown",a=>{a.key==="Enter"&&n()})}async function V(){try{if(!(await(await fetch("/api/auth/telegram",{cache:"no-store"})).json()).telegram_auth_available)return!1;let s="";try{s=window.Telegram&&window.Telegram.WebApp&&window.Telegram.WebApp.initData||""}catch{s=""}if(!s)return!1;const n=await fetch("/api/auth/telegram",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({initData:s})});if(!n.ok)return!1;const a=await n.json();return!a.ok||!a.token?!1:(h=a.token,localStorage.setItem(S,h),!0)}catch{return!1}}async function K(){try{const t=await(await fetch("/api/auth",{cache:"no-store"})).json();if(await V()){b=!0,y();return}t.pin_set?h?y():k():(h="",b=!0,y())}catch{g.innerHTML=`<div class="loading">Can't reach server</div>`}}function j(e){return e>=1024?(e/1024).toFixed(1)+" GB":e+" MB"}const B=(e,t,s)=>`<div class="tile"><div class="label">${e}</div><div class="value"><span class="dot" style="background:${s}"></span>${t}</div></div>`;function _(e,t,s,n){const a=Math.max(0,Math.min(100,s));return`<div class="card"><h3>${e}</h3>
    <div class="row"><span>${t}</span></div>
    <div class="bar"><div class="bar-fill ${n?"amber":""}" style="width:${a}%"></div></div></div>`}function Y(e){return`<div class="svc">${Object.entries(e).map(([s,n])=>{const a=typeof n=="string"?n:n&&n.state||"unknown",o=a==="active"?"var(--brand-bright)":"var(--red)",v=n&&typeof n=="object"&&n.uptime?`<span class="muted"> ${D(n.uptime)}</span>`:"";return`<div class="svc-item"><span class="name">${s}</span>${v}
      <span class="state" style="color:${o}"><span class="dot" style="background:${o}"></span>${a}</span></div>`}).join("")}</div>`}function D(e){const t=e.match(/(\d{2}):(\d{2}):\d{2}/);return t?`↑${t[1]}:${t[2]}`:""}function X(e){const t=e.services["hermes-gateway.service"],s=typeof t=="object"&&t?t.state:t,n=s==="active"?"var(--brand-bright)":"var(--red)",a=L.ram.total_mb?Math.round(e.ram.used_mb/e.ram.total_mb*100):0,i=e.disk&&e.disk.used_pct||0;return`<div class="grid">
    ${B("Gateway",s||"unknown",n)}
    ${B("Router",e.router.models+" models",e.router.live?"var(--brand-bright)":"var(--amber)")}
    ${B("Relay",e.relay.agents+" agents","var(--brand-bright)")}
  </div>
  ${Z()}
  ${_("Memory",j(e.ram.used_mb)+" / "+j(e.ram.total_mb),a,!1)}
  ${_("Disk",(e.disk&&e.disk.used)+" used",i,i>85)}
  ${Y(e.services)}
  <button class="btn" onclick="refreshData()">⟳ Refresh</button>`}function Z(){return`<div class="quickgrid">
    <div class="quick blue" onclick="goTab('models')"><span class="qic">🧠</span>Models</div>
    <div class="quick green" onclick="goTab('logs')"><span class="qic">📜</span>Live Logs</div>
    <div class="quick purple" onclick="goTab('relay')"><span class="qic">🤖</span>Fleet</div>
    <div class="quick amber" onclick="goTab('system')"><span class="qic">🖥️</span>System</div>
  </div>`}function F(e){N("light"),m==="logs"&&W(),m==="relay"&&A(),m=e,document.querySelectorAll(".tab, .nav-item").forEach(t=>t.classList.toggle("active",t.dataset.tab===e)),x()}function ee(e){const t=typeof e=="string"?e:e&&e.id||"",s=typeof e=="object"&&e&&e.owned_by?e.owned_by:"router",n=typeof e=="object"&&e&&e.created?e.created:"";return`<div class="model-chip">
    <div class="mc-id">${c(t)}</div>
    <div class="mc-badges">
      <span class="mc-owned">${c(s)}</span>
      <span class="mc-avail" title="available"><span class="dot" style="background:var(--brand-bright)"></span></span>
    </div>
    ${n?`<div class="mc-created muted">${c(n)}</div>`:""}
  </div>`}function te(e){return e.router.models?`<div class="card"><h3>Router Models (${e.router.models})</h3>
    <div class="models">${e.models.map(ee).join("")}</div></div>
    <button class="btn" onclick="refreshData()">⟳ Refresh</button>`:'<div class="loading">No model data</div>'}function se(e){const t=e.relay.roster&&e.relay.roster.agents||[],s=t.map(n=>`<div class="svc-item"><span class="name">${n.name}</span><span class="state" style="color:var(--brand-bright)">${n.role}</span></div>`).join("");return`<div class="card"><h3>GOD SPEED Community (${t.length} bots)</h3><div class="svc">${s}</div></div>
    ${ne()}
    ${ae()}
    ${ie()}
    <button class="btn" onclick="refreshData()">⟳ Refresh</button>`}let f={roles:[],pollTimer:null,dispatching:!1};function ne(){const e=f.roles;return`<div class="card"><h3>Dispatch a Job</h3>
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
  </div>`}function ae(){return'<div class="card"><h3>Job Feed</h3><div class="svc" id="fleetJobs"><div class="loading">loading jobs…</div></div></div>'}function ie(){return'<div class="card"><h3>Replies</h3><div class="svc" id="fleetReplies"><div class="loading">none yet</div></div></div>'}function oe(e){const t=(e||"open").toLowerCase(),n={open:["var(--amber)","Open"],done:["var(--brand-bright)","Done"],claimed:["var(--brand-bright)","Claimed"],replied:["var(--brand-bright)","Replied"]}[t]||["var(--blue)",t];return`<span class="fl-status" style="color:${n[0]};border-color:${n[0]}">${n[1]}</span>`}function ce(e){const t=e&&e.job_id||"",s=e&&e.title||"untitled",n=e&&e.assignee||"?",a=e&&e.created_at||"";return`<div class="fl-item">
    <div class="fl-line">
      <span class="fl-dot"></span>
      <div class="fl-body">
        <div class="fl-title">${c(s)} <span class="muted fl-jid">${t.slice(0,8)}</span></div>
        <div class="fl-meta">
          <span class="fl-assignee">→ ${c(n)}</span>
          ${oe(e&&e.status)}
          <span class="muted fl-ts">${c(a)}</span>
        </div>
      </div>
    </div>
  </div>`}function le(e){const t=typeof e.body=="object"?e.body:{},n=t.kind==="job_done"||e.kind==="job_done"?`✅ done ${(t.job_id||"").slice(0,8)}`:e.subject||"reply";return`<div class="svc-item"><span class="name">${c(n)}</span><span class="state" style="color:var(--brand-bright)">${e.from}</span></div>`}async function re(){try{const e=await d("/api/fleet/roles",{cache:"no-store"});if(!e.ok)return;const t=await e.json();f.roles=t.roles||[];const s=document.getElementById("fleetAssignee");s&&f.roles.length&&(s.innerHTML=f.roles.map(n=>`<option value="${n.name}">${n.name} — ${n.role}</option>`).join(""))}catch{}}async function de(){if(f.dispatching)return;const e=document.getElementById("fleetDispatchBtn"),t=document.getElementById("fleetDispatchMsg"),s=document.getElementById("fleetAssignee").value,n=document.getElementById("fleetTitle").value.trim(),a=document.getElementById("fleetGoal").value;if(!s||!n){t&&(t.innerHTML='<span style="color:var(--red)">Assignee and title required.</span>');return}e.disabled=!0,e.textContent="Dispatching…",f.dispatching=!0;try{const i=await d("/api/fleet/dispatch",{method:"POST",body:JSON.stringify({assignee:s,title:n,goal:a})}),o=await i.json();i.ok?(t&&(t.innerHTML=`<span style="color:var(--brand-bright)">Dispatched job <b>${o.job_id.slice(0,8)}</b> → ${s}</span>`),document.getElementById("fleetTitle").value="",document.getElementById("fleetGoal").value="",C()):t&&(t.innerHTML=`<span style="color:var(--red)">Error: ${o.error||i.status}</span>`)}catch{t&&(t.innerHTML='<span style="color:var(--red)">Could not reach dispatch.</span>')}e.disabled=!1,e.textContent="🚀 Dispatch",f.dispatching=!1}async function C(){const e=document.getElementById("fleetJobs"),t=document.getElementById("fleetReplies");if(e)try{const a=(await(await d("/api/fleet/jobs",{cache:"no-store"})).json()).jobs||[];e.innerHTML=a.length?`<div class="fleet-timeline">${a.map(ce).join("")}</div>`:'<div class="loading">no jobs yet</div>'}catch{}if(t)try{const a=(await(await d("/api/fleet/replies",{cache:"no-store"})).json()).replies||[];t.innerHTML=a.length?a.slice(0,20).map(le).join(""):'<div class="loading">no replies yet</div>'}catch{}}function ue(){if(f.pollTimer)return;re(),C();const e=document.getElementById("fleetDispatchBtn");e&&(e.onclick=de),f.pollTimer=setInterval(C,3e3)}function A(){f.pollTimer&&(clearInterval(f.pollTimer),f.pollTimer=null)}let r={sources:null,selected:null,running:!1,last:null};async function pe(){try{const e=await d("/api/osint/sources",{cache:"no-store"});if(!e.ok)return;const t=await e.json();r.sources=t||{},!r.selected&&Object.keys(r.sources).length&&(r.selected=Object.keys(r.sources)[0]),E()}catch{}}function ve(){const e=r.sources||{},t=Object.keys(e);if(!t.length)return'<div class="loading">No OSINT sources available</div>';const s=r.selected||t[0],n=e[s]||{desc:"",params:{},required_params:[]},a=Object.entries(n.params||{}).map(([i,o])=>{const v=(n.required_params||[]).includes(i),$=v?' <span style="color:var(--amber)">*</span>':"";let w;if(o.type==="bool")w=`<select id="op_${i}" class="osint-picker"><option value="false">No</option><option value="true">Yes</option></select>`;else if(o.choices)w=`<select id="op_${i}" class="osint-picker">${o.choices.map(T=>`<option value="${T}">${T}</option>`).join("")}</select>`;else{const T=o.desc||i;w=`<input id="op_${i}" class="osint-picker" type="text" placeholder="${T}" ${v?"required":""} />`}return`<label class="fld"><span>${i}${$}</span>${w}</label>`}).join("");return`<div class="card"><h3>Public Records Query</h3>
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
  </div>`}function me(){const e=r.last;if(!e)return"";if(e.error)return`<div class="card"><h3>Query Error</h3><div style="color:var(--red);font-size:12px">${c(e.error)}</div></div>`;const t=e.rows||[];if(!t.length)return`<div class="card"><h3>No rows</h3><div class="osint-desc">Source returned 0 rows (${c(JSON.stringify(e.query||{}))})</div></div>`;const s=e.columns||Object.keys(t[0]||{}),n=s.map(i=>`<th>${c(i)}</th>`).join(""),a=t.map(i=>`<tr>${s.map(o=>`<td>${c(i[o]!=null?String(i[o]):"")}</td>`).join("")}</tr>`).join("");return`<div class="card"><h3>Results · ${e.count} rows · ${(e.took_ms/1e3).toFixed(1)}s</h3>
    <div class="stats-grid">
      <div class="stat-pill"><span>Source</span><span class="n">${c(e.source)}</span></div>
      <div class="stat-pill"><span>Rows</span><span class="n">${e.count}</span></div>
    </div>
    <div class="res-wrap"><table class="res"><thead><tr>${n}</tr></thead><tbody>${a}</tbody></table></div>
    <button class="save-btn" id="osintSaveBtn">💾 Save to collection</button>
    <div class="fmsg" id="osintSaveMsg"></div>
  </div>`}function E(){const e=document.getElementById("osintRoot");if(!e)return;e.innerHTML=ve()+me();const t=document.getElementById("osintSource");t&&(t.onchange=()=>{r.selected=t.value,r.last=null,E()});const s=document.getElementById("osintRunBtn");s&&(s.onclick=ge);const n=document.getElementById("osintSaveBtn");n&&(n.onclick=he)}function fe(){const e=(r.sources||{})[r.selected]||{params:{}},t={};for(const s of Object.keys(e.params||{})){const n=document.getElementById("op_"+s);if(!n)continue;const a=n.value;a!==""&&a!=null&&(t[s]=a)}return t}async function ge(){if(r.running)return;const e=document.getElementById("osintRunBtn"),t=document.getElementById("osintMsg"),s=r.selected;if(!s)return;const n=fe(),i=(((r.sources||{})[s]||{}).required_params||[]).filter(o=>!(o in n));if(i.length){t&&(t.innerHTML=`<span style="color:var(--red)">Missing required: ${i.join(", ")}</span>`);return}e.disabled=!0,e.textContent="Querying…",r.running=!0,t&&(t.innerHTML='<span style="color:var(--muted)">Running… (can take up to 60s)</span>');try{const o=new URLSearchParams(n).toString(),v=await d(`/api/osint/${s}?${o}`,{cache:"no-store"}),$=await v.json();v.ok?r.last=$:r.last={error:$.error||"HTTP "+v.status},E()}catch{r.last={error:"Could not reach backend"},E()}e.disabled=!1,e.textContent="🔎 Run Query",r.running=!1}async function he(){const e=r.last,t=document.getElementById("osintSaveMsg");if(!e||!e.rows||!e.rows.length){t&&(t.innerHTML='<span style="color:var(--red)">No results to save</span>');return}try{const s=await d("/api/collection/ingest",{method:"POST",body:JSON.stringify({source:e.source,query:JSON.stringify(e.query||{}),payload:{columns:e.columns,rows:e.rows.slice(0,100),count:e.count,took_ms:e.took_ms}})}),n=await s.json();s.ok?t&&(t.innerHTML=`<span style="color:var(--brand-bright)">Saved #${n.id} to collection</span>`):t&&(t.innerHTML=`<span style="color:var(--red)">Error: ${n.error||s.status}</span>`)}catch{t&&(t.innerHTML='<span style="color:var(--red)">Could not reach backend</span>')}}let p={items:[],stats:null,search:"",view:"recent",timeline:[],entities:[]};const ye=[{id:"recent",label:"Items"},{id:"timeline",label:"Timeline"},{id:"entities",label:"Entities"}];function be(){return`<div class="ingest-subtabs">${ye.map(e=>`
    <div class="ingest-subtab ${p.view===e.id?"active":""}" data-view="${e.id}">${e.label}</div>`).join("")}</div>`}function $e(e){const t=e&&e.source||"unknown",s=e&&e.query||"",n=e&&e.ts||"";let a="";try{const i=e&&e.payload;i==null?a="":typeof i=="string"?a=i.slice(0,160):a=JSON.stringify(i).slice(0,160)}catch{a=""}return`<div class="col-item">
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
  </div>`,a=`<div class="card" style="padding:10px">${be()}</div>`;let i;if(p.view==="timeline")i=we();else if(p.view==="entities")i=Te();else{const o=p.items||[];i=`<div class="card"><h3>Recent Items (${o.length})</h3>
      ${o.length?o.map($e).join(""):'<div class="loading">Nothing collected yet</div>'}
    </div>`}return s+n+a+i}function we(){const e=p.timeline||[];if(!e.length)return'<div class="card"><h3>Timeline</h3><div class="loading">No events yet — run OSINT queries and save them.</div></div>';const t=e.map(s=>{const n=(s.entities||[]).map(a=>`<span class="entity-chip">${c(a)}</span>`).join("");return`<div class="col-item">
      <div class="col-head">
        <span class="col-src">${c(s.source)}</span>
        <span class="col-ts">#${s.id} · ${c(s.ts)}</span>
      </div>
      <div class="col-q">⚑ ${c(s.query)}</div>
      ${n?`<div class="col-entities">${n}</div>`:""}
    </div>`}).join("");return`<div class="card"><h3>Timeline · ${e.length}</h3>${t}</div>`}function Te(){const e=p.entities||[];if(!e.length)return'<div class="card"><h3>Entities</h3><div class="loading">No entities extracted yet.</div></div>';const t=e.map(s=>{const n=(s.sources||[]).map(a=>`<span class="src-tag">${c(a)}</span>`).join(" ");return`<div class="ent-row">
      <span class="ent-name">${c(s.canonical)}</span>
      <span class="ent-count">${s.count}</span>
      <span class="ent-srcs">${n}</span>
    </div>`}).join("");return`<div class="card"><h3>Entities · ${e.length}</h3><div class="ent-list">${t}</div></div>`}async function Le(){try{const[e,t]=await Promise.all([d("/api/collection/stats",{cache:"no-store"}),d("/api/collection/recent?limit=30",{cache:"no-store"})]);p.stats=await e.json();const s=await t.json();p.items=s.items||[];try{const i=await(await d("/api/collection/timeline",{cache:"no-store"})).json();p.timeline=i.events||[]}catch{}try{const i=await(await d("/api/collection/entities",{cache:"no-store"})).json();p.entities=i.entities||[]}catch{}const n=document.getElementById("ingestRoot");n&&(n.innerHTML=R(),J())}catch{}}function J(){const e=document.getElementById("ingestSearchBtn");e&&(e.onclick=M);const t=document.getElementById("ingestSearch");t&&t.addEventListener("keydown",s=>{s.key==="Enter"&&M()}),document.querySelectorAll(".ingest-subtab").forEach(s=>{s.onclick=()=>{p.view=s.dataset.view;const n=document.getElementById("ingestRoot");n&&(n.innerHTML=R(),J())}})}async function M(){const e=document.getElementById("ingestSearch"),t=e&&e.value||"";p.search=t;try{const n=await(await d("/api/collection/search?q="+encodeURIComponent(t),{cache:"no-store"})).json();p.items=n.items||[];const a=document.getElementById("ingestRoot");if(a){a.innerHTML=R();const i=document.getElementById("ingestSearchBtn");i&&(i.onclick=M);const o=document.getElementById("ingestSearch");o&&(o.value=t),o&&o.addEventListener("keydown",v=>{v.key==="Enter"&&M()})}}catch{}}function ke(e){return`<div class="card"><h3>Services</h3><div class="svc">${Object.entries(e.services).map(([s,n])=>{const a=typeof n=="object"&&n?n.state:n,o=a==="active"?"var(--brand-bright)":"var(--red)",v=typeof n=="object"&&n&&n.uptime?` <span class="muted">↑${D(n.uptime)}</span>`:"";return`<div class="svc-item"><span class="name">${s}</span>${v}<span class="state" style="color:${o}">${a}</span></div>`}).join("")}</div></div>
    <div class="card"><h3>System</h3>
      <div class="row"><span>Memory</span><span class="muted">${j(e.ram.used_mb)} / ${j(e.ram.total_mb)}</span></div>
      <div class="row"><span>Disk</span><span class="muted">${e.disk.used} used</span></div>
      <div class="row"><span>Updated</span><span class="muted">${e.ts}</span></div>
    </div>
    <button class="btn" onclick="refreshData()">⟳ Refresh</button>`}async function je(){const e=document.querySelector(".btn");e&&(e.textContent="⟳ Refreshing…"),await y(!0),e&&(e.textContent="⟳ Refresh")}let l={since:0,running:!1,paused:!1,streamTimer:null,hasLoaded:!1};function Ee(){return`<div class="card">
    <div class="loghead">
      <h3>Agent Log · stream</h3>
      <div class="logctl">
        <button class="btn-mini ${l.paused?"":"active"}" id="logPause">${l.paused?"▶ Resume":"⏸ Pause"}</button>
        <button class="btn-mini" id="logClear">Clear</button>
      </div>
    </div>
    <div class="logfeed" id="logFeed"><div class="loading">Connecting…</div></div>
  </div>`}function Me(e){const t=(e||"").toLowerCase();return t==="info"?"info":["warn","warning"].includes(t)?"warn":["err","error","critical","exception"].includes(t)?"err":""}function G(e){const t=e.match(/^(\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2},\d+)\s+(\w+)\s+(.*)$/);return t?`<div class="logline"><span class="ts">${t[1]}</span><span class="lv ${Me(t[2])}">${t[2]}</span><span class="msg">${t[3]}</span></div>`:`<div class="logline"><span class="msg">${e}</span></div>`}function c(e){return e.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;")}async function Ie(){if(l.running)try{const e=await d("/api/logs?since="+l.since,{cache:"no-store"});if(!e.ok)throw new Error("bad");const t=await e.json();if(l.since=t.since||0,t.lines&&t.lines.length){const s=document.getElementById("logFeed");if(!s)return;const n=s.scrollHeight-s.scrollTop-s.clientHeight<24,a=document.createElement("div");for(a.innerHTML=t.lines.map(i=>G(c(i))).join(""),s.appendChild(a);s.children.length>800;)s.removeChild(s.firstChild);n&&!l.paused&&(s.scrollTop=s.scrollHeight)}}catch{const t=document.getElementById("logFeed");t&&!l.hasLoaded&&(t.innerHTML=`<div class="loading">Can't reach logs</div>`)}}function Se(){l.running||(l.running=!0,l.hasLoaded=!1,d("/api/logs?since=0&limit=120",{cache:"no-store"}).then(e=>e.json()).then(e=>{l.hasLoaded=!0,l.since=e.since||0;const t=document.getElementById("logFeed");if(t){t.innerHTML=e.lines.map(a=>G(c(a))).join(""),t.scrollTop=t.scrollHeight;const s=document.getElementById("logPause");s&&(s.onclick=()=>{l.paused=!l.paused,s.textContent=l.paused?"▶ Resume":"⏸ Pause",s.classList.toggle("active",!l.paused)});const n=document.getElementById("logClear");n&&(n.onclick=()=>{t.innerHTML=""})}}).catch(()=>{const e=document.getElementById("logFeed");e&&(e.innerHTML=`<div class="loading">Can't reach logs</div>`)}),l.streamTimer=setInterval(Ie,2500))}function W(){l.running=!1,l.streamTimer&&(clearInterval(l.streamTimer),l.streamTimer=null)}function x(){if(!L){g.innerHTML='<div class="loading">Offline</div>';return}const e=L;m==="overview"?g.innerHTML=X(e):m==="models"?g.innerHTML=te(e):m==="relay"?(g.innerHTML=se(e),ue()):m==="osint"?(g.innerHTML='<div id="osintRoot"></div>',pe()):m==="ingest"?(g.innerHTML='<div id="ingestRoot"><div class="loading">Loading collection…</div></div>',Le()):m==="system"?g.innerHTML=ke(e):m==="logs"&&(g.innerHTML=Ee(),Se())}async function y(e){try{const t=await d("/api/health",{cache:"no-store"});if(!t.ok)throw new Error("bad status");const s=await t.json();let n=[];try{n=(await(await d("/api/models",{cache:"no-store"})).json()).models||[]}catch{}s.models=n,L=s,H.textContent="● live",e?m!=="logs"&&x():x()}catch{H.textContent="✗ offline",!e&&h&&(g.innerHTML=`<div class="loading">Can't reach backend</div>`)}}const P=document.getElementById("navToggle"),O=document.getElementById("sideNav"),I=document.getElementById("navBackdrop");function Be(){O.classList.add("open"),I.classList.add("open")}function q(){O.classList.remove("open"),I.classList.remove("open")}P&&P.addEventListener("click",()=>{N("light"),O.classList.contains("open")?q():Be()});I&&I.addEventListener("click",q);document.querySelectorAll(".nav-item").forEach(e=>{e.addEventListener("click",()=>{m==="logs"&&W(),m==="relay"&&A(),q(),F(e.dataset.tab)})});function z(){const e=document.getElementById("navLiveText");e&&(e.textContent=H.textContent.replace("● ","").trim()||"live")}const He=y;y=async function(e){await He(e),z()};z();window.goTab=F;window.refreshData=je;K();setInterval(()=>{b&&y()},15e3);
