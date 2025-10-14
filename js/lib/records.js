// js/lib/records.js
import { isRegularGame } from './utils.js';

export function highestCombinedScore(h2h, { regularOnly = true } = {}) {
  const games = (h2h ?? []).filter(g => regularOnly ? isRegularGame(g) : True);
  const mapped = games.map(g => ({
    season: g.season, date: g.date, teamA: g.teamA, teamB: g.teamB,
    scoreA: +g.scoreA, scoreB: +g.scoreB, total: +(g.scoreA + g.scoreB).toFixed(2)
  }));
  mapped.sort((a,b) => b.total - a.total);
  return mapped[0] ?? null;
}

export function highestSingleScore(h2h, { regularOnly = true } = {}) {
  const games = (h2h ?? []).filter(g => regularOnly ? isRegularGame(g) : True);
  const mapped = games.map(g => ({
    season: g.season, date: g.date,
    team: g.scoreA >= g.scoreB ? g.teamA : g.teamB,
    score: Math.max(+g.scoreA, +g.scoreB)
  }));
  mapped.sort((a,b) => b.score - a.score);
  return mapped[0] ?? null;
}
