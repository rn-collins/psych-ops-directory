# Psychedelic Operations Directory

A read-only editorial index of 175 organisations appearing in the psychedelic
operations field. Inclusion is not vetting, endorsement, licensure verification,
or a finding about quality, safety, financial stability, or legal compliance.

The index is not distinguished by the names it holds. It is distinguished by two
published documents: **/taxonomy**, which defines each of the 23 categories, what
it excludes, what a listing in it does not tell you, and the three known defects
in the taxonomy itself; and **/methodology**, which states exactly what the link
check establishes (that a server answered over HTTPS on a stated date) and what it
does not.

## Editing content

`lib/listings-static.js` holds the records. `lib/taxonomy.js` holds the category
definitions and the rule that decides whether a recorded scope descriptor may be
published — a descriptor carrying a ranking, certification, superlative or
transaction claim is withheld, because no claim in this release has a source
attached to it yet. `lib/link-overrides.js` holds hand-checked link exceptions the
automated pass cannot see, such as a server that answers with an expired
certificate.

After changing any of those three, regenerate the pages:

```sh
npm run render   # writes public/*.html from lib/
npm test         # fails if the committed HTML is stale against lib/
```

There is no deploy-time build. The committed HTML is the artefact, which is why
every record is present, linkable and printable with JavaScript switched off;
`public/app.js` only filters what is already on the page.

## License

Apache-2.0 — see [LICENSE](LICENSE).
