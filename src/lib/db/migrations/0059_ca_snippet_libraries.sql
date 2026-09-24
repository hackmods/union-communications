ALTER TABLE "ca_snippets" ADD COLUMN "library_id" text;--> statement-breakpoint
ALTER TABLE "ca_snippets" ADD COLUMN "locale" text DEFAULT 'en' NOT NULL;--> statement-breakpoint
CREATE INDEX "ca_snippets_library_locale_idx" ON "ca_snippets" USING btree ("union_id","library_id","locale");
