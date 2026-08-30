// The category taxonomy, and the rule that governs the free-text descriptor.
//
// A directory is not distinguished by the names it holds — names are cheap and
// several other lists hold the same ones. It is distinguished by whether a reader
// can tell what a category means, what it excludes, and what an entry in it does
// not prove. That is what this file is.
//
// The taxonomy was not designed. It accreted during the underlying survey, and it
// shows: four pairs of categories overlap, and two identifier prefixes are used by
// two different categories each. Those defects are recorded in DEFECTS below and
// published rather than quietly merged, because merging them now would silently
// rewrite which category a record was originally assigned to.

// A descriptor is published only if it survives this test. The survey recorded a
// free-text descriptor for every entry, and a large minority of those descriptors
// contain exactly the material this release withholds elsewhere: rankings,
// certifications, superlatives, acquisition values and promotional framing. A
// descriptor that says "flagship" or "$1.2B exit" or "OHA approved" is a claim,
// and no claim in this release has a source attached to it yet.
export const CLAIM_PATTERN = /(\$|%|\b\d+(\.\d+)?\s?(m|b|k)\b|\bAm Law\b|VERIFY STATUS|\bflagship\b|\bleading\b|\bpremier\b|\bfirst\b|\blargest\b|\bbest\b|\bmajor\b|\btop\b|\bonly\b|\bworld[- ]class\b|\bauthoritative\b|\brobust\b|\bapproved\b|\baccredited\b|\bcertified\b|\blicensed\b|\blicensee\b|\bISO\b|\bHIPAA\b|\bacquir|\bexit\b|\bmerger\b|\bconsolidat|\bconfirmed\b|\bNEJM\b|\bdocumented\b|\bdedicated\b|\bofficial\b|\bspecialist\b|\bfree\b|\bcomprehensive\b|\ball-in-one\b|\bpurpose-built\b|\bcredentialed\b)/i;

// Redaction is clause-level, not record-level. The first release applied the test to
// the whole descriptor and dropped all of it when any part tripped, so "OHA/HECC-licensed
// — 9-month/205-hr, Ashland OR" published as nothing at all. The unsourced claim was the
// first clause; the programme length and the town were never in doubt. Forty-nine records
// were blanked that way, and the blanking notice — repeated verbatim on each one — became
// the most common sentence on the site.
//
// So: split the descriptor, test each clause, publish the clauses that survive. A surviving
// clause must carry at least two words, because a lone fragment ("global", "online") reads
// as damage rather than description.
const SPLIT = /\s+—\s+|;\s*|\s+·\s+/;

export function redact(text) {
  const clauses = String(text || "").split(SPLIT).map((c) => c.trim()).filter(Boolean);
  const kept = clauses.filter((c) => !CLAIM_PATTERN.test(c) && c.split(/\s+/).length >= 2);
  return { kept: kept.join(" · "), dropped: clauses.length - kept.length, clauses: clauses.length };
}

