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
  const { name, cat, sub, svc, price, url, contact, note } = body || {};

  if (!name || !cat || !svc) {
    return res.status(400).json({ error: 'name, cat, and svc are required' });
  }

  const ts = Date.now();
  const id = `SUB-${ts}`;
  const submission = {
    id, name, cat, sub: sub || '', svc, price: price || '',
    url: url || '', contact: contact || '', note: note || '',
    submittedAt: new Date(ts).toISOString(),
    status: 'pending'
  };

  await redis('SET', `psydir:submissions:${id}`, JSON.stringify(submission));
  await redis('LPUSH', 'psydir:submissions:queue', id);

  if (SLACK) {
    await fetch(SLACK, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text: `📬 *New Psych Ops Directory Submission*\n*Name:* ${name}\n*Category:* ${cat}\n*Contact:* ${contact || 'not provided'}\n*Review at:* https://psych-ops-directory.vercel.app/admin`
      })
    });
  }

  return res.status(200).json({ ok: true, id });
}
