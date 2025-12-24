import { topRegularBlowouts } from '../js/lib/blowouts.js';
import H2H from '../assets/H2H.json';

export const config = { runtime: 'edge' };

export default async function handler(req: Request) {
  const url = new URL(req.url);
  const limit = Number(url.searchParams.get('limit') ?? '10');
  const rows = topRegularBlowouts(H2H, limit);

  return new Response(JSON.stringify({ rows }), {
    headers: {
      'content-type': 'application/json',
      'cache-control': 's-maxage=3600'
    }
  });
}
