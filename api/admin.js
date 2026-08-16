const REDIS = process.env.UPSTASH_REDIS_REST_URL;
const TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN;
const ADMIN_PIN = process.env.ADMIN_PIN;

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
  res.setHeader('Access-Control-Allow-Origin', 'https://psych-ops-directory.vercel.app');
  res.setHeader('Vary', 'Origin');
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Admin-Pin');
  if (req.method === 'OPTIONS') return res.status(200).end();

  if (!ADMIN_PIN) return res.status(503).json({ error: 'Admin access is not configured' });
  const pin = req.headers['x-admin-pin'];
  if (pin !== ADMIN_PIN) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  // GET — return dashboard data
  if (req.method === 'GET') {
    const [listingsRaw, queueRaw, flagsQueueRaw, viewsRaw] = await Promise.all([
      redis('GET', 'psydir:listings'),
      redis('LRANGE', 'psydir:submissions:queue', '0', '49'),
      redis('LRANGE', 'psydir:flags:queue', '0', '49'),
      redis('GET', 'psydir:analytics:views:total')
    ]);

    const listings = parseRedisVal(listingsRaw.result) || [];
    const subIds = queueRaw.result || [];
    const flagIds = flagsQueueRaw.result || [];

    // Fetch submissions
    const submissions = await Promise.all(
      subIds.map(async id => {
        const r = await redis('GET', `psydir:submissions:${id}`);
        return parseRedisVal(r.result);
      })
    );

    // Fetch flags
    const flags = await Promise.all(
      flagIds.map(async id => {
        const r = await redis('GET', `psydir:flags:${id}`);
        return parseRedisVal(r.result);
      })
    );

    return res.status(200).json({
      ok: true,
      stats: {
        listings: listings.length,
        pendingSubmissions: submissions.filter(s => s && s.status === 'pending').length,
        flags: flags.filter(Boolean).length,
        totalViews: parseInt(parseRedisVal(viewsRaw.result) || '0')
      },
      submissions: submissions.filter(Boolean),
      flags: flags.filter(Boolean)
    });
  }

  // POST — mutations
  if (req.method === 'POST') {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    const { action } = body;

    if (action === 'add') {
      const { listing } = body;
      if (!listing || !listing.id || !listing.name) {
        return res.status(400).json({ error: 'listing with id and name required' });
      }
      const raw = await redis('GET', 'psydir:listings');
      const listings = parseRedisVal(raw.result) || [];
      if (listings.find(l => l.id === listing.id)) {
        return res.status(409).json({ error: `ID ${listing.id} already exists` });
      }
      listings.push({ ...listing, addedAt: new Date().toISOString() });
      await redis('SET', 'psydir:listings', JSON.stringify(listings));
      await redis('SET', 'psydir:lastUpdated', new Date().toISOString());
      return res.status(200).json({ ok: true, count: listings.length });
    }

    if (action === 'edit') {
      const { listing } = body;
      if (!listing || !listing.id) return res.status(400).json({ error: 'listing.id required' });
      const raw = await redis('GET', 'psydir:listings');
      const listings = parseRedisVal(raw.result) || [];
      const idx = listings.findIndex(l => l.id === listing.id);
      if (idx === -1) return res.status(404).json({ error: 'Listing not found' });
      listings[idx] = { ...listings[idx], ...listing, updatedAt: new Date().toISOString() };
      await redis('SET', 'psydir:listings', JSON.stringify(listings));
      await redis('SET', 'psydir:lastUpdated', new Date().toISOString());
      return res.status(200).json({ ok: true });
    }

    if (action === 'delete') {
      const { id } = body;
      if (!id) return res.status(400).json({ error: 'id required' });
      const raw = await redis('GET', 'psydir:listings');
      const listings = parseRedisVal(raw.result) || [];
      const filtered = listings.filter(l => l.id !== id);
      await redis('SET', 'psydir:listings', JSON.stringify(filtered));
      await redis('SET', 'psydir:lastUpdated', new Date().toISOString());
      return res.status(200).json({ ok: true, removed: listings.length - filtered.length });
    }

    if (action === 'approve') {
      const { submissionId } = body;
      const raw = await redis('GET', `psydir:submissions:${submissionId}`);
      const sub = parseRedisVal(raw.result);
      if (!sub) return res.status(404).json({ error: 'Submission not found' });

      const listRaw = await redis('GET', 'psydir:listings');
      const listings = parseRedisVal(listRaw.result) || [];
      const newId = `SUB-${Date.now()}`;
      listings.push({
        id: newId, name: sub.name, tier: 'TIER 2', cat: sub.cat,
        sub: sub.sub || '', svc: sub.svc, price: sub.price || '',
        note: sub.note || '', url: sub.url || '',
        addedAt: new Date().toISOString(), source: 'submission'
      });
      await redis('SET', 'psydir:listings', JSON.stringify(listings));
      await redis('SET', `psydir:submissions:${submissionId}`, JSON.stringify({ ...sub, status: 'approved' }));
      await redis('SET', 'psydir:lastUpdated', new Date().toISOString());
      return res.status(200).json({ ok: true });
    }

    if (action === 'reject') {
      const { submissionId } = body;
      const raw = await redis('GET', `psydir:submissions:${submissionId}`);
      const sub = parseRedisVal(raw.result);
      if (!sub) return res.status(404).json({ error: 'Submission not found' });
      await redis('SET', `psydir:submissions:${submissionId}`, JSON.stringify({ ...sub, status: 'rejected' }));
      return res.status(200).json({ ok: true });
    }

    return res.status(400).json({ error: `Unknown action: ${action}` });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
