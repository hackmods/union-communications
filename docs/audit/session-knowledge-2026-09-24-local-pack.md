# Session knowledge — Local pack (2026-09-24)

**Audience:** future agents + Ryan.
**Companion:** [`session-knowledge-2026-08-20-org-chart.md`](session-knowledge-2026-08-20-org-chart.md), [`session-knowledge-2026-08-18-website-export.md`](session-knowledge-2026-08-18-website-export.md).

## What shipped

Public Comms **Local pack** at `/tools/local-pack` (`/create/local-pack` canonical):

- Versioned on-device backup envelope `kind: "unionops-local-pack"`, `version: 1` — Brand Kit, Public Roster, preferences, onboarding flag, Website Template draft.
- Loader rejects wrong kind / unsupported version; `migrateLocalPackV1` is the identity hook for future versions.
- Website draft key `unionops-website-draft` (local-only, like roster — not on `ApiAdapter`).
- Compose helper `composeWebsiteTemplateData` merges Brand Kit + roster + draft (+ optional site-file overlay).

## Product language

- EN locked name: **Local pack**. FR: **Trousse locale**.
- Brand Kit and Org Chart editors stay separate; they no longer host JSON/CSV import/export UI.
- **Website Template** keeps Import / Download site file / ZIP / WordPress — that `unionops-website` deploy artifact is not replaced by Local pack.

## Do not

- Fold roster or site-copy editors into Brand Kit to “centralize.”
- Drop Website Template site-file import because Local pack exists.
- Put Local pack behind Officer Hub auth — it is public Comms on-device sovereignty.
