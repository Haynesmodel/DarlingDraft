import { describe, it, expect } from 'vitest';
import { topRegularBlowouts } from '../blowouts.js';
import H2H from '../../../assets/H2H.json';

describe('topRegularBlowouts', () => {
  it('returns top 10 sorted by margin', () => {
    const rows = topRegularBlowouts(H2H, 10);
    expect(rows.length).toBe(10);
    for (let i = 1; i < rows.length; i++) {
      expect(rows[i-1].margin).toBeGreaterThanOrEqual(rows[i].margin);
    }
    expect(rows[0]).toHaveProperty('winner');
    expect(typeof rows[0].margin).toBe('number');
  });
});
