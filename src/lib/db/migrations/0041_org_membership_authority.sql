-- Durable local membership, scoped office assignments, and revocable delegation.
CREATE TABLE IF NOT EXISTS "local_memberships" (
  "id" text PRIMARY KEY NOT NULL,
  "union_id" text NOT NULL REFERENCES "unions"("id") ON DELETE CASCADE,
  "local_id" text NOT NULL REFERENCES "locals"("id") ON DELETE CASCADE,
  "user_id" text NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "bargaining_unit_id" text REFERENCES "bargaining_units"("id") ON DELETE SET NULL,
  "status" text DEFAULT 'active' NOT NULL,
  "is_primary" boolean DEFAULT false NOT NULL,
  "started_at" timestamp with time zone DEFAULT now() NOT NULL,
  "ended_at" timestamp with time zone,
  "created_by_id" text NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "local_memberships_status_check" CHECK ("status" IN ('active','inactive'))
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "local_memberships_user_local_uidx" ON "local_memberships" ("user_id","local_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "local_memberships_union_local_idx" ON "local_memberships" ("union_id","local_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "local_memberships_user_status_idx" ON "local_memberships" ("user_id","status");
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "officer_assignments" (
  "id" text PRIMARY KEY NOT NULL,
  "union_id" text NOT NULL REFERENCES "unions"("id") ON DELETE CASCADE,
  "local_id" text NOT NULL REFERENCES "locals"("id") ON DELETE CASCADE,
  "user_id" text NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "position" text NOT NULL,
  "officer_roster_id" text,
  "starts_at" timestamp with time zone DEFAULT now() NOT NULL,
  "ends_at" timestamp with time zone,
  "revoked_at" timestamp with time zone,
  "assigned_by_id" text NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "officer_assignments_position_check" CHECK ("position" IN ('president','vice_president','grievance_officer','steward','executive_member'))
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "officer_assignments_local_position_idx" ON "officer_assignments" ("union_id","local_id","position");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "officer_assignments_user_active_idx" ON "officer_assignments" ("user_id","revoked_at","ends_at");
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "authority_delegations" (
  "id" text PRIMARY KEY NOT NULL,
  "union_id" text NOT NULL REFERENCES "unions"("id") ON DELETE CASCADE,
  "local_id" text NOT NULL REFERENCES "locals"("id") ON DELETE CASCADE,
  "capability" text NOT NULL,
  "grantor_user_id" text NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "delegate_user_id" text NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "starts_at" timestamp with time zone NOT NULL,
  "ends_at" timestamp with time zone NOT NULL,
  "reason" text NOT NULL,
  "revoked_at" timestamp with time zone,
  "revoked_by_id" text,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "authority_delegations_valid_window" CHECK ("ends_at" > "starts_at"),
  CONSTRAINT "authority_delegations_max_90_days" CHECK ("ends_at" <= "starts_at" + interval '90 days')
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "authority_delegations_delegate_active_idx" ON "authority_delegations" ("delegate_user_id","revoked_at","ends_at");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "authority_delegations_scope_idx" ON "authority_delegations" ("union_id","local_id","capability");
--> statement-breakpoint
ALTER TABLE "officer_roster" ADD COLUMN IF NOT EXISTS "user_id" text REFERENCES "users"("id") ON DELETE SET NULL;
--> statement-breakpoint
ALTER TABLE "officer_roster" ADD COLUMN IF NOT EXISTS "canonical_position" text;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "officer_roster_user_idx" ON "officer_roster" ("user_id");
--> statement-breakpoint
UPDATE officer_roster o SET
  user_id = matched.id,
  canonical_position = COALESCE(o.canonical_position, CASE
    WHEN lower(o.role) LIKE '%vice%president%' THEN 'vice_president'
    WHEN lower(o.role) LIKE '%president%' THEN 'president'
    WHEN lower(o.role) LIKE '%grievance%' THEN 'grievance_officer'
    WHEN lower(o.role) LIKE '%steward%' THEN 'steward'
    WHEN lower(o.role) LIKE '%executive%' OR lower(o.role) LIKE '%exec%' THEN 'executive_member'
    ELSE NULL END)
FROM users matched
WHERE o.user_id IS NULL AND o.email IS NOT NULL
  AND lower(trim(o.email)) = lower(trim(matched.email))
  AND o.union_id = matched.union_id
  AND EXISTS (SELECT 1 FROM locals l WHERE l.id = o.local_id AND l.union_id = o.union_id)
  AND (SELECT count(*) FROM users same_email WHERE lower(trim(same_email.email)) = lower(trim(o.email)) AND same_email.union_id = o.union_id) = 1;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "committee_memberships" (
  "id" text PRIMARY KEY NOT NULL,
  "committee_id" text NOT NULL,
  "union_id" text NOT NULL REFERENCES "unions"("id") ON DELETE CASCADE,
  "local_id" text NOT NULL REFERENCES "locals"("id") ON DELETE CASCADE,
  "user_id" text NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "role" text DEFAULT 'member' NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "committee_memberships_committee_user_uidx" ON "committee_memberships" ("committee_id","user_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "committee_memberships_user_idx" ON "committee_memberships" ("union_id","user_id");
--> statement-breakpoint
INSERT INTO "local_memberships" (id, union_id, local_id, user_id, bargaining_unit_id, status, is_primary, started_at, created_by_id)
SELECT 'lm-backfill-' || u.id || '-' || u.local_id, u.union_id, u.local_id, u.id, u.bargaining_unit_id, 'active', true, u.created_at, u.id
FROM users u
WHERE u.union_id IS NOT NULL AND u.local_id IS NOT NULL
ON CONFLICT (user_id, local_id) DO NOTHING;
--> statement-breakpoint
INSERT INTO "local_memberships" (id, union_id, local_id, user_id, status, is_primary, started_at, created_by_id)
SELECT 'lm-access-' || u.id || '-' || local.value, u.union_id, local.value, u.id, 'active', false, u.created_at, u.id
FROM users u
CROSS JOIN LATERAL jsonb_array_elements_text(COALESCE(u.accessible_local_ids, '[]'::jsonb)) AS local(value)
WHERE u.union_id IS NOT NULL
  AND NOT (COALESCE(u.roles, '[]'::jsonb) ?| ARRAY['platform_admin','union_admin','division_admin'])
  AND EXISTS (SELECT 1 FROM locals l WHERE l.id = local.value AND l.union_id = u.union_id)
ON CONFLICT (user_id, local_id) DO NOTHING;
--> statement-breakpoint
INSERT INTO "officer_assignments" (id, union_id, local_id, user_id, position, assigned_by_id, starts_at)
SELECT 'oa-backfill-' || u.id || '-' || role.position, u.union_id, u.local_id, u.id, role.position, u.id, u.created_at
FROM users u
CROSS JOIN LATERAL (VALUES
  ('local_president'::text, 'president'::text),
  ('local_steward'::text, 'steward'::text),
  ('local_exec'::text, 'executive_member'::text)
) AS role(role_key, position)
WHERE u.union_id IS NOT NULL AND u.local_id IS NOT NULL AND COALESCE(u.roles, '[]'::jsonb) ? role.role_key
  AND EXISTS (SELECT 1 FROM local_memberships lm WHERE lm.user_id = u.id AND lm.local_id = u.local_id AND lm.status = 'active')
  AND NOT EXISTS (SELECT 1 FROM officer_assignments oa WHERE oa.user_id = u.id AND oa.local_id = u.local_id AND oa.position = role.position)
ON CONFLICT DO NOTHING;
--> statement-breakpoint
INSERT INTO "committee_memberships" (id, committee_id, union_id, local_id, user_id, role, created_at)
SELECT 'cm-backfill-' || c.id || '-' || o.user_id, c.id, c.union_id, c.local_id, o.user_id, 'member', c.created_at
FROM committees c
CROSS JOIN LATERAL jsonb_array_elements_text(COALESCE(c.member_officer_ids, '[]'::jsonb)) AS legacy(officer_id)
JOIN officer_roster o ON o.id = legacy.officer_id AND o.union_id = c.union_id AND o.local_id = c.local_id
JOIN local_memberships lm ON lm.union_id = c.union_id AND lm.local_id = c.local_id AND lm.user_id = o.user_id
WHERE o.user_id IS NOT NULL AND lm.status = 'active' AND lm.ended_at IS NULL
ON CONFLICT (committee_id, user_id) DO NOTHING;
