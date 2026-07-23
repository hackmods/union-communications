# UnionOps — Core Domain Schema Blueprint (Zod + ORM + Auth Fix)

**Purpose:** bridge document between the audit (`docs/audit/{executive-summary,active-context,execution-backlog}.md`) and execution. This is the concrete data-layer and auth design that closes `SEC-003` (Postgres+RLS), `SEC-006` (mass-assignment), `SEC-001`/`SEC-005` (session tampering). Every type below mirrors the **actual current** TypeScript interfaces in `src/types/*.ts` (verified against `git ls-files` — no invented fields beyond what's explicitly called out as new). Do not add fields that aren't in the source types without opening a `FEAT-` ticket first (see `execution-backlog.md` `FEAT-004`/`FEAT-005` for the deliberately-scoped new fields).

**No `zod`, `drizzle-orm`, `pg`, or `prisma` dependency exists in `package.json` today.** All of this is greenfield.

---

## 1. Zod validation schemas

Add `zod` to `dependencies`. Create `src/lib/validation/` with one file per domain, each exporting the schema(s) an API route needs. These schemas are the fix for `SEC-006` (grievance/bumping PATCH mass-assignment) and the general "no schema validation library" gap noted in `active-context.md` §3.

### 1.1 `src/lib/validation/tenant.ts` (shared primitives)

```typescript
import { z } from "zod";

// Reused everywhere a tenant-scoped entity is created/updated.
export const unionIdSchema = z.string().min(1);
export const localIdSchema = z.string().min(1);
export const bargainingUnitIdSchema = z.string().min(1).optional();

export const userRoleSchema = z.enum([
  "platform_admin",
  "union_admin",
  "division_admin",
  "local_president",
  "local_exec",
  "local_steward",
  "stability_member",
  "solo_account",
]);

export const isoDateTimeSchema = z
  .string()
  .refine((v) => !Number.isNaN(Date.parse(v)), "Must be an ISO 8601 datetime");
```

### 1.2 `src/lib/validation/grievance.ts`

Mirrors `src/types/grievance.ts`. **Critical rule: tenant-identity fields (`unionId`, `localId`, `id`) are never part of an update schema** — they are set once at create time from the authenticated session, never from client input, closing the `SEC-006` mass-assignment hole.

```typescript
import { z } from "zod";
import { bargainingUnitIdSchema } from "./tenant";

export const grievanceStatusSchema = z.enum([
  "open",
  "in_progress",
  "escalated",
  "resolved",
  "withdrawn",
]);

export const grievanceEventTypeSchema = z.enum([
  "step_filed",
  "response_received",
  "meeting_scheduled",
  "deadline",
  "escalation",
  "resolution",
]);

// POST /api/grievances body — unionId/localId/createdById are derived from
// the session server-side, NEVER accepted from the client.
export const createGrievanceSchema = z.object({
  memberPseudonym: z.string().max(200).optional(),
  category: z.string().min(1).max(200),
  filedAt: z.string().datetime(),
  assignedStewardId: z.string().min(1).optional(),
  bargainingUnitId: bargainingUnitIdSchema,
});

// PATCH /api/grievances/[id] body — explicit allowlist only.
// Adapter update() must apply ONLY these keys, never spread the raw body.
export const updateGrievanceSchema = z
  .object({
    status: grievanceStatusSchema,
    currentStep: z.number().int().min(1).max(10),
    memberPseudonym: z.string().max(200),
    category: z.string().min(1).max(200),
    assignedStewardId: z.string().min(1),
    bargainingUnitId: z.string().min(1).nullable(),
    resolvedAt: z.string().datetime().nullable(),
  })
  .partial()
  .strict(); // .strict() rejects any key not listed above — this is the mass-assignment fix

export const createNoteSchema = z.object({
  body: z.string().min(1).max(10_000),
});

export const createEventSchema = z.object({
  type: grievanceEventTypeSchema,
  stepNumber: z.number().int().min(1).max(10).optional(),
  dueAt: z.string().datetime().optional(),
  completedAt: z.string().datetime().optional(),
  note: z.string().max(2000).optional(),
});
```

### 1.3 `src/lib/validation/bumping.ts`

Mirrors `src/types/bumping.ts`.

```typescript
import { z } from "zod";

export const bumpingCaseStatusSchema = z.enum([
  "open",
  "in_review",
  "decided",
  "closed",
]);

export const positionDescriptionSchema = z.object({
  title: z.string().min(1).max(200),
  duties: z.string().max(20_000),
  qualifications: z.string().max(20_000),
  seniorityNotes: z.string().max(5_000),
  sourceText: z.string().max(200_000).optional(),
  fileName: z.string().max(255).optional(),
});

export const createBumpingCaseSchema = z.object({
  memberRef: z.string().min(1).max(200),
  seniorityDate: z.string().datetime(),
  currentPosition: z.string().min(1).max(200),
  targetPosition: z.string().min(1).max(200),
  scenario: z.string().min(1).max(5_000),
  incumbentPosition: positionDescriptionSchema,
  bumpingPosition: positionDescriptionSchema,
});

// .strict() — same mass-assignment defense as grievances.
export const updateBumpingCaseSchema = z
  .object({
    status: bumpingCaseStatusSchema,
    incumbentPosition: positionDescriptionSchema,
    bumpingPosition: positionDescriptionSchema,
    checklist: z.record(z.string(), z.boolean().nullable()),
  })
  .partial()
  .strict();

export const createDecisionSchema = z.object({
  outcome: z.string().min(1).max(2000),
  rationale: z.string().min(1).max(10_000),
  dissentNotes: z.string().max(5_000).optional(),
});
```

### 1.4 `src/lib/validation/time.ts`

Mirrors `src/types/time.ts`.

```typescript
import { z } from "zod";

export const timeCategorySchema = z.enum([
  "staff",
  "release",
  "duty_bank",
  "action",
  "volunteer",
]);

export const timeEntryGpsSchema = z.object({
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  accuracyM: z.number().nonnegative().optional(),
  capturedAt: z.string().datetime(),
});

export const clockInSchema = z.object({
  category: timeCategorySchema,
  jobCodeId: z.string().min(1),
  notes: z.string().max(2000).optional(),
  clockInGps: timeEntryGpsSchema.optional(),
});

export const clockOutSchema = z.object({
  entryId: z.string().min(1),
  notes: z.string().max(2000).optional(),
  clockOutGps: timeEntryGpsSchema.optional(),
});

export const manualEntrySchema = z.object({
  category: timeCategorySchema,
  jobCodeId: z.string().min(1),
  clockInAt: z.string().datetime(),
  clockOutAt: z.string().datetime(),
  notes: z.string().max(2000).optional(),
  eventLabel: z.string().max(200).optional(),
  workerId: z.string().min(1),
  workerName: z.string().min(1).max(200),
  status: z.enum(["completed", "submitted"]),
  entrySource: z.enum(["manual_range", "bulk_event"]),
  eventId: z.string().optional(),
}).refine((v) => new Date(v.clockOutAt) > new Date(v.clockInAt), {
  message: "clockOutAt must be after clockInAt",
  path: ["clockOutAt"],
});
```

### 1.5 `src/lib/validation/attachments.ts`

Mirrors `src/types/attachments.ts`.

```typescript
import { z } from "zod";

export const attachmentScanStatusSchema = z.enum([
  "pending",
  "clean",
  "infected",
  "skipped_dev",
]);

// Size cap here is a defense-in-depth companion to src/lib/attachments/scan.ts's
// existing size check — validate before the scan step runs, not only after.
export const createAttachmentSchema = z.object({
  fileName: z.string().min(1).max(255),
  mimeType: z.string().min(1).max(127),
  sizeBytes: z.number().int().positive().max(25 * 1024 * 1024), // 25MB ceiling — tune per deployment
  contentBase64: z.string().max(35_000_000).optional(), // memory-adapter dev path only; drop once object storage lands (FEAT-001)
});
```

### 1.6 Route wiring pattern (apply to every mutating route)

```typescript
// Example: src/app/api/grievances/[id]/route.ts PATCH handler
import { updateGrievanceSchema } from "@/lib/validation/grievance";

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const session = await requireGrievanceSession(); // existing auth+MFA+role gate — unchanged
  const raw = await request.json();

  const parsed = updateGrievanceSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid request body", issues: parsed.error.flatten() },
      { status: 400 },
    );
  }

  // parsed.data is now guaranteed to contain ONLY allowlisted, type-safe fields.
  // Adapter receives parsed.data, never `raw` — this closes SEC-006.
  const grievance = await grievanceStore.update(params.id, parsed.data, /* ACL context */);
  // ...
}
```

**Rule for every future PATCH/POST route:** never pass `await request.json()`'s result directly to an adapter's `create`/`update` function. Always `schema.safeParse()` first and pass `parsed.data`.

---

## 2. Database ORM schema (Drizzle ORM + PostgreSQL)

**Recommendation: Drizzle ORM over Prisma.** Rationale: Drizzle's schema is plain TypeScript (fits the codebase's existing "no code-gen step" philosophy — compare to `docxtemplater`/`pptxgenjs` being called directly, not through a generated client), has a smaller runtime footprint appropriate for the CapRover/1GB-droplet self-host target already documented in `docker/Dockerfile`'s `NODE_OPTIONS="--max-old-space-size=768"` comment, and its `drizzle-kit` migration files are plain SQL — easy for a self-hosting operator to inspect, unlike Prisma's binary query engine. If the team prefers Prisma instead, the table/column design below translates directly — only the syntax changes.

