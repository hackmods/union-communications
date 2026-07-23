CREATE TABLE "grievance_outcomes" (
	"id" text PRIMARY KEY NOT NULL,
	"grievance_id" text NOT NULL,
	"outcome_type" text NOT NULL,
	"remedy" text,
	"settlement_terms" text,
	"arbitrator_name" text,
	"hearing_date" timestamp with time zone,
	"decided_at" timestamp with time zone NOT NULL,
	"recorded_by_id" text NOT NULL,
	CONSTRAINT "grievance_outcomes_grievance_id_unique" UNIQUE("grievance_id")
);
--> statement-breakpoint
ALTER TABLE "grievance_outcomes" ADD CONSTRAINT "grievance_outcomes_grievance_id_grievances_id_fk" FOREIGN KEY ("grievance_id") REFERENCES "public"."grievances"("id") ON DELETE cascade ON UPDATE no action;