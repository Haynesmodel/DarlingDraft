/* -------------------------------
   State + Config
--------------------------------*/
let players = [];
let sortCol = null, sortAsc = true;

const rosterConfig = [
  { slot: "QB", limit: 1 },
  { slot: "RB", limit: 2 },
  { slot: "WR", limit: 2 },
  { slot: "TE", limit: 1 },
  { slot: "FLEX", limit: 1, flex:true },
  { slot: "DST", limit: 1 },
  { slot: "K", limit: 1 },
  { slot: "BENCH", limit: 7 }
];
let roster = {};
rosterConfig.forEach(rc => roster[rc.slot] = []);

let rivalryTable = null;
const startersTotal = 9;

/* -------------------------------
   Helpers
--------------------------------*/
const byId = (id) => players.find(p => p._id === id);
function assignIds() {
  players.forEach((p, idx) => p._id = (crypto.randomUUID ? crypto.randomUUID() : ('id_' + (Date.now()+idx))));
}
function countInSlot(slot) { return roster[slot].length; }
function openSlots(slot) { return rosterConfig.find(rc=>rc.slot===slot).limit - countInSlot(slot); }
function computeStartersFilled(){ return ["QB","RB","WR","TE","FLEX","DST","K"].reduce((n,s)=>n+countInSlot(s),0); }
function cheer(){ try{ document.getElementById("cheer").play(); }catch(e){} }
function isValuePick(p){
  const delta = parseFloat(p["ECR VS ADP"]);
  return !isNaN(delta) && delta <= -3;
}

/* -------------------------------
   File Loading: CSV
--------------------------------*/
document.getElementById("csvFile").addEventListener("change", function(e) {
  Papa.parse(e.target.files[0], {
    header: true,
    skipEmptyLines: true,
    complete: function(results) {
      players = results.data.filter(r => r["PLAYER NAME"]);
      assignIds();
      renderTable(); renderRoster(); renderNeedsAndWarnings(); updateProgress();
      document.getElementById("csvFile").classList.add("hidden");
    }
  });
});

/* -------------------------------
   Auto Load H2H.xlsx
--------------------------------*/
/* -------------------------------
   Auto Load H2H from JSON
--------------------------------*/
async function loadH2H() {
  try {
    const response = await fetch("assets/H2H_clean.json");
    const data = await response.json();
    rivalryTable = data;
    renderRivalry(data);
  } catch (err) {
    console.error("Could not load H2H_clean.json", err);
  }
}


/* -------------------------------
   Rendering: Table
--------------------------------*/
function renderTable() {
  const search = document.getElementById("search").value.toLowerCase();
  const pos = document.getElementById("positionFilter").value;
  const avail = document.getElementById("availabilityFilter").value;
  let filtered = players.filter(p=>{
    const name=(p["PLAYER NAME"]||"").toLowerCase(), team=(p.TEAM||"").toLowerCase();
    let ok=name.includes(search)||team.includes(search);
    if (pos==="FLEX") ok &= p.POS&&(p.POS.startsWith("RB")||p.POS.startsWith("WR")||p.POS.startsWith("TE"));
    else if (pos!=="") ok &= (p.POS||"").toUpperCase().startsWith(pos);
    if (avail==="available"&&p._drafted) return false;
    if (avail==="drafted"&&!p._drafted) return false;
    return ok;
  });
  if (sortCol) filtered.sort((a,b)=>{
    let va=a[sortCol], vb=b[sortCol]; if(!isNaN(+va)&&!isNaN(+vb)){va=+va;vb=+vb;}
    return va<vb?(sortAsc?-1:1):va>vb?(sortAsc?1:-1):0;
  });
  filtered.sort((a,b)=>(a._drafted===b._drafted)?0:(a._drafted?1:-1));
  const tbody=document.querySelector("#playersTable tbody"); tbody.innerHTML="";
  filtered.forEach(p=>{
    const posClass=(p.POS||"").replace(/[0-9]/g,"");
    const valueBadge=isValuePick(p)?`<span class="badge fire">🔥 value</span>`:"";
    const tr=document.createElement("tr"); if(p._drafted)tr.classList.add("drafted");
    tr.innerHTML=`<td>${p.RK??""}</td><td>${p["PLAYER NAME"]??""} ${valueBadge}</td>
      <td class="${posClass}">${p.POS??""}</td><td>${p.TEAM??""}</td><td>${p.BYE??""}</td>
      <td>${!p._drafted?`<button class="btn primary" onclick="draftPlayer('${p._id}')">Draft</button>
        <button class="btn ghost" onclick="otherDrafted('${p._id}')">Other Team</button>`
        :`<button class="btn danger" onclick="undraft('${p._id}')">Undo</button>`}</td>`;
    tbody.appendChild(tr);
  });
}