Add dependencies: `drizzle-orm`, `postgres` (or `pg`), dev: `drizzle-kit`.

### 2.1 File layout

```
src/lib/db/
  client.ts          # postgres.js connection + drizzle() instance
  schema/
    tenant.ts         # unions, divisions, locals, bargaining_units, users
    grievance.ts       # grievances, grievance_events, grievance_notes
    bumping.ts          # bumping_cases, committee_sessions, committee_notes, decision_records
    time.ts              # time_entries, job_codes, work_sites, time_workers, time_expected_windows
    attachments.ts        # attachment_meta
    audit.ts               # audit_log
    qol.ts                   # member_communications, ca_snippets, shared_templates, scheduled_meetings
  migrations/            # drizzle-kit generated SQL
```

### 2.2 Tenancy tables — `src/lib/db/schema/tenant.ts`

```typescript
import { pgTable, text, boolean, timestamp, jsonb, primaryKey } from "drizzle-orm/pg-core";

export const unions = pgTable("unions", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  defaultLocale: text("default_locale").notNull().default("en"), // "en" | "fr"
  enabledModules: jsonb("enabled_modules").notNull().$type<string[]>(), // HubModule[]
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const divisions = pgTable("divisions", {
  id: text("id").primaryKey(),
  unionId: text("union_id").notNull().references(() => unions.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  code: text("code").notNull(),
  enabledModules: jsonb("enabled_modules").notNull().$type<string[]>(),
});

export const locals = pgTable("locals", {
  id: text("id").primaryKey(),
  unionId: text("union_id").notNull().references(() => unions.id, { onDelete: "cascade" }),
  divisionId: text("division_id").references(() => divisions.id, { onDelete: "set null" }),
  localNumber: text("local_number").notNull(),
  subText: text("sub_text").notNull().default(""),
});

export const bargainingUnits = pgTable("bargaining_units", {
  id: text("id").primaryKey(),
  unionId: text("union_id").notNull().references(() => unions.id, { onDelete: "cascade" }),
  localId: text("local_id").notNull().references(() => locals.id, { onDelete: "cascade" }),
  code: text("code").notNull(),
  name: text("name").notNull(),
  grievanceConfig: jsonb("grievance_config").$type<{ steps: { number: number; name: string; responseDays: number | null }[] }>(),
});

export const users = pgTable("users", {
  id: text("id").primaryKey(),
  email: text("email").notNull().unique(),
  name: text("name").notNull(),
  passwordHash: text("password_hash").notNull(), // bcrypt — see §3 (finally makes the existing bcryptjs dependency load-bearing)
  unionId: text("union_id").notNull().references(() => unions.id, { onDelete: "restrict" }),
  divisionId: text("division_id").references(() => divisions.id, { onDelete: "set null" }),
  localId: text("local_id").references(() => locals.id, { onDelete: "set null" }),
  bargainingUnitId: text("bargaining_unit_id").references(() => bargainingUnits.id, { onDelete: "set null" }),
  accessibleLocalIds: jsonb("accessible_local_ids").$type<string[]>(),
  roles: jsonb("roles").notNull().$type<string[]>(), // UserRole[]
  totpSecret: text("totp_secret"), // per-user MFA secret — see §3, replaces the shared AUTH_MFA_CODE
  mfaEnabled: boolean("mfa_enabled").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
```

