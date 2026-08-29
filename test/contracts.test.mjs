import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { LISTINGS } from "../lib/listings-static.js";
import { CATEGORIES, descriptorFor, CLAIM_PATTERN } from "../lib/taxonomy.js";
import handler from "../api/listings.js";

const r = (p) => readFile(new URL("../" + p, import.meta.url), "utf8");

function callApi() {
  let body;
  const res = {
    statusCode: 200,
    setHeader() { return res; },
    status(c) { res.statusCode = c; return res; },
    json(o) { body = o; return res; },
  };
  handler({ method: "GET" }, res);
  return body;
}

const dedup = () => {
  const seen = new Set(); const out = [];
  for (const x of LISTINGS) {
    const k = String(x.name || "").trim().toLowerCase();
    if (!k || seen.has(k)) continue;
    seen.add(k); out.push(x);
  }
  return out;
};

test("no write or admin routes", async () => {
  for (const p of ["api/admin.js", "api/seed.js", "api/submit.js", "api/flag.js", "api/track.js", "api/analytics.js", "api/subscribe.js"]) {
    await assert.rejects(r(p));
  }
});

test("safe public API fields", async () => {
  const s = await r("api/listings.js");
  for (const x of ["price", "svc", "note", "tier"]) assert.doesNotMatch(s, new RegExp(x + ":"));
});

test("strict CSP", async () => assert.doesNotMatch(await r("vercel.json"), /unsafe-inline|unsafe-eval/));

test("bounded language", async () => {
  const s = await r("public/index.html");
  assert.match(s, /not vetting, endorsement/);
  assert.doesNotMatch(s, /vetted vendors/i);
});

test("every category in the data has a published definition", () => {
  const cats = new Set(dedup().map((x) => x.cat));
  for (const c of cats) {
    assert.ok(CATEGORIES[c], `category "${c}" has no definition in lib/taxonomy.js`);
    assert.ok(CATEGORIES[c].is && CATEGORIES[c].excludes && CATEGORIES[c].doesNotTell, `category "${c}" is missing a boundary field`);
  }
  for (const c of Object.keys(CATEGORIES)) assert.ok(cats.has(c), `defined category "${c}" holds no records`);
});

test("no published descriptor carries an unsourced claim", () => {
  for (const x of dedup()) {
    const d = descriptorFor(x);
    if (!d.withheld) assert.doesNotMatch(d.text, CLAIM_PATTERN, `${x.id} publishes a claim-bearing descriptor`);
  }
});

test("the API applies the same descriptor rule as the rendered pages", () => {
  const body = callApi();
  assert.equal(body.count, dedup().length);
  for (const item of body.listings) {
    if (item.scopeWithheld) assert.equal(item.scope, "");
    else assert.doesNotMatch(item.scope, CLAIM_PATTERN);
  }
  assert.ok(body.scopeWithheldCount > 0);
});

test("the API never publishes a non-HTTPS destination", () => {
  for (const item of callApi().listings) {
    if (item.url) assert.ok(item.url.startsWith("https://"), `${item.id} has a non-HTTPS URL`);
  }
});

test("the rendered directory is not stale against the data", async () => {
  const html = await r("public/index.html");
  const body = callApi();
  assert.match(html, new RegExp(">" + body.count + " of " + body.count + " records shown"));
  for (const item of body.listings) {
    assert.ok(html.includes('data-id="' + item.id + '"'), `${item.id} missing from public/index.html — run npm run render`);
  }
});

test("the taxonomy page documents every category and every known defect", async () => {
  const html = await r("public/taxonomy.html");
  for (const c of Object.keys(CATEGORIES)) {
    assert.ok(html.includes(c.replace(/&/g, "&amp;")), `taxonomy page is missing "${c}"`);
  }
  assert.match(html, /Known defects in this taxonomy/);
});

test("the method page states what the link check does not establish", async () => {
  assert.match(await r("public/methodology.html"), /does not establish that the site belongs to the named organisation/);
});

test("hand-checked link exceptions are withheld and explained, in both the API and the page", async () => {
  const { LINK_OVERRIDES } = await import("../lib/link-overrides.js");
  const body = callApi();
  const html = await r("public/index.html");
  for (const id of Object.keys(LINK_OVERRIDES)) {
    const item = body.listings.find((x) => x.id === id);
    assert.ok(item, `override references unknown record ${id}`);
    assert.equal(item.url, "", `${id} still publishes a link`);
    assert.ok(item.linkWithheldReason.length > 20, `${id} withholds a link without saying why`);
    assert.match(html, /Link withheld —/);
  }
});
