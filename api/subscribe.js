const REDIS = process.env.UPSTASH_REDIS_REST_URL;
const TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN;
const RESEND_KEY = process.env.RESEND_API_KEY;
const ALLOWED_ORIGIN = "https://psych-ops-directory.vercel.app";

async function redis(cmd, ...args) {
  if (!REDIS || !TOKEN) throw new Error("Storage is not configured");
  const r = await fetch(`${REDIS}/${cmd}/${args.map(encodeURIComponent).join("/")}`, { headers: { Authorization: `Bearer ${TOKEN}` } });
  if (!r.ok) throw new Error("Storage request failed");
  return r.json();
}
function bodyOf(req) { try { return typeof req.body === "string" ? JSON.parse(req.body) : req.body || {}; } catch { return null; } }
function emailOk(v) { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v) && v.length <= 254; }
function cleanCategories(value) {
  if (!Array.isArray(value) || !value.length) return ["all"];
  return [...new Set(value.filter(x => typeof x === "string").map(x => x.trim().slice(0, 100)).filter(Boolean))].slice(0, 24);
}

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", ALLOWED_ORIGIN);
  res.setHeader("Vary", "Origin");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  res.setHeader("Cache-Control", "no-store");
  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const body = bodyOf(req);
  if (!body) return res.status(400).json({ error: "Invalid JSON" });
  const email = typeof body.email === "string" ? body.email.toLowerCase().trim() : "";
  if (!emailOk(email)) return res.status(400).json({ error: "Valid email required" });
  if (body.consent !== true) return res.status(400).json({ error: "Explicit subscription consent is required" });
  const categories = cleanCategories(body.categories);
  const record = { email, categories, subscribedAt: new Date().toISOString(), consent: true, consentVersion: "2026-08-15" };

  try {
    await redis("SET", `psydir:subscribers:${email}`, JSON.stringify(record));
    await redis("SADD", "psydir:subscribers:all", email);
    for (const category of categories) await redis("SADD", `psydir:subscribers:cat:${category}`, email);

    let confirmationSent = false;
    if (RESEND_KEY) {
      const categoryLabel = categories.includes("all") ? "all categories" : categories.join(", ");
      const response = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${RESEND_KEY}` },
        body: JSON.stringify({
          from: "Psych Ops Directory <onboarding@resend.dev>",
          to: [email],
          subject: "Psych Ops Directory — subscription received",
          html: `<p>Your subscription for <strong>${categoryLabel}</strong> was received.</p><p><a href="https://psych-ops-directory.vercel.app">Visit the directory</a></p>`
        })
      });
      confirmationSent = response.ok;
      if (!response.ok) console.error("Confirmation delivery failed", response.status);
    }
    return res.status(200).json({ ok: true, stored: true, confirmationSent });
  } catch (error) {
    console.error(error);
    return res.status(503).json({ ok: false, error: "Subscription service unavailable" });
  }
}
