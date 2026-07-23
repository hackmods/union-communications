CREATE TABLE "member_communications" (
	"id" text PRIMARY KEY NOT NULL,
	"grievance_id" text NOT NULL,
	"union_id" text NOT NULL,
	"local_id" text NOT NULL,
	"channel" text NOT NULL,
	"direction" text NOT NULL,
	"summary" text NOT NULL,
	"occurred_at" timestamp with time zone NOT NULL,
	"logged_by_id" text NOT NULL,
	"logged_by_name" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "scheduled_meetings" (
	"id" text PRIMARY KEY NOT NULL,
	"grievance_id" text NOT NULL,
	"union_id" text NOT NULL,
	"local_id" text NOT NULL,
	"title" text NOT NULL,
	"starts_at" timestamp with time zone NOT NULL,
	"ends_at" timestamp with time zone,
	"location" text,
	"description" text,
	"created_by_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "member_communications" ADD CONSTRAINT "member_communications_grievance_id_grievances_id_fk" FOREIGN KEY ("grievance_id") REFERENCES "public"."grievances"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "member_communications" ADD CONSTRAINT "member_communications_union_id_unions_id_fk" FOREIGN KEY ("union_id") REFERENCES "public"."unions"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "member_communications" ADD CONSTRAINT "member_communications_local_id_locals_id_fk" FOREIGN KEY ("local_id") REFERENCES "public"."locals"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "scheduled_meetings" ADD CONSTRAINT "scheduled_meetings_grievance_id_grievances_id_fk" FOREIGN KEY ("grievance_id") REFERENCES "public"."grievances"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "scheduled_meetings" ADD CONSTRAINT "scheduled_meetings_union_id_unions_id_fk" FOREIGN KEY ("union_id") REFERENCES "public"."unions"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "scheduled_meetings" ADD CONSTRAINT "scheduled_meetings_local_id_locals_id_fk" FOREIGN KEY ("local_id") REFERENCES "public"."locals"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "member_comms_grievance_idx" ON "member_communications" USING btree ("grievance_id");--> statement-breakpoint
CREATE INDEX "scheduled_meetings_grievance_idx" ON "scheduled_meetings" USING btree ("grievance_id");