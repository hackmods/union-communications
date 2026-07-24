CREATE TABLE "travel_authorizations" (
	"id" text PRIMARY KEY NOT NULL,
	"union_id" text NOT NULL,
	"local_id" text NOT NULL,
	"requested_by_id" text NOT NULL,
	"requested_by_name" text NOT NULL,
	"purpose" text NOT NULL,
	"event_name" text NOT NULL,
	"event_start_date" text NOT NULL,
	"event_end_date" text NOT NULL,
	"estimated_costs" jsonb NOT NULL,
	"status" text NOT NULL,
	"approved_by_id" text,
	"approved_at" timestamp with time zone,
	"denied_reason" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "cash_advances" (
	"id" text PRIMARY KEY NOT NULL,
	"travel_authorization_id" text NOT NULL,
	"union_id" text NOT NULL,
	"local_id" text NOT NULL,
	"amount" double precision NOT NULL,
	"issued_at" timestamp with time zone NOT NULL,
	"issued_by_id" text NOT NULL,
	"ledger_entry_id" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "expense_claims" (
	"id" text PRIMARY KEY NOT NULL,
	"travel_authorization_id" text NOT NULL,
	"union_id" text NOT NULL,
	"local_id" text NOT NULL,
	"claimant_id" text NOT NULL,
	"status" text NOT NULL,
	"line_items" jsonb NOT NULL,
	"advance_amount" double precision NOT NULL,
	"difference" double precision,
	"reconciled_at" timestamp with time zone,
	"reconciled_by_id" text,
	"reconcile_ledger_entry_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "travel_authorizations" ADD CONSTRAINT "travel_authorizations_union_id_unions_id_fk" FOREIGN KEY ("union_id") REFERENCES "public"."unions"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "travel_authorizations" ADD CONSTRAINT "travel_authorizations_local_id_locals_id_fk" FOREIGN KEY ("local_id") REFERENCES "public"."locals"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cash_advances" ADD CONSTRAINT "cash_advances_travel_authorization_id_travel_authorizations_id_fk" FOREIGN KEY ("travel_authorization_id") REFERENCES "public"."travel_authorizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cash_advances" ADD CONSTRAINT "cash_advances_union_id_unions_id_fk" FOREIGN KEY ("union_id") REFERENCES "public"."unions"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cash_advances" ADD CONSTRAINT "cash_advances_local_id_locals_id_fk" FOREIGN KEY ("local_id") REFERENCES "public"."locals"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "expense_claims" ADD CONSTRAINT "expense_claims_travel_authorization_id_travel_authorizations_id_fk" FOREIGN KEY ("travel_authorization_id") REFERENCES "public"."travel_authorizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "expense_claims" ADD CONSTRAINT "expense_claims_union_id_unions_id_fk" FOREIGN KEY ("union_id") REFERENCES "public"."unions"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "expense_claims" ADD CONSTRAINT "expense_claims_local_id_locals_id_fk" FOREIGN KEY ("local_id") REFERENCES "public"."locals"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "travel_authorizations_union_local_idx" ON "travel_authorizations" USING btree ("union_id","local_id");--> statement-breakpoint
CREATE INDEX "travel_authorizations_status_idx" ON "travel_authorizations" USING btree ("status");--> statement-breakpoint
CREATE INDEX "cash_advances_auth_idx" ON "cash_advances" USING btree ("travel_authorization_id");--> statement-breakpoint
CREATE INDEX "cash_advances_union_local_idx" ON "cash_advances" USING btree ("union_id","local_id");--> statement-breakpoint
CREATE INDEX "expense_claims_auth_idx" ON "expense_claims" USING btree ("travel_authorization_id");--> statement-breakpoint
CREATE INDEX "expense_claims_union_local_idx" ON "expense_claims" USING btree ("union_id","local_id");--> statement-breakpoint
ALTER TABLE "attachment_meta" ADD COLUMN IF NOT EXISTS "expense_claim_id" text;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "attachment_meta_expense_claim_idx" ON "attachment_meta" USING btree ("expense_claim_id");--> statement-breakpoint
-- ORG-008 / ADR-008: Row-Level Security for travel tables.
ALTER TABLE travel_authorizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE cash_advances ENABLE ROW LEVEL SECURITY;
ALTER TABLE expense_claims ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS travel_authorizations_tenant_isolation ON travel_authorizations;
CREATE POLICY travel_authorizations_tenant_isolation ON travel_authorizations
  USING (
    union_id = nullif(current_setting('app.current_union_id', true), '')
    AND (
      local_id = nullif(current_setting('app.current_local_id', true), '')
      OR current_setting('app.current_cross_local', true) = 'true'
      OR nullif(current_setting('app.current_local_id', true), '') IS NULL
    )
  );

DROP POLICY IF EXISTS cash_advances_tenant_isolation ON cash_advances;
CREATE POLICY cash_advances_tenant_isolation ON cash_advances
  USING (
    union_id = nullif(current_setting('app.current_union_id', true), '')
    AND (
      local_id = nullif(current_setting('app.current_local_id', true), '')
      OR current_setting('app.current_cross_local', true) = 'true'
      OR nullif(current_setting('app.current_local_id', true), '') IS NULL
    )
  );

DROP POLICY IF EXISTS expense_claims_tenant_isolation ON expense_claims;
CREATE POLICY expense_claims_tenant_isolation ON expense_claims
  USING (
    union_id = nullif(current_setting('app.current_union_id', true), '')
    AND (
      local_id = nullif(current_setting('app.current_local_id', true), '')
      OR current_setting('app.current_cross_local', true) = 'true'
      OR nullif(current_setting('app.current_local_id', true), '') IS NULL
    )
  );
