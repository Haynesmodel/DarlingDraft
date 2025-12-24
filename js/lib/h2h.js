// js/lib/h2h.js
import { isRegularGame } from './utils.js';

export function headToHead(h2h, teamA, teamB, opts = {}) {
  const regularOnly = opts.regularOnly ?? true;
  const rel = (h2h ?? []).filter((g) => {
    const correctTeams = (g.teamA === teamA && g.teamB === teamB) || (g.teamA === teamB && g.teamB === teamA);
    return correctTeams && (regularOnly ? isRegularGame(g) : true);
  });

  let a = 0, b = 0, t = 0;
  for (const g of rel) {
    if (g.scoreA === g.scoreB) t++;
    else if ((g.teamA === teamA && g.scoreA > g.scoreB) || (g.teamB === teamA && g.scoreB > g.scoreA)) a++;
    else b++;
  }
  return { teamA, teamB, wA: a, wB: b, ties: t, n: rel.length };
}