// Claims that were checked against the body that issues them, and survived. A claim leaves
// the withheld pile only by being verified at its source, never by being waved through.
// Each entry names the source and the day it was read, so a stale check is visible as stale.
export const VERIFIED = {
  "FT-01": { text: "On Colorado's approved training-programme list, as InnerTrek LLC.", source: "https://dpo.colorado.gov/NaturalMedicine", checkedAt: "2026-08-29" },
  "FT-02": { text: "On Colorado's approved training-programme list.", source: "https://dpo.colorado.gov/NaturalMedicine", checkedAt: "2026-08-29" },
  "FT-04": { text: "On Colorado's approved training-programme list.", source: "https://dpo.colorado.gov/NaturalMedicine", checkedAt: "2026-08-29" },
  "FT-05": { text: "On Colorado's approved training-programme list under the legal name The Resurgence Training Institute, Inc., carrying this record's website. That answers the survey note asking whether the programme still operates.", source: "https://dpo.colorado.gov/NaturalMedicine", checkedAt: "2026-08-29" },
  "FT-06": { text: "On Colorado's approved training-programme list.", source: "https://dpo.colorado.gov/NaturalMedicine", checkedAt: "2026-08-29" },
  "FT-07": { text: "On Colorado's approved training-programme list, which records didactic training yes, practicum no, consultation available 2026.", source: "https://dpo.colorado.gov/NaturalMedicine", checkedAt: "2026-08-29" },
  "FT-03B": { text: "The survey recorded this programme as Colorado-approved. It is not on Colorado's approved training-programme list as published on the date checked. The Oregon half of that claim was not checked.", source: "https://dpo.colorado.gov/NaturalMedicine", checkedAt: "2026-08-29" },
  "RC-03": { text: "Oregon's health authority states that this directory is not a comprehensive list of licensees and is not used for licence verification: inclusion is optional and consent-based, and a licensee who declines is still licensed. To check a licence, use the state's Search License Status tool instead.", source: "https://www.oregon.gov/oha/ph/preventionwellness/pages/psilocybin-licensee-directory.aspx", checkedAt: "2026-08-29" },
  "RC-04": { text: "This is Colorado's natural-medicine programme homepage, carrying rules, board minutes and the approved training-programme list. Licence status is checked through the division's separate licence lookup, not here.", source: "https://dpo.colorado.gov/NaturalMedicine", checkedAt: "2026-08-29" },
};

export function descriptorFor(entry) {
  const text = String(entry.sub || "").trim();
  if (!text) return { text: "", withheld: true, reason: "no descriptor was recorded" };
  if (!CLAIM_PATTERN.test(text)) return { text, withheld: false, reason: "" };
  const { kept, dropped } = redact(text);
  if (kept) return { text: kept, withheld: false, reason: "", redactedClauses: dropped };
  return { text: "", withheld: true, reason: "every clause of the recorded descriptor makes a ranking, certification, superlative or transaction claim with no source attached" };
}

export const GROUPS = {
  practice: "Professional services an organisation in this field buys",
  money: "Money — banking, capital and grantmaking tools",
  research: "Research and clinical infrastructure",
  delivery: "Delivery, training and the people who do the work",
  community: "Community, harm reduction and tradition",
  backoffice: "Back office",
};

