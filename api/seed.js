const REDIS = process.env.UPSTASH_REDIS_REST_URL;
const TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN;
const ADMIN_PIN = process.env.ADMIN_PIN;

async function redis(cmd, ...args) {
  const r = await fetch(`${REDIS}/${cmd}/${args.map(encodeURIComponent).join('/')}`, {
    headers: { Authorization: `Bearer ${TOKEN}` }
  });
  return r.json();
}

// Import full listings data — this will be populated by the seed script
// The actual data is stored as a separate import to keep this file manageable
const SEED_URL = 'https://psych-ops-directory.vercel.app/api/listings-static';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', 'https://psych-ops-directory.vercel.app');
  res.setHeader('Vary', 'Origin');
  res.setHeader('Cache-Control', 'no-store');

  if (!ADMIN_PIN) return res.status(503).json({ error: 'Admin access is not configured' });
  const pin = req.headers['x-admin-pin'];
  if (pin !== ADMIN_PIN) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    // Check if already seeded
    const existing = await redis('GET', 'psydir:listings');
    let current = [];
    if (existing.result) {
      try { current = JSON.parse(existing.result); } catch {}
    }

    if (current.length > 0 && !req.query.force) {
      return res.status(200).json({
        ok: true,
        message: `Already seeded with ${current.length} listings. Pass ?force=1 to reseed.`,
        count: current.length
      });
    }

    // Fetch seed data from static endpoint
    const r = await fetch(SEED_URL, { headers: { 'X-Admin-Pin': pin } });
    const data = await r.json();

    if (!data.listings || !Array.isArray(data.listings)) {
      return res.status(500).json({ error: 'Failed to fetch seed data' });
    }

    await redis('SET', 'psydir:listings', JSON.stringify(data.listings));
    await redis('SET', 'psydir:lastUpdated', new Date().toISOString());

    return res.status(200).json({
      ok: true,
      message: `Seeded ${data.listings.length} listings`,
      count: data.listings.length
    });
  } catch (e) {
    return res.status(500).json({ ok: false, error: e.message });
  }
}
