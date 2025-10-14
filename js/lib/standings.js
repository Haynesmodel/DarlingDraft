// js/lib/standings.js
import { isRegularGame } from './utils.js';

export function seasonStandings(h2h, season) {
  const rows = new Map();
  const yr = Number(season);

  for (const g of (h2h ?? [])) {
    if (!isRegularGame(g) || Number(g.season) != yr) continue;

    if (!rows.has(g.teamA)) rows.set(g.teamA, { team: g.teamA, w:0,l:0,t:0,pf:0,pa:0,n:0 });
    if (!rows.has(g.teamB)) rows.set(g.teamB, { team: g.teamB, w:0,l:0,t:0,pf:0,pa:0,n:0 });
    const A = rows.get(g.teamA), B = rows.get(g.teamB);

    A.pf += +g.scoreA; A.pa += +g.scoreB; A.n++;
    B.pf += +g.scoreB; B.pa += +g.scoreA; B.n++;

    if (g.scoreA > g.scoreB) { A.w++; B.l++; }
    else if (g.scoreB > g.scoreA) { B.w++; A.l++; }
    else { A.t++; B.t++; }
  }

  const arr = Array.from(rows.values()).map(r => ({
    ...r,
    diff: +(r.pf - r.pa).toFixed(2),
    winPct: r.n ? +((r.w + 0.5*r.t) / r.n).toFixed(3) : 0
  }));

  return arr.sort((x, y) => {
    const d1 = (y.w - y.l) - (x.w - x.l);
    if (d1 !== 0) return d1;
    const d2 = y.pf - x.pf;
    if (d2 !== 0) return d2;
    return (y.winPct - x.winPct);
  });
}
