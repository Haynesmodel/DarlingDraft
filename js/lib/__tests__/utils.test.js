import { describe, it, expect } from 'vitest';
import { isRegularGame, isPlayoffGame, gameMargin, gameWinner, bySeasonDate } from '../utils.js';

describe('utils', () => {
  it('regular vs playoff flags', () => {
    expect(isRegularGame({ type: 'Regular' })).toBe(true);
    expect(isRegularGame({ type: 'Playoff' })).toBe(false);
    expect(isPlayoffGame({ type: 'Playoff' })).toBe(true);
    expect(isPlayoffGame({ round: 'Wild Card' })).toBe(true);
  });

  it('game margin and winner', () => {
    const g = { scoreA: 150.2, scoreB: 120.1 };
    expect(gameMargin(g)).toBeGreaterThan(30);
    expect(gameWinner(g)).toBe('A');
  });

  it('season/date comparator', () => {
    const a = { season: 2022, date: '2022-09-01' };
    const b = { season: 2022, date: '2022-10-01' };
    expect(bySeasonDate(a, b)).toBeLessThan(0);
  });
});
