# Session knowledge — Joint committees / EERC fit-gap (2026-08-23)

**Audience:** future agents + Ryan.  
**Companions:** [`docs/VISION.md`](../VISION.md) (fill the gap without replacing national systems), [`session-knowledge-2026-07-30.md`](session-knowledge-2026-07-30.md) (LINK-001 national URL rot), [`session-knowledge-2026-08-19-comms-stay-free.md`](session-knowledge-2026-08-19-comms-stay-free.md) (ADR-019), [`session-knowledge-2026-08-19-portal-solidarity-names.md`](session-knowledge-2026-08-19-portal-solidarity-names.md), [`docs/modules/LOCAL_PORTAL.md`](../modules/LOCAL_PORTAL.md), [`seed/reference-tenant-opseu-caat.json`](../../seed/reference-tenant-opseu-caat.json).

This is a **product mapping**, not a shipped feature. No public guide, no Home CTA, no OPSEU-named Hub module.

---

## What EERC is (first example, not a product name)

PT CAAT-S **Employee/Employer Relations Committee** (PTEERC) is a **provincial joint union–employer** body under the part-time Support Staff CA (Article 5.4 / Appendix 4). The FT parallel (FTEERC) is Article 4.7 / Appendix J. It is **not** a local Health & Safety committee, not an LEC, and not the college bumping / stability committee.

Jobs from the CA (both PT and FT):

- Joint recommendations to the **bargaining teams** on system-wide issues
- Official but unconstrained provincial communication during the life of the CA
- Preclude / resolve common problems
- Groundwork for the next round of negotiations
- 5 union + 5 employer members, regional spread, co-chairs
- PT: about six meetings/year; FT: endeavour to meet monthly
- Local issues only after **UCC** (Union/College Committee) has already failed
- **Must not** take items that are a formal grievance
- **Management records official minutes**; co-chairs sign; approved minutes go on the union site **and** the employer-council site
- Recommending body, not a substitute for bargaining
- Union pays travel; 50% wage reimbursement on leave

Treat EERC as the first **example** of a joint labour-management / divisional committee. The same kit would serve FT EERC, Joint Insurance, Joint Classification, Grievance Scheduling, and local UCCs. **Do not special-case PTEERC in core code.**

The OPSEU taxonomy page did not load in the 2026-08-23 review (Cloudflare bot wall). CEC publishes a PTEERC minutes archive. That mismatch is the “national support is lacking” problem: employer-side minutes exist; union-side discovery/distribution is fragile — same class as LINK-001.

---

## Alignment (do not break)

[`docs/VISION.md`](../VISION.md): locals should not wait on weak central comms; the hub **fills the gap without replacing national union systems.**

| Rule | Why |
|---|---|
| No OPSEU-named core module | Multi-union. Seed/config only. Brand Kit [opseu-sector-catalog.ts](../../src/lib/brand/opseu-sector-catalog.ts) is **comms identities**, not Hub tenancy. |
| Do not host official joint minutes as source of truth | CA: management records them; both parties post them. UnionOps may **point at** official URLs via [`comms-sources.ts`](../../src/lib/constants/comms-sources.ts) only — no hardcoded national `https://` in pages. |
| Separate union caucus notes from joint records | Mixing them leaks strategy onto a joint table and looks like replacing the employer minute-taker. |
| Comms stay free | On-device tools. A hosted committee workspace is Officer Hub / Local Portal (hosting cost, invite-only, Hub still unadvertised). |
| No employer login, no joint-minutes CMS, no grievance→EERC automation | Would replace national systems and violate the CA’s “not a grievance forum” rule. |

If a public guide is ever added: generic “joint committee caucus + member explainers”; OPSEU/EERC as *example* copy; EN/FR claim parity; What’s new in the same change. Do not add a Home CTA.

---

## Tenancy (the real blocker)

```
Union → Division? → Local → Collection/BargainingUnit? → data
```

EERC sits at **union + division + provincial bargaining group** (PT CAAT-S across colleges). Hub org entities sit at **local**.

| Fact | Evidence |
|---|---|
| `Committee` requires `localId` | [`src/types/committees.ts`](../../src/types/committees.ts) — “Internal (non-bargaining) committee roster” |
| Minutes, meetings, tasks, discussions, travel, documents vault require `localId` | [`minutes.ts`](../../src/types/minutes.ts), [`meetings.ts`](../../src/types/meetings.ts), [`task.ts`](../../src/types/task.ts), [`discussions.ts`](../../src/types/discussions.ts), [`travel.ts`](../../src/types/travel.ts), [`attachments.ts`](../../src/types/attachments.ts) `DocumentRecord` |
| `BargainingUnit` is per local | [`src/types/tenant.ts`](../../src/types/tenant.ts) — `bu-243-pt` is Local 243’s PT collection, not “PT CAAT-S provincial” |
| Seed PT exists only on Local 243 | [`seed/reference-tenant-opseu-caat.json`](../../seed/reference-tenant-opseu-caat.json); Local 560 is FT-only in seed |
| `HubModule` has no committees/minutes flag | [`src/types/tenant.ts`](../../src/types/tenant.ts) — org tools are always-on Hub chrome, still local-scoped |
| `stability_member` is bumping | [`docs/RBAC.md`](../RBAC.md) — not a provincial joint-committee role |
| `division_admin` exists | Can cross-local some Hub lists; does **not** create a division-scoped committee workspace |

Portal `Circle` is the only collaboration type with optional `localId` ([`src/types/portal.ts`](../../src/types/portal.ts)). In practice:

