-- Site Admin outreach inventory must read across unions.
-- 0088 required union_id = app.current_union_id even when platform_admin was set,
-- so /api/site-admin/outreach-lists always returned an empty inventory.
-- Match product-news: MFA-verified platform admins use customization_root(NULL, true).

ALTER TABLE "outreach_lists" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "outreach_subscribers" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "outreach_consent_events" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "outreach_suppressions" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "outreach_campaigns" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "outreach_deliveries" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "outreach_action_tokens" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
DROP POLICY IF EXISTS "outreach_lists_tenant" ON "outreach_lists";
--> statement-breakpoint
CREATE POLICY "outreach_lists_tenant" ON "outreach_lists"
  FOR ALL
  USING (
    public.customization_root(NULL, true)
    OR (
      union_id = current_setting('app.current_union_id', true)
      AND (
        current_setting('app.current_cross_local', true) = 'true'
        OR current_setting('app.current_platform_admin', true) = 'true'
      )
    )
  )
  WITH CHECK (
    public.customization_root(union_id)
    OR (
      union_id = current_setting('app.current_union_id', true)
      AND (
        current_setting('app.current_cross_local', true) = 'true'
        OR current_setting('app.current_platform_admin', true) = 'true'
      )
    )
  );
--> statement-breakpoint
DROP POLICY IF EXISTS "outreach_subscribers_tenant" ON "outreach_subscribers";
--> statement-breakpoint
CREATE POLICY "outreach_subscribers_tenant" ON "outreach_subscribers"
  FOR ALL
  USING (
    public.customization_root(NULL, true)
    OR (
      union_id = current_setting('app.current_union_id', true)
      AND (
        current_setting('app.current_cross_local', true) = 'true'
        OR current_setting('app.current_platform_admin', true) = 'true'
        OR current_setting('app.current_marketing_job', true) = 'true'
      )
    )
  )
  WITH CHECK (
    public.customization_root(union_id)
    OR (
      union_id = current_setting('app.current_union_id', true)
      AND (
        current_setting('app.current_cross_local', true) = 'true'
        OR current_setting('app.current_platform_admin', true) = 'true'
        OR current_setting('app.current_marketing_job', true) = 'true'
      )
    )
  );
--> statement-breakpoint
DROP POLICY IF EXISTS "outreach_consent_events_tenant" ON "outreach_consent_events";
--> statement-breakpoint
CREATE POLICY "outreach_consent_events_tenant" ON "outreach_consent_events"
  FOR ALL
  USING (
    public.customization_root(NULL, true)
    OR (
      union_id = current_setting('app.current_union_id', true)
      AND (
        current_setting('app.current_cross_local', true) = 'true'
        OR current_setting('app.current_platform_admin', true) = 'true'
        OR current_setting('app.current_marketing_job', true) = 'true'
      )
    )
  )
  WITH CHECK (
    public.customization_root(union_id)
    OR (
      union_id = current_setting('app.current_union_id', true)
      AND (
        current_setting('app.current_cross_local', true) = 'true'
        OR current_setting('app.current_platform_admin', true) = 'true'
        OR current_setting('app.current_marketing_job', true) = 'true'
      )
    )
  );
--> statement-breakpoint
DROP POLICY IF EXISTS "outreach_suppressions_tenant" ON "outreach_suppressions";
--> statement-breakpoint
CREATE POLICY "outreach_suppressions_tenant" ON "outreach_suppressions"
  FOR ALL
  USING (
    public.customization_root(NULL, true)
    OR (
      union_id = current_setting('app.current_union_id', true)
      AND (
        current_setting('app.current_cross_local', true) = 'true'
        OR current_setting('app.current_platform_admin', true) = 'true'
        OR current_setting('app.current_marketing_job', true) = 'true'
      )
    )
  )
  WITH CHECK (
    public.customization_root(union_id)
    OR (
      union_id = current_setting('app.current_union_id', true)
      AND (
        current_setting('app.current_cross_local', true) = 'true'
        OR current_setting('app.current_platform_admin', true) = 'true'
        OR current_setting('app.current_marketing_job', true) = 'true'
      )
    )
  );
--> statement-breakpoint
DROP POLICY IF EXISTS "outreach_campaigns_tenant" ON "outreach_campaigns";
--> statement-breakpoint
CREATE POLICY "outreach_campaigns_tenant" ON "outreach_campaigns"
  FOR ALL
  USING (
    public.customization_root(NULL, true)
    OR (
      union_id = current_setting('app.current_union_id', true)
      AND (
        current_setting('app.current_cross_local', true) = 'true'
        OR current_setting('app.current_platform_admin', true) = 'true'
      )
    )
  )
  WITH CHECK (
    public.customization_root(union_id)
    OR (
      union_id = current_setting('app.current_union_id', true)
      AND (
        current_setting('app.current_cross_local', true) = 'true'
        OR current_setting('app.current_platform_admin', true) = 'true'
      )
    )
  );
--> statement-breakpoint
DROP POLICY IF EXISTS "outreach_deliveries_tenant" ON "outreach_deliveries";
--> statement-breakpoint
CREATE POLICY "outreach_deliveries_tenant" ON "outreach_deliveries"
  FOR ALL
  USING (
    public.customization_root(NULL, true)
    OR (
      union_id = current_setting('app.current_union_id', true)
      AND (
        current_setting('app.current_cross_local', true) = 'true'
        OR current_setting('app.current_platform_admin', true) = 'true'
        OR current_setting('app.current_marketing_job', true) = 'true'
      )
    )
  )
  WITH CHECK (
    public.customization_root(union_id)
    OR (
      union_id = current_setting('app.current_union_id', true)
      AND (
        current_setting('app.current_cross_local', true) = 'true'
        OR current_setting('app.current_platform_admin', true) = 'true'
        OR current_setting('app.current_marketing_job', true) = 'true'
      )
    )
  );
--> statement-breakpoint
DROP POLICY IF EXISTS "outreach_action_tokens_tenant" ON "outreach_action_tokens";
--> statement-breakpoint
CREATE POLICY "outreach_action_tokens_tenant" ON "outreach_action_tokens"
  FOR ALL
  USING (
    public.customization_root(NULL, true)
    OR (
      union_id = current_setting('app.current_union_id', true)
      AND (
        current_setting('app.current_cross_local', true) = 'true'
        OR current_setting('app.current_platform_admin', true) = 'true'
        OR current_setting('app.current_marketing_job', true) = 'true'
      )
    )
  )
  WITH CHECK (
    public.customization_root(union_id)
    OR (
      union_id = current_setting('app.current_union_id', true)
      AND (
        current_setting('app.current_cross_local', true) = 'true'
        OR current_setting('app.current_platform_admin', true) = 'true'
        OR current_setting('app.current_marketing_job', true) = 'true'
      )
    )
  );
