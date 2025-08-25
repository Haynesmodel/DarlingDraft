/* =========================================================
   The Darling — Draft + League History (Week facet + All Teams)
   - New Week filter (multi-select)
   - "All Teams" option in Team selector
   - Opponent Breakdown becomes "Team Records" when All Teams is selected
   - Top highlights (Darlings/Saunders) hidden for All Teams
========================================================= */

/* ---------- Global State ---------- */
let players = [];
let sortCol = null, sortAsc = true;

const rosterConfig = [
  { slot: "QB", limit: 1 },
  { slot: "RB", limit: 2 },
  { slot: "WR", limit: 2 },
  { slot: "TE", limit: 1 },
  { slot: "FLEX", limit: 1, flex: true },
  { slot: "DST", limit: 1 },
  { slot: "K", limit: 1 },
  { slot: "BENCH", limit: 7 }
];
let roster = {}; rosterConfig.forEach(rc => (roster[rc.slot] = []));

const startersTotal = 9;
const DEFAULT_TEAM_FOR_RIVALRY = "Joe";

let leagueGames = [];      // assets/H2H.json
let seasonSummaries = [];  // assets/SeasonSummary.json

let selectedTeam = "Joe";
let selectedSeasons = new Set();
let selectedWeeks = new Set();
let selectedOpponents = new Set();
let selectedTypes = new Set();
let selectedRounds = new Set();

let universe = { seasons: [], weeks: [], opponents: [], types: [], rounds: [] };
let seasonWeekDates = new Map(); // season -> [sorted unique regular-season dates]
let maxWeekAcrossSeasons = 0;

