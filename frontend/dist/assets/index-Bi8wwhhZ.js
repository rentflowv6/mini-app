(function(){const t=document.createElement("link").relList;if(t&&t.supports&&t.supports("modulepreload"))return;for(const a of document.querySelectorAll('link[rel="modulepreload"]'))s(a);new MutationObserver(a=>{for(const i of a)if(i.type==="childList")for(const o of i.addedNodes)o.tagName==="LINK"&&o.rel==="modulepreload"&&s(o)}).observe(document,{childList:!0,subtree:!0});function n(a){const i={};return a.integrity&&(i.integrity=a.integrity),a.referrerPolicy&&(i.referrerPolicy=a.referrerPolicy),a.crossOrigin==="use-credentials"?i.credentials="include":a.crossOrigin==="anonymous"?i.credentials="omit":i.credentials="same-origin",i}function s(a){if(a.ep)return;a.ep=!0;const i=n(a);fetch(a.href,i)}})();const y=document.getElementById("app"),W=document.getElementById("liveBadge");let I=null,g="overview",b=null;try{b=window.Telegram&&window.Telegram.WebApp}catch{b=null}if(b)try{b.ready(),b.expand&&b.expand(),b.setHeaderColor&&b.setHeaderColor("#0a0e0a"),b.setBackgroundColor&&b.setBackgroundColor("#0a0e0a"),b.disableVerticalSwipes&&b.disableVerticalSwipes()}catch{}function B(e){try{b&&b.HapticFeedback&&b.HapticFeedback.impactOccurred(e||"light")}catch{}}let M="";async function ye(){try{const t=await(await fetch("/config.json",{cache:"no-store"})).json();t&&t.tunnelUrl&&(M=t.tunnelUrl)}catch{try{await new Promise(s=>setTimeout(s,500));const n=await(await fetch("/config.json",{cache:"no-store"})).json();n&&n.tunnelUrl&&(M=n.tunnelUrl)}catch{}}M||(M=window.location.origin||"")}const F="mini_app_token";let x=localStorage.getItem(F)||"",j=!1;function be(e){const t=Object.assign({"Content-Type":"application/json",cache:"no-store"},e||{});return x&&(t.Authorization="Bearer "+x),t}async function p(e,t){const n=t||{},s=be(n.headers),a=e.startsWith("http")?e:M?M+e:e,i=await fetch(a,Object.assign({},n,{headers:s}));if(i.status===401)throw x="",localStorage.removeItem(F),j=!1,_("Session expired — enter PIN."),new Error("unauthorized");return i}function we(e){return`<div class="card" style="max-width:320px;margin:8vh auto;text-align:center">
    <div class="logo" style="justify-content:center;margin-bottom:14px">
      <div class="mark">🔒</div><h2 style="margin-left:8px">Mini App</h2></div>
    <p style="color:var(--muted);margin-bottom:12px">Enter your PIN to open the dashboard</p>
    <input id="pinInput" type="password" inputmode="numeric" autocomplete="current-password"
      placeholder="••••" style="width:100%;padding:12px;border-radius:10px;border:1px solid var(--border);
      background:var(--card2);color:var(--text);font-size:18px;text-align:center;letter-spacing:4px;margin-bottom:12px">
    <button class="btn" id="pinBtn">Unlock</button>
    ${e?`<p style="color:var(--red);margin-top:10px;font-size:12px">${e}</p>`:""}
  </div>`}async function _(e){j=!0,y.innerHTML=we(e);const t=document.getElementById("pinInput"),n=document.getElementById("pinBtn");t&&t.focus();const s=async()=>{const a=t&&t.value||"";if(a){n.disabled=!0,n.textContent="Checking…";try{const i=await fetch("/api/auth",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({pin:a})});i.ok?(x=(await i.json()).token||"",localStorage.setItem(F,x),E()):_("Wrong PIN — try again.")}catch{_("Could not reach auth.")}}};n&&(n.onclick=s),t&&t.addEventListener("keydown",a=>{a.key==="Enter"&&s()})}async function $e(){try{if(!(await(await fetch("/api/auth/telegram",{cache:"no-store"})).json()).telegram_auth_available)return!1;let n="";try{n=window.Telegram&&window.Telegram.WebApp&&window.Telegram.WebApp.initData||""}catch{n=""}if(!n)return!1;const s=await fetch("/api/auth/telegram",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({initData:n})});if(!s.ok)return!1;const a=await s.json();return!a.ok||!a.token?!1:(x=a.token,localStorage.setItem(F,x),!0)}catch{return!1}}async function Te(){try{const t=await(await fetch("/api/auth",{cache:"no-store"})).json();if(await $e()){j=!0,E();return}t.pin_set?x?(j=!0,E()):_():(x="",j=!0,E())}catch{y.innerHTML=`<div class="loading">Can't reach server</div>`}j&&!window._refreshTimer&&(window._refreshTimer=!0,setInterval(()=>{j&&E()},15e3))}function O(e){return e>=1024?(e/1024).toFixed(1)+" GB":e+" MB"}const R=(e,t,n)=>`<div class="tile"><div class="label">${e}</div><div class="value"><span class="dot" style="background:${n}"></span>${t}</div></div>`;function te(e,t,n,s){const a=Math.max(0,Math.min(100,n));return`<div class="card"><h3>${e}</h3>
    <div class="row"><span>${t}</span></div>
    <div class="bar"><div class="bar-fill ${s?"amber":""}" style="width:${a}%"></div></div></div>`}function ie(e,t){const n=typeof t=="object"&&t?t.state||"unknown":t||"unknown",s=n==="active",a=s?"var(--brand-bright)":"var(--red)",i=!!(typeof t=="object"&&t&&t.protected),o=typeof t=="object"&&t&&t.uptime?`<span class="muted"> ${He(t.uptime)}</span>`:"",r=i?`<div class="svc-right"><span class="svc-lock" title="Protected — cannot be stopped from here">🔒</span><div class="switch ${s?"on":""} disabled"></div></div>`:`<div class="svc-right"><div class="switch ${s?"on":""}" data-svc="${e}" data-action="${s?"stop":"start"}" title="${s?"Stop":"Start"}"></div></div>`;return`<div class="svc-item" data-svc-row="${e}"><span class="name">${e}</span>${o}
    <span class="state" style="color:${a}"><span class="dot" style="background:${a}"></span>${n}</span>${r}</div>`}function ke(e){return`<div class="svc">${Object.entries(e).map(([n,s])=>ie(n,s)).join("")}</div>`}let G=new Set;async function Le(e,t,n){if(!G.has(e)){G.add(e),n&&n.classList.add("busy");try{const s=await p(`/api/services/${encodeURIComponent(e)}/action`,{method:"POST",body:JSON.stringify({action:t})}),a=await s.json();if(s.ok)B("medium"),await E(!0);else{const i=a.error==="protected_service"?"Protected — cannot be changed from here":a.error||"HTTP "+s.status;B("error");const o=document.querySelector(`[data-svc-row="${CSS.escape(e)}"]`);o&&(o.style.opacity="0.5",setTimeout(()=>o.style.opacity="1",600))}}catch{B("error")}finally{G.delete(e),n&&n.classList.remove("busy")}}}function xe(){document.querySelectorAll(".switch[data-svc]").forEach(e=>{e.dataset.wired||(e.dataset.wired="1",e.addEventListener("click",()=>{const t=e.dataset.svc,n=e.dataset.action;Le(t,n,e)}))})}let q={definitions:{},instances:[],running:!1};function Ee(e){const n={pending:["var(--muted)","pending"],running:["var(--amber)","running"],done:["var(--brand-bright)","done"],failed:["var(--red)","failed"],published:["var(--blue)","published"]}[e]||["var(--muted)",e||"?"];return`<span class="fl-status" style="color:${n[0]};border-color:${n[0]}">${n[1]}</span>`}function je(e){const t=e.stages||[],n=t.map((o,r)=>`
    <div class="pl-stage">
      <span class="pl-stage-idx">${r+1}</span>
      <span class="pl-stage-role">${l(o.role)}</span>
      <span class="pl-stage-agent muted">${l(o.assignee||"")}</span>
      ${Ee(o.status)}
    </div>`).join(""),s=e.status,a=s==="done"?"var(--brand-bright)":s==="stalled"?"var(--red)":"var(--amber)",i=s==="running"?`<button class="btn-mini" data-pl-advance="${e.pipeline_id}">⟳ Advance</button>`:"";return`<div class="card"><h3>${l(e.name)} · ${l(e.title)}</h3>
    <div class="row"><span class="muted">${e.pipeline_id}</span>
      <span class="state" style="color:${a}">${s}</span></div>
    <div class="pl-chain">${n}</div>
    <div class="row"><span class="muted">stage ${e.current_stage||0}/${t.length}</span>
      ${i}
      <button class="btn-mini" data-pl-refresh>⟳ Refresh</button></div>
  </div>`}function Se(){const e=q.definitions||{},t=Object.keys(e);return t.length?`<div class="card"><h3>Launch a Pipeline</h3>
    <div class="frm">
      <label class="fld"><span>Type</span><select id="plName">${t.map(s=>`<option value="${s}">${s} — ${l(e[s].description.slice(0,60))}</option>`).join("")}</select></label>
      <label class="fld"><span>Title</span><input id="plTitle" type="text" placeholder="e.g. Add payment webhook" /></label>
      <label class="fld"><span>Input / brief</span><textarea id="plInput" rows="2" placeholder="Context for the first stage (optional)"></textarea></label>
      <button class="btn" id="plLaunchBtn">🚀 Launch</button>
      <div class="fmsg" id="plMsg"></div>
    </div></div>`:""}function Me(){const e=document.getElementById("pipelineRoot");if(!e)return;const t=q.instances||[],n=t.length?t.map(je).join(""):'<div class="card"><h3>No pipelines yet</h3><div class="loading">Launch one below.</div></div>';e.innerHTML=Se()+n;const s=document.getElementById("plLaunchBtn");s&&(s.onclick=Ie),document.querySelectorAll("[data-pl-advance]").forEach(a=>{a.onclick=()=>Be(a.dataset.plAdvance)})}async function V(){try{const e=await p("/api/pipelines",{cache:"no-store"});if(!e.ok)return;const t=await e.json();q.definitions=t.definitions||{},q.instances=t.pipelines||[],Me()}catch{}}async function Ie(){const e=document.getElementById("plName").value,t=document.getElementById("plTitle").value.trim(),n=document.getElementById("plInput").value,s=document.getElementById("plMsg");if(!e||!t){s&&(s.innerHTML='<span style="color:var(--red)">Title required</span>');return}try{const a=await p("/api/pipelines",{method:"POST",body:JSON.stringify({name:e,title:t,input:n})}),i=await a.json();a.ok?(s&&(s.innerHTML=`<span style="color:var(--brand-bright)">Launched ${i.pipeline.pipeline_id} — stage 1 dispatched (${i.action})</span>`),document.getElementById("plTitle").value="",document.getElementById("plInput").value="",V()):s&&(s.innerHTML=`<span style="color:var(--red)">Error: ${i.error||a.status}</span>`)}catch{s&&(s.innerHTML='<span style="color:var(--red)">Could not launch</span>')}}async function Be(e){try{const n=await(await p(`/api/pipelines/${encodeURIComponent(e)}/advance`,{method:"POST",body:JSON.stringify({})})).json();V()}catch{}}function He(e){const t=e.match(/(\d{2}):(\d{2}):\d{2}/);return t?`↑${t[1]}:${t[2]}`:""}function ae(e){const t=e.services["hermes-gateway.service"],n=typeof t=="object"&&t?t.state:t,s=n==="active"?"var(--brand-bright)":"var(--red)",a=I.ram.total_mb?Math.round(e.ram.used_mb/e.ram.total_mb*100):0,i=e.disk&&e.disk.used_pct||0,r=Object.entries(e.services||{}).filter(([,m])=>{const h=typeof m=="object"&&m?m.state:m;return h&&h!=="active"}).map(([m])=>m),c=[];n!=="active"&&c.push("Gateway is not active"),i>85&&c.push("Disk nearly full ("+i+"%)"),a>85&&c.push("Memory pressure ("+a+"%)"),e.router.live||c.push("Router has no live models"),r.length&&c.push(r.length+" service(s) not active: "+r.slice(0,3).join(", ")),T.reviewCount>0&&c.unshift(T.reviewCount+" task(s) await your review");const d=c.length===0?{txt:"All core systems healthy",color:"var(--brand-bright)"}:{txt:"Needs attention ("+c.length+")",color:"var(--red)"},f=T.reviewCount>0?`<span style="background:var(--amber);color:#222;border-radius:10px;padding:1px 8px;font-size:11px;font-weight:700">${T.reviewCount}</span>`:"";return`<div class="grid">
    ${R("Gateway",n||"unknown",s)}
    ${R("Router",e.router.models+" models",e.router.live?"var(--brand-bright)":"var(--amber)")}
    ${R("Relay",e.relay.agents+" agents","var(--brand-bright)")}
    ${R("Review",T.reviewCount+" pending "+f,T.reviewCount>0?"var(--amber)":"var(--brand-bright)")}
  </div>
  <div style="padding:10px 14px;margin:8px 0;border-radius:10px;background:var(--card);border-left:4px solid ${d.color}">
    <span style="font-weight:700;color:${d.color}">${d.txt}</span>
    ${c.length?`<div style="font-size:12px;opacity:.85;margin-top:4px">${c.map(m=>"• "+m).join("<br>")}</div>`:""}
  </div>
  <div class="mission-strip">
    <div class="m-step on"><span class="mn">01</span>Request</div><div class="m-sep">→</div>
    <div class="m-step on"><span class="mn">02</span>Approve</div><div class="m-sep">→</div>
    <div class="m-step"><span class="mn">03</span>Plan</div><div class="m-sep">→</div>
    <div class="m-step"><span class="mn">04</span>Execute</div><div class="m-sep">→</div>
    <div class="m-step"><span class="mn">05</span>Verify</div><div class="m-sep">→</div>
    <div class="m-step"><span class="mn">06</span>Record</div>
  </div>
  <div class="caps-strip">
    <div class="cap-chip"><div class="cic">🔎</div><div class="cct">Intelligence</div><div class="ccd">OSINT · research</div></div>
    <div class="cap-chip"><div class="cic">🐛</div><div class="cct">Engineering</div><div class="ccd">Bug Hunter · code</div></div>
    <div class="cap-chip"><div class="cic">🤖</div><div class="cct">Agents</div><div class="ccd">Hive · Swarm</div></div>
    <div class="cap-chip"><div class="cic">🧠</div><div class="cct">Models</div><div class="ccd">249+ routes</div></div>
    <div class="cap-chip"><div class="cic">🏗️</div><div class="cct">Build</div><div class="ccd">App builder</div></div>
    <div class="cap-chip"><div class="cic">🌐</div><div class="cct">Browser</div><div class="ccd">Crawl · Tor</div></div>
    <div class="cap-chip"><div class="cic">🎨</div><div class="cct">Media</div><div class="ccd">Image · video</div></div>
    <div class="cap-chip"><div class="cic">📈</div><div class="cct">Trading</div><div class="ccd">KuCoin · paper</div></div>
  </div>
  <div class="legend">
    <span><i class="lg"></i>Code present</span>
    <span><i class="lb"></i>Runtime verified</span>
    <span><i class="la"></i>Documented</span>
    <span><i class="lo"></i>Warning</span>
  </div>
  ${Oe()}
  ${Ce(T.reviews)}
  ${Re(T.recent)}
  ${_e(c,T)}
  ${te("Memory",O(e.ram.used_mb)+" / "+O(e.ram.total_mb),a,!1)}
  ${te("Disk",(e.disk&&e.disk.used)+" used",i,i>85)}
  ${ke(e.services)}
  <button class="btn" onclick="refreshData()">⟳ Refresh</button>`}function Ce(e){if(!e||!e.length)return"";const t=e.slice(0,5).map(n=>(n.returned_model&&`${l(n.returned_model)}`,`<div style="display:flex;justify-content:space-between;align-items:center;padding:6px 0;border-bottom:1px solid var(--border, #222)">
      <span style="font-size:13px">${l(n.title||n.job_id||"")}</span>
      <button class="btn" style="font-size:12px;background:var(--amber);color:#222" onclick="goTab('review')">Review</button>
    </div>`)).join("");return`<div class="card"><h3>✅ Awaiting review (${e.length})</h3>${t}<div style="margin-top:8px"><button class="btn" onclick="goTab('review')">Open review queue →</button></div></div>`}function Re(e){return!e||!e.length?"":`<div class="card"><h3>🕘 Recent activity</h3>${e.slice(0,6).map(n=>{const s=n.status||"unknown",a=s==="done"?"✅":s==="review"?"⏳":s==="blocked"?"🚫":"📦",i=s==="done"?"var(--brand-bright)":s==="blocked"?"var(--red)":"var(--amber)",o=(n.job_id||"").slice(0,10);return`<div style="display:flex;align-items:center;gap:8px;padding:4px 0;font-size:12px">
      <span>${a}</span><span style="opacity:.85">${l(n.title||o||"")}</span>
      <span style="margin-left:auto;color:${i}">${s}</span>
    </div>`}).join("")}</div>`}function _e(e,t){const n=[];return t.reviewCount>0&&n.push(`• ${t.reviewCount} task(s) await review — open the Review tab to approve or block.`),e.some(s=>s.includes("Disk"))&&n.push("• Disk is nearly full — consider pruning old logs/artifacts."),e.some(s=>s.includes("Memory"))&&n.push("• Memory pressure — some services may be throttled."),n.length||n.push("• No action needed — everything is healthy."),`<div class="card"><h3>💡 Suggestions</h3><div style="font-size:13px;opacity:.9">${n.join("<br>")}</div></div>`}const T={reviewCount:0,reviews:[],recent:[]};async function oe(){try{const e=await p("/api/fleet/jobs",{cache:"no-store"});if(!e.ok)return;const n=(await e.json()).jobs||[];T.reviews=n.filter(a=>a.status==="review"),T.reviewCount=T.reviews.length,T.recent=n.slice(0,5);const s=document.getElementById("overviewRoot");s&&g==="overview"&&(s.innerHTML=ae(I))}catch{}}function Oe(){return`<div class="quickgrid">
    <div class="quick blue" onclick="goTab('models')"><span class="qic">🧠</span>Models</div>
    <div class="quick green" onclick="goTab('logs')"><span class="qic">📜</span>Live Logs</div>
    <div class="quick purple" onclick="goTab('relay')"><span class="qic">🤖</span>Fleet</div>
    <div class="quick" style="background:#3b2e0b;color:#f5c86e" onclick="goTab('review')"><span class="qic">✅</span>Review</div>
    <div class="quick amber" onclick="goTab('system')"><span class="qic">🖥️</span>System</div>
    <div class="quick" style="background:#0b3b2e;color:#86efac" onclick="openNorthlet()"><span class="qic">🏛️</span>NorthLet</div>
  </div>`}function qe(){B("light");const e="https://northlet.onrender.com";try{if(window.Telegram&&window.Telegram.WebApp&&window.Telegram.WebApp.openLink){window.Telegram.WebApp.openLink(e);return}}catch{}try{window.open(e,"_blank","noopener")}catch{window.location.href=e}}function ce(e){B("light"),g==="logs"&&ue(),g==="relay"&&re(),g==="review"&&Ze(),g=e,document.querySelectorAll(".tab, .nav-item").forEach(t=>t.classList.toggle("active",t.dataset.tab===e)),K(),e==="review"&&Xe()}function Ne(e){const t=typeof e=="string"?e:e&&e.id||"",n=typeof e=="object"&&e&&e.owned_by?e.owned_by:"router",s=typeof e=="object"&&e&&e.created?e.created:"";return`<div class="model-chip">
    <div class="mc-id">${l(t)}</div>
    <div class="mc-badges">
      <span class="mc-owned">${l(n)}</span>
      <span class="mc-avail" title="available"><span class="dot" style="background:var(--brand-bright)"></span></span>
    </div>
    ${s?`<div class="mc-created muted">${l(s)}</div>`:""}
  </div>`}function Pe(e){return e.router.models?`<div class="card"><h3>Router Models (${e.router.models})</h3>
    <div class="models">${e.models.map(Ne).join("")}</div></div>
    <button class="btn" onclick="refreshData()">⟳ Refresh</button>`:'<div class="loading">No model data</div>'}function Ae(e){const t=e.relay.roster&&e.relay.roster.agents||[],n=t.map(s=>`<div class="svc-item"><span class="name">${s.name}</span><span class="state" style="color:var(--brand-bright)">${s.role}</span></div>`).join("");return`<div class="card"><h3>GOD SPEED Community (${t.length} bots)</h3><div class="svc">${n}</div></div>
    ${De()}
    ${Fe()}
    <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:8px">
      <button class="btn" onclick="exportFleetJobs()">⬇ Export jobs (JSON)</button>
      <button class="btn" onclick="refreshData()">⟳ Refresh</button>
    </div>`}let k={roles:[],pollTimer:null,dispatching:!1};function De(){const e=k.roles;return`<div class="card"><h3>Dispatch a Job</h3>
    <div class="frm">
      <label class="fld"><span>Assignee</span>
        <select id="fleetAssignee">${e.length?e.map(n=>`<option value="${n.name}">${n.name} — ${n.role}</option>`).join(""):'<option value="">loading roles…</option>'}</select>
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
  </div>`}function Fe(){return`<div class="card"><h3>Execution Timeline</h3>
    <div class="fl-filter" style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:8px">
      <input id="flFilterQ" type="text" placeholder="Search jobs (title / id / agent)…" style="flex:1;min-width:140px;padding:6px 10px;border-radius:8px;border:1px solid var(--border,#333);background:var(--card,#111);color:inherit" />
      <select id="flFilterStatus" style="padding:6px 10px;border-radius:8px;border:1px solid var(--border,#333);background:var(--card,#111);color:inherit">
        <option value="">All statuses</option>
        <option value="open">open</option>
        <option value="claimed">claimed</option>
        <option value="done">done</option>
        <option value="review">review</option>
        <option value="blocked">blocked</option>
      </select>
    </div>
    <div class="fleet-timeline" id="fleetTimeline"><div class="loading">loading timeline…</div></div>
  </div>`}const Je={job_created:["var(--muted)","created"],job_claimed:["var(--amber)","claimed"],job_done:["var(--brand-bright)","done"],reply:["var(--teal)","reply"]};function ze(e){const t=Je[e.kind]||["var(--blue)",e.kind||"event"],n=e.ts||"",s=e.agent||"?",a=e.job_id?`<span class="muted fl-jid">${e.job_id.slice(0,8)}</span>`:"",i=e.summary||"",o=e.kind==="job_created"?"📦":e.kind==="job_claimed"?"🤝":e.kind==="job_done"?"✅":"💬";return`<div class="fl-item">
    <div class="fl-line">
      <span class="fl-dot tl-dot" style="background:${t[0]};box-shadow:0 0 0 2px ${t[0]}33"></span>
      <div class="fl-body tl-body">
        <div class="fl-title">${o} ${l(i)} ${a}</div>
        <div class="fl-meta">
          <span class="fl-assignee">${l(s)}</span>
          <span class="fl-status" style="color:${t[0]};border-color:${t[0]}">${t[1]}</span>
          <span class="muted fl-ts">${l(n)}</span>
        </div>
      </div>
    </div>
  </div>`}async function Ge(){try{const e=await p("/api/fleet/roles",{cache:"no-store"});if(!e.ok)return;const t=await e.json();k.roles=t.roles||[];const n=document.getElementById("fleetAssignee");n&&k.roles.length&&(n.innerHTML=k.roles.map(s=>`<option value="${s.name}">${s.name} — ${s.role}</option>`).join(""))}catch{}}async function We(){if(k.dispatching)return;const e=document.getElementById("fleetDispatchBtn"),t=document.getElementById("fleetDispatchMsg"),n=document.getElementById("fleetAssignee").value,s=document.getElementById("fleetTitle").value.trim(),a=document.getElementById("fleetGoal").value;if(!n||!s){t&&(t.innerHTML='<span style="color:var(--red)">Assignee and title required.</span>');return}e.disabled=!0,e.textContent="Dispatching…",k.dispatching=!0;try{const i=await p("/api/fleet/dispatch",{method:"POST",body:JSON.stringify({assignee:n,title:s,goal:a})}),o=await i.json();i.ok?(t&&(t.innerHTML=`<span style="color:var(--brand-bright)">Dispatched job <b>${o.job_id.slice(0,8)}</b> → ${n}</span>`),document.getElementById("fleetTitle").value="",document.getElementById("fleetGoal").value="",H()):t&&(t.innerHTML=`<span style="color:var(--red)">Error: ${o.error||i.status}</span>`)}catch{t&&(t.innerHTML='<span style="color:var(--red)">Could not reach dispatch.</span>')}e.disabled=!1,e.textContent="🚀 Dispatch",k.dispatching=!1}async function H(){const e=document.getElementById("fleetTimeline");if(e)try{const s=(await(await p("/api/fleet/timeline",{cache:"no-store"})).json()).events||[],a=document.getElementById("flFilterQ"),i=document.getElementById("flFilterStatus"),o=(a&&a.value||"").trim().toLowerCase(),r=(i&&i.value||"").trim().toLowerCase();let c=s;r&&(c=c.filter(d=>(d.kind||"").toLowerCase().includes(r)||(d.summary||"").toLowerCase().includes(r))),o&&(c=c.filter(d=>((d.summary||"")+" "+(d.job_id||"")+" "+(d.agent||"")).toLowerCase().includes(o))),e.innerHTML=c.length?c.map(ze).join(""):'<div class="loading">no fleet activity matches</div>'}catch{}}function Ue(){if(k.pollTimer)return;Ge(),H();const e=document.getElementById("fleetDispatchBtn");e&&(e.onclick=We);const t=document.getElementById("flFilterQ"),n=document.getElementById("flFilterStatus");t&&t.addEventListener("input",H),n&&n.addEventListener("change",H),k.pollTimer=setInterval(H,3e3)}function re(){k.pollTimer&&(clearInterval(k.pollTimer),k.pollTimer=null)}let $={tasks:[],loading:!1,token:null,pollTimer:null};function Qe(){return $.token||($.token=""),$.token}async function C(){const e=document.getElementById("reviewRoot");if(e&&!$.loading){$.loading=!0;try{const t=await p("/api/fleet/jobs",{cache:"no-store"});if(!t.ok)throw new Error("bad status");const a=((await t.json()).jobs||[]).filter(i=>i.status==="review");$.tasks=a,e.innerHTML=Ke(a)}catch{e.innerHTML='<div class="loading">Could not load review queue.</div>'}finally{$.loading=!1}}}function Ke(e){return e.length?`<div class="card" style="padding:14px">
    <div style="font-weight:700;margin-bottom:10px">✅ Review queue (${e.length})</div>
    ${e.map(Ve).join("")}
  </div>`:'<div class="card" style="padding:14px">No tasks in review yet.</div>'}function Ve(e){const t=e.returned_model?`<span class="cm-model">${l(e.returned_model)}</span>`:"",n=e.provider?`<span style="opacity:.7">via ${l(e.provider)}</span>`:"",s=e.status==="done"?"var(--brand-bright)":e.status==="blocked"?"var(--red)":"var(--amber)";return`<div class="svc-item" style="flex-direction:column;align-items:flex-start;gap:6px;margin-bottom:10px;padding:10px;background:var(--card);border-radius:10px">
    <div style="display:flex;width:100%;justify-content:space-between;align-items:center">
      <span class="name" style="font-weight:700">${l(e.title||e.job_id||"")}</span>
      <span class="state" style="color:${s}">${l(e.status||"")}</span>
    </div>
    <div style="font-size:12px;opacity:.85">${l(e.job_id||"").slice(0,16)} ${t} ${n}</div>
    <div style="display:flex;gap:8px;flex-wrap:wrap">
      <button class="btn" style="background:var(--brand-bright);color:#082;font-weight:600" onclick="doReview('${e.job_id}','approve')">Approve</button>
      <button class="btn" style="background:var(--amber);color:#222;font-weight:600" onclick="doReview('${e.job_id}','request_changes')">Request changes</button>
      <button class="btn" style="background:var(--red);color:#fff;font-weight:600" onclick="doReview('${e.job_id}','block')">Block</button>
    </div>
    <div id="reviewMsg_${e.job_id}" style="font-size:12px"></div>
  </div>`}async function Ye(e,t){const n=Qe();if(!n)return;let s="";if((t==="request_changes"||t==="block")&&(s=prompt(t==="block"?"Block reason:":"Changes requested — reason:")||"",!s))return;const a=document.getElementById("reviewMsg_"+e);a&&(a.innerHTML='<span style="opacity:.7">Applying…</span>');try{const i=await p("/api/tasks/review",{method:"POST",body:JSON.stringify({task_id:e,action:t,owner_token:n,reason:s})}),o=await i.json();i.ok?(a&&(a.innerHTML=`<span style="color:var(--brand-bright)">✓ ${o.outcome}</span>`),C()):(a&&(a.innerHTML=`<span style="color:var(--red)">Error: ${o.error||o.detail||i.status}</span>`),o.error==="unauthorized"&&($.token=null))}catch{a&&(a.innerHTML='<span style="color:var(--red)">Could not reach review API</span>')}}function Xe(){$.pollTimer||(C(),$.pollTimer=setInterval(C,5e3))}function Ze(){$.pollTimer&&(clearInterval($.pollTimer),$.pollTimer=null)}let v={sources:null,selected:null,running:!1,last:null};async function et(){try{const e=await p("/api/osint/sources",{cache:"no-store"});if(!e.ok)return;const t=await e.json();v.sources=t||{},!v.selected&&Object.keys(v.sources).length&&(v.selected=Object.keys(v.sources)[0]),N()}catch{}}function tt(){const e=v.sources||{},t=Object.keys(e);if(!t.length)return'<div class="loading">No OSINT sources available</div>';const n=v.selected||t[0],s=e[n]||{desc:"",params:{},required_params:[]},a=Object.entries(s.params||{}).map(([i,o])=>{const r=(s.required_params||[]).includes(i),c=r?' <span style="color:var(--amber)">*</span>':"";let d;if(o.type==="bool")d=`<select id="op_${i}" class="osint-picker"><option value="false">No</option><option value="true">Yes</option></select>`;else if(o.choices)d=`<select id="op_${i}" class="osint-picker">${o.choices.map(f=>`<option value="${f}">${f}</option>`).join("")}</select>`;else{const f=o.desc||i;d=`<input id="op_${i}" class="osint-picker" type="text" placeholder="${f}" ${r?"required":""} />`}return`<label class="fld"><span>${i}${c}</span>${d}</label>`}).join("");return`<div class="card"><h3>Public Records Query</h3>
    <div class="frm">
      <label class="fld"><span>Source</span>
        <select id="osintSource" class="osint-picker">
          ${t.map(i=>`<option value="${i}" ${i===n?"selected":""}>${i}</option>`).join("")}
        </select>
      </label>
      <div class="osint-desc">${s.desc||""} <span class="src-tag">${n}</span></div>
      ${a}
      <button class="btn" id="osintRunBtn">🔎 Run Query</button>
      <div class="fmsg" id="osintMsg"></div>
    </div>
  </div>`}function nt(){const e=v.last;if(!e)return"";if(e.error)return`<div class="card"><h3>Query Error</h3><div style="color:var(--red);font-size:12px">${l(e.error)}</div></div>`;const t=e.rows||[];if(!t.length)return`<div class="card"><h3>No rows</h3><div class="osint-desc">Source returned 0 rows (${l(JSON.stringify(e.query||{}))})</div></div>`;const n=e.columns||Object.keys(t[0]||{}),s=n.map(i=>`<th>${l(i)}</th>`).join(""),a=t.map(i=>`<tr>${n.map(o=>`<td>${l(i[o]!=null?String(i[o]):"")}</td>`).join("")}</tr>`).join("");return`<div class="card"><h3>Results · ${e.count} rows · ${(e.took_ms/1e3).toFixed(1)}s</h3>
    <div class="stats-grid">
      <div class="stat-pill"><span>Source</span><span class="n">${l(e.source)}</span></div>
      <div class="stat-pill"><span>Rows</span><span class="n">${e.count}</span></div>
    </div>
    <div class="res-wrap"><table class="res"><thead><tr>${s}</tr></thead><tbody>${a}</tbody></table></div>
    <button class="save-btn" id="osintSaveBtn">💾 Save to collection</button>
    <div class="fmsg" id="osintSaveMsg"></div>
  </div>`}function N(){const e=document.getElementById("osintRoot");if(!e)return;e.innerHTML=tt()+nt();const t=document.getElementById("osintSource");t&&(t.onchange=()=>{v.selected=t.value,v.last=null,N()});const n=document.getElementById("osintRunBtn");n&&(n.onclick=it);const s=document.getElementById("osintSaveBtn");s&&(s.onclick=at)}function st(){const e=(v.sources||{})[v.selected]||{params:{}},t={};for(const n of Object.keys(e.params||{})){const s=document.getElementById("op_"+n);if(!s)continue;const a=s.value;a!==""&&a!=null&&(t[n]=a)}return t}async function it(){if(v.running)return;const e=document.getElementById("osintRunBtn"),t=document.getElementById("osintMsg"),n=v.selected;if(!n)return;const s=st(),i=(((v.sources||{})[n]||{}).required_params||[]).filter(o=>!(o in s));if(i.length){t&&(t.innerHTML=`<span style="color:var(--red)">Missing required: ${i.join(", ")}</span>`);return}e.disabled=!0,e.textContent="Querying…",v.running=!0,t&&(t.innerHTML='<span style="color:var(--muted)">Running… (can take up to 60s)</span>');try{const o=new URLSearchParams(s).toString(),r=await p(`/api/osint/${n}?${o}`,{cache:"no-store"}),c=await r.json();r.ok?v.last=c:v.last={error:c.error||"HTTP "+r.status},N()}catch{v.last={error:"Could not reach backend"},N()}e.disabled=!1,e.textContent="🔎 Run Query",v.running=!1}async function at(){const e=v.last,t=document.getElementById("osintSaveMsg");if(!e||!e.rows||!e.rows.length){t&&(t.innerHTML='<span style="color:var(--red)">No results to save</span>');return}try{const n=await p("/api/collection/ingest",{method:"POST",body:JSON.stringify({source:e.source,query:JSON.stringify(e.query||{}),payload:{columns:e.columns,rows:e.rows.slice(0,100),count:e.count,took_ms:e.took_ms}})}),s=await n.json();n.ok?t&&(t.innerHTML=`<span style="color:var(--brand-bright)">Saved #${s.id} to collection</span>`):t&&(t.innerHTML=`<span style="color:var(--red)">Error: ${s.error||n.status}</span>`)}catch{t&&(t.innerHTML='<span style="color:var(--red)">Could not reach backend</span>')}}const U=[{id:"research",icon:"🔍",label:"Research",desc:"Deep research on any topic",fields:[{name:"topic",label:"Topic",type:"text",placeholder:"e.g. local AI stack 2026"},{name:"depth",label:"Depth (3-10)",type:"number",default:5,min:3,max:10}]},{id:"code-builder",icon:"⚡",label:"Code Builder",desc:"Generate code from a spec",fields:[{name:"spec",label:"Spec",type:"textarea",placeholder:"e.g. A FastAPI endpoint that accepts JSON and returns a list"},{name:"language",label:"Language",type:"select",choices:["python","typescript","javascript","bash"],default:"python"}]},{id:"swarm",icon:"🐝",label:"Swarm",desc:"Multi-agent swarm on a goal",fields:[{name:"goal",label:"Goal",type:"textarea",placeholder:"e.g. Audit the GODSPEED fleet for idle RAM usage"}]}];let L={selected:null,running:!1,last:null};function ot(){const e=L.selected,t=U.map(s=>`
    <div class="agent-card ${e===s.id?"active":""}" data-agent="${s.id}">
      <div class="agent-icon">${s.icon}</div>
      <div class="agent-label">${s.label}</div>
      <div class="agent-desc">${s.desc}</div>
    </div>`).join("");let n="";if(e){const s=U.find(i=>i.id===e),a=s.fields.map(i=>i.type==="textarea"?`<label>${i.label}<br><textarea id="ag_${i.name}" class="picker" rows="4" placeholder="${i.placeholder||""}"></textarea></label>`:i.type==="select"?`<label>${i.label}<br><select id="ag_${i.name}" class="picker">${i.choices.map(o=>`<option value="${o}"${o===i.default?" selected":""}>${o}</option>`).join("")}</select></label>`:i.type==="number"?`<label>${i.label}<br><input id="ag_${i.name}" class="picker" type="number" value="${i.default||1}" min="${i.min||0}" max="${i.max||99}"></label>`:`<label>${i.label}<br><input id="ag_${i.name}" class="picker" type="text" placeholder="${i.placeholder||""}"></label>`).join(" ");n=`<div class="card agent-form">
      <h3>${s.icon} ${s.label}</h3>
      ${a}
      <br>
      <button class="btn" id="agRunBtn">🚀 Run Agent</button>
      <div class="fmsg" id="agMsg"></div>
      <pre class="agent-output" id="agentOutput">${L.last?JSON.stringify(L.last,null,2):""}</pre>
    </div>`}return`<div id="agentsRoot">${t}<br>${n}</div>`}function ct(){const e=document.getElementById("agentsRoot");if(!e)return;e.querySelectorAll(".agent-card").forEach(n=>{n.onclick=()=>{L.selected=n.dataset.agent,L.last=null,le()}});const t=document.getElementById("agRunBtn");t&&(t.onclick=rt)}function le(){const e=document.getElementById("agentsRoot");e&&(e.innerHTML=ot(),ct())}async function rt(){if(L.running)return;const e=document.getElementById("agRunBtn"),t=document.getElementById("agMsg"),n=document.getElementById("agentOutput"),s=L.selected;if(!s)return;const a=U.find(c=>c.id===s),i={};for(const c of a.fields){const d=document.getElementById("ag_"+c.name);d&&(i[c.name]=c.type==="number"?Number(d.value):d.value)}const o=a.fields.filter(c=>!i[c.name]&&i[c.name]!==0);if(o.length){t&&(t.innerHTML=`<span style="color:var(--red)">Required: ${o.map(c=>c.label).join(", ")}</span>`);return}e.disabled=!0,e.textContent="Running…",t&&(t.innerHTML=""),L.running=!0;let r=[];try{const c=await p(`/api/agents/${s}`,{method:"POST",body:JSON.stringify(i)});if((c.headers.get("content-type")||"").includes("text/event-stream")&&c.body){const f=c.body.getReader(),m=new TextDecoder;let h="";for(n.textContent="";;){const{value:J,done:ge}=await f.read();if(ge)break;h+=m.decode(J,{stream:!0});const Z=h.split(`
`);h=Z.pop();for(const ee of Z){if(!ee.startsWith("data: "))continue;const z=ee.slice(6).trim();if(z)try{const S=JSON.parse(z);if(r.push(S),n){const fe=S.type||"event",he=S.message||S.reply||JSON.stringify(S);n.textContent+=`[${fe}] ${he}
`,n.scrollTop=n.scrollHeight}}catch{n.textContent+=`[raw] ${z}
`}}}}else{const f=await c.json();r=[f],n&&(n.textContent=JSON.stringify(f,null,2))}L.last=r.length===1?r[0]:{events:r,count:r.length},t&&(t.innerHTML=`<span style="color:var(--brand-bright)">Done — ${r.length} events</span>`)}catch(c){L.last={error:c.message},t&&(t.innerHTML=`<span style="color:var(--red)">${c.message}</span>`),n&&(n.textContent="Error: "+c.message)}L.running=!1,e.disabled=!1,e.textContent="🚀 Run Agent"}let w={items:[],stats:null,search:"",view:"recent",timeline:[],entities:[]};const lt=[{id:"recent",label:"Items"},{id:"timeline",label:"Timeline"},{id:"entities",label:"Entities"}];function dt(){return`<div class="ingest-subtabs">${lt.map(e=>`
    <div class="ingest-subtab ${w.view===e.id?"active":""}" data-view="${e.id}">${e.label}</div>`).join("")}</div>`}function pt(e){const t=e&&e.source||"unknown",n=e&&e.query||"",s=e&&e.ts||"";let a="";try{const i=e&&e.payload;i==null?a="":typeof i=="string"?a=i.slice(0,160):a=JSON.stringify(i).slice(0,160)}catch{a=""}return`<div class="col-item">
    <div class="col-head">
      <span class="col-src">${l(t)}</span>
      <span class="col-ts">#${e&&e.id!=null?e.id:"?"} · ${l(s)}</span>
    </div>
    <div class="col-q">⚑ ${n?l(n):'<span class="muted">(no query)</span>'}</div>
    ${a?`<div class="col-p">${l(a)}${a.length>=160?"…":""}</div>`:""}
  </div>`}function Y(){const e=w.stats||{total:0,by_source:{}},t=Object.entries(e.by_source||{}).map(([o,r])=>`<div class="stat-pill"><span>${l(o)}</span><span class="n">${r}</span></div>`).join(""),n=`<div class="card"><h3>Collection Stats</h3>
    <div class="stats-grid">
      <div class="stat-pill"><span>Total</span><span class="n">${e.total}</span></div>
      ${t||'<div class="stat-pill"><span>Sources</span><span class="n">0</span></div>'}
    </div>
  </div>`,s=`<div class="card"><h3>Search Collection</h3>
    <div class="frm">
      <input id="ingestSearch" class="osint-picker" type="text" placeholder="Search collected items…" value="${l(w.search)}" />
      <button class="btn" id="ingestSearchBtn">Search</button>
    </div>
  </div>`,a=`<div class="card" style="padding:10px">${dt()}</div>`;let i;if(w.view==="timeline")i=ut();else if(w.view==="entities")i=vt();else{const o=w.items||[];i=`<div class="card"><h3>Recent Items (${o.length})</h3>
      ${o.length?o.map(pt).join(""):'<div class="loading">Nothing collected yet</div>'}
    </div>`}return n+s+a+i}function ut(){const e=w.timeline||[];if(!e.length)return'<div class="card"><h3>Timeline</h3><div class="loading">No events yet — run OSINT queries and save them.</div></div>';const t=e.map(n=>{const s=(n.entities||[]).map(a=>`<span class="entity-chip">${l(a)}</span>`).join("");return`<div class="col-item">
      <div class="col-head">
        <span class="col-src">${l(n.source)}</span>
        <span class="col-ts">#${n.id} · ${l(n.ts)}</span>
      </div>
      <div class="col-q">⚑ ${l(n.query)}</div>
      ${s?`<div class="col-entities">${s}</div>`:""}
    </div>`}).join("");return`<div class="card"><h3>Timeline · ${e.length}</h3>${t}</div>`}function vt(){const e=w.entities||[];if(!e.length)return'<div class="card"><h3>Entities</h3><div class="loading">No entities extracted yet.</div></div>';const t=e.map(n=>{const s=(n.sources||[]).map(a=>`<span class="src-tag">${l(a)}</span>`).join(" ");return`<div class="ent-row">
      <span class="ent-name">${l(n.canonical)}</span>
      <span class="ent-count">${n.count}</span>
      <span class="ent-srcs">${s}</span>
    </div>`}).join("");return`<div class="card"><h3>Entities · ${e.length}</h3><div class="ent-list">${t}</div></div>`}async function mt(){try{const[e,t]=await Promise.all([p("/api/collection/stats",{cache:"no-store"}),p("/api/collection/recent?limit=30",{cache:"no-store"})]);w.stats=await e.json();const n=await t.json();w.items=n.items||[];try{const i=await(await p("/api/collection/timeline",{cache:"no-store"})).json();w.timeline=i.events||[]}catch{}try{const i=await(await p("/api/collection/entities",{cache:"no-store"})).json();w.entities=i.entities||[]}catch{}const s=document.getElementById("ingestRoot");s&&(s.innerHTML=Y(),de())}catch{}}function de(){const e=document.getElementById("ingestSearchBtn");e&&(e.onclick=P);const t=document.getElementById("ingestSearch");t&&t.addEventListener("keydown",n=>{n.key==="Enter"&&P()}),document.querySelectorAll(".ingest-subtab").forEach(n=>{n.onclick=()=>{w.view=n.dataset.view;const s=document.getElementById("ingestRoot");s&&(s.innerHTML=Y(),de())}})}async function P(){const e=document.getElementById("ingestSearch"),t=e&&e.value||"";w.search=t;try{const s=await(await p("/api/collection/search?q="+encodeURIComponent(t),{cache:"no-store"})).json();w.items=s.items||[];const a=document.getElementById("ingestRoot");if(a){a.innerHTML=Y();const i=document.getElementById("ingestSearchBtn");i&&(i.onclick=P);const o=document.getElementById("ingestSearch");o&&(o.value=t),o&&o.addEventListener("keydown",r=>{r.key==="Enter"&&P()})}}catch{}}function gt(e){return`<div class="card"><h3>Services <span class="muted" style="text-transform:none;letter-spacing:0">— tap a switch to start/stop</span></h3><div class="svc">${Object.entries(e.services).map(([n,s])=>ie(n,s)).join("")}</div></div>
    <div class="card"><h3>System</h3>
      <div class="row"><span>Memory</span><span class="muted">${O(e.ram.used_mb)} / ${O(e.ram.total_mb)}</span></div>
      <div class="row"><span>Disk</span><span class="muted">${e.disk.used} used</span></div>
      <div class="row"><span>Updated</span><span class="muted">${e.ts}</span></div>
    </div>
    <button class="btn" onclick="refreshData()">⟳ Refresh</button>`}async function ft(){const e=document.querySelector(".btn");e&&(e.textContent="⟳ Refreshing…"),await E(!0),e&&(e.textContent="⟳ Refresh")}let u={since:0,running:!1,paused:!1,streamTimer:null,hasLoaded:!1};function ht(){return`<div class="card">
    <div class="loghead">
      <h3>Agent Log · stream</h3>
      <div class="logctl">
        <button class="btn-mini ${u.paused?"":"active"}" id="logPause">${u.paused?"▶ Resume":"⏸ Pause"}</button>
        <button class="btn-mini" id="logClear">Clear</button>
      </div>
    </div>
    <div class="logfeed" id="logFeed"><div class="loading">Connecting…</div></div>
  </div>`}function yt(e){const t=(e||"").toLowerCase();return t==="info"?"info":["warn","warning"].includes(t)?"warn":["err","error","critical","exception"].includes(t)?"err":""}function pe(e){const t=e.match(/^(\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2},\d+)\s+(\w+)\s+(.*)$/);return t?`<div class="logline"><span class="ts">${t[1]}</span><span class="lv ${yt(t[2])}">${t[2]}</span><span class="msg">${t[3]}</span></div>`:`<div class="logline"><span class="msg">${e}</span></div>`}function l(e){return e.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;")}async function bt(){if(u.running)try{const e=await p("/api/logs?since="+u.since,{cache:"no-store"});if(!e.ok)throw new Error("bad");const t=await e.json();if(u.since=t.since||0,t.lines&&t.lines.length){const n=document.getElementById("logFeed");if(!n)return;const s=n.scrollHeight-n.scrollTop-n.clientHeight<24,a=document.createElement("div");for(a.innerHTML=t.lines.map(i=>pe(l(i))).join(""),n.appendChild(a);n.children.length>800;)n.removeChild(n.firstChild);s&&!u.paused&&(n.scrollTop=n.scrollHeight)}}catch{const t=document.getElementById("logFeed");t&&!u.hasLoaded&&(t.innerHTML=`<div class="loading">Can't reach logs</div>`)}}function wt(){u.running||(u.running=!0,u.hasLoaded=!1,p("/api/logs?since=0&limit=120",{cache:"no-store"}).then(e=>e.json()).then(e=>{u.hasLoaded=!0,u.since=e.since||0;const t=document.getElementById("logFeed");if(t){t.innerHTML=e.lines.map(a=>pe(l(a))).join(""),t.scrollTop=t.scrollHeight;const n=document.getElementById("logPause");n&&(n.onclick=()=>{u.paused=!u.paused,n.textContent=u.paused?"▶ Resume":"⏸ Pause",n.classList.toggle("active",!u.paused)});const s=document.getElementById("logClear");s&&(s.onclick=()=>{t.innerHTML=""})}}).catch(()=>{const e=document.getElementById("logFeed");e&&(e.innerHTML=`<div class="loading">Can't reach logs</div>`)}),u.streamTimer=setInterval(bt,2500))}function ue(){u.running=!1,u.streamTimer&&(clearInterval(u.streamTimer),u.streamTimer=null)}const ve="mini_chat_msgs",Q=()=>{try{const e=JSON.parse(localStorage.getItem(ve)||"[]");return Array.isArray(e)?e:[]}catch{return[]}};function ne(e){try{localStorage.setItem(ve,JSON.stringify(e.slice(-40)))}catch{}}function $t(){const e=Q();return`<div class="chat-wrap">
    <div class="nav-item" style="display:flex;align-items:center;gap:8px;padding:8px 10px;margin:0 6px 8px;border-radius:10px;background:var(--card);cursor:pointer;font-size:13px;font-weight:700;color:var(--brand-bright);flex:0 0 auto" onclick="openNorthlet()"><span class="nic">🏛️</span>NorthLet ↗</div>
    <div class="chat-log" id="chatLog">${e.length?e.map(n=>{const s=n.role==="user"?"user":n.role==="err"?"err":"bot",a=n.model?`<span class="cm-model">${l(n.model)}</span>`:"";return`<div class="chat-msg ${s}">${l(n.content)}${a}</div>`}).join(""):'<div class="chat-hint">Ask GODSPEED anything — it routes to live cloud models.</div>'}</div>
    <div class="chat-input-row">
      <textarea class="chat-input" id="chatInput" rows="1" placeholder="Message…"></textarea>
      <button class="chat-send" id="chatSend" aria-label="Send">➤</button>
    </div>
  </div>`}function Tt(){const e=document.getElementById("chatLog"),t=document.getElementById("chatInput"),n=document.getElementById("chatSend");if(!e||!t||!n)return;e.scrollTop=e.scrollHeight;const s=()=>{t.style.height="auto",t.style.height=Math.min(t.scrollHeight,96)+"px"};t.addEventListener("input",s);const a=()=>{const r=e.querySelector(".chat-msg.pending");r&&r.remove()},i=(r,c,d)=>{const f=r==="user"?"user":r==="err"?"err":"bot",m=d?`<span class="cm-model">${l(d)}</span>`:"",h=document.createElement("div");return h.className="chat-msg "+f,h.textContent=c,d&&h.insertAdjacentHTML("beforeend",m),e.appendChild(h),e.scrollTop=e.scrollHeight,h};async function o(){const r=t.value.trim();if(!r)return;t.value="",s();const c=Q();c.push({role:"user",content:r}),ne(c),i("user",r),i("bot","…").classList.add("pending"),n.disabled=!0;try{const f=await p("/api/chat",{method:"POST",body:JSON.stringify({messages:c.filter(J=>J.role!=="err").slice(-20)})}),m=await f.json();if(a(),!f.ok||!m.ok){i("err",m.error||"Something went wrong.");return}i("bot",m.reply,m.model);const h=Q();h.push({role:"assistant",content:m.reply,model:m.model}),ne(h)}catch{a(),i("err","Could not reach server.")}finally{n.disabled=!1,t.focus()}}n.addEventListener("click",o),t.addEventListener("keydown",r=>{r.key==="Enter"&&!r.shiftKey&&(r.preventDefault(),o())})}function K(){if(!I){y.innerHTML='<div class="loading">Offline</div>';return}const e=I;if(g==="overview"){y.innerHTML='<div id="overviewRoot"></div>';const t=document.getElementById("overviewRoot");t.innerHTML=ae(I),oe()}else g==="chat"?(y.innerHTML=$t(),Tt()):g==="models"?y.innerHTML=Pe(e):g==="relay"?(y.innerHTML=Ae(e),Ue()):g==="review"?(y.innerHTML='<div id="reviewRoot"><div class="loading">Loading review queue…</div></div>',C()):g==="osint"?(y.innerHTML='<div id="osintRoot"></div>',et()):g==="ingest"?(y.innerHTML='<div id="ingestRoot"><div class="loading">Loading collection…</div></div>',mt()):g==="system"?y.innerHTML=gt(e):g==="pipelines"?(y.innerHTML='<div id="pipelineRoot"><div class="loading">Loading pipelines…</div></div>',V()):g==="logs"?(y.innerHTML=ht(),wt()):g==="agents"&&(y.innerHTML='<div id="agentsRoot"></div>',le());xe()}async function E(e){try{const t=await p("/api/health",{cache:"no-store"});if(!t.ok)throw new Error("bad status");const n=await t.json();let s=[];try{s=(await(await p("/api/models",{cache:"no-store"})).json()).models||[]}catch{}n.models=s,I=n,W.textContent="● live",e?g!=="logs"&&K():K()}catch{W.textContent="✗ offline",!e&&x&&(y.innerHTML=`<div class="loading">Can't reach backend</div>`)}}const se=document.getElementById("navToggle"),X=document.getElementById("sideNav"),A=document.getElementById("navBackdrop");function kt(){X.classList.add("open"),A.classList.add("open")}function D(){X.classList.remove("open"),A.classList.remove("open")}se&&se.addEventListener("click",()=>{B("light"),X.classList.contains("open")?D():kt()});A&&A.addEventListener("click",D);document.querySelectorAll(".nav-item").forEach(e=>{e.addEventListener("click",()=>{if(e.dataset.tab==="northlet"){D(),qe();return}g==="logs"&&ue(),g==="relay"&&re(),D(),ce(e.dataset.tab)})});function me(){const e=document.getElementById("navLiveText");e&&(e.textContent=W.textContent.replace("● ","").trim()||"live")}const Lt=E;E=async function(e){await Lt(e),me()};me();window.goTab=ce;window.refreshData=ft;window.doReview=Ye;window.refreshReview=C;window.refreshOverviewExtra=oe;ye().then(()=>Te());
