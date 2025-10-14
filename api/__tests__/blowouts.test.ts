import { describe, it, expect } from 'vitest';
import handler from '../blowouts.ts';

describe('GET /api/blowouts', () => {
  it('returns rows array', async () => {
    const res = await handler(new Request('https://example.com/api/blowouts?limit=3'));
    const data = await res.json();
    expect(res.ok).toBe(true);
    expect(Array.isArray(data.rows)).toBe(true);
    expect(data.rows.length).toBe(3);
    expect(data.rows[0]).toHaveProperty('winner');
  });
});
