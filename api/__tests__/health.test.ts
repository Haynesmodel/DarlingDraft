import { describe, it, expect } from 'vitest';
import handler from '../health.ts';

describe('GET /api/health', () => {
  it('returns ok:true', async () => {
    const res = await handler(new Request('https://example.com/api/blowouts?limit=3'));
    const data = await res.json();
    expect(res.ok).toBe(true);
    expect(data.ok).toBe(true);
    expect(typeof data.ts).toBe('number');
  });
});
