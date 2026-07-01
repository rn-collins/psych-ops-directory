const REDIS = process.env.UPSTASH_REDIS_REST_URL;
const TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN;
const RESEND_KEY = process.env.RESEND_API_KEY;
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
  const { email, categories } = body || {};

  if (!email || !email.includes('@')) {
    return res.status(400).json({ error: 'Valid email required' });
  }

  const cats = Array.isArray(categories) && categories.length > 0
    ? categories
    : ['all'];

  const ts = Date.now();
  const sub = {
    email: email.toLowerCase().trim(),
    categories: cats,
    subscribedAt: new Date(ts).toISOString()
  };

  // Store subscriber
  await redis('SET', `psydir:subscribers:${email.toLowerCase().trim()}`, JSON.stringify(sub));

  // Add to master set
  await redis('SADD', 'psydir:subscribers:all', email.toLowerCase().trim());

  // Add to category sets
  for (const cat of cats) {
    await redis('SADD', `psydir:subscribers:cat:${cat}`, email.toLowerCase().trim());
  }

  // Send confirmation email via Resend
  if (RESEND_KEY) {
    const catLabel = cats.includes('all') ? 'all categories' : cats.join(', ');
    await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${RESEND_KEY}`
      },
      body: JSON.stringify({
        from: 'Psych Ops Directory <onboarding@resend.dev>',
        to: [email],
        subject: 'Psych Ops Directory — You\'re subscribed',
        html: `<p>You\'re now subscribed to alerts for <strong>${catLabel}</strong> in the Psych Ops Directory.</p>
               <p>You\'ll be notified when new listings are added or existing listings are updated.</p>
               <p><a href="https://psych-ops-directory.vercel.app">Visit the directory →</a></p>
               <p style="color:#999;font-size:12px">Built by Aloha AI Consulting · collins.ra@northeastern.edu</p>`
      })
    });
  }

  // Slack alert
  if (SLACK) {
    await fetch(SLACK, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text: `📧 *New Psych Ops Directory subscriber*\n${email}\nCategories: ${cats.join(', ')}`
      })
    });
  }

  return res.status(200).json({ ok: true });
}