### 2.3 Grievance tables — `src/lib/db/schema/grievance.ts`

```typescript
import { pgTable, text, integer, timestamp, index } from "drizzle-orm/pg-core";
import { unions, locals, bargainingUnits } from "./tenant";

export const grievances = pgTable("grievances", {
  id: text("id").primaryKey(),
  unionId: text("union_id").notNull().references(() => unions.id, { onDelete: "restrict" }),
  localId: text("local_id").notNull().references(() => locals.id, { onDelete: "restrict" }),
  bargainingUnitId: text("bargaining_unit_id").references(() => bargainingUnits.id, { onDelete: "set null" }),
  memberPseudonym: text("member_pseudonym"),
  category: text("category").notNull(),
  status: text("status").notNull(), // GrievanceStatus
  currentStep: integer("current_step").notNull().default(1),
  filedAt: timestamp("filed_at", { withTimezone: true }).notNull(),
  resolvedAt: timestamp("resolved_at", { withTimezone: true }),
  assignedStewardId: text("assigned_steward_id").notNull(),
  createdById: text("created_by_id").notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  // Every list query filters by unionId at minimum (RLS backstop below) — index it.
  unionLocalIdx: index("grievances_union_local_idx").on(t.unionId, t.localId),
  stewardIdx: index("grievances_steward_idx").on(t.assignedStewardId),
}));

export const grievanceEvents = pgTable("grievance_events", {
  id: text("id").primaryKey(),
  grievanceId: text("grievance_id").notNull().references(() => grievances.id, { onDelete: "cascade" }),
  type: text("type").notNull(), // GrievanceEventType
  stepNumber: integer("step_number"),
  dueAt: timestamp("due_at", { withTimezone: true }),
  completedAt: timestamp("completed_at", { withTimezone: true }),
  note: text("note"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// Append-only by convention (matches current memory-adapter behavior) — no
// UPDATE/DELETE grant for this table in the app DB role; enforce at the DB
// role level, not just application code, once RLS lands.
export const grievanceNotes = pgTable("grievance_notes", {
  id: text("id").primaryKey(),
  grievanceId: text("grievance_id").notNull().references(() => grievances.id, { onDelete: "cascade" }),
  authorId: text("author_id").notNull(),
  authorName: text("author_name").notNull(),
  body: text("body").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// New in this blueprint — closes FEAT-004 (arbitration outcome). Optional 1:1 with a grievance.
export const grievanceOutcomes = pgTable("grievance_outcomes", {
  id: text("id").primaryKey(),
  grievanceId: text("grievance_id").notNull().unique().references(() => grievances.id, { onDelete: "cascade" }),
  outcomeType: text("outcome_type").notNull(), // "upheld" | "denied" | "settled" | "withdrawn"
  remedy: text("remedy"),
  settlementTerms: text("settlement_terms"),
  arbitratorName: text("arbitrator_name"),
  hearingDate: timestamp("hearing_date", { withTimezone: true }),
  decidedAt: timestamp("decided_at", { withTimezone: true }).notNull(),
  recordedById: text("recorded_by_id").notNull(),
});
```

