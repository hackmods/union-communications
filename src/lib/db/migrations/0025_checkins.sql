CREATE TABLE "checkin_schedules" (
	"id" text PRIMARY KEY NOT NULL,
	"union_id" text NOT NULL,
	"local_id" text NOT NULL,
	"bargaining_unit_id" text,
	"question" text NOT NULL,
	"cadence" text NOT NULL,
	"weekday" integer,
	"active" boolean DEFAULT true NOT NULL,
	"created_by_id" text NOT NULL,
	"created_by_name" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "checkin_answers" (
	"id" text PRIMARY KEY NOT NULL,
	"schedule_id" text NOT NULL,
	"union_id" text NOT NULL,
	"local_id" text NOT NULL,
	"period_key" text NOT NULL,
	"author_id" text NOT NULL,
	"author_name" text NOT NULL,
	"body" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "checkin_schedules" ADD CONSTRAINT "checkin_schedules_union_id_unions_id_fk" FOREIGN KEY ("union_id") REFERENCES "public"."unions"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "checkin_schedules" ADD CONSTRAINT "checkin_schedules_local_id_locals_id_fk" FOREIGN KEY ("local_id") REFERENCES "public"."locals"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "checkin_schedules" ADD CONSTRAINT "checkin_schedules_bargaining_unit_id_bargaining_units_id_fk" FOREIGN KEY ("bargaining_unit_id") REFERENCES "public"."bargaining_units"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "checkin_answers" ADD CONSTRAINT "checkin_answers_schedule_id_checkin_schedules_id_fk" FOREIGN KEY ("schedule_id") REFERENCES "public"."checkin_schedules"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "checkin_answers" ADD CONSTRAINT "checkin_answers_union_id_unions_id_fk" FOREIGN KEY ("union_id") REFERENCES "public"."unions"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "checkin_answers" ADD CONSTRAINT "checkin_answers_local_id_locals_id_fk" FOREIGN KEY ("local_id") REFERENCES "public"."locals"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "checkin_schedules_union_local_idx" ON "checkin_schedules" USING btree ("union_id","local_id");--> statement-breakpoint
CREATE INDEX "checkin_schedules_active_idx" ON "checkin_schedules" USING btree ("active");--> statement-breakpoint
CREATE UNIQUE INDEX "checkin_answers_unique_author_period_idx" ON "checkin_answers" USING btree ("schedule_id","period_key","author_id");--> statement-breakpoint
CREATE INDEX "checkin_answers_schedule_period_idx" ON "checkin_answers" USING btree ("schedule_id","period_key");--> statement-breakpoint
CREATE INDEX "checkin_answers_union_local_idx" ON "checkin_answers" USING btree ("union_id","local_id");--> statement-breakpoint
ALTER TABLE checkin_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE checkin_answers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS checkin_schedules_tenant_isolation ON checkin_schedules;
CREATE POLICY checkin_schedules_tenant_isolation ON checkin_schedules
  USING (
    union_id = nullif(current_setting('app.current_union_id', true), '')
    AND (
      local_id = nullif(current_setting('app.current_local_id', true), '')
      OR current_setting('app.current_cross_local', true) = 'true'
      OR nullif(current_setting('app.current_local_id', true), '') IS NULL
    )
  );

DROP POLICY IF EXISTS checkin_answers_tenant_isolation ON checkin_answers;
CREATE POLICY checkin_answers_tenant_isolation ON checkin_answers
  USING (
    union_id = nullif(current_setting('app.current_union_id', true), '')
    AND (
      local_id = nullif(current_setting('app.current_local_id', true), '')
      OR current_setting('app.current_cross_local', true) = 'true'
      OR nullif(current_setting('app.current_local_id', true), '') IS NULL
    )
  );