- Seed Circles (Hall, LEC, JHSC) are all `local-243` ([`memory-adapter.ts`](../../src/lib/portal/memory-adapter.ts))
- `POST /api/portal/circles` always stamps `session.user.localId` ([`circles/route.ts`](../../src/app/api/portal/circles/route.ts))

So the type allows a union-only Circle; the API does not.

---

## Usable today

### Public Comms (no Hub login) — strongest immediate support

Use after **approved** official minutes, or for **union-side** drafts that never go to the joint table as if they were minutes.

| Tool | Job for a committee volunteer |
|---|---|
| Document Generator `letterhead` / `simple-letter` | Recommendation letters, UCC opinion letters, bargaining-team briefs |
| Document Generator `lec-directory` | Empty branded roster sheet — LEC-shaped fields, not an EERC roster sync |
| Graphic Maker, Flyer Maker, Board Notice, QR Card/Board | Member-facing “what was decided / what happens next” for **locals** |
| `/guide/email-broadcast`, `/guide/workshop` | How to get an explainer out without a member marketing list |
| Brand Kit College Support profile | Colours/type for those exports. Not the official committee brand. |
| Org Chart | On-device poster. Weak for a 10-person joint table. Do not pull Hub officers. |

### Officer Hub — native for **local UCC**, wrong scope for EERC

[`/app/committees`](../../src/app/[locale]/app/committees/page.tsx) is a local Health & Safety / Social roster (seed `com-001` / `com-002`). President / `division_admin` / `union_admin` / `platform_admin` gate ([`committees/access.ts`](../../src/lib/committees/access.ts)).

| Job | Closest surface | Why it only half-fits |
|---|---|---|
| Who is on the committee | `/app/committees` | Required `localId`; officer IDs from the **local** roster |
| Motions / votes | `/app/minutes` | Robert’s Rules. EERC minutes are jointly signed subject summaries recorded by management |
| Meeting dates / RSVP | `/app/meetings`, `/app/calendar` | Local membership meetings, not a 6×/year provincial table |
| Caucus to-dos | `/app/tasks`, discussions, check-ins | Required `localId` |
| CA clause lookup | `/app/snippets` | Union-scoped snippets **can** omit `localId` — useful for system-wide issue cites |
| “Is this already a grievance?” | `/app/grievances` | EERC must refuse live grievances; Hub cannot see another local’s cases unless elevated |
| Travel | `/app/travel` + expenses | Local fund workflow. EERC travel is often union/divisional |
| Files | `/app/documents` | Local CBA/minutes vault, not a provincial binder |
| Local UCC | same Hub org kit | **Native fit.** Unresolved UCC items are EERC’s intake path |

Do **not** reuse bumping `CommitteeSession` / `CommitteeNote` ([`src/types/bumping.ts`](../../src/types/bumping.ts)). That is college stability — a different statutory committee.

### Local Portal — closest collaboration primitive

`kind: "committee"`, `visibility: "invited"`, Bulletin / Actions / Binder / Calendar / Many hands. Seed already has invited LEC and JHSC Circles — **local** templates, not provincial.

An invited committee Circle with members from several colleges is the nearest “union caucus of 5” **if** create/list stop requiring a single `localId`. Until then, a partner can still use Comms tools solo, or a Circle that happens to live on their home local (other colleges’ members may not belong to that Hall).

Caveats: Portal is hosted (not free-forever); Hub invite-only; default persistence is memory unless `*_DB_BACKEND` flips. Floor/Bulletin must never be the joint table with the employer.

---

## Fit-gaps (do not pretend these exist)

1. Division-scoped workspace for people from many locals (actual EERC union side)
2. Issue docket that is **not** a grievance (UCC referral, system-wide problem, bargaining-prep note, “not a grievance” guard)
3. Union caucus vs joint minutes split (confidential prep vs signed public minutes)
4. Recommendation-brief workflow (letterhead exists; docket → brief does not)
5. Official minutes **distribution** to principals/locals without becoming the publisher of record
6. Provincial collection (one CA, many colleges) vs per-local `BargainingUnit`
7. A provincial committee role (do not overload `stability_member`)

---

## How to support a partner on PT EERC **now** (no new product)

1. Brand Kit + Document Generator letterhead for union-side briefs and UCC opinion letters.
2. After approved minutes: Graphic / Flyer / email-broadcast explainer **for locals**, linking to official union/employer posts (registry URLs only when those IDs exist).
3. `/app/snippets` for PT CA clause cites on system-wide issues (if they have Hub).
4. Invited Portal Circle only if the five union members can actually sign in to the same tenant — today that Circle will still be stamped with one `localId`.
5. Travel module only if the **home local** is paying; otherwise keep expenses off-platform.

---

## Optional slices (not built 2026-08-23)

Deferred until an explicit product cut — **not** implied by this note:

1. Public generic guide: joint committee caucus + member explainers (UCC → provincial table → approved minutes → local boards). Registry rows for official minutes pages. What’s new. No Home CTA.
2. Honor optional `Circle.localId` on create/list/invite so an invited committee Circle can be union-scoped (members from many locals). Reuse Portal; **no new EERC entity.**

Do not start either slice from this document alone.

---

## Do not

- Add `/app/eerc` or hardcode OPSEU committee names in `src/lib` / `src/app` outside seed/config
- Host official joint minutes as the system of record
- Put union caucus notes in a place the employer side could be invited into
- Feed live grievances into a joint-committee docket
- Use bumping committee session/notes for EERC
- Advertise Officer Hub in public chrome because this mapping exists
- Add a Home or hero CTA for this review