### 2.4 Bumping tables — `src/lib/db/schema/bumping.ts`

```typescript
import { pgTable, text, timestamp, jsonb, index } from "drizzle-orm/pg-core";
import { unions, locals } from "./tenant";

export const bumpingCases = pgTable("bumping_cases", {
  id: text("id").primaryKey(),
  unionId: text("union_id").notNull().references(() => unions.id, { onDelete: "restrict" }),
  localId: text("local_id").notNull().references(() => locals.id, { onDelete: "restrict" }),
  memberRef: text("member_ref").notNull(),
  seniorityDate: timestamp("seniority_date", { withTimezone: true }).notNull(),
  currentPosition: text("current_position").notNull(),
  targetPosition: text("target_position").notNull(),
  scenario: text("scenario").notNull(),
  status: text("status").notNull(),
  incumbentPosition: jsonb("incumbent_position").notNull(), // PositionDescription
  bumpingPosition: jsonb("bumping_position").notNull(),
  checklist: jsonb("checklist").notNull().$type<Record<string, boolean | null>>(),
  createdById: text("created_by_id").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  unionLocalIdx: index("bumping_cases_union_local_idx").on(t.unionId, t.localId),
}));

export const committeeSessions = pgTable("committee_sessions", {
  id: text("id").primaryKey(),
  bumpingCaseId: text("bumping_case_id").notNull().references(() => bumpingCases.id, { onDelete: "cascade" }),
  date: timestamp("date", { withTimezone: true }).notNull(),
  attendees: jsonb("attendees").notNull().$type<string[]>(),
  agenda: text("agenda").notNull(),
  createdById: text("created_by_id").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const committeeNotes = pgTable("committee_notes", {
  id: text("id").primaryKey(),
  bumpingCaseId: text("bumping_case_id").notNull().references(() => bumpingCases.id, { onDelete: "cascade" }),
  sessionId: text("session_id").references(() => committeeSessions.id, { onDelete: "set null" }),
  authorId: text("author_id").notNull(),
  authorName: text("author_name").notNull(),
  body: text("body").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const decisionRecords = pgTable("decision_records", {
  id: text("id").primaryKey(),
  bumpingCaseId: text("bumping_case_id").notNull().unique().references(() => bumpingCases.id, { onDelete: "cascade" }),
  outcome: text("outcome").notNull(),
  rationale: text("rationale").notNull(),
  dissentNotes: text("dissent_notes"),
  recordedById: text("recorded_by_id").notNull(),
  recordedAt: timestamp("recorded_at", { withTimezone: true }).notNull().defaultNow(),
});

// New in this blueprint — closes FEAT-005 (seniority roster), separate from
// per-case rows so it can be queried/ranked independently of any one dispute.
export const memberSeniorityRecords = pgTable("member_seniority_records", {
  id: text("id").primaryKey(),
  unionId: text("union_id").notNull().references(() => unions.id, { onDelete: "restrict" }),
  localId: text("local_id").notNull().references(() => locals.id, { onDelete: "restrict" }),
  memberRef: text("member_ref").notNull(),
  seniorityDate: timestamp("seniority_date", { withTimezone: true }).notNull(),
  classification: text("classification").notNull(),
  active: boolean("active").notNull().default(true),
});
```

