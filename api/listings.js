import { LISTINGS, REVIEWED_AT } from "../lib/listings-static.js";
import { CATEGORIES, descriptorFor } from "../lib/taxonomy.js";
import { LINK_OVERRIDES } from "../lib/link-overrides.js";

const LINKS_CHECKED_AT = "2026-08-29";

export default function handler(req, res) {
  if (req.method !== "GET") return res.status(405).setHeader("Allow", "GET").json({ error: "Method not allowed" });

  const seen = new Set();
  const listings = [];
  for (const entry of LISTINGS) {
    const key = String(entry.name || "").trim().toLowerCase();
    if (!key || seen.has(key)) continue;
    seen.add(key);
    let url = "";
    try { const u = new URL(entry.url); if (u.protocol === "https:") url = u.href; } catch { /* no usable URL */ }
    // The same rule the rendered pages apply: a recorded descriptor is published
    // only when it makes no ranking, certification, superlative or transaction
    // claim, because no claim in this release has a source attached to it yet.
    const descriptor = descriptorFor(entry);
    // A hand-checked exception the automated pass cannot see: a server can answer
    // over HTTPS with a certificate a browser will refuse to accept.
    const override = LINK_OVERRIDES[String(entry.id || "")] || null;
    listings.push({
      id: String(entry.id || ""),
      name: String(entry.name || "Untitled"),
      category: String(entry.cat || "Other"),
      scope: descriptor.text,
      scopeWithheld: descriptor.withheld,
      scopeWithheldReason: descriptor.reason,
      url: override ? "" : url,
      linkStatus: override ? override.status : (url ? "ok" : String(entry.linkStatus || "none-recorded")),
      linkWithheldReason: override ? override.reason : "",
      linkCheckedAt: override ? override.checkedAt : LINKS_CHECKED_AT,
      recordReviewedAt: String(entry.reviewedAt || REVIEWED_AT),
      evidenceStatus: "provenance-pending",
    });
  }

  const categories = {};
  for (const name of Object.keys(CATEGORIES)) {
    const members = listings.filter((x) => x.category === name);
    categories[name] = {
      count: members.length,
      linked: members.filter((x) => x.url).length,
      includes: CATEGORIES[name].is,
      excludes: CATEGORIES[name].excludes,
      doesNotEstablish: CATEGORIES[name].doesNotTell,
      overlaps: CATEGORIES[name].overlaps || null,
    };
  }

  res.setHeader("Cache-Control", "public, s-maxage=3600, stale-while-revalidate=86400");
  res.setHeader("X-Content-Type-Options", "nosniff");
  return res.status(200).json({
    ok: true,
    count: listings.length,
    rawEntryCount: LISTINGS.length,
    reviewedAt: REVIEWED_AT,
    linksCheckedAt: LINKS_CHECKED_AT,
    unreachableCount: listings.filter((x) => !x.url).length,
    scopeWithheldCount: listings.filter((x) => x.scopeWithheld).length,
    scope: "Read-only editorial index. Inclusion is not vetting, endorsement, licensure verification, or a quality/safety finding.",
    linkCheckEstablishes: "That a server answered at that hostname over HTTPS on linksCheckedAt. Not that the site belongs to the named organisation, that the organisation still operates, or that the domain has not changed hands.",
    fieldsWithheld: ["pricing", "promotional claims", "credentials", "rankings", "detailed services", "descriptors containing an unsourced claim"],
    categories,
    listings,
  });
}
