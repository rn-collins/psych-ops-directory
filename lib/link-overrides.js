// Link-status exceptions found by hand, with the reason and the moment of the check.
//
// The automated link check asks whether a server answers over HTTPS. That question
// has a failure mode it cannot see: a server that answers, but with a certificate a
// browser will refuse. To a script that is a connection; to a person it is a full-page
// security interstitial, which is not a working website by any definition a reader
// cares about.
//
// Entries here override the recorded status. Each records what was observed and when,
// so the finding is reproducible and so a stale override is visible as stale. A
// certificate problem in particular is usually temporary — Let's Encrypt certificates
// renew automatically — and this file is the place that says so rather than leaving a
// permanent-looking mark on an organisation.

export const LINK_OVERRIDES = {
  "FT-18": {
    status: "tls-expired",
    checkedAt: "2026-08-29T21:56Z",
    reason: "The destination answers, but its TLS certificate expired at 20:52 UTC on 29 August 2026, about an hour before this check. A browser will block the page with a security interstitial rather than load it.",
    note: "The certificate was issued by Let's Encrypt, which renews automatically, so this is likely to clear on its own. It is recorded rather than treated as a dead site.",
  },
};

export function statusFor(entry, recorded) {
  const override = LINK_OVERRIDES[entry.id];
  return override ? override.status : recorded;
}