### 2.5 RLS policy pattern (apply identically to every tenant-scoped table above)

Postgres RLS is the actual enforcement layer ADR-008/ADR-013 call for — the application-level `unionId`/`localId` filtering in `src/lib/*/access.ts` becomes defense-in-depth, not the only line of defense, once this lands.

```sql
-- Run once per tenant-scoped table (grievances shown; repeat for bumping_cases,
-- time_entries, attachment_meta, audit_log, ca_snippets, shared_templates, etc.)
ALTER TABLE grievances ENABLE ROW LEVEL SECURITY;

-- The app sets these per-connection/per-request via `SET LOCAL app.current_union_id = '...'`
-- (and app.current_local_id, app.current_roles) inside a transaction, populated
-- from the authenticated session — never from client-supplied request fields.
CREATE POLICY grievances_tenant_isolation ON grievances
  USING (
    union_id = current_setting('app.current_union_id', true)
    AND (
      local_id = current_setting('app.current_local_id', true)
      OR current_setting('app.current_cross_local', true) = 'true' -- set only for union_admin/division_admin/platform_admin
    )
  );

-- platform_admin break-glass (cross-union) is a SEPARATE, explicitly-audited
-- policy/role per docs/RBAC.md "requires audited break-glass" — do not fold
-- it into the default policy above.
```