/* -------------------------------
   Rendering: Roster, Needs, Warnings
--------------------------------*/
function renderRoster() {
  const div=document.getElementById("rosterSlots"); div.innerHTML="";
  rosterConfig.forEach(rc=>{
    for(let i=0;i<rc.limit;i++){
      const player=roster[rc.slot][i];
      const posClass=player?(player.POS||"").replace(/[0-9]/g,""):"";
      const row=document.createElement("div");
      row.className="slot";
      row.innerHTML=`<div><strong>${rc.slot}</strong>: ${
        player?`<span class="${posClass}">${player["PLAYER NAME"]} (${player.POS})</span>`
               :`<span class="empty">empty</span>`}</div>
        <div>${player?`<button class="btn danger" onclick="removeFromRoster('${rc.slot}',${i})">Remove</button>`:""}</div>`;
      div.appendChild(row);
    }
  });
  renderNeedsAndWarnings(); updateProgress();
}
function renderNeedsAndWarnings(){
  const needsBar=document.getElementById("needsBar"); needsBar.innerHTML="";
  rosterConfig.forEach(rc=>{
    const need=openSlots(rc.slot);
    const pill=document.createElement("div");
    pill.className="need"+(need<=0?" ok":"");
    pill.textContent=`${rc.slot}: ${Math.max(0,need)}`;
    needsBar.appendChild(pill);
  });
  const bw=document.getElementById("byeWarnings"); bw.innerHTML="";
}
function updateProgress(){
  const pct=Math.min(100,Math.round(computeStartersFilled()/startersTotal*100));
  document.getElementById("progressFill").style.width=pct+"%";
}
function renderRivalry(games) {
  if (!games || !games.length) {
    document.getElementById("rivalry").innerHTML =
      "<div class='muted'>No rivalry data available.</div>";
    return;
  }

  // Aggregate per opponent
  const summary = {};
  games.forEach(g => {
    if (!summary[g.opponent]) {
      summary[g.opponent] = { w: 0, l: 0, t: 0, pf: 0, pa: 0, g: 0 };
    }
    const rec = summary[g.opponent];
    rec.pf += g.joe_score;
    rec.pa += g.opp_score;
    rec.g += 1;
    if (g.joe_score > g.opp_score) rec.w += 1;
    else if (g.joe_score < g.opp_score) rec.l += 1;
    else rec.t += 1;
  });

  let entries = Object.entries(summary);
  // Sort by win %
  entries.sort(([, a], [, b]) => (b.w / b.g) - (a.w / a.g));

  let html = "<h3 style='margin:4px 0 8px'>Rivalry Standings</h3>";
  html += `
    <table class="rivalry-table">
      <thead>
        <tr>
          <th>Opponent</th>
          <th>W</th>
          <th>L</th>
          <th>T</th>
          <th>Win %</th>
          <th>PF</th>
          <th>PA</th>
        </tr>
      </thead>
      <tbody>
  `;

  entries.forEach(([name, r]) => {
    const pct = (r.g > 0 ? (r.w / r.g * 100).toFixed(1) : "0.0") + "%";
    html += `
      <tr>
        <td>${name}</td>
        <td>${r.w}</td>
        <td>${r.l}</td>
        <td>${r.t}</td>
        <td>${pct}</td>
        <td>${r.pf.toFixed(1)}</td>
        <td>${r.pa.toFixed(1)}</td>
      </tr>
    `;
  });

  html += "</tbody></table>";
  document.getElementById("rivalry").innerHTML = html;
}

/* -------------------------------
   Actions
--------------------------------*/
function draftPlayer(id){
  const player=byId(id); if(!player)return; player._drafted=true;
  let placed=false;
  for(const rc of rosterConfig){if(rc.flex)continue; if(player.POS&&player.POS.startsWith(rc.slot)&&roster[rc.slot].length<rc.limit){roster[rc.slot].push(player);placed=true;break;}}
  if(!placed&&(player.POS&&["RB","WR","TE"].some(s=>player.POS.startsWith(s)))&&roster["FLEX"].length<1){roster["FLEX"].push(player);placed=true;}
  if(!placed&&roster["BENCH"].length<7){roster["BENCH"].push(player);}
  cheer(); renderTable(); renderRoster();
}
function otherDrafted(id){const player=byId(id); if(player){player._drafted=true; renderTable();}}
function undraft(id){
  const player=byId(id); if(!player)return; player._drafted=false;
  for(const slot in roster){roster[slot]=roster[slot].filter(p=>p._id!==id);} renderTable(); renderRoster();
}
function removeFromRoster(slot,i){
  const player=roster[slot][i]; if(player)player._drafted=false;
  roster[slot].splice(i,1); renderTable(); renderRoster();
}

/* -------------------------------
   Events
--------------------------------*/
document.getElementById("resetBtn").addEventListener("click",()=>{
  players.forEach(p=>p._drafted=false); Object.keys(roster).forEach(k=>roster[k]=[]);
  renderTable(); renderRoster();
});
document.getElementById("search").addEventListener("input", renderTable);
document.getElementById("positionFilter").addEventListener("change", renderTable);
document.getElementById("availabilityFilter").addEventListener("change", renderTable);
document.querySelectorAll("#playersTable th[data-col]").forEach(th=>{
  th.addEventListener("click",()=>{const col=th.getAttribute("data-col"); if(sortCol===col)sortAsc=!sortAsc; else{sortCol=col;sortAsc=true;} renderTable();});
});

/* -------------------------------
   Init
--------------------------------*/
window.addEventListener("DOMContentLoaded", () => {
  loadH2H();
});
