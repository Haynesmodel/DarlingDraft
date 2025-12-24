import { describe, it, expect } from 'vitest';
import H2H from '../../../assets/H2H.json';
import { seasonStandings } from '../standings.js';

describe('seasonStandings', () => {
  it('builds standings for a known season', () => {
    const rows = seasonStandings(H2H, 2022);
    expect(rows.length).toBeGreaterThan(0);
    for (const r of rows) {
      expect(r.n).toBeGreaterThan(0);
      expect(r.w + r.l + r.t).toBe(r.n);
      expect(typeof r.winPct).toBe('number');
    }
  });
});
