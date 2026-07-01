const REDIS = process.env.UPSTASH_REDIS_REST_URL;
const TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN;

async function redis(cmd, ...args) {
  const r = await fetch(`${REDIS}/${cmd}/${args.map(encodeURIComponent).join('/')}`, {
    headers: { Authorization: `Bearer ${TOKEN}` }
  });
  return r.json();
}

function parseRedisVal(result) {
  if (!result) return null;
  if (typeof result === 'string') {
    try { return JSON.parse(result); } catch { return result; }
  }
  return result;
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=300');

  try {
    const raw = await redis('GET', 'psydir:listings');
    const listings = parseRedisVal(raw.result);

    if (!listings || !Array.isArray(listings) || listings.length === 0) {
      return res.status(200).json({ ok: true, count: 0, listings: [], seeded: false });
    }

    // Track analytics
    const today = new Date().toISOString().split('T')[0];
    await redis('INCR', `psydir:analytics:views:${today}`);
    await redis('INCR', 'psydir:analytics:views:total');

    return res.status(200).json({
      ok: true,
      count: listings.length,
      listings,
      lastUpdated: (await redis('GET', 'psydir:lastUpdated')).result || null
    });
  } catch (e) {
    return res.status(500).json({ ok: false, error: e.message });
  }
}
