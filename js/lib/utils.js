// js/lib/utils.js
export const isRegularGame = (g) => g?.type === 'Regular';
export const isPlayoffGame = (g) => (g?.type && g.type !== 'Regular') || !!g?.round;

export function gameWinner(g) {
  if (g == null) return null;
  if (typeof g.scoreA !== 'number' || typeof g.scoreB !== 'number') return null;
  if (g.scoreA > g.scoreB) return 'A';
  if (g.scoreB > g.scoreA) return 'B';
  return null;
}

export function gameMargin(g) {
  if (typeof g?.scoreA !== 'number' || typeof g?.scoreB !== 'number') return 0;
  return Math.abs(+g.scoreA - +g.scoreB);
}

export function gameKey(g) {
  return { season: Number(g?.season ?? 0), date: String(g?.date ?? '') };
}

export function bySeasonDate(a, b) {
  const sa = Number(a.season ?? 0), sb = Number(b.season ?? 0);
  if (sa !== sb) return sa - sb;
  const da = String(a.date ?? ''), db = String(b.date ?? '');
  return da.localeCompare(db);
}