/* ---------- Utils ---------- */
const byId = (id)=>players.find(p=>p._id===id);
function assignIds(){ players.forEach((p,idx)=> p._id = (crypto.randomUUID?crypto.randomUUID():("id_"+Date.now()+"_"+idx))); }
function countInSlot(s){return roster[s].length;}
function openSlots(s){return rosterConfig.find(rc=>rc.slot===s).limit - countInSlot(s);}
function computeStartersFilled(){ return ["QB","RB","WR","TE","FLEX","DST","K"].reduce((n,s)=>n+countInSlot(s),0); }
function cheer(){ try{ document.getElementById("cheer").play(); }catch(e){} }
function isValuePick(p){ const d=parseFloat(p["ECR VS ADP"]); return !isNaN(d)&&d<=-3; }
function sum(a){return a.reduce((x,y)=>x+y,0);}
function unique(a){return [...new Set(a)];}
function byDateAsc(a,b){return new Date(a.date)-new Date(b.date);}
function byDateDesc(a,b){return new Date(b.date)-new Date(a.date);}
function fmtPct(w,l,t){const g=w+l+t; return g?(((w+0.5*t)/g)*100).toFixed(1)+'%':'0.0%';}
function csvEscape(s){return (''+s).replace(/"/g,'""');}

function normType(t){ return (t && t.trim()) ? t : "Regular"; }
function normRound(r){ return r || ""; }

function sidesForTeam(g, team){
  let pf, pa, opp;
  if (g.teamA===team){ pf=g.scoreA; pa=g.scoreB; opp=g.teamB; }
  else if (g.teamB===team){ pf=g.scoreB; pa=g.scoreA; opp=g.teamA; }
  else return null;
  let result='T'; if(pf>pa) result='W'; else if(pf<pa) result='L';
  return { pf, pa, opp, result };
}
function isSaundersGame(g){
  const t = normType(g.type).toLowerCase();
  const r = normRound(g.round).toLowerCase();
  return t==="saunders" || r.includes("saunders");
}
function isRegularGame(g){ return normType(g.type)==="Regular"; }
function isPlayoffGame(g){ return !isRegularGame(g) && !isSaundersGame(g); }

/* ---------- League-wide Week Index (Regular season only) ---------- */
function buildSeasonWeekIndex(){
  seasonWeekDates = new Map();
  for(const g of leagueGames){
    if(!isRegularGame(g)) continue;
    const s = +g.season;
    const arr = seasonWeekDates.get(s) || [];
    const key = new Date(g.date).toISOString().slice(0,10); // normalize date
    arr.push(key);
    seasonWeekDates.set(s, arr);
  }
  // unique + sort
  for(const [season, arr] of seasonWeekDates.entries()){
    const uniq = unique(arr).sort((a,b)=> new Date(a)-new Date(b));
    seasonWeekDates.set(season, uniq);
    if(uniq.length > maxWeekAcrossSeasons) maxWeekAcrossSeasons = uniq.length;
  }
  universe.weeks = Array.from({length:maxWeekAcrossSeasons}, (_,i)=>i+1);
}
function getGameWeek(g){
  if(!isRegularGame(g)) return null;
  const list = seasonWeekDates.get(+g.season); if(!list) return null;
  const key = new Date(g.date).toISOString().slice(0,10);
  const idx = list.indexOf(key);
  return idx>=0 ? (idx+1) : null;
}

/* ---------- Loaders & Tabs ---------- */
async function loadLeagueJSON(){
  try{
    const [h2hRes, seasonRes] = await Promise.all([
      fetch("assets/H2H.json"),
      fetch("assets/SeasonSummary.json")
    ]);
    leagueGames = await h2hRes.json();
    seasonSummaries = await seasonRes.json();
    buildSeasonWeekIndex();
  }catch(e){ console.error("Failed to load league JSON", e); }
}
function showPage(id){
  document.querySelectorAll('.tab').forEach(t=>t.classList.remove('active'));
  document.querySelectorAll('.page').forEach(p=>p.classList.remove('visible'));
  if(id==='draft'){ document.getElementById('tabDraftBtn').classList.add('active'); document.getElementById('page-draft').classList.add('visible'); }
  else { document.getElementById('tabHistoryBtn').classList.add('active'); document.getElementById('page-history').classList.add('visible'); }
}

/* ---------- Init ---------- */
window.addEventListener('DOMContentLoaded', async ()=>{
  await loadLeagueJSON();

  // Tabs
  document.getElementById('tabDraftBtn').addEventListener('click', ()=>showPage('draft'));
  document.getElementById('tabHistoryBtn').addEventListener('click', ()=>{
    showPage('history');
    if(!document.getElementById('teamSelect').dataset.ready){
      buildHistoryControls();
      document.getElementById('teamSelect').dataset.ready='1';
    }
    renderHistory();
  });

  // Draft inputs/sorting
  document.getElementById("search")?.addEventListener("input",renderTable);
  document.getElementById("positionFilter")?.addEventListener("change",renderTable);
  document.getElementById("availabilityFilter")?.addEventListener("change",renderTable);
  document.querySelectorAll('#playersTable th[data-col]').forEach(th=>{
    th.addEventListener('click',()=>{ const col=th.getAttribute('data-col'); if(sortCol===col) sortAsc=!sortAsc; else {sortCol=col; sortAsc=true;} renderTable(); });
  });

  // Dropdown toggling
  document.addEventListener("click",(e)=>{
    document.querySelectorAll(".dropdown").forEach(dd=>{
      const btn=dd.querySelector(".dropdown-toggle");
      if(btn && btn.contains(e.target)) dd.classList.toggle("open");
      else if(!dd.contains(e.target)) dd.classList.remove("open");
    });
  });

  // Clear / Export
  document.getElementById("clearFilters")?.addEventListener("click", resetAllFacetsToAll);
  document.getElementById("exportCsv")?.addEventListener("click", exportHistoryCsv);

  // Sidebar: rivalry + postseason chips (years for Saunders)
  renderDraftRivalry();
  renderSidebarPostseason(DEFAULT_TEAM_FOR_RIVALRY);

  // Draft CSV
  const csv=document.getElementById("csvFile");
  if(csv){
    csv.addEventListener("change", function(e){
      Papa.parse(e.target.files[0], {
        header:true, skipEmptyLines:true,
        complete: (results)=>{
          players = results.data.filter(r=>r["PLAYER NAME"]);
          assignIds(); renderTable(); renderRoster(); renderNeedsAndWarnings(); updateProgress();
        }
      });
    });
  }
});

/* ---------- Draft Rendering/Actions ---------- */
function renderTable(){
  const search=(document.getElementById("search")?.value||"").toLowerCase();
  const pos=document.getElementById("positionFilter")?.value||"";
  const avail=document.getElementById("availabilityFilter")?.value||"all";
  let filtered=players.filter(p=>{
    const name=(p["PLAYER NAME"]||"").toLowerCase(), team=(p.TEAM||"").toLowerCase();
    let ok=name.includes(search)||team.includes(search);
    if(pos==="FLEX") ok &= p.POS&&(p.POS.startsWith("RB")||p.POS.startsWith("WR")||p.POS.startsWith("TE"));
    else if(pos!=="") ok &= (p.POS||"").toUpperCase().startsWith(pos);
    if(avail==="available"&&p._drafted) return false;
    if(avail==="drafted"&&!p._drafted) return false;
    return ok;
  });
  if(sortCol) filtered.sort((a,b)=>{
    let va=a[sortCol], vb=b[sortCol]; if(!isNaN(+va)&&!isNaN(+vb)){va=+va;vb=+vb;}
    return va<vb?(sortAsc?-1:1):va>vb?(sortAsc?1:-1):0;
  });
  filtered.sort((a,b)=>(a._drafted===b._drafted)?0:(a._drafted?1:-1));
  const tbody=document.querySelector("#playersTable tbody"); if(!tbody) return;
  tbody.innerHTML="";
  filtered.forEach(p=>{
    const posClass=(p.POS||"").replace(/[0-9]/g,"");
    const valueBadge=isValuePick(p)?`<span class="badge fire">🔥 value</span>`:"";
    const tr=document.createElement("tr"); if(p._drafted) tr.classList.add("drafted");
    tr.innerHTML=`<td>${p.RK??""}</td>
      <td>${p["PLAYER NAME"]??""} ${valueBadge}</td>
      <td class="${posClass}">${p.POS??""}</td>
      <td>${p.TEAM??""}</td>
      <td>${p.BYE??""}</td>
      <td>${!p._drafted?`<button class="btn primary" onclick="draftPlayer('${p._id}')">Draft</button>
                        <button class="btn" onclick="otherDrafted('${p._id}')">Other Team</button>`
                      :`<button class="btn danger" onclick="undraft('${p._id}')">Undo</button>`}
      </td>`;
    tbody.appendChild(tr);
  });
}
function renderRoster(){
  const div=document.getElementById("rosterSlots"); if(!div)return; div.innerHTML="";
  rosterConfig.forEach(rc=>{
    for(let i=0;i<rc.limit;i++){
      const player=roster[rc.slot][i];
      const posClass=player?(player.POS||"").replace(/[0-9]/g,""):"";
      const row=document.createElement("div"); row.className="slot";
      row.innerHTML=`<div><strong>${rc.slot}</strong>: ${
        player?`<span class="${posClass}">${player["PLAYER NAME"]} (${player.POS})</span>`:`<span class="empty">empty</span>`}</div>
        <div>${player?`<button class="btn danger" onclick="removeFromRoster('${rc.slot}',${i})">Remove</button>`:""}</div>`;
      div.appendChild(row);
    }
  });
  renderNeedsAndWarnings(); updateProgress();
}
function renderNeedsAndWarnings(){
  const nb=document.getElementById("needsBar"); if(!nb)return; nb.innerHTML="";
  rosterConfig.forEach(rc=>{
    const need=openSlots(rc.slot);
    const pill=document.createElement("div"); pill.className="need"+(need<=0?" ok":"");
    pill.textContent=`${rc.slot}: ${Math.max(0,need)}`; nb.appendChild(pill);
  });
  const bw=document.getElementById("byeWarnings"); if(bw) bw.innerHTML="";
}
function updateProgress(){
  const pct=Math.min(100,Math.round(computeStartersFilled()/startersTotal*100));
  document.getElementById("progressFill")?.style.setProperty("width", pct+"%");
}
function draftPlayer(id){
  const p=byId(id); if(!p) return; p._drafted=true;
  let placed=false;
  for(const rc of rosterConfig){
    if(rc.flex) continue;
    if(p.POS && p.POS.startsWith(rc.slot) && roster[rc.slot].length<rc.limit){ roster[rc.slot].push(p); placed=true; break; }
  }
  if(!placed && p.POS && ["RB","WR","TE"].some(s=>p.POS.startsWith(s)) && roster["FLEX"].length<1){ roster["FLEX"].push(p); placed=true; }
  if(!placed && roster["BENCH"].length<7){ roster["BENCH"].push(p); }
  cheer(); renderTable(); renderRoster();
}
function otherDrafted(id){ const p=byId(id); if(p){p._drafted=true; renderTable();} }
function undraft(id){
  const p=byId(id); if(!p)return; p._drafted=false;
  for(const slot in roster){roster[slot]=roster[slot].filter(x=>x._id!==id);} renderTable(); renderRoster();
}
function removeFromRoster(slot,i){
  const p=roster[slot][i]; if(p) p._drafted=false; roster[slot].splice(i,1); renderRoster(); renderTable();
}

/* ---------- Draft Sidebar: Rivalry + Postseason chips ---------- */
function renderDraftRivalry(){
  if(!leagueGames.length) return;
  const me=DEFAULT_TEAM_FOR_RIVALRY, vs={};
  for(const g of leagueGames){
    const s=sidesForTeam(g,me); if(!s) continue;
    const key=s.opp; vs[key]=vs[key]||{w:0,l:0,t:0,pf:0,pa:0};
    if(s.result==='W') vs[key].w++; else if(s.result==='L') vs[key].l++; else vs[key].t++;
    vs[key].pf+=s.pf; vs[key].pa+=s.pa;
  }
  const rows=Object.entries(vs).map(([opp,r])=>({opp,...r,pct:(r.w+0.5*r.t)/Math.max(1,(r.w+r.l+r.t))}))
    .sort((a,b)=> b.pct-a.pct || b.w-a.w || a.l-b.l);
  const top=rows.slice(0,6);
  const html=`<table class="rivalry-table">
    <thead><tr><th>Opponent</th><th>W-L-T</th><th>Win %</th><th>PF / PA</th></tr></thead>
    <tbody>${top.map(r=>`<tr><td>${r.opp}</td><td>${r.w}-${r.l}-${r.t}</td><td>${fmtPct(r.w,r.l,r.t)}</td><td>${r.pf.toFixed(1)} / ${r.pa.toFixed(1)}</td></tr>`).join("")}</tbody>
  </table>`;
  document.getElementById("rivalry").innerHTML=html;
  const best=rows[0]; if(best) document.getElementById("trashTalk").textContent=`Most-owned: ${best.opp} (${best.w}-${best.l}-${best.t}).`;
}

function renderSidebarPostseason(team){
  const wrap=document.getElementById('postKpis'); if(!wrap) return;
  const champs = seasonSummaries.filter(r=>r.owner===team && r.champion).map(x=>x.season).sort((a,b)=>b-a);
  const byes = seasonSummaries.filter(r=>r.owner===team && r.bye).map(x=>x.season).sort((a,b)=>b-a);
  const sauYears = seasonSummaries.filter(r=>r.owner===team && r.saunders===true).map(x=>x.season).sort((a,b)=>b-a);
  wrap.innerHTML = `
    <div class="pill">🏆 Champs: ${champs.length}${champs.length?` (${champs.join(", ")})`:""}</div>
    <div class="pill">🔥 Byes: ${byes.length}${byes.length?` (${byes.join(", ")})`:""}</div>
    <div class="pill">🪦 Saunders: ${sauYears.length}${sauYears.length?` (${sauYears.join(", ")})`:""}</div>
  `;
}

/* ---------- Facets (simple checklist) ---------- */
function teamOptions(){
  const ts=unique(seasonSummaries.map(r=>r.owner));
  const tg=unique(leagueGames.flatMap(g=>[g.teamA,g.teamB]));
  const allTeams = unique([...ts,...tg]).sort();
  return ["ALL", ...allTeams]; // "ALL" rendered as All Teams
}
function seasonOptions(){ return unique(leagueGames.map(g=>g.season)).sort((a,b)=>b-a); }
function weekOptions(){ return universe.weeks.slice(); }
function opponentOptions(team){
  const all = unique(leagueGames.flatMap(g=>[g.teamA,g.teamB])).sort();
  return (team==="ALL") ? all : all.filter(o=>o!==team);
}
function typeOptions(){ return unique(leagueGames.map(g=>normType(g.type))).sort(); }
function roundOptionsOrdered(){
  const rounds=unique(leagueGames.map(g=>normRound(g.round)).filter(Boolean));
  const order = (roundStr="")=>{
    const r=(roundStr||"").toLowerCase().trim();
    const sau = r.includes("saunders");
    const ply = !sau && (r.includes("wild")||r.includes("quarter")||r.includes("semi")||r.includes("final")||r.includes("champ"));
    if(ply){ if(r.includes("wild"))return 1; if(r.includes("quarter"))return 2; if(r.includes("semi"))return 3; if(r.includes("champ")||r==="final"||r.endsWith("final"))return 4; return 90; }
    if(sau){ if(r.includes("round 1"))return 1; if(r.includes("final"))return 2; return 95; }
    if(r.includes("third"))return 80; return 99;
  };
  return rounds.sort((a,b)=>{ const da=order(a), db=order(b); if(da!==db) return da-db; return a.localeCompare(b); });
}

function buildHistoryControls(){
  // Team select
  const teamSelect=document.getElementById('teamSelect');
  const teams=teamOptions();
  teamSelect.innerHTML=teams.map(t=>{
    const label = (t==="ALL") ? "All Teams" : t;
    return `<option value="${t}">${label}</option>`;
  }).join("");
  teamSelect.value = teams.includes('Joe') ? 'Joe' : (teams[0] || 'ALL');
  selectedTeam = teamSelect.value || 'Joe';
  teamSelect.addEventListener('change', ()=>{
    selectedTeam = teamSelect.value;
    buildFacet('oppFilters', opponentOptions(selectedTeam), {prefix:'opp'});
    readFacetSelections(); updateFacetCountTexts(); renderHistory();
  });

  // Facets
  buildFacet('seasonFilters', seasonOptions(), {prefix:'season'});
  buildFacet('weekFilters', weekOptions(), {prefix:'week'});
  buildFacet('oppFilters', opponentOptions(selectedTeam), {prefix:'opp'});
  buildFacet('typeFilters', typeOptions(), {prefix:'type'});
  buildFacet('roundFilters', roundOptionsOrdered(), {prefix:'round'});

  // Universe + defaults
  universe.seasons = seasonOptions();
  universe.opponents = opponentOptions(selectedTeam);
  universe.types = typeOptions();
  universe.rounds = roundOptionsOrdered();

  resetAllFacetsToAll(); // All by default
  updateFacetCountTexts();
}

function buildFacet(containerId, values, opts={}){
  const container=document.getElementById(containerId); if(!container) return;
  const { prefix='f' } = opts;

  container.innerHTML = `
    <div class="all-row">
      <label>
        <input type="checkbox" class="${prefix}-all" checked />
        <span>All</span>
      </label>
    </div>
    <div class="grid">
      ${values.map(v=>`
        <label>
          <input type="checkbox" class="${prefix}-cb" data-value="${encodeURIComponent(v)}" />
          <span>${v}</span>
        </label>
      `).join("")}
    </div>
  `;

  // Behavior
  container.addEventListener('change',(e)=>{
    // All toggled
    if(e.target && e.target.matches(`input.${prefix}-all`)){
      const allChecked = e.target.checked;
      const cbs = container.querySelectorAll(`input.${prefix}-cb`);
      if(allChecked){ cbs.forEach(cb=>cb.checked=false); }
      readFacetSelections(); updateFacetCountTexts(); renderHistory();
      return;
    }
    // Specific toggled
    if(e.target && e.target.matches(`input.${prefix}-cb`)){
      const all = container.querySelector(`input.${prefix}-all`);
      const anySpecificChecked = [...container.querySelectorAll(`input.${prefix}-cb`)].some(cb=>cb.checked);
      all.checked = !anySpecificChecked; // none selected -> All
      readFacetSelections(); updateFacetCountTexts(); renderHistory();
    }
  });
}

function resetAllFacetsToAll(){
  ['seasonFilters','weekFilters','oppFilters','typeFilters','roundFilters'].forEach(id=>{
    const pref = id.startsWith('season')?'season'
              : id.startsWith('week')  ?'week'
              : id.startsWith('opp')   ?'opp'
              : id.startsWith('type')  ?'type'
              : 'round';
    const all = document.querySelector(`#${id} .${pref}-all`);
    const cbs = document.querySelectorAll(`#${id} .${pref}-cb`);
    if(all) all.checked = true;
    cbs.forEach(cb=>cb.checked=false);
  });
  readFacetSelections(); updateFacetCountTexts(); renderHistory();
}

/* Read selections from DOM into sets */
function readFacetSelections(){
  selectedSeasons = (document.querySelector('#seasonFilters .season-all')?.checked)
    ? new Set()
    : new Set([...document.querySelectorAll('#seasonFilters .season-cb')].filter(cb=>cb.checked).map(cb=>+decodeURIComponent(cb.dataset.value)));

  selectedWeeks = (document.querySelector('#weekFilters .week-all')?.checked)
    ? new Set()
    : new Set([...document.querySelectorAll('#weekFilters .week-cb')].filter(cb=>cb.checked).map(cb=>+decodeURIComponent(cb.dataset.value)));

  selectedOpponents = (document.querySelector('#oppFilters .opp-all')?.checked)
    ? new Set()
    : new Set([...document.querySelectorAll('#oppFilters .opp-cb')].filter(cb=>cb.checked).map(cb=>decodeURIComponent(cb.dataset.value)));

  selectedTypes = (document.querySelector('#typeFilters .type-all')?.checked)
    ? new Set()
    : new Set([...document.querySelectorAll('#typeFilters .type-cb')].filter(cb=>cb.checked).map(cb=>decodeURIComponent(cb.dataset.value)));

  selectedRounds = (document.querySelector('#roundFilters .round-all')?.checked)
    ? new Set()
    : new Set([...document.querySelectorAll('#roundFilters .round-cb')].filter(cb=>cb.checked).map(cb=>decodeURIComponent(cb.dataset.value)));

  universe.seasons = seasonOptions();
  universe.weeks = weekOptions();
  universe.opponents = opponentOptions(selectedTeam);
  universe.types = typeOptions();
  universe.rounds = roundOptionsOrdered();
}

/* Is a facet restrictive? (“All” => not restrictive) */
function isRestrictive(selSet, uniArr){
  if(!uniArr.length) return false;
  if(selSet.size===0) return false;
  if(selSet.size===uniArr.length) return false;
  return true;
}

/* Button texts: “All” or “N selected” */
function updateFacetCountTexts(){
  const setText = (id, selSet, uniArr)=>{
    const el=document.getElementById(id);
    if(!el) return;
    if(selSet.size===0 || selSet.size===uniArr.length) el.textContent="All";
    else el.textContent=`${selSet.size} selected`;
  };
  setText('seasonCountText', selectedSeasons, universe.seasons);
  setText('weekCountText', selectedWeeks, universe.weeks);
  setText('oppCountText', selectedOpponents, universe.opponents);
  setText('typeCountText', selectedTypes, universe.types);
  setText('roundCountText', selectedRounds, universe.rounds);
}

/* ---------- HISTORY: Filter + Render ---------- */
function applyFacetFilters(allGames){
  return allGames.filter(g=>{
    // Team filter
    const teamCheck = (selectedTeam==="ALL")
      ? true
      : (g.teamA===selectedTeam || g.teamB===selectedTeam);
    if(!teamCheck) return false;

    const t=normType(g.type);
    const r=normRound(g.round);
    const season=+g.season;

    // Opponent restriction:
    if(isRestrictive(selectedOpponents, universe.opponents)){
      if(selectedTeam==="ALL"){
        if(!(selectedOpponents.has(g.teamA) || selectedOpponents.has(g.teamB))) return false;
      }else{
        const opp = sidesForTeam(g, selectedTeam)?.opp;
        if(!opp || !selectedOpponents.has(opp)) return false;
      }
    }

    if(isRestrictive(selectedSeasons, universe.seasons) && !selectedSeasons.has(season)) return false;
    if(isRestrictive(selectedTypes, universe.types) && !selectedTypes.has(t)) return false;
    if(isRestrictive(selectedRounds, universe.rounds)){ if(!r || !selectedRounds.has(r)) return false; }

    // Week filter (applies to Regular-season games only)
    if(isRestrictive(selectedWeeks, universe.weeks)){
      const w = getGameWeek(g);
      if(!w || !selectedWeeks.has(w)) return false;
    }

    return true;
  });
}

function renderHistory(){
  const teamSel=document.getElementById('teamSelect');
  if(teamSel && selectedTeam!==teamSel.value) selectedTeam=teamSel.value;

  renderTopHighlights(selectedTeam);

  const filtered = applyFacetFilters(leagueGames);
  renderAggStats(selectedTeam, filtered);
  renderOppBreakdown(selectedTeam, filtered);
  renderSeasonRecap(selectedTeam);
  renderWeekByWeek(selectedTeam, filtered);
  renderGamesTable(selectedTeam, filtered);
}

/* ---------- Top Highlights: Darlings (Titles) & Saunders (years) ---------- */
function renderTopHighlights(team){
  const grid = document.getElementById('teamOverviewGrid');
  if(!grid) return;

  if(team==="ALL"){ grid.innerHTML = ""; return; }

  const rows = seasonSummaries.filter(r => r.owner === team);

  // Darlings = championships
  const champYears = rows
    .filter(r => r.champion)
    .map(r => r.season)
    .sort((a,b) => b - a);

  // Saunders YEARS = only seasons flagged as Saunders
  const sauYears = rows
    .filter(r => r.saunders === true)
    .map(r => r.season)
    .sort((a,b) => b - a);

  const chip = (title, main, sub="", extraClass="") => `
    <div class="overview-chip ${extraClass}">
      <h4>${title}</h4>
      <div class="big">${main}</div>
      ${sub ? `<div class="sub">${sub}</div>` : ""}
    </div>
  `;

  grid.innerHTML = [
    chip("Darlings", `${champYears.length}`, champYears.length ? `Years: ${champYears.join(", ")}` : "—", "champs"),
    chip("Saunders", `${sauYears.length}`, sauYears.length ? `Years: ${sauYears.join(", ")}` : "—", "sau")
  ].join("");
}

/* ---- Stats Overview: Regular, Playoff, Saunders ---- */
function renderAggStats(team, games){
  const reg=[], ply=[], sau=[];
  for(const g of games){
    const type=normType(g.type);
    const forTeam = (team==="ALL") ? null : sidesForTeam(g,team);
    if(team==="ALL"){
      if(isRegularGame(g)) reg.push({pf:g.scoreA,pa:g.scoreB},{pf:g.scoreB,pa:g.scoreA});
      else if(isSaundersGame(g)) sau.push({pf:g.scoreA,pa:g.scoreB},{pf:g.scoreB,pa:g.scoreA});
      else ply.push({pf:g.scoreA,pa:g.scoreB},{pf:g.scoreB,pa:g.scoreA});
    }else if(forTeam){
      if(isRegularGame(g)) reg.push(forTeam);
      else if(isSaundersGame(g)) sau.push(forTeam);
      else ply.push(forTeam);
    }
  }
  const count=(arr,res)=>arr.filter(s=>{
    if(res==='T') return s.pf===s.pa;
    if(res==='W') return s.pf>s.pa;
    return s.pf<s.pa;
  }).length;
  const rec=(arr)=>`${count(arr,'W')}-${count(arr,'L')}-${count(arr,'T')}`;
  const pct=(arr)=>fmtPct(count(arr,'W'),count(arr,'L'),count(arr,'T'));

  const all=[...reg,...ply,...sau];
  const pf=sum(all.map(s=>s.pf)), pa=sum(all.map(s=>s.pa)), n=all.length;
  const ppg = n? (pf/n):0, oppg = n? (pa/n):0;

  // Streak only makes sense for a single team
  const streak = (team==="ALL") ? "—" : (()=> {
    const ordered=[...games].sort(byDateDesc);
    let stType=null, stLen=0;
    for(const g of ordered){
      const r=sidesForTeam(g, team)?.result; if(!r) continue;
      if(stType===null){ stType=r; stLen=1; }
      else if(r===stType){ stLen++; }
      else break;
    }
    return stType ? `${stType}${stLen>1?stLen:""}` : "—";
  })();

  const stat=(label,val)=>`<div class="stat"><div class="label">${label}</div><div class="value">${val}</div></div>`;
  document.getElementById('aggStats').innerHTML = [
    stat('Reg Record', rec(reg)),
    stat('Reg Win %', pct(reg)),
    stat('Playoff Record', rec(ply)),
    stat('Playoff Win %', pct(ply)),
    stat('Saunders Record', rec(sau)),
    stat('Saunders Win %', pct(sau)),
    stat('PPG', ppg.toFixed(2)),
    stat('OPPG', oppg.toFixed(2)),
    stat('Games', n),
    stat('Streak', streak),
    stat('Avg. Margin', (ppg-oppg).toFixed(2)),
  ].join("");

  renderSeasonCallout(team);
}

/* ---- Season Callout ---- */
function seasonSummaryLookup(team, season){ return seasonSummaries.find(r=>r.owner===team && +r.season===+season); }
function renderSeasonCallout(team){
  const callout=document.getElementById('seasonCallout'); if(!callout) return; callout.innerHTML="";
  if(team==="ALL") return; // only for single team
  if(selectedSeasons.size===1){
    const [onlySeason]=[...selectedSeasons];
    const rec=seasonSummaryLookup(team, onlySeason); if(!rec) return;
    const bits=[];
    if(rec.champion) bits.push("🏆 Champion");
    if(rec.bye) bits.push("🔥 Top-2 Seed");
    if(rec.saunders) bits.push("🪦 Saunders Bracket");
    if(rec.playoff_wins||rec.playoff_losses||rec.playoff_ties) bits.push(`Playoffs: ${(rec.playoff_wins||0)}-${(rec.playoff_losses||0)}-${(rec.playoff_ties||0)}`);
    if(rec.saunders_wins||rec.saunders_losses||rec.saunders_ties) bits.push(`Saunders: ${(rec.saunders_wins||0)}-${(rec.saunders_losses||0)}-${(rec.saunders_ties||0)}`);
    const record=`${rec.wins}-${rec.losses}-${rec.ties||0}`;
    const pct=fmtPct(rec.wins, rec.losses, rec.ties||0);
    callout.innerHTML = `<div class="callout">
      <div>${team} in <strong>${onlySeason}</strong></div>
      <div>Record: <strong>${record}</strong> (${pct})</div>
      <div>${bits.join(" • ")||"—"}</div>
    </div>`;
  }
}

/* ---- Opponent Breakdown (or Team Records for ALL) ---- */
function renderOppBreakdown(team, games){
  const header=document.getElementById('oppHeader');
  const col1=document.getElementById('oppCol1');
  const tb=document.querySelector('#oppTable tbody'); if(!tb) return;

  if(team==="ALL"){
    header.textContent="Team Records";
    col1.textContent="Team";

    const map=new Map();
    for(const g of games){
      // teamA perspective
      let rA=map.get(g.teamA)||{w:0,l:0,t:0,pf:0,pa:0,n:0};
      if(g.scoreA>g.scoreB) rA.w++; else if(g.scoreA<g.scoreB) rA.l++; else rA.t++;
      rA.pf+=g.scoreA; rA.pa+=g.scoreB; rA.n++; map.set(g.teamA,rA);
      // teamB perspective
      let rB=map.get(g.teamB)||{w:0,l:0,t:0,pf:0,pa:0,n:0};
      if(g.scoreB>g.scoreA) rB.w++; else if(g.scoreB<g.scoreA) rB.l++; else rB.t++;
      rB.pf+=g.scoreB; rB.pa+=g.scoreA; rB.n++; map.set(g.teamB,rB);
    }
    const rows=[...map.entries()].map(([teamName,r])=>({
      teamName, ...r,
      pct:(r.w+0.5*r.t)/Math.max(1,(r.w+r.l+r.t)),
      ppg: r.n? (r.pf/r.n):0, oppg: r.n? (r.pa/r.n):0
    })).sort((a,b)=> b.pct-a.pct || b.w-a.w || a.l-b.l || a.teamName.localeCompare(b.teamName));

    tb.innerHTML = rows.map(r=>`
      <tr>
        <td>${r.teamName}</td>
        <td>${r.w}-${r.l}-${r.t}</td>
        <td>${fmtPct(r.w,r.l,r.t)}</td>
        <td>${r.ppg.toFixed(2)}</td>
        <td>${r.oppg.toFixed(2)}</td>
        <td>${r.n}</td>
      </tr>
    `).join("");
    return;
  }

  // Single team: opponent breakdown
  header.textContent="Opponent Breakdown";
  col1.textContent="Opponent";

  const map=new Map();
  for(const g of games){
    const s=sidesForTeam(g, team); if(!s) continue;
    const r=map.get(s.opp)||{w:0,l:0,t:0,pf:0,pa:0,n:0};
    if(s.result==='W') r.w++; else if(s.result==='L') r.l++; else r.t++;
    r.pf+=s.pf; r.pa+=s.pa; r.n++; map.set(s.opp, r);
  }
  const rows=[...map.entries()].map(([opp,r])=>({
    opp, ...r, pct:(r.w+0.5*r.t)/Math.max(1,(r.w+r.l+r.t)),
    ppg: r.n? (r.pf/r.n):0, oppg: r.n? (r.pa/r.n):0
  })).sort((a,b)=> b.pct-a.pct || b.w-a.w || a.l-b.l || a.opp.localeCompare(b.opp));

  tb.innerHTML = rows.map(r=>`
    <tr>
      <td>${r.opp}</td>
      <td>${r.w}-${r.l}-${r.t}</td>
      <td>${fmtPct(r.w,r.l,r.t)}</td>
      <td>${r.ppg.toFixed(2)}</td>
      <td>${r.oppg.toFixed(2)}</td>
      <td>${r.n}</td>
    </tr>
  `).join("");
}

/* ---- Season Recap (combined Outcome) ---- */
function renderSeasonRecap(team){
  const tb=document.querySelector('#seasonRecapTable tbody'); if(!tb) return;
  if(team==="ALL"){ tb.innerHTML = `<tr><td colspan="4">Select a team to view season-by-season outcomes.</td></tr>`; return; }

  let rows=seasonSummaries.filter(r=>r.owner===team);
  if(isRestrictive(selectedSeasons, universe.seasons)) {
    rows = rows.filter(r=>selectedSeasons.has(+r.season));
  }
  rows.sort((a,b)=>b.season-a.season);

  const fmtTriplet = (w=0,l=0,t=0) => `${w||0}-${l||0}-${t||0}`;

  const mkOutcome = (r)=>{
    const pW=r.playoff_wins||0, pL=r.playoff_losses||0, pT=r.playoff_ties||0;
    const sW=r.saunders_wins||0, sL=r.saunders_losses||0, sT=r.saunders_ties||0;

    if (r.champion) return "Champion";
    if ((pW+pL+pT) > 0) return `Playoffs (${fmtTriplet(pW,pL,pT)})`;
    if (r.saunders === true || (sW+sL+sT) > 0) return `Saunders (${fmtTriplet(sW,sL,sT)})`;
    if (r.bye) return "Top-2 Seed";
    return "—";
  };

  tb.innerHTML = rows.map(r=>`
    <tr>
      <td>${r.season}</td>
      <td>${r.wins}-${r.losses}-${r.ties||0}</td>
      <td>${fmtPct(r.wins,r.losses,r.ties||0)}</td>
      <td>${mkOutcome(r)}</td>
    </tr>
  `).join("");
}

/* ---- Week-by-Week (newest → oldest) ---- */
function renderWeekByWeek(team, games){
  const tb=document.querySelector('#weekTable tbody'); if(!tb) return;
  if(team==="ALL"){ tb.innerHTML = `<tr><td colspan="8">Select a team to see their week-by-week games.</td></tr>`; return; }

  const bySeason=new Map();
  for(const g of games){ const arr=bySeason.get(g.season)||[]; arr.push(g); bySeason.set(g.season, arr); }

  const rows=[];
  for(const [season, arr] of [...bySeason.entries()].sort((a,b)=>b[0]-a[0])){
    // infer within-season order but also show league-week if available
    const map=new Map();
    arr.filter(x=>sidesForTeam(x,team)).sort(byDateAsc).forEach((g,idx)=>map.set(g, idx+1));
    for(const g of arr.sort(byDateDesc)){
      const s=sidesForTeam(g, team); if(!s) continue;
      const weekLeague = getGameWeek(g);
      const weekTeam = map.get(g)||'';
      const weekToShow = isRegularGame(g) ? (weekLeague ?? weekTeam) : '';
      const type=normType(g.type);
      rows.push({season, week:weekToShow, date:g.date, opp:s.opp, result:s.result, pf:s.pf, pa:s.pa, type, round:normRound(g.round)});
    }
  }
  tb.innerHTML = rows.map(r=>{
    const resClass = r.result==='W'?'result-win': r.result==='L'?'result-loss':'result-tie';
    const postClass = (r.type!=="Regular") ? 'postseason' : '';
    return `<tr class="${resClass} ${postClass}">
      <td>${r.season}</td>
      <td>${r.week||''}</td>
      <td>${r.date}</td>
      <td>${r.opp}</td>
      <td>${r.result}</td>
      <td>${r.pf.toFixed(2)} - ${r.pa.toFixed(2)}</td>
      <td>${r.type}</td>
      <td>${r.round||''}</td>
    </tr>`;
  }).join("");
}

/* ---- All Games (newest → oldest) ---- */
function renderGamesTable(team, games){
  const tbody=document.querySelector("#historyGamesTable tbody"); if(!tbody) return;

  if(team==="ALL"){
    const rows=games.slice().sort(byDateDesc).map(g=>{
      return `<tr>
        <td>${g.date}</td>
        <td>${g.teamA} vs ${g.teamB}</td>
        <td>${g.scoreA===g.scoreB?'T':(g.scoreA>g.scoreB?'W':'L')} / ${g.scoreB===g.scoreA?'T':(g.scoreB>g.scoreA?'W':'L')}</td>
        <td>${g.scoreA.toFixed(2)} - ${g.scoreB.toFixed(2)}</td>
        <td>${normType(g.type)}</td>
        <td>${normRound(g.round)}</td>
        <td>${g.season}</td>
      </tr>`;
    }).join("");
    tbody.innerHTML = rows || `<tr><td colspan="7">No games match the current filters.</td></tr>`;
    return;
  }

  const rows=games.slice().sort(byDateDesc).map(g=>{
    const s=sidesForTeam(g, team); if(!s) return null;
    const type=normType(g.type);
    const resClass = s.result==='W'?'result-win': s.result==='L'?'result-loss':'result-tie';
    const postClass = (type!=="Regular") ? 'postseason' : '';
    return `<tr class="${resClass} ${postClass}">
      <td>${g.date}</td>
      <td>${s.opp}</td>
      <td>${s.result}</td>
      <td>${s.pf.toFixed(2)} - ${s.pa.toFixed(2)}</td>
      <td>${type}</td>
      <td>${normRound(g.round)}</td>
      <td>${g.season}</td>
    </tr>`;
  }).filter(Boolean).join("");
  tbody.innerHTML = rows || `<tr><td colspan="7">No games match the current filters.</td></tr>`;
}

/* ---------- Export ---------- */
function exportHistoryCsv(){
  const filtered=applyFacetFilters(leagueGames).sort(byDateDesc);
  const team=selectedTeam||'Team';
  const seasonsSuffix = isRestrictive(selectedSeasons, universe.seasons) ? '_'+[...selectedSeasons].sort((a,b)=>a-b).join('-') : '';
  const weeksSuffix = isRestrictive(selectedWeeks, universe.weeks) ? '_wk'+[...selectedWeeks].sort((a,b)=>a-b).join('-') : '';
  const header=['date','season','team','opponent','result','pf','pa','type','round','week'];
  const lines=[header.join(',')];

  if(team==="ALL"){
    for(const g of filtered){
      const w=getGameWeek(g) || '';
      // teamA perspective
      const resA = g.scoreA===g.scoreB?'T':(g.scoreA>g.scoreB?'W':'L');
      lines.push([g.date,g.season,g.teamA,g.teamB,resA,g.scoreA.toFixed(2),g.scoreB.toFixed(2),normType(g.type),normRound(g.round),w]
        .map(csvEscape).map(v=>`"${v}"`).join(','));
      // teamB perspective
      const resB = g.scoreB===g.scoreA?'T':(g.scoreB>g.scoreA?'W':'L');
      lines.push([g.date,g.season,g.teamB,g.teamA,resB,g.scoreB.toFixed(2),g.scoreA.toFixed(2),normType(g.type),normRound(g.round),w]
        .map(csvEscape).map(v=>`"${v}"`).join(','));
    }
    const blob=new Blob([lines.join('\n')],{type:'text/csv'});
    const url=URL.createObjectURL(blob); const a=document.createElement('a');
    a.href=url; a.download=`history_ALL${seasonsSuffix}${weeksSuffix}.csv`; document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
    return;
  }

  for(const g of filtered){
    const s=sidesForTeam(g, team); if(!s) continue;
    const w=getGameWeek(g) || '';
    lines.push([g.date,g.season,team,s.opp,s.result,s.pf.toFixed(2),s.pa.toFixed(2),normType(g.type),normRound(g.round),w]
      .map(csvEscape).map(v=>`"${v}"`).join(','));
  }
  const blob=new Blob([lines.join('\n')],{type:'text/csv'});
  const url=URL.createObjectURL(blob); const a=document.createElement('a');
  a.href=url; a.download=`history_${team}${seasonsSuffix}${weeksSuffix}.csv`; document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
}