export const CATEGORIES = {
  "Legal": {
    group: "practice",
    is: "Law firms and individual attorneys whose published practice description includes psychedelics, entheogens or the state programmes regulating them.",
    excludes: "General-practice firms with no published psychedelic practice, and non-lawyer consultants who advise on regulation.",
    doesNotTell: "Nothing about competence, bar standing, malpractice history, current client conflicts, or whether the firm still does this work. Attorneys move; three entries here describe practices that migrated to another firm listed in the same category.",
  },
  "Accounting & Finance": {
    group: "backoffice",
    is: "Accountants and financial-services providers who publicly describe working with cannabis, psychedelic or plant-medicine businesses.",
    excludes: "General accounting practices, and investors — those are under Capital Markets.",
    doesNotTell: "Nothing about licensure, professional standing, or whether a firm will take your engagement.",
  },
  "Insurance": {
    group: "backoffice",
    is: "Insurers, brokers and benefit administrators offering products aimed at psychedelic services, facilitators or service centres.",
    excludes: "General commercial brokers with no published psychedelic line.",
    doesNotTell: "Nothing about whether a policy would actually cover your activity, whether the carrier is admitted in your state, or whether the product still exists.",
  },
  "Grant Management": {
    group: "money",
    is: "Software and services for finding, tracking and administering grants, used by nonprofits in this field.",
    excludes: "Grantmakers themselves.",
    doesNotTell: "Nothing about price, fit, data handling, or whether the product is still supported.",
  },
  "Fundraising CRM": {
    group: "money",
    is: "Donor-management and fundraising database products.",
    excludes: "General CRM used for sales rather than donors.",
    doesNotTell: "Nothing about cost at your scale, migration difficulty, or ownership changes.",
  },
  "Banking": {
    group: "money",
    is: "Banking providers and banking-policy references relevant to cannabis-adjacent and psychedelic businesses.",
    excludes: "Investors and payment processors.",
    doesNotTell: "Nothing about whether an institution will open your account, its current risk appetite, or its fees. One entry here is a federal bill rather than a bank, and is recorded as policy context.",
    overlaps: "Banking & Financial Services",
  },
  "Banking & Financial Services": {
    group: "money",
    is: "The same subject as Banking. This is a second label that accreted during the survey and was never reconciled.",
    excludes: "Nothing distinct from Banking.",
    doesNotTell: "See Banking. Treat the two categories as one when searching; the split is an artefact of the survey, not a distinction with meaning.",
    overlaps: "Banking",
  },
  "Capital Markets": {
    group: "money",
    is: "Investment banks and capital-markets intermediaries serving psychedelic issuers.",
    excludes: "Venture funds — though the survey did not hold that line, see the overlap note.",
    doesNotTell: "Nothing about assets under management, deal performance, or current activity.",
    overlaps: "Capital Markets / VC",
  },
  "Capital Markets / VC": {
    group: "money",
    is: "Venture and specialist funds investing in psychedelic companies.",
    excludes: "Philanthropic funders.",
    doesNotTell: "Nothing about fund size, whether the fund is still deploying, or whether it still exists. Three of the five entries here had no reachable website when links were last checked — a rate high enough to be worth reading as a signal about this segment.",
    overlaps: "Capital Markets",
  },
  "Facilitator Training": {
    group: "delivery",
    is: "Programmes that train psilocybin facilitators, including those built against state curriculum requirements.",
    excludes: "Conferences and general psychedelic education, which sit under Education & Training.",
    doesNotTell: "Nothing about state approval status, accreditation, cost, completion rates, or whether a graduate can be licensed anywhere. State approval in particular is a live, checkable fact held by the state, not by this index — and it is exactly the kind of claim the descriptor rule withholds here.",
    overlaps: "Education & Training",
  },
  "Education & Training": {
    group: "delivery",
    is: "Conference producers and general educational programming.",
    excludes: "Facilitator curricula.",
    doesNotTell: "Nothing about whether an event will run again, or whether the organisation is still operating.",
    overlaps: "Facilitator Training",
  },
  "Retreat Centers": {
    group: "delivery",
    is: "Service centres, retreat operators and the registries that list them.",
    excludes: "Clinics whose published model is medical rather than service-centre based.",
    doesNotTell: "Nothing about licensure, safety, staffing, incident history, pricing, or whether a centre is open. This is the single category where the gap between what the index records and what a reader wants to know is widest, and the honest answer is to check the state licensee registry — one entry in this category is that registry.",
  },
  "Mental Health Workforce & Staffing": {
    group: "delivery",
    is: "Job boards, staffing intermediaries and practitioner directories serving this field.",
    excludes: "Individual practitioners.",
    doesNotTell: "Nothing about whether listed practitioners are credentialed, whether a directory verifies its own entries, or whether the board still has postings.",
  },
  "Clinical Research Orgs": {
    group: "research",
    is: "Contract research organisations and trial-site networks with published psychedelic trial work.",
    excludes: "Academic centres running their own research.",
    doesNotTell: "Nothing about trial quality, regulatory findings, current capacity, or whether the described trial work is ongoing.",
  },
  "Academic Research Centers": {
    group: "research",
    is: "University-based centres and institutes with a named psychedelic research programme.",
    excludes: "Individual laboratories without a named centre, and commercial research organisations.",
    doesNotTell: "Nothing about funding status, publication record, whether the named director is still in post, or whether the centre is still active. Several entries record a founding year and a named lead; both age quickly.",
  },
  "Research Infrastructure": {
    group: "research",
    is: "Data platforms and survey tools used to run research.",
    excludes: "The research organisations themselves.",
    doesNotTell: "Nothing about compliance posture, security, or suitability for regulated data.",
    overlaps: "Research Collaborators",
  },
  "Research Collaborators": {
    group: "research",
    is: "A single entry: a data-governance and compliance collaborator. The category exists because one record did not fit anywhere else.",
    excludes: "Everything else.",
    doesNotTell: "A category with one member is a filing decision, not a taxonomy. It is published as it was recorded rather than merged, because merging it now would rewrite the original assignment.",
    overlaps: "Research Infrastructure",
  },
  "Technology": {
    group: "practice",
    is: "Software and technical services built for or adapted to psychedelic services — records systems, background checks, session tooling.",
    excludes: "Research platforms and CRM, which have their own categories.",
    doesNotTell: "Nothing about security, regulatory compliance, uptime, pricing, or whether a state accepts the product for a required process.",
  },
  "HR & People Ops": {
    group: "backoffice",
    is: "Payroll, benefits, employer-of-record and workforce-management providers used by organisations in this field.",
    excludes: "Recruiters and job boards.",
    doesNotTell: "Nothing about cost, jurisdictional coverage, or willingness to serve this sector — which is the actual constraint for most organisations here.",
  },
  "Community Infrastructure": {
    group: "community",
    is: "Communications, public affairs, lobbying and convening organisations that serve the field as a whole rather than one segment.",
    excludes: "Advocacy organisations whose primary work is harm reduction.",
    doesNotTell: "Nothing about who funds them, whom they represent, or what positions they take.",
  },
  "Harm Reduction": {
    group: "community",
    is: "Drug-checking services, peer support lines, festival and event support, and harm-reduction education.",
    excludes: "Treatment providers.",
    doesNotTell: "Nothing about coverage area, hours, current capacity, or clinical supervision. For anything urgent, treat this as a starting list and confirm directly.",
  },
  "Indigenous / Ceremonial": {
    group: "community",
    is: "Indigenous-led organisations, sacred-plant advocacy bodies, land conservancies and religious-use organisations.",
    excludes: "Commercial retreat operators using ceremonial framing.",
    doesNotTell: "Nothing about standing to speak for any community, relationship to any recognised tribe or church, legal status under RFRA or state law, or the position of any body toward any other. This is the category where an outside index is least equipped to characterise anything, and the descriptor rule withholds more here than anywhere else.",
  },
  "Translation & Language": {
    group: "backoffice",
    is: "Translation and interpreting providers used for clinical, research and multilingual community work.",
    excludes: "General localisation agencies with no clinical or research offering.",
    doesNotTell: "Nothing about certification, clinical interpreting qualifications, or data handling.",
  },
};

export const DEFECTS = [
  {
    defect: "Four category pairs cover the same ground.",
    detail: "Banking and Banking & Financial Services; Capital Markets and Capital Markets / VC; Facilitator Training and Education & Training; Research Infrastructure and Research Collaborators. Each pair arose because the survey introduced a second label mid-way and never reconciled the first.",
    handling: "Both labels are published as recorded, and each category page names its counterpart. Merging them now would silently reassign records to a category no reviewer put them in, and the whole point of a read-only snapshot is that it reports what was recorded.",
  },
  {
    defect: "Two identifier prefixes are used by two different categories each.",
    detail: "RC identifies both Research Collaborators and Retreat Centers; CM identifies both Capital Markets and Capital Markets / VC. An identifier prefix in this dataset therefore does not determine a category.",
    handling: "Record identifiers are published as recorded and are unique within the set; only the prefix is ambiguous. Do not infer a category from an identifier.",
  },
  {
    defect: "One category has a single member.",
    detail: "Research Collaborators holds one record. A category of one is a filing decision rather than a class.",
    handling: "Published as recorded, and labelled as such on the taxonomy page.",
  },
];
