import { describe, it, expect } from 'vitest';
import H2H from '../../../assets/H2H.json';
import { headToHead } from '../h2h.js';

describe('headToHead', () => {
  it('computes head-to-head record (regular only)', () => {
    const r = headToHead(H2H, 'Joe', 'Zook', { regularOnly: true });
    expect(r.n).toBeGreaterThan(0);
    expect(r.wA + r.wB + r.ties).toBe(r.n);
  });
});