Add a `src/lib/db/rls-context.ts` helper that every request handler calls once, right after `require*Session()` succeeds, to set the Postgres session variables for the duration of that request's transaction — this is the concrete mechanism, not just app-layer `access.ts` checks, that makes ADR-008 real.

### 2.6 Migration path from memory adapters

1. Keep every existing `*Adapter` TypeScript interface (`src/lib/grievance/adapter.ts` etc.) unchanged — routes and RBAC code do not need to change.
2. Write a new `DrizzleGrievanceAdapter implements GrievanceAdapter` (etc. per module) that runs the queries above instead of touching an in-memory array.
3. Feature-flag the swap per module (`GRIEVANCE_DB_BACKEND=memory|postgres`) so Phase 2 of `sprint-phases.md` can land module-by-module rather than as one big-bang cutover.
4. Port each memory adapter's seed data (`src/lib/grievance/memory-adapter.ts`'s hardcoded array, etc.) into `drizzle-kit`'s seed script so `npm run dev` / demo hosts keep working identically.

---

## 3. Auth / MFA security fix blueprint

Exact, ordered code changes to close `SEC-001` (client-side MFA bypass) and `SEC-005` (forgeable `localId`/`bargainingUnitId`). Read `active-context.md` §4 for the full current-behavior writeup before making these changes.

### 3.1 Problem recap (current code, for reference)

```30:42:src/auth.config.ts
      if (trigger === "update" && session) {
        if (session.mfaVerified !== undefined) {
          token.mfaVerified = session.mfaVerified as boolean;
        }
        if ("localId" in session) {
          token.localId = session.localId as string | undefined;
        }
        if ("bargainingUnitId" in session) {
          token.bargainingUnitId = session.bargainingUnitId as
            | string
            | undefined;
        }
      }
```

```23:30:src/app/api/mfa/verify/route.ts
  const expected =
    process.env.AUTH_MFA_CODE ??
    process.env.AUTH_DEV_MFA_CODE ??
    "000000";

  if (code !== expected) {
```

```54:66:src/app/[locale]/app/mfa/page.tsx
    const res = await fetch("/api/mfa/verify", { ... });
    if (!res.ok) { ... }
    await update({ mfaVerified: true });
```

The client trusts itself: `/api/mfa/verify` never touches the session; the page calls `update({ mfaVerified: true })` purely on the client's own say-so once the fetch returns `ok`. Any authenticated browser can skip the fetch and call `update({ mfaVerified: true })` directly.

### 3.2 Step-by-step fix

