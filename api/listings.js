import { LISTINGS, REVIEWED_AT } from "./listings-static.js";

export default async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });
  res.setHeader("Cache-Control", "public, s-maxage=300, stale-while-revalidate=3600");
  res.setHeader("X-Content-Type-Options", "nosniff");
  return res.status(200).json({
    ok: true,
    count: LISTINGS.length,
    categories: new Set(LISTINGS.map(x => x.cat)).size,
    reviewedAt: REVIEWED_AT,
    source: "editorial-static-corpus",
    listingIdsUnique: new Set(LISTINGS.map(x => x.id)).size === LISTINGS.length,
    listings: LISTINGS
  });
}
