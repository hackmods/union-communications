-- Internal processor inventory and a deliberately minimal public projection.
-- Providers are never seeded from assumptions; operators verify actual host configuration.
CREATE TABLE subprocessor_registry (
  "id" text PRIMARY KEY NOT NULL,
  "service_name" text NOT NULL,
  "purpose" jsonb NOT NULL,
  "data_categories" jsonb NOT NULL,
  "data_subjects" jsonb NOT NULL,
  "processing_region" text NOT NULL,
  "transfer_status" text NOT NULL,
  "effective_from" timestamp with time zone NOT NULL,
  "effective_to" timestamp with time zone,
  "review_status" text NOT NULL DEFAULT 'unreviewed',
  "dpa_status" text NOT NULL DEFAULT 'unreviewed',
  "public_disclosure_approved" boolean NOT NULL DEFAULT false,
  "public_notes" jsonb NOT NULL DEFAULT '{"en":"","fr":""}'::jsonb,
  "internal_notes" text NOT NULL DEFAULT '',
  "verification_evidence" text NOT NULL DEFAULT '',
  "review_owner" text,
  "reviewed_by" text,
  "reviewed_at" timestamp with time zone,
  "created_by" text NOT NULL,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  "updated_by" text NOT NULL,
  "updated_at" timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT "subprocessor_registry_localized_fields" CHECK (
    jsonb_typeof("purpose") = 'object'
    AND "purpose" ? 'en' AND jsonb_typeof("purpose"->'en') = 'string' AND length(btrim("purpose"->>'en')) > 0
    AND "purpose" ? 'fr' AND jsonb_typeof("purpose"->'fr') = 'string' AND length(btrim("purpose"->>'fr')) > 0
    AND jsonb_typeof("data_categories") = 'object'
    AND "data_categories" ? 'en' AND jsonb_typeof("data_categories"->'en') = 'array'
    AND jsonb_array_length(CASE WHEN jsonb_typeof("data_categories"->'en') = 'array' THEN "data_categories"->'en' ELSE '[]'::jsonb END) > 0
    AND "data_categories" ? 'fr' AND jsonb_typeof("data_categories"->'fr') = 'array'
    AND jsonb_array_length(CASE WHEN jsonb_typeof("data_categories"->'fr') = 'array' THEN "data_categories"->'fr' ELSE '[]'::jsonb END) > 0
    AND jsonb_typeof("data_subjects") = 'object'
    AND "data_subjects" ? 'en' AND jsonb_typeof("data_subjects"->'en') = 'array'
    AND jsonb_array_length(CASE WHEN jsonb_typeof("data_subjects"->'en') = 'array' THEN "data_subjects"->'en' ELSE '[]'::jsonb END) > 0
    AND "data_subjects" ? 'fr' AND jsonb_typeof("data_subjects"->'fr') = 'array'
    AND jsonb_array_length(CASE WHEN jsonb_typeof("data_subjects"->'fr') = 'array' THEN "data_subjects"->'fr' ELSE '[]'::jsonb END) > 0
    AND jsonb_typeof("public_notes") = 'object'
    AND "public_notes" ? 'en' AND jsonb_typeof("public_notes"->'en') = 'string'
    AND "public_notes" ? 'fr' AND jsonb_typeof("public_notes"->'fr') = 'string'
  ),
  CONSTRAINT "subprocessor_registry_status" CHECK (
    "transfer_status" IN ('within_canada', 'cross_border', 'not_applicable', 'under_review')
    AND "review_status" IN ('unreviewed', 'approved', 'rejected')
    AND "dpa_status" IN ('unreviewed', 'under_review', 'approved', 'not_applicable')
  ),
  CONSTRAINT "subprocessor_registry_dates" CHECK (
    "effective_to" IS NULL OR "effective_to" > "effective_from"
  ),
  CONSTRAINT "subprocessor_registry_review_evidence" CHECK (
    ("review_status" = 'approved' AND "reviewed_by" IS NOT NULL AND "reviewed_by" IS DISTINCT FROM "created_by" AND "reviewed_by" IS DISTINCT FROM "updated_by" AND "reviewed_at" IS NOT NULL AND "review_owner" IS NOT NULL AND length(btrim("verification_evidence")) > 0 AND "public_disclosure_approved")
    OR "review_status" <> 'approved'
  )
);
--> statement-breakpoint
CREATE INDEX "subprocessor_registry_updated_idx" ON subprocessor_registry ("updated_at");
--> statement-breakpoint
CREATE TABLE subprocessor_public_projections (
  "id" text PRIMARY KEY NOT NULL REFERENCES subprocessor_registry("id") ON DELETE CASCADE,
  "service_name" text NOT NULL,
  "purpose" jsonb NOT NULL,
  "data_categories" jsonb NOT NULL,
  "data_subjects" jsonb NOT NULL,
  "processing_region" text NOT NULL,
  "transfer_status" text NOT NULL,
  "effective_from" timestamp with time zone NOT NULL,
  "effective_to" timestamp with time zone,
  "public_notes" jsonb NOT NULL DEFAULT '{"en":"","fr":""}'::jsonb,
  "published_at" timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT "subprocessor_public_localized_fields" CHECK (
    jsonb_typeof("purpose") = 'object'
    AND "purpose" ? 'en' AND jsonb_typeof("purpose"->'en') = 'string' AND length(btrim("purpose"->>'en')) > 0
    AND "purpose" ? 'fr' AND jsonb_typeof("purpose"->'fr') = 'string' AND length(btrim("purpose"->>'fr')) > 0
    AND jsonb_typeof("data_categories") = 'object'
    AND "data_categories" ? 'en' AND jsonb_typeof("data_categories"->'en') = 'array'
    AND jsonb_array_length(CASE WHEN jsonb_typeof("data_categories"->'en') = 'array' THEN "data_categories"->'en' ELSE '[]'::jsonb END) > 0
    AND "data_categories" ? 'fr' AND jsonb_typeof("data_categories"->'fr') = 'array'
    AND jsonb_array_length(CASE WHEN jsonb_typeof("data_categories"->'fr') = 'array' THEN "data_categories"->'fr' ELSE '[]'::jsonb END) > 0
    AND jsonb_typeof("data_subjects") = 'object'
    AND "data_subjects" ? 'en' AND jsonb_typeof("data_subjects"->'en') = 'array'
    AND jsonb_array_length(CASE WHEN jsonb_typeof("data_subjects"->'en') = 'array' THEN "data_subjects"->'en' ELSE '[]'::jsonb END) > 0
    AND "data_subjects" ? 'fr' AND jsonb_typeof("data_subjects"->'fr') = 'array'
    AND jsonb_array_length(CASE WHEN jsonb_typeof("data_subjects"->'fr') = 'array' THEN "data_subjects"->'fr' ELSE '[]'::jsonb END) > 0
    AND jsonb_typeof("public_notes") = 'object'
    AND "public_notes" ? 'en' AND jsonb_typeof("public_notes"->'en') = 'string'
    AND "public_notes" ? 'fr' AND jsonb_typeof("public_notes"->'fr') = 'string'
  ),
  CONSTRAINT "subprocessor_public_transfer_status" CHECK (
    "transfer_status" IN ('within_canada', 'cross_border', 'not_applicable', 'under_review')
  ),
  CONSTRAINT "subprocessor_public_dates" CHECK (
    "effective_to" IS NULL OR "effective_to" > "effective_from"
  )
);
--> statement-breakpoint
CREATE INDEX "subprocessor_public_effective_idx" ON subprocessor_public_projections ("effective_from");
--> statement-breakpoint
CREATE TABLE subprocessor_audit_events (
  "id" text PRIMARY KEY NOT NULL,
  "actor_id" text NOT NULL,
  "provider_id" text,
  "action" text NOT NULL,
  "before_record" jsonb,
  "after_record" jsonb,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT "subprocessor_audit_action" CHECK (
    "action" IN ('created', 'updated', 'reviewed', 'published', 'withdrawn', 'viewed')
  )
);
--> statement-breakpoint
CREATE INDEX "subprocessor_audit_provider_idx" ON subprocessor_audit_events ("provider_id", "created_at");
--> statement-breakpoint
CREATE INDEX "subprocessor_audit_created_idx" ON subprocessor_audit_events ("created_at");
--> statement-breakpoint
ALTER TABLE subprocessor_registry ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE subprocessor_registry FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY subprocessor_registry_operator_all ON subprocessor_registry
  FOR ALL USING (public.customization_root(NULL, true))
  WITH CHECK (public.customization_root(NULL, true));
