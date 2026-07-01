const REDIS = process.env.UPSTASH_REDIS_REST_URL;
const TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN;
const SLACK = process.env.SLACK_WEBHOOK_URL;

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
  const { listingId, listingName, reason, contact } = body || {};

  if (!listingId || !reason) {
    return res.status(400).json({ error: 'listingId and reason are required' });
  }

  const ts = Date.now();
  const flagId = `FLAG-${ts}`;
  const flag = {
    id: flagId, listingId, listingName: listingName || '',
    reason, contact: contact || '',
    flaggedAt: new Date(ts).toISOString()
  };

  await redis('SET', `psydir:flags:${flagId}`, JSON.stringify(flag));
  await redis('LPUSH', 'psydir:flags:queue', flagId);

  if (SLACK) {
    await fetch(SLACK, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text: `🚩 *Listing Flagged for Review*\n*Listing:* ${listingName || listingId}\n*Reason:* ${reason}\n*Contact:* ${contact || 'anonymous'}\n*Review at:* https://psych-ops-directory.vercel.app/admin`
      })
    });
  }

  return res.status(200).json({ ok: true, id: flagId });
}
