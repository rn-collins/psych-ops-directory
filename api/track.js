const REDIS = process.env.UPSTASH_REDIS_REST_URL;
const TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN;

async function redis(cmd, ...args) {
  const r = await fetch(`${REDIS}/${cmd}/${args.map(encodeURIComponent).join('/')}`, {
    headers: { Authorization: `Bearer ${TOKEN}` }
  });
  return r.json();
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
  const { type, query, category } = body || {};

  const today = new Date().toISOString().split('T')[0];

  if (type === 'view') {
    await Promise.all([
      redis('INCR', `psydir:analytics:views:${today}`),
      redis('INCR', 'psydir:analytics:views:total')
    ]);
  }

  if (type === 'search' && query && query.length >= 2) {
    const q = query.toLowerCase().slice(0, 80);
    await Promise.all([
      redis('ZINCRBY', 'psydir:analytics:searches', '1', q),
      redis('INCR', `psydir:analytics:searches:${today}`)
    ]);
  }

  if (type === 'category' && category) {
    await redis('ZINCRBY', 'psydir:analytics:categories', '1', category);
  }

  if (type === 'compare') {
    await redis('INCR', 'psydir:analytics:compares:total');
  }

  if (type === 'export') {
    await redis('INCR', 'psydir:analytics:exports:total');
  }

  return res.status(200).json({ ok: true });
}
