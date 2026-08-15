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
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
  res.setHeader('Access-Control-Allow-Origin', 'https://psych-ops-directory.vercel.app');
  res.setHeader('Cache-Control', 'public, s-maxage=120');

  try {
    const [totalRaw, searchesRaw, catsRaw, comparesRaw, exportsRaw] = await Promise.all([
      redis('GET', 'psydir:analytics:views:total'),
      redis('ZREVRANGE', 'psydir:analytics:searches', '0', '9', 'WITHSCORES'),
      redis('ZREVRANGE', 'psydir:analytics:categories', '0', '6', 'WITHSCORES'),
      redis('GET', 'psydir:analytics:compares:total'),
      redis('GET', 'psydir:analytics:exports:total')
    ]);

    const totalViews = parseInt(parseRedisVal(totalRaw.result) || '0');
    const compares = parseInt(parseRedisVal(comparesRaw.result) || '0');
    const exports_ = parseInt(parseRedisVal(exportsRaw.result) || '0');

    // Parse WITHSCORES result: [term, score, term, score, ...]
    const parseZset = (raw) => {
      const arr = raw.result || [];
      const out = [];
      for (let i = 0; i < arr.length; i += 2) {
        out.push({ term: arr[i], count: parseInt(arr[i + 1]) });
      }
      return out;
    };

    const topSearches = parseZset(searchesRaw);
    const topCategories = parseZset(catsRaw);

    return res.status(200).json({
      ok: true,
      views: { total: totalViews },
      topSearches,
      topCategories,
      compares,
      exports: exports_
    });
  } catch (e) {
    console.error(e);
    return res.status(503).json({ ok: false, error: 'Analytics unavailable' });
  }
}
