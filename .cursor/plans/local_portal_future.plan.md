# Local Portal — future enhancements (intent)

Captured so agents and humans do not lose design intent after the memory MVP.

**Shipped MVP:** ADR-017, `/portal` Circles through P4 experience (Momentum, Sidebars, Fronts, search, @mentions, soft-delete, CSV import, activity pack, DnD Pipeline, per-tool mute). Smoke: `e2e/portal.smoke.spec.ts`.

**Authoritative backlog rule:** [`.cursor/rules/local-portal-backlog.mdc`](../rules/local-portal-backlog.mdc)  
**Module spec:** [`docs/modules/LOCAL_PORTAL.md`](../../docs/modules/LOCAL_PORTAL.md)

## Priority lanes

### A — Production readiness
Postgres+RLS (`circleId`), Binder storage+scan, invite/Roster email, drop memory store.

### B — Remaining polish
Email→Bulletin (post-privacy ADR), digest email, SSE Floor, live Calendar↔`UnionMeeting` RSVP.

### C — Experience (mostly shipped in P4)
Circle templates, Pipeline DnD, per-tool mute, Station digests, keyboard shortcuts, officer handoff activity pack, guest banner — done in memory.

## Ideas parking lot (unranked)

- Circle-level retention policies (committee vs Hall)
- Read receipts on Bulletin (opt-in; privacy review)
- Action recurring series tied to Roll Call
- Printable Oversight PDF for LEC packets
- FR copy review with steward volunteers
- Feature flag per Circle tool (disable Floor for formal committees)

Do not start lane B/C work until lane A has a clear Postgres plan unless the user explicitly prioritizes UX.
