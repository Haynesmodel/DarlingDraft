import { describe, it, expect } from 'vitest';
import H2H from '../../../assets/H2H.json';
import { highestCombinedScore, highestSingleScore } from '../records.js';

describe('records', () => {
  it('finds a valid highest combined score game', () => {
    const g = highestCombinedScore(H2H);
    expect(g).not.toBeNull();
    expect(g.total).toBeGreaterThan(0);
  });

  it('finds a valid highest single score game', () => {
    const g = highestSingleScore(H2H);
    expect(g).not.toBeNull();
    expect(g.score).toBeGreaterThan(0);
  });
});
