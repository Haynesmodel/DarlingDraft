import { describe, it, expect } from 'vitest';
import H2H from '../../../assets/H2H.json';
import { longestWinStreak } from '../streaks.js';

describe('streaks', () => {
  it('computes a longest win streak for a team', () => {
    const s = longestWinStreak(H2H, 'Joe', { regularOnly: true });
    expect(s).toHaveProperty('length');
    expect(typeof s.length).toBe('number');
  });
});
