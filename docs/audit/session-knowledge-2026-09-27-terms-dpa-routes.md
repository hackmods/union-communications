# Session knowledge — 2026-09-27 — Terms and DPA public routes

## Decision

Keep `/terms` and `/dpa` stable localized entry points without creating the
appearance that an unapproved managed draft is a contract. The routes show a
status page until an effective approved bilingual policy is available. Then
they permanently redirect at request time to the managed document detail
route, which provides the published version metadata and content.

## Publication conditions

`src/lib/public-documents/contract-routes.ts` permits the handoff only when the
managed record is available (not marked unpublished), is a policy, records
`humanApproved: true`, contains English and French text, and has a valid
`effectiveAt` no later than the current time. Drafts, future-effective versions,
one-language records, external links, and files do not become contract pages.
The status routes are dynamic and `noindex`; the sitemap continues to include
published documents from `listPublicDocuments`, not the unavailable status
pages.

## Public wording and navigation

Both locales state that the status page is not an agreement and does not create
new obligations; existing signed agreements may still apply. The Trust index
and footer link to both stable paths. The existing Trust What's New entry was
updated rather than adding a duplicate public announcement.

## Verification and remaining work

Added a pure test for publication eligibility and a sitemap assertion that
unavailable status paths are not indexed. A Node native type-stripping check
passed the approval, future-effective, and bilingual-content cases. EN/FR
catalogs and metadata were updated together; locale-copy and SEO guards are
present but could not be run without the project dependencies. Typecheck, lint,
and browser checks also remain pending. No Terms or DPA wording was invented,
and no legal approval or effective publication is implied.
