// Writes the four public pages from lib/listings-static.js and lib/taxonomy.js.
//
// Runs by hand, not at deploy time — this site has no build step and the
// committed HTML is the artefact. It exists so the directory carries its own
// records: every listing is present, linkable and printable with JavaScript off,
// and app.js only filters what is already on the page.
//
//   node scripts/render.mjs

import { writeFile } from "node:fs/promises";
import { LISTINGS, REVIEWED_AT } from "../lib/listings-static.js";
import { CATEGORIES, GROUPS, DEFECTS, descriptorFor, VERIFIED } from "../lib/taxonomy.js";
import { LINK_OVERRIDES } from "../lib/link-overrides.js";

const LINKS_CHECKED_AT = "2026-08-29";
const root = new URL("../", import.meta.url);
const esc = (v) => String(v ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const longDate = (iso) => new Date(iso + "T12:00:00Z").toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
const slug = (v) => String(v).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

const seen = new Set();
const RECORDS = [];
for (const entry of LISTINGS) {
  const key = String(entry.name || "").trim().toLowerCase();
  if (!key || seen.has(key)) continue;
  seen.add(key);
  let url = "";
  try { const u = new URL(entry.url); if (u.protocol === "https:") url = u.href; } catch { /* no usable URL */ }
  const descriptor = descriptorFor(entry);
  const override = LINK_OVERRIDES[String(entry.id || "")];
  RECORDS.push({
    id: String(entry.id || ""),
    name: String(entry.name || "Untitled"),
    category: String(entry.cat || "Other"),
    descriptor: descriptor.text,
    descriptorWithheld: descriptor.withheld,
    descriptorReason: descriptor.reason,
    redactedClauses: descriptor.redactedClauses || 0,
    verified: VERIFIED[String(entry.id || "")] || null,
    url: override ? "" : url,
    recordedUrl: url,
    linkStatus: override ? override.status : (url ? "ok" : String(entry.linkStatus || "none-recorded")),
    override: override || null,
    reviewedAt: String(entry.reviewedAt || REVIEWED_AT),
  });
}
RECORDS.sort((a, b) => a.category.localeCompare(b.category) || a.name.localeCompare(b.name));

const counts = {};
for (const r of RECORDS) {
  const c = counts[r.category] || (counts[r.category] = { total: 0, linked: 0, described: 0 });
  c.total += 1;
  if (r.url) c.linked += 1;
  if (!r.descriptorWithheld) c.described += 1;
}
const unlinked = RECORDS.filter((r) => !r.url);
const overridden = unlinked.filter((r) => r.override);
const neverRecorded = unlinked.filter((r) => r.linkStatus === "none-recorded");
const didNotAnswer = unlinked.length - overridden.length - neverRecorded.length;
const unlinkedProse = `${unlinked.length} of ${RECORDS.length} entries are shown without a link: ${didNotAnswer} whose domain did not resolve or served no working HTTPS site when links were checked on ${longDate(LINKS_CHECKED_AT)}, ${overridden.length === 1 ? "one whose certificate had expired at the moment of checking" : `${overridden.length} whose certificates had expired at the moment of checking`}, and ${neverRecorded.length === 1 ? "one that never had a website recorded" : `${neverRecorded.length} that never had a website recorded`}.`;
const withheldCount = RECORDS.filter((r) => r.descriptorWithheld).length;
const redactedCount = RECORDS.filter((r) => r.redactedClauses > 0).length;
const verifiedCount = RECORDS.filter((r) => r.verified).length;
const categoryNames = Object.keys(counts).sort();

const head = (title, description, canonical) => `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(title)}</title><meta name="description" content="${esc(description)}"><link rel="canonical" href="${esc(canonical)}"><link rel="icon" href="/favicon.svg"><link rel="manifest" href="/manifest.webmanifest"><link rel="apple-touch-icon" href="/apple-touch-icon.png"><meta property="og:title" content="${esc(title)}"><meta property="og:description" content="${esc(description)}"><meta property="og:type" content="website"><meta property="og:url" content="${esc(canonical)}"><meta property="og:image" content="https://psych-ops-directory.vercel.app/og-image.png"><meta property="og:image:width" content="1200"><meta property="og:image:height" content="630"><meta property="og:image:alt" content="Psychedelic Operations Directory"><meta name="twitter:card" content="summary_large_image"><meta name="twitter:title" content="${esc(title)}"><meta name="twitter:image" content="https://psych-ops-directory.vercel.app/og-image.png"><link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin><link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500;600&family=IBM+Plex+Sans:wght@400;500;600;700&display=swap"><link rel="stylesheet" href="/styles.css">`;

const siteNav = `<nav aria-label="Site"><a href="/">Directory</a><a href="/taxonomy">Taxonomy</a><a href="/methodology">Methodology</a><a href="/corrections">Corrections</a><a href="/privacy">Privacy</a></nav>`;
const foot = `<footer><p>Entries were last reviewed ${esc(longDate(REVIEWED_AT))}; destination links were last checked ${esc(longDate(LINKS_CHECKED_AT))}. Pricing, credentials, rankings and detailed service claims are withheld until claim-level provenance is public; ${verifiedCount} records carry a claim checked at its issuing source, dated on the record.</p><p><a href="/">Directory</a> · <a href="/taxonomy">Taxonomy</a> · <a href="/methodology">Methodology</a> · <a href="/corrections">Corrections</a> · <a href="/privacy">Privacy</a></p></footer>`;

function recordMarkup(record) {
  const text = [record.name, record.category, record.descriptor].join(" ").toLowerCase();
  return `<article class="record" id="${esc(slug(record.id))}" data-id="${esc(record.id)}" data-category="${esc(record.category)}" data-link="${record.url ? "linked" : "unlinked"}" data-name="${esc(record.name)}" data-text="${esc(text)}">
<div class="record-top"><h3>${esc(record.name)}</h3><a class="permalink" href="#${esc(slug(record.id))}" aria-label="Permanent link to ${esc(record.name)}">#</a></div>
<p class="meta"><a class="cat-link" href="/taxonomy#${esc(slug(record.category))}">${esc(record.category)}</a> · record ${esc(record.id)} · reviewed ${esc(longDate(record.reviewedAt))}</p>
${record.descriptorWithheld
    ? `<p class="withheld">Scope descriptor withheld: ${esc(record.descriptorReason)}.</p>`
    : `<p class="descriptor">${esc(record.descriptor)}${record.redactedClauses ? ` <span class="qualifier">(${record.redactedClauses === 1 ? "one further clause" : `${record.redactedClauses} further clauses`} redacted under the claim rule)</span>` : ""}</p>`}
${record.verified
    ? `<p class="verified"><strong>Checked at the source.</strong> ${esc(record.verified.text)} <a href="${esc(record.verified.source)}" target="_blank" rel="noopener noreferrer">${esc(new URL(record.verified.source).hostname)}</a>, read ${esc(longDate(record.verified.checkedAt))}.</p>`
    : ""}
${record.url
    ? `<p><a class="visit" href="${esc(record.url)}" target="_blank" rel="noopener noreferrer" aria-label="Open the website for ${esc(record.name)} (opens in a new tab)">Open website</a> <span class="host">${esc(new URL(record.url).hostname)}</span></p>`
    : record.override
      ? `<p class="nolink"><strong>Link withheld — ${esc(record.override.status === "tls-expired" ? "expired security certificate" : record.override.status)}.</strong> ${esc(record.override.reason)} ${esc(record.override.note || "")} Recorded destination: <span class="host">${esc(record.recordedUrl ? new URL(record.recordedUrl).hostname : "none")}</span>, checked ${esc(record.override.checkedAt)}.</p>`
      : `<p class="nolink">${record.linkStatus === "none-recorded" ? "No website was ever recorded for this entry." : `No reachable website was found when links were last checked on ${esc(longDate(LINKS_CHECKED_AT))}.`}</p>`}
</article>`;
}

// ---------------------------------------------------------------- directory

const index = `${head(
  "Psychedelic Operations Directory — read-only editorial index",
  `A read-only index of ${RECORDS.length} organisations appearing in the psychedelic operations field, with a published taxonomy and a stated verification boundary. Inclusion is not vetting, endorsement or a quality finding.`,
  "https://psych-ops-directory.vercel.app/",
)}<script src="/app.js" defer></script></head><body>
<a class="skip" href="#main">Skip to directory</a>
<header>
<p class="eyebrow">Read-only editorial snapshot</p>
<h1>Psychedelic Operations Directory</h1>
<p class="deck">${RECORDS.length} organisations, in ${categoryNames.length} categories. Read every scope line below as the survey&rsquo;s own wording, not as a finding of this index: it is stated here once so it need not be repeated on ${RECORDS.length} cards. Being listed means an organisation was present in the field when the survey ran. It is not vetting, endorsement, licensure verification, or a finding about quality, safety, financial stability or legal compliance.</p>
${siteNav}
</header>
<main id="main" tabindex="-1">

<section class="brief" aria-labelledby="brief-title">
<h2 id="brief-title">What this is, in one paragraph</h2>
<p>A survey of the psychedelic operations field recorded ${LISTINGS.length} entries. After removing duplicate names, ${RECORDS.length} remain. The survey did not attach a public source to each claim it captured, so a claim is published here only when it has one: pricing, credentials, rankings, acquisition values and promotional framing are held back until they do.</p>
<p>That rule used to be applied to a whole descriptor at once, which meant one unsourced word deleted the entire scope line. It now applies clause by clause. ${redactedCount} records have had part of a descriptor removed and the rest published; ${withheldCount} have nothing left to publish and say so. Where a withheld claim was worth having, the way to get it back is to go and check it: ${verifiedCount} records now carry a line read directly from the body that issues the claim — Colorado&rsquo;s approved training-programme list, and Oregon&rsquo;s own account of what its licensee directory is. Two of those checks contradict what the survey recorded.</p>
<p>The two things that make this more than a list of names are on separate pages: <a href="/taxonomy">the taxonomy</a>, which says what each category means and what it excludes, and <a href="/methodology">the method</a>, which says exactly what was and was not checked.</p>
</section>

<section class="composition" aria-labelledby="composition-title">
<h2 id="composition-title">What the corpus is made of</h2>
<p>Composition is itself a finding. Two categories hold a quarter of the index between them, four categories hold three records or fewer, and the share of entries with a working link varies sharply by category — a variation worth reading before drawing conclusions from any single row.</p>
<div class="table-wrap">
<table>
<caption class="sr-only">Record counts, working links and published descriptors by category</caption>
<thead><tr><th scope="col">Category</th><th scope="col">Records</th><th scope="col">With a working link</th><th scope="col">With a published descriptor</th></tr></thead>
<tbody>${categoryNames.map((name) => `<tr><th scope="row"><a href="/taxonomy#${esc(slug(name))}">${esc(name)}</a></th><td>${counts[name].total}</td><td>${counts[name].linked}</td><td>${counts[name].described}</td></tr>`).join("")}
<tr class="total"><th scope="row">All categories</th><td>${RECORDS.length}</td><td>${RECORDS.length - unlinked.length}</td><td>${RECORDS.length - withheldCount}</td></tr></tbody>
</table>
</div>
</section>

<section class="controls" aria-labelledby="filters-title">
<h2 id="filters-title">Search the index</h2>
<form id="filters" role="search">
<div class="grid">
<label for="search">Search names, categories and descriptors<input id="search" name="q" type="search" autocomplete="off" placeholder="Oregon, harm reduction, translation…"></label>
<label for="category">Category<select id="category" name="cat"><option value="">All ${categoryNames.length} categories</option>${categoryNames.map((name) => `<option>${esc(name)}</option>`).join("")}</select></label>
<label for="link">Destination link<select id="link" name="link"><option value="">Any link status</option><option value="linked">Has a working link</option><option value="unlinked">No reachable link</option></select></label>
<label for="sort">Order<select id="sort" name="sort"><option value="category">Category, then name</option><option value="name">Name A–Z</option><option value="name-desc">Name Z–A</option><option value="id">Record identifier</option></select></label>
</div>
<div class="toolbar">
<p id="summary" role="status" aria-live="polite">${RECORDS.length} of ${RECORDS.length} records shown.</p>
<button type="button" id="clear" class="secondary">Clear</button>
<button type="button" id="share" class="secondary" hidden>Copy link to this view</button>
</div>
<p class="note">${esc(unlinkedProse)} They are listed rather than deleted, because a name appearing in the field is the fact this index records; a working website is not.</p>
<noscript><p class="note">Searching and filtering need JavaScript. All ${RECORDS.length} records are printed in full below either way, grouped by category.</p></noscript>
</form>
</section>

<section aria-labelledby="records-title">
<h2 id="records-title">Directory records</h2>
<div id="results" class="records">${RECORDS.map(recordMarkup).join("")}</div>
<p id="empty" class="notice" hidden>No record matches those filters.</p>
</section>

</main>
${foot}
</body></html>`;

// ----------------------------------------------------------------- taxonomy

const groupOrder = Object.keys(GROUPS);
const byGroup = {};
for (const [name, def] of Object.entries(CATEGORIES)) (byGroup[def.group] = byGroup[def.group] || []).push([name, def]);

const taxonomy = `${head(
  "Taxonomy · Psychedelic Operations Directory",
  `What each of the ${categoryNames.length} categories means, what it excludes, and what a listing in it does not tell you — including the four overlapping category pairs the survey left behind.`,
  "https://psych-ops-directory.vercel.app/taxonomy",
)}</head><body>
<a class="skip" href="#main">Skip to content</a>
<header>
<p class="eyebrow">Psychedelic Operations Directory</p>
<h1>The taxonomy</h1>
<p class="deck">Any list can hold ${RECORDS.length} names. What makes an index usable is knowing what a category means, what it deliberately excludes, and what an entry in it does not prove. All three are below, for all ${categoryNames.length} categories — including the places where the taxonomy is defective.</p>
${siteNav}
</header>
<main id="main" class="prose" tabindex="-1">

<h2>How to read a category</h2>
<p>Each entry below states three things. <strong>Includes</strong> is the rule that admitted a record. <strong>Excludes</strong> is the boundary — the neighbouring thing that looks similar and was filed elsewhere, which is usually more informative than the inclusion rule. <strong>A listing here does not tell you</strong> is the important one: it names, specifically, the questions a reader will want answered that this index cannot answer.</p>
<p>Categories are descriptive. They are not tiers, grades, or endorsements, and no ordering among them is implied. Earlier versions of this index carried tier labels; those were retired because a tier reads as a quality judgement and no quality judgement was ever made.</p>

<h2>Known defects in this taxonomy</h2>
<p>The taxonomy accreted during the survey rather than being designed in advance, and it has three defects. They are published rather than repaired, for a reason worth stating plainly: repairing a category assignment after the fact would mean filing records into categories no reviewer put them in, and a snapshot that quietly improves itself is no longer a record of what was found.</p>
<ol class="defects">${DEFECTS.map((d) => `<li><h3>${esc(d.defect)}</h3><p>${esc(d.detail)}</p><p class="handling"><strong>How it is handled.</strong> ${esc(d.handling)}</p></li>`).join("")}</ol>

${groupOrder.filter((g) => byGroup[g]).map((g) => `<h2 id="${esc(slug(g))}">${esc(GROUPS[g])}</h2>
${byGroup[g].sort((a, b) => a[0].localeCompare(b[0])).map(([name, def]) => `<section class="cat" id="${esc(slug(name))}">
<h3>${esc(name)} <span class="count">${counts[name] ? counts[name].total : 0} record${counts[name] && counts[name].total === 1 ? "" : "s"}</span></h3>
<p><strong>Includes.</strong> ${esc(def.is)}</p>
<p><strong>Excludes.</strong> ${esc(def.excludes)}</p>
<p class="limit"><strong>A listing here does not tell you.</strong> ${esc(def.doesNotTell)}</p>
${def.overlaps ? `<p class="overlap"><strong>Overlaps.</strong> This category covers ground also covered by <a href="#${esc(slug(def.overlaps))}">${esc(def.overlaps)}</a>. Search both.</p>` : ""}
<p class="jump"><a href="/?cat=${encodeURIComponent(name)}">See the ${counts[name] ? counts[name].total : 0} records in this category</a></p>
</section>`).join("")}`).join("")}

</main>
${foot}
</body></html>`;

// -------------------------------------------------------------- methodology

const methodology = `${head(
  "Methodology · Psychedelic Operations Directory",
  "Exactly what was checked, what was not, how the link check was run, why descriptors are withheld, and how to reproduce every claim on this site.",
  "https://psych-ops-directory.vercel.app/methodology",
)}</head><body>
<a class="skip" href="#main">Skip to content</a>
<header>
<p class="eyebrow">Psychedelic Operations Directory</p>
<h1>Method and evidence boundaries</h1>
<p class="deck">A method section is worth reading only if it tells you what would have been missed. This one is written so that a reader who does not trust the index can reproduce every claim it makes, and can see the ones it declines to make.</p>
${siteNav}
</header>
<main id="main" class="prose" tabindex="-1">

<h2>What this release publishes, and why so little</h2>
<p>A survey of the field recorded ${LISTINGS.length} entries, each with a name, a category, a free-text descriptor, a service description, a price, an internal note and a URL. It did not record a public source for each individual claim. That single gap determines everything about this release.</p>
<p>A claim without a source is not a small defect that can be labelled around. If this index published “led most psychedelic public offerings” or “approved by the Oregon Health Authority” with nothing behind it, a reader would have no way to distinguish it from a claim that was checked — and the presence of any unsourced claim degrades every sourced one on the page. So the release withholds pricing, service descriptions, credentials, rankings, acquisitions and promotional characterisations entirely, and publishes only what can stand without a source: that a name appeared in the survey, the category it was filed under, and whether a link answered on a stated date.</p>

<h2>The descriptor rule</h2>
<p>The one field that required judgement is the short scope descriptor. Some are purely descriptive — “Oregon psilocybin licensing; cannabis and emerging industries” makes no claim beyond stating a practice area. Others carry exactly the material withheld everywhere else, in miniature: certifications, superlatives, transaction values, rankings.</p>
<p>Rather than judge them one at a time, a single mechanical rule is applied. A clause is removed if it contains a currency or percentage figure, a scaled number, a superlative, a ranking reference, or a claim of approval, accreditation, certification, licensure, acquisition or exit.</p>
<p>The rule first shipped at record level: any descriptor containing any such clause was dropped whole. That was wrong in a way worth naming, because it destroyed sound information to suppress unsound information sitting next to it. &ldquo;OHA/HECC-licensed &mdash; 9-month/205-hr, Ashland OR&rdquo; became a blank; the programme length and the town had nothing wrong with them. Forty-nine of ${RECORDS.length} records were emptied that way, and because each printed the same notice explaining why, that notice became the single most repeated sentence on the site &mdash; which is its own kind of failure to inform.</p>
<p>The rule is now applied clause by clause. A clause survives if it makes no claim and carries at least two words, a lone fragment being closer to damage than description. ${RECORDS.length - withheldCount} records publish a descriptor, ${redactedCount} of them with part removed and the removal counted on the card. ${withheldCount} have no clause that survives and say so.</p>
<p>Suppression is the cheap half. A claim can also leave the withheld pile by being checked, and ${verifiedCount} have been: the facilitator-training approvals against Colorado&rsquo;s published list of approved natural-medicine training programmes, and the two state registry records against the registries themselves. Each such record names the source and the date it was read. Two checks came back against the survey: one training programme recorded as Colorado-approved is not on Colorado&rsquo;s list, and the Oregon licensee directory recorded here as an authoritative full list is described by Oregon as neither comprehensive nor usable for licence verification. Both now say so on the record. Nothing else in this release has been verified this way, and a claim without such a line has not been checked.</p>
<p>The rule is deliberately blunt and it over-withholds. A descriptor that mentions a genuine state approval is suppressed alongside a descriptor that merely boasts, because the index has no source for either and cannot tell them apart. Where a claim of state approval matters — facilitator training is the obvious case — the state holds that fact and publishes it, and that is where a reader should go.</p>

<h2>Deduplication</h2>
<p>Names are compared after trimming whitespace and lowercasing, and the first occurrence wins. ${LISTINGS.length} raw entries reduce to ${RECORDS.length} published records. This catches exact duplicate names and nothing else: an organisation recorded twice under two different names, or under a former and a current name, is still present twice. No attempt was made to resolve organisational identity, because doing so is a research task and this is a snapshot.</p>

<h2>The link check, and what it establishes</h2>
<p>Destination links were checked on <time datetime="${esc(LINKS_CHECKED_AT)}">${esc(longDate(LINKS_CHECKED_AT))}</time>, separately from the ${esc(longDate(REVIEWED_AT))} entry review. Each recorded URL was requested over HTTPS. Only links that answered are published as links. Hosts that refuse automated requests but serve people normally are treated as reachable, because a refusal to answer a script is not evidence that a site is gone.</p>
<p>What that check establishes is narrow and worth stating exactly: <strong>that a server answered at that hostname over HTTPS on that date.</strong> It does not establish that the site belongs to the named organisation, that the organisation still operates, that the page describes the same business it described when the survey ran, or that the domain has not changed hands. A parked domain answers. So does a domain someone else has bought.</p>
<p>${esc(unlinkedProse)} They are listed rather than deleted. The fact this index records is that a name appeared in the field; a working website is a separate fact, and losing one does not erase the other. The unreachable entries also cluster in a way that is itself informative — three of the five records under Capital Markets / VC and four of the twenty under Legal.</p>

<h2>The failure an automated check cannot see</h2>
<p>An HTTPS request that completes is not the same as a website a person can open. A server whose TLS certificate has expired still answers; a browser then refuses to render the page and shows a full-screen security warning instead. To a script that is success. To a reader it is a wall.</p>
<p>${overridden.length === 1 ? "One entry" : `${overridden.length} entries`} in this index ${overridden.length === 1 ? "is" : "are"} in exactly that state, found by hand rather than by the automated pass, and ${overridden.length === 1 ? "its" : "their"} link ${overridden.length === 1 ? "is" : "are"} withheld with the reason and the timestamp shown on the record itself. Certificate expiry is usually temporary and often resolves within hours, which is why the record says what was observed and when rather than marking the organisation as gone.</p>

<h2>What is not checked at all</h2>
<p>No licence is verified. No credential is verified. No professional standing, insurance, incident history, financial condition or regulatory status is verified. No organisation was contacted. Nobody was asked whether they wished to be listed, and inclusion was not solicited. Nothing on this site should be read as a finding about any organisation’s quality, safety or lawfulness, and nothing here is professional advice.</p>

<h2>What a future claim would require</h2>
<p>Detailed claims will return only with claim-level provenance. An evidence record for a single proposition must carry: the exact proposition as it will be published, the primary URL, the publisher, the source type, the publication date, the access date, the jurisdiction it applies in, the reviewer, the verification result, the boundary of what the source supports, and a next-review date. That is a high bar deliberately. It is the bar that would let a reader check a claim without trusting the person who wrote it.</p>

<h2>Retired labels</h2>
<p>Earlier versions carried tier labels — Tier 1, Tier 2, Tier 3 — and an evidence-status grade derived from them. Both are retired. A tier reads as a ranking whatever the caption says, and no ranking was ever performed; the grades were a record of how much the surveyor had written about an entry, not of how well it had been verified. Publishing them under a different name would have preserved the same false signal.</p>

<h2>Dates</h2>
<p>Entries were last reviewed <time datetime="${esc(REVIEWED_AT)}">${esc(longDate(REVIEWED_AT))}</time>. Links were last checked <time datetime="${esc(LINKS_CHECKED_AT)}">${esc(longDate(LINKS_CHECKED_AT))}</time>. Neither date is generated from the clock. Both are recorded values, and they change only when the work is done again — which means that if this page still reads ${esc(longDate(LINKS_CHECKED_AT))} a year from now, the correct inference is that the work has not been redone, and the index should be treated accordingly.</p>

<h2>How to check this yourself</h2>
<p>Every claim on this site is reproducible without asking anyone. The record count, the category counts and the link-status counts are all derived from the same published data as the pages themselves, and the composition table on the directory page shows the working. The link status of any entry can be confirmed by requesting the destination and comparing the result against the date stated here. Where the two disagree, the check on this page is the one that is out of date — say so through <a href="/corrections">Corrections</a>.</p>

</main>
${foot}
</body></html>`;

// -------------------------------------------------------------- corrections

const corrections = `${head(
  "Corrections · Psychedelic Operations Directory",
  "What this index will correct, what it will not, what a useful correction request contains, and what happens to one.",
  "https://psych-ops-directory.vercel.app/corrections",
)}</head><body>
<a class="skip" href="#main">Skip to content</a>
<header>
<p class="eyebrow">Psychedelic Operations Directory</p>
<h1>Corrections</h1>
<p class="deck">A read-only index still has to be correctable. This page says what can be fixed, what cannot, and why the difference is not arbitrary.</p>
${siteNav}
</header>
<main id="main" class="prose" tabindex="-1">

<h2>What will be corrected</h2>
<p>Four things, because these are the four things this release actually asserts.</p>
<ul>
<li><strong>A wrong name.</strong> A misspelling, a former name, or a name that belongs to a different organisation.</li>
<li><strong>A wrong destination URL.</strong> Including a link that now resolves to an unrelated site, which is the failure mode a periodic link check is worst at catching.</li>
<li><strong>A wrong category.</strong> Judged against the published <a href="/taxonomy">taxonomy</a>, not against preference. If the taxonomy itself is wrong, say that instead — it is a more useful report.</li>
<li><strong>A duplicate.</strong> The deduplication rule matches exact names only, so an organisation recorded under two different spellings is still here twice.</li>
</ul>

<h2>What will not be corrected</h2>
<p>Requests to add pricing, credentials, service descriptions, rankings, awards or promotional language cannot be granted, because this release publishes none of those for anyone. Granting one would not be a correction; it would be an exception, and an index with exceptions is no longer a snapshot. The same applies to requests to move an organisation “higher” — there is no ordering to move within.</p>
<p>Requests for removal are considered but not automatic. Inclusion records that a name appeared in a public survey of the field. That remains true whether or not the organisation wishes it recorded, and an index that removes entries on request stops describing the field and starts describing who asked.</p>

<h2>What a useful request contains</h2>
<p>The record identifier as shown on the entry, the specific field that is wrong, what it should say, and a public URL that shows it. A correction supported by a source can be checked by anyone; a correction supported by assertion moves the problem rather than solving it.</p>

<h2>What happens to a request</h2>
<p>Interactive submission and flagging endpoints are closed — this site has no form, no account and no write path of any kind, which is a deliberate property rather than an unfinished feature. Send corrections through the contact channel published by RN Collins, and do not include confidential or sensitive information; anything sent is handled as ordinary correspondence and nothing here is a secure channel.</p>
<p>A request is not automatically accepted or published. Accepted corrections take effect the next time the index is regenerated, and the review date on every page moves only when that work is actually done. If you send a correction and the date has not changed, your correction has not yet been applied.</p>

</main>
${foot}
</body></html>`;

// ------------------------------------------------------------------ privacy

const privacy = `${head(
  "Privacy · Psychedelic Operations Directory",
  "No tracking, analytics, accounts, cookies or submission endpoints. Search and filtering happen in your browser and are never sent back.",
  "https://psych-ops-directory.vercel.app/privacy",
)}</head><body>
<a class="skip" href="#main">Skip to content</a>
<header>
<p class="eyebrow">Psychedelic Operations Directory</p>
<h1>Privacy</h1>
<p class="deck">Everything this page claims is checkable in your browser’s network tab, which is the only reason a privacy page is worth reading.</p>
${siteNav}
</header>
<main id="main" class="prose" tabindex="-1">

<h2>What is not here</h2>
<p>No analytics, no tracking pixels, no cookies, no advertising, no third-party scripts, no fonts or images from another host, no account system, and no submission, flagging, subscription, administrative or seed endpoint. There is nothing to opt out of because nothing is collected. Earlier versions of this project had submission and administrative routes; they were removed rather than disabled, and the repository’s own test suite fails if any of them reappears.</p>

<h2>What the page loads</h2>
<p>Three files, all from this origin: the page, one stylesheet, one script. The Content-Security-Policy served with every response confines scripts, styles and network connections to this origin, blocks framing, blocks inline script and inline style, and forbids form submission to anywhere. A future mistake in the markup therefore cannot quietly begin sending data elsewhere.</p>

<h2>What happens when you search</h2>
<p>Everything. All ${RECORDS.length} records are already in the page you downloaded; searching, filtering and sorting run entirely in your browser against markup that is already there. No request is made as you type, and there is no endpoint that could receive one. Filter state is written into the address bar so that a view can be linked and restored — which means a link you share carries whatever you typed, visibly, before you send it.</p>
<p>Nothing is stored on your device. There is no local storage, no session storage and no saved state; closing the tab leaves nothing behind.</p>

<h2>Links out</h2>
<p>Opening an organisation’s website sends an ordinary request to that third party under its own privacy practices. This site sets a <code>strict-origin-when-cross-origin</code> referrer policy, so those hosts learn that a visitor arrived from this origin but not which record was being read.</p>

<h2>What the host sees</h2>
<p>The site is served by Vercel, which processes ordinary request metadata — IP address, user agent, requested path, timestamp — to deliver and secure the site under its own privacy practices. That is true of any hosted website and is outside this site’s control. Nothing beyond it is recorded.</p>

<h2>About the organisations listed</h2>
<p>Every record describes a public organisation, not a private individual, and every published field was drawn from public presence in the field. Where a survey descriptor named an individual, that descriptor is withheld under the rule described in the <a href="/methodology">methodology</a>. Organisations that believe a record is wrong should read <a href="/corrections">Corrections</a>.</p>

</main>
${foot}
</body></html>`;

await writeFile(new URL("public/index.html", root), index);
await writeFile(new URL("public/taxonomy.html", root), taxonomy);
await writeFile(new URL("public/methodology.html", root), methodology);
await writeFile(new URL("public/corrections.html", root), corrections);
await writeFile(new URL("public/privacy.html", root), privacy);
console.log(`Rendered ${RECORDS.length} records across ${categoryNames.length} categories into 5 pages (${withheldCount} descriptors withheld, ${unlinked.length} entries unlinked).`);
