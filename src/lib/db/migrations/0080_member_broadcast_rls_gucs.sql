-- Correct member_broadcast RLS session GUCs (app.current_*).
-- Hosts that already applied 0079 with the short names get fixed here.

DROP POLICY IF EXISTS "member_broadcast_consents_tenant" ON "member_broadcast_consents";
CREATE POLICY "member_broadcast_consents_tenant" ON "member_broadcast_consents"
  FOR ALL
  USING (
    union_id = current_setting('app.current_union_id', true)
    AND (
      local_id = current_setting('app.current_local_id', true)
      OR current_setting('app.current_cross_local', true) = 'true'
    )
  )
  WITH CHECK (
    union_id = current_setting('app.current_union_id', true)
    AND (
      local_id = current_setting('app.current_local_id', true)
      OR current_setting('app.current_cross_local', true) = 'true'
    )
  );

DROP POLICY IF EXISTS "member_broadcast_campaigns_tenant" ON "member_broadcast_campaigns";
CREATE POLICY "member_broadcast_campaigns_tenant" ON "member_broadcast_campaigns"
  FOR ALL
  USING (
    union_id = current_setting('app.current_union_id', true)
    AND (
      local_id = current_setting('app.current_local_id', true)
      OR current_setting('app.current_cross_local', true) = 'true'
    )
  )
  WITH CHECK (
    union_id = current_setting('app.current_union_id', true)
    AND (
      local_id = current_setting('app.current_local_id', true)
      OR current_setting('app.current_cross_local', true) = 'true'
    )
  );
