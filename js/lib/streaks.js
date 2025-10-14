// js/lib/streaks.js
import { isRegularGame, bySeasonDate } from './utils.js';

export function longestWinStreak(h2h, team, { regularOnly = true } = {}) {
  const games = (h2h ?? []).filter(g => (regularOnly ? isRegularGame(g) : true) && (g.teamA === team || g.teamB === team));
  games.sort((a, b) => bySeasonDate(a, b));

  let best = { length: 0, start: null, end: null };
  let curLen = 0, curStart = null;

  for (const g of games) {
    const aWon = g.scoreA > g.scoreB;
    const bWon = g.scoreB > g.scoreA;
    const isWin = (g.teamA === team && aWon) || (g.teamB === team && bWon);

    if (isWin) {
      curLen = curLen === 0 ? 1 : curLen + 1;
      if (curLen === 1) curStart = { season: Number(g.season), date: String(g.date) };
      if (curLen > best.length) {
        best.length = curLen;
        best.start = curStart;
        best.end = { season: Number(g.season), date: String(g.date) };
      }
    } else {
      curLen = 0;
      curStart = null;
    }
  }
  return best;
}