--> statement-breakpoint
ALTER TABLE subprocessor_public_projections ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE subprocessor_public_projections FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY subprocessor_public_operator_read ON subprocessor_public_projections
  FOR SELECT USING (public.customization_root(NULL, true));
--> statement-breakpoint
CREATE POLICY subprocessor_public_active_read ON subprocessor_public_projections
  FOR SELECT USING (
    "effective_from" <= now()
    AND ("effective_to" IS NULL OR "effective_to" > now())
  );
--> statement-breakpoint
CREATE POLICY subprocessor_public_publish_insert ON subprocessor_public_projections
  FOR INSERT WITH CHECK (
    public.customization_root(NULL, true)
    AND EXISTS (
      SELECT 1 FROM subprocessor_registry r
      WHERE r.id = subprocessor_public_projections."id" AND r.review_status = 'approved'
        AND r.public_disclosure_approved AND r.reviewed_by IS DISTINCT FROM r.created_by
        AND r.reviewed_by IS DISTINCT FROM r.updated_by
    )
  );
--> statement-breakpoint
CREATE POLICY subprocessor_public_publish_update ON subprocessor_public_projections
  FOR UPDATE USING (
    public.customization_root(NULL, true)
    AND EXISTS (
      SELECT 1 FROM subprocessor_registry r
      WHERE r.id = subprocessor_public_projections."id" AND r.review_status = 'approved'
        AND r.public_disclosure_approved AND r.reviewed_by IS DISTINCT FROM r.created_by
        AND r.reviewed_by IS DISTINCT FROM r.updated_by
    )
  ) WITH CHECK (
    public.customization_root(NULL, true)
    AND EXISTS (
      SELECT 1 FROM subprocessor_registry r
      WHERE r.id = subprocessor_public_projections."id" AND r.review_status = 'approved'
        AND r.public_disclosure_approved AND r.reviewed_by IS DISTINCT FROM r.created_by
        AND r.reviewed_by IS DISTINCT FROM r.updated_by
    )
  );