**Step 1 — Add a server-side "pending MFA grant" store.** In-memory is fine short-term (matches the rest of the codebase's current persistence posture) but must be per-session, single-use, short-TTL:

```typescript
// src/lib/auth/mfa-grants.ts (new file)
interface MfaGrant {
  userId: string;
  nonce: string;      // random, single-use
  issuedAt: number;
  expiresAt: number;  // issuedAt + 60_000 (60s window to complete the update() round trip)
}

const grants = new Map<string, MfaGrant>(); // keyed by userId

export function issueMfaGrant(userId: string): string {
  const nonce = crypto.randomUUID();
  grants.set(userId, { userId, nonce, issuedAt: Date.now(), expiresAt: Date.now() + 60_000 });
  return nonce;
}

export function consumeMfaGrant(userId: string, nonce: string): boolean {
  const grant = grants.get(userId);
  if (!grant || grant.nonce !== nonce || Date.now() > grant.expiresAt) return false;
  grants.delete(userId); // single-use
  return true;
}
```

**Step 2 — `/api/mfa/verify` issues the nonce instead of just returning `{success:true}`:**

```typescript
// src/app/api/mfa/verify/route.ts — replace the tail of POST()
  // ... existing code/TOTP check unchanged (see SEC-002 for replacing the
  // shared-code check itself with per-user TOTP against users.totpSecret) ...

  const nonce = issueMfaGrant(session.user.id);

  await auditLog.log({ /* unchanged */ });

  return NextResponse.json({ success: true, mfaGrant: nonce });
```

**Step 3 — MFA page sends the nonce back through `update()`, not a bare boolean:**

```typescript
// src/app/[locale]/app/mfa/page.tsx — replace handleSubmit's tail
  const res = await fetch("/api/mfa/verify", { /* unchanged */ });
  if (!res.ok) { /* unchanged */ }
  const { mfaGrant } = await res.json();
  await update({ mfaGrant }); // send the opaque nonce, not the boolean itself
```

**Step 4 — `jwt()` callback validates the nonce server-side before setting `mfaVerified`, and drops the ability to set `mfaVerified` directly from client input entirely:**

```typescript
// src/auth.config.ts — replace the `trigger === "update"` branch
import { consumeMfaGrant } from "@/lib/auth/mfa-grants";

// ...
      if (trigger === "update" && session) {
        // mfaVerified is NEVER settable directly from client input anymore.
        if (typeof session.mfaGrant === "string" && token.sub) {
          if (consumeMfaGrant(token.sub, session.mfaGrant)) {
            token.mfaVerified = true;
          }
          // invalid/expired/reused nonce: silently ignored, token unchanged
        }

        // localId/bargainingUnitId: validate against the token's OWN
        // accessibleLocalIds + role before accepting (closes SEC-005).
        if ("localId" in session) {
          const requested = session.localId as string | undefined;
          const roles = (token.roles as string[] | undefined) ?? [];
          const accessible = (token.accessibleLocalIds as string[] | undefined) ?? [];
          const crossLocalRoles = ["platform_admin", "union_admin", "division_admin"];
          const canCrossLocal = roles.some((r) => crossLocalRoles.includes(r));
          const allowed =
            requested === undefined || // clearing scope ("all locals") is allowed for cross-local roles only — see next line
            accessible.includes(requested) ||
            canCrossLocal;
          if (allowed) {
            token.localId = requested;
          }
          // else: forged localId silently ignored, token.localId unchanged
        }
        if ("bargainingUnitId" in session) {
          // bargainingUnitId is only meaningful under the (now-validated) current localId —
          // re-derive/validate it belongs to token.localId via the tenant loader rather than
          // trusting the client's pairing. Reject if it doesn't belong to the active local.
          token.bargainingUnitId = validateBargainingUnitForLocal(
            session.bargainingUnitId as string | undefined,
            token.localId as string | undefined,
            token.unionId as string,
          );
        }
      }
```

**Step 5 — Update `HubContextSwitcher.tsx` call sites.** No change needed to the component itself (it already sends `{ localId, bargainingUnitId }`) — the validation now happens server-side in Step 4, so a legitimate switch by an authorized user still works, and an unauthorized/forged one is now silently rejected instead of trusted.

**Step 6 — Regression tests (add to `src/auth.config.test.ts`, new file):**
1. Valid MFA nonce → `mfaVerified` becomes `true`.
2. Reused nonce → rejected, `mfaVerified` stays `false`.
3. Expired nonce (mock `Date.now()` past TTL) → rejected.
4. Arbitrary client-supplied `mfaVerified: true` with no `mfaGrant` → **has no effect** (this is the regression test that directly proves `SEC-001` is closed).
5. `local_steward` requesting a `localId` outside `accessibleLocalIds` → rejected, token unchanged.
6. `union_admin` requesting any `localId` in their union → accepted.
7. `bargainingUnitId` that doesn't belong to the resulting `localId` → rejected/nulled.

### 3.3 Sequencing note

This blueprint is intentionally independent of `SEC-002` (replacing the shared MFA code with per-user TOTP) and `SEC-003` (Postgres) — it can and should ship first, on its own, against the current in-memory demo-user store. Layer `SEC-002`'s TOTP secret check into Step 2 above once `users.totpSecret` exists (either as an in-memory field on `DemoUser` short-term, or on the `users` table once §2.2 lands).
