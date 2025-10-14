// js/lib/blowouts.js
import { isRegularGame } from './utils.js';

export function topRegularBlowouts(h2h, limit = 10) {
  return (h2h ?? [])
    .filter((g) => g && isRegularGame(g) && typeof g.scoreA === 'number' && typeof g.scoreB === 'number')
    .map((g) => {
      const aWins = g.scoreA >= g.scoreB;
      const winner = aWins ? g.teamA : g.teamB;
      const loser  = aWins ? g.teamB : g.teamA;
      const wScore = aWins ? g.scoreA : g.scoreB;
      const lScore = aWins ? g.scoreB : g.scoreA;
      return {
        season: Number(g.season),
        date: String(g.date),
        winner,
        loser,
        scoreW: +wScore,
        scoreL: +lScore,
        margin: +(+wScore - +lScore).toFixed(2)
      };
    })
    .sort((a, b) => b.margin - a.margin)
    .slice(0, limit);
}
