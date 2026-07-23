CREATE TABLE "bargaining_units" (
	"id" text PRIMARY KEY NOT NULL,
	"union_id" text NOT NULL,
	"local_id" text NOT NULL,
	"code" text NOT NULL,
	"name" text NOT NULL,
	"grievance_config" jsonb
);
--> statement-breakpoint
CREATE TABLE "divisions" (
	"id" text PRIMARY KEY NOT NULL,
	"union_id" text NOT NULL,
	"name" text NOT NULL,
	"code" text NOT NULL,
	"enabled_modules" jsonb NOT NULL
);
--> statement-breakpoint
CREATE TABLE "locals" (
	"id" text PRIMARY KEY NOT NULL,
	"union_id" text NOT NULL,
	"division_id" text,
	"local_number" text NOT NULL,
	"sub_text" text DEFAULT '' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "unions" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"default_locale" text DEFAULT 'en' NOT NULL,
	"enabled_modules" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "unions_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" text PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"name" text NOT NULL,
	"password_hash" text NOT NULL,
	"union_id" text,
	"division_id" text,
	"local_id" text,
	"bargaining_unit_id" text,
	"accessible_local_ids" jsonb,
	"roles" jsonb NOT NULL,
	"totp_secret" text,
	"mfa_enabled" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "grievance_events" (
	"id" text PRIMARY KEY NOT NULL,
	"grievance_id" text NOT NULL,
	"type" text NOT NULL,
	"step_number" integer,
	"due_at" timestamp with time zone,
	"completed_at" timestamp with time zone,
	"note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "grievance_notes" (
	"id" text PRIMARY KEY NOT NULL,
	"grievance_id" text NOT NULL,
	"author_id" text NOT NULL,
	"author_name" text NOT NULL,
	"body" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "grievances" (
	"id" text PRIMARY KEY NOT NULL,
	"union_id" text NOT NULL,
	"local_id" text NOT NULL,
	"bargaining_unit_id" text,
	"member_pseudonym" text,
	"category" text NOT NULL,
	"status" text NOT NULL,
	"current_step" integer DEFAULT 1 NOT NULL,
	"filed_at" timestamp with time zone NOT NULL,
	"resolved_at" timestamp with time zone,
	"assigned_steward_id" text NOT NULL,
	"created_by_id" text NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "bumping_cases" (
	"id" text PRIMARY KEY NOT NULL,
	"union_id" text NOT NULL,
	"local_id" text NOT NULL,
	"member_ref" text NOT NULL,
	"seniority_date" text NOT NULL,
	"current_position" text NOT NULL,
	"target_position" text NOT NULL,
	"scenario" text NOT NULL,
	"status" text NOT NULL,
	"incumbent_position" jsonb NOT NULL,
	"bumping_position" jsonb NOT NULL,
	"checklist" jsonb NOT NULL,
	"created_by_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "committee_notes" (
	"id" text PRIMARY KEY NOT NULL,
	"bumping_case_id" text NOT NULL,
	"session_id" text,
	"author_id" text NOT NULL,
	"author_name" text NOT NULL,
	"body" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "committee_sessions" (
	"id" text PRIMARY KEY NOT NULL,
	"bumping_case_id" text NOT NULL,
	"date" text NOT NULL,
	"attendees" jsonb NOT NULL,
	"agenda" text NOT NULL,
	"created_by_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "decision_records" (
	"id" text PRIMARY KEY NOT NULL,
	"bumping_case_id" text NOT NULL,
	"outcome" text NOT NULL,
	"rationale" text NOT NULL,
	"dissent_notes" text,
	"recorded_by_id" text NOT NULL,
	"recorded_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "decision_records_bumping_case_id_unique" UNIQUE("bumping_case_id")
);
--> statement-breakpoint
CREATE TABLE "member_seniority_records" (
	"id" text PRIMARY KEY NOT NULL,
	"union_id" text NOT NULL,
	"local_id" text NOT NULL,
	"member_ref" text NOT NULL,
	"seniority_date" text NOT NULL,
	"classification" text NOT NULL,
	"active" boolean DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE TABLE "audit_log" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"action" text NOT NULL,
	"resource_type" text NOT NULL,
	"resource_id" text NOT NULL,
	"union_id" text,
	"local_id" text,
	"timestamp" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "bargaining_units" ADD CONSTRAINT "bargaining_units_union_id_unions_id_fk" FOREIGN KEY ("union_id") REFERENCES "public"."unions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bargaining_units" ADD CONSTRAINT "bargaining_units_local_id_locals_id_fk" FOREIGN KEY ("local_id") REFERENCES "public"."locals"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "divisions" ADD CONSTRAINT "divisions_union_id_unions_id_fk" FOREIGN KEY ("union_id") REFERENCES "public"."unions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "locals" ADD CONSTRAINT "locals_union_id_unions_id_fk" FOREIGN KEY ("union_id") REFERENCES "public"."unions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "locals" ADD CONSTRAINT "locals_division_id_divisions_id_fk" FOREIGN KEY ("division_id") REFERENCES "public"."divisions"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_union_id_unions_id_fk" FOREIGN KEY ("union_id") REFERENCES "public"."unions"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_division_id_divisions_id_fk" FOREIGN KEY ("division_id") REFERENCES "public"."divisions"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_local_id_locals_id_fk" FOREIGN KEY ("local_id") REFERENCES "public"."locals"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_bargaining_unit_id_bargaining_units_id_fk" FOREIGN KEY ("bargaining_unit_id") REFERENCES "public"."bargaining_units"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "grievance_events" ADD CONSTRAINT "grievance_events_grievance_id_grievances_id_fk" FOREIGN KEY ("grievance_id") REFERENCES "public"."grievances"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "grievance_notes" ADD CONSTRAINT "grievance_notes_grievance_id_grievances_id_fk" FOREIGN KEY ("grievance_id") REFERENCES "public"."grievances"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "grievances" ADD CONSTRAINT "grievances_union_id_unions_id_fk" FOREIGN KEY ("union_id") REFERENCES "public"."unions"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "grievances" ADD CONSTRAINT "grievances_local_id_locals_id_fk" FOREIGN KEY ("local_id") REFERENCES "public"."locals"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "grievances" ADD CONSTRAINT "grievances_bargaining_unit_id_bargaining_units_id_fk" FOREIGN KEY ("bargaining_unit_id") REFERENCES "public"."bargaining_units"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bumping_cases" ADD CONSTRAINT "bumping_cases_union_id_unions_id_fk" FOREIGN KEY ("union_id") REFERENCES "public"."unions"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bumping_cases" ADD CONSTRAINT "bumping_cases_local_id_locals_id_fk" FOREIGN KEY ("local_id") REFERENCES "public"."locals"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "committee_notes" ADD CONSTRAINT "committee_notes_bumping_case_id_bumping_cases_id_fk" FOREIGN KEY ("bumping_case_id") REFERENCES "public"."bumping_cases"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "committee_notes" ADD CONSTRAINT "committee_notes_session_id_committee_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."committee_sessions"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "committee_sessions" ADD CONSTRAINT "committee_sessions_bumping_case_id_bumping_cases_id_fk" FOREIGN KEY ("bumping_case_id") REFERENCES "public"."bumping_cases"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "decision_records" ADD CONSTRAINT "decision_records_bumping_case_id_bumping_cases_id_fk" FOREIGN KEY ("bumping_case_id") REFERENCES "public"."bumping_cases"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "member_seniority_records" ADD CONSTRAINT "member_seniority_records_union_id_unions_id_fk" FOREIGN KEY ("union_id") REFERENCES "public"."unions"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "member_seniority_records" ADD CONSTRAINT "member_seniority_records_local_id_locals_id_fk" FOREIGN KEY ("local_id") REFERENCES "public"."locals"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_log" ADD CONSTRAINT "audit_log_union_id_unions_id_fk" FOREIGN KEY ("union_id") REFERENCES "public"."unions"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_log" ADD CONSTRAINT "audit_log_local_id_locals_id_fk" FOREIGN KEY ("local_id") REFERENCES "public"."locals"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "grievances_union_local_idx" ON "grievances" USING btree ("union_id","local_id");--> statement-breakpoint
CREATE INDEX "grievances_steward_idx" ON "grievances" USING btree ("assigned_steward_id");--> statement-breakpoint
CREATE INDEX "bumping_cases_union_local_idx" ON "bumping_cases" USING btree ("union_id","local_id");--> statement-breakpoint
CREATE INDEX "audit_log_union_idx" ON "audit_log" USING btree ("union_id");--> statement-breakpoint
CREATE INDEX "audit_log_resource_idx" ON "audit_log" USING btree ("resource_type","resource_id");