--> statement-breakpoint
CREATE POLICY subprocessor_public_withdraw_delete ON subprocessor_public_projections
  FOR DELETE USING (public.customization_root(NULL, true));
--> statement-breakpoint
CREATE FUNCTION public.subprocessor_public_projection_guard() RETURNS trigger
  LANGUAGE plpgsql SET search_path=pg_catalog,public AS $$
DECLARE source public.subprocessor_registry%ROWTYPE;
BEGIN
  SELECT * INTO source FROM public.subprocessor_registry WHERE id=NEW.id FOR SHARE;
  IF NOT FOUND OR source.review_status <> 'approved' OR NOT source.public_disclosure_approved
    OR source.reviewed_by IS NOT DISTINCT FROM source.created_by
    OR source.reviewed_by IS NOT DISTINCT FROM source.updated_by
    OR source.effective_from > now() OR (source.effective_to IS NOT NULL AND source.effective_to <= now()) THEN
    RAISE EXCEPTION 'provider disclosure is not currently approved';
  END IF;
  IF NEW.service_name IS DISTINCT FROM source.service_name
    OR NEW.purpose IS DISTINCT FROM source.purpose
    OR NEW.data_categories IS DISTINCT FROM source.data_categories
    OR NEW.data_subjects IS DISTINCT FROM source.data_subjects
    OR NEW.processing_region IS DISTINCT FROM source.processing_region
    OR NEW.transfer_status IS DISTINCT FROM source.transfer_status
    OR NEW.effective_from IS DISTINCT FROM source.effective_from
    OR NEW.effective_to IS DISTINCT FROM source.effective_to
    OR NEW.public_notes IS DISTINCT FROM source.public_notes THEN
    RAISE EXCEPTION 'public disclosure must match the reviewed provider record';
  END IF;
  RETURN NEW;
END $$;
--> statement-breakpoint
CREATE TRIGGER subprocessor_public_projection_guard
  BEFORE INSERT OR UPDATE ON subprocessor_public_projections
  FOR EACH ROW EXECUTE FUNCTION public.subprocessor_public_projection_guard();
--> statement-breakpoint
REVOKE ALL ON FUNCTION public.subprocessor_public_projection_guard() FROM PUBLIC;
--> statement-breakpoint
ALTER TABLE subprocessor_audit_events ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE subprocessor_audit_events FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY subprocessor_audit_operator_read ON subprocessor_audit_events
  FOR SELECT USING (public.customization_root(NULL, true));
--> statement-breakpoint
CREATE POLICY subprocessor_audit_operator_insert ON subprocessor_audit_events
  FOR INSERT WITH CHECK (public.customization_root(NULL, true));
--> statement-breakpoint
CREATE FUNCTION public.subprocessor_audit_immutable() RETURNS trigger
  LANGUAGE plpgsql SET search_path=pg_catalog,public AS $$
BEGIN
  RAISE EXCEPTION 'subprocessor audit history is append-only';
END $$;
--> statement-breakpoint
CREATE TRIGGER subprocessor_audit_immutable
  BEFORE UPDATE OR DELETE ON subprocessor_audit_events
  FOR EACH ROW EXECUTE FUNCTION public.subprocessor_audit_immutable();
--> statement-breakpoint
REVOKE UPDATE, DELETE ON subprocessor_audit_events FROM unionops_app;
--> statement-breakpoint
REVOKE ALL ON FUNCTION public.subprocessor_audit_immutable() FROM PUBLIC;
