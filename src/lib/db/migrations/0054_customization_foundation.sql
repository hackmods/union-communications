CREATE TABLE customization_assets (
  "id" text PRIMARY KEY NOT NULL,
  "scope_id" text NOT NULL,
  "union_id" text,
  "storage_key" text NOT NULL,
  "mime" text NOT NULL,
  "bytes" integer NOT NULL,
  "hash" text NOT NULL,
  "scan_status" text NOT NULL,
  "rights_note" text NOT NULL,
  "alt_text" jsonb NOT NULL,
  "created_by" text NOT NULL,
  "created_at" timestamp with time zone NOT NULL DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE customization_audit (
  "id" text PRIMARY KEY NOT NULL,
  "scope_id" text NOT NULL,
  "union_id" text,
  "actor_id" text NOT NULL,
  "action" text NOT NULL,
  "resource_id" text,
  "metadata" jsonb NOT NULL,
  "reason" text NOT NULL,
  "created_at" timestamp with time zone NOT NULL DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE customization_delivery_fragments (
  "id" text PRIMARY KEY NOT NULL,
  "release_id" text NOT NULL,
  "resource_id" text NOT NULL,
  "scope_id" text NOT NULL,
  "union_id" text,
  "locale" text NOT NULL,
  "fragment_id" text NOT NULL,
  "kind" text NOT NULL,
  "ordinal" integer NOT NULL,
  "minimum_audience" text NOT NULL,
  "payload" jsonb NOT NULL,
  "control_resource_ids" jsonb NOT NULL DEFAULT '[]'::jsonb
);
--> statement-breakpoint
CREATE UNIQUE INDEX customization_fragment_identity ON customization_delivery_fragments ("release_id", "locale", "fragment_id");
--> statement-breakpoint
CREATE INDEX customization_fragments_scope_locale ON customization_delivery_fragments ("scope_id", "locale");
--> statement-breakpoint
CREATE TABLE customization_drafts (
  "resource_id" text PRIMARY KEY NOT NULL,
  "scope_id" text NOT NULL,
  "union_id" text,
  "payload" jsonb NOT NULL,
  "base_release_id" text,
  "ancestor_heads" jsonb NOT NULL DEFAULT '{}'::jsonb,
  "reviews" jsonb NOT NULL DEFAULT '{}'::jsonb,
  "schema_version" integer NOT NULL,
  "lock_version" integer NOT NULL,
  "updated_by" text NOT NULL,
  "updated_at" timestamp with time zone NOT NULL DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE customization_heads (
  "resource_id" text PRIMARY KEY NOT NULL,
  "scope_id" text NOT NULL,
  "union_id" text,
  "active_release_id" text,
  "generation" integer NOT NULL,
  "updated_at" timestamp with time zone NOT NULL DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE customization_maintenance_grants (
  "id" text PRIMARY KEY NOT NULL,
  "scope_id" text NOT NULL,
  "union_id" text,
  "user_id" text NOT NULL,
  "capabilities" jsonb NOT NULL,
  "resource_kinds" jsonb NOT NULL,
  "starts_at" timestamp with time zone NOT NULL,
  "ends_at" timestamp with time zone NOT NULL,
  "revoked_at" timestamp with time zone,
  "revoked_by" text,
  "granted_by" text NOT NULL,
  "reason" text NOT NULL,
  "created_at" timestamp with time zone NOT NULL DEFAULT now()
);
--> statement-breakpoint
CREATE INDEX customization_grant_user_union ON customization_maintenance_grants ("user_id", "union_id", "ends_at");
--> statement-breakpoint
CREATE TABLE customization_operations (
  "id" text PRIMARY KEY NOT NULL,
  "scope_id" text NOT NULL,
  "union_id" text,
  "actor_id" text NOT NULL,
  "operation_key" text NOT NULL,
  "request_hash" text NOT NULL,
  "result" jsonb NOT NULL,
  "created_at" timestamp with time zone NOT NULL DEFAULT now()
);
--> statement-breakpoint
CREATE UNIQUE INDEX customization_operation_idempotency ON customization_operations ("actor_id", "scope_id", "operation_key");
--> statement-breakpoint
CREATE TABLE customization_policy (
  "resource_id" text PRIMARY KEY NOT NULL,
  "scope_id" text NOT NULL,
  "union_id" text,
  "audience" text NOT NULL,
  "enabled" boolean NOT NULL,
  "withdrawn_at" timestamp with time zone,
  "public_listing" boolean NOT NULL DEFAULT false,
  "public_teaser" jsonb,
  "policy_version" integer NOT NULL,
  "editable_fields" jsonb NOT NULL,
  "entitlement_key" text,
  "updated_by" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE customization_preset_bindings (
  "id" text PRIMARY KEY NOT NULL,
  "scope_id" text NOT NULL,
  "union_id" text,
  "preset_id" text NOT NULL,
  "sector_id" text NOT NULL DEFAULT '',
  "published_at" timestamp with time zone,
  "updated_by" text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX customization_preset_sector ON customization_preset_bindings ("preset_id", "sector_id");
--> statement-breakpoint
CREATE TABLE customization_public_projections (
  "id" text PRIMARY KEY NOT NULL,
  "resource_id" text NOT NULL,
  "release_id" text NOT NULL,
  "scope_id" text NOT NULL,
  "union_id" text,
  "locale" text NOT NULL,
  "public_dto" jsonb NOT NULL,
  "policy_version" integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX customization_projection_identity ON customization_public_projections ("release_id", "locale");
--> statement-breakpoint
CREATE TABLE customization_releases (
  "id" text PRIMARY KEY NOT NULL,
  "resource_id" text NOT NULL,
  "scope_id" text NOT NULL,
  "union_id" text,
  "revision_id" text NOT NULL,
  "dependency_manifest" jsonb NOT NULL,
  "compiled_default_version" text NOT NULL,
  "resolved" jsonb,
  "published_by" text NOT NULL,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  "replaces_release_id" text
);
--> statement-breakpoint
CREATE TABLE customization_resources (
  "id" text PRIMARY KEY NOT NULL,
  "scope_id" text NOT NULL,
  "union_id" text,
  "key" text NOT NULL,
  "kind" text NOT NULL,
  "slug" text,
  "created_by" text NOT NULL,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  "archived_at" timestamp with time zone
);
--> statement-breakpoint
CREATE UNIQUE INDEX customization_resource_scope_key ON customization_resources ("scope_id", "key");
--> statement-breakpoint
CREATE UNIQUE INDEX customization_resource_scope_slug ON customization_resources ("scope_id", "slug");
--> statement-breakpoint
CREATE TABLE customization_revisions (
  "id" text PRIMARY KEY NOT NULL,
  "resource_id" text NOT NULL,
  "scope_id" text NOT NULL,
  "union_id" text,
  "revision_no" integer NOT NULL,
  "schema_version" integer NOT NULL,
  "payload" jsonb NOT NULL,
  "content_hash" text NOT NULL,
  "created_by" text NOT NULL,
  "change_reason" text NOT NULL,
  "created_at" timestamp with time zone NOT NULL DEFAULT now()
);
--> statement-breakpoint
CREATE UNIQUE INDEX customization_revision_number ON customization_revisions ("resource_id", "revision_no");
--> statement-breakpoint
CREATE TABLE customization_scopes (
  "id" text PRIMARY KEY NOT NULL,
  "kind" text NOT NULL,
  "union_id" text,
  "division_id" text,
  "local_id" text,
  "bargaining_unit_id" text,
  "parent_scope_id" text,
  "archived_at" timestamp with time zone,
  "created_at" timestamp with time zone NOT NULL DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE customization_section_controls (
  "id" text PRIMARY KEY NOT NULL,
  "resource_id" text NOT NULL,
  "scope_id" text NOT NULL,
  "union_id" text,
  "block_id" text NOT NULL,
  "minimum_audience" text NOT NULL,
  "withdrawn_at" timestamp with time zone,
  "policy_version" integer NOT NULL,
  "updated_by" text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX customization_section_resource_block ON customization_section_controls ("resource_id", "block_id");

--> statement-breakpoint
ALTER TABLE customization_scopes ADD CONSTRAINT customization_scope_union_fk FOREIGN KEY (union_id) REFERENCES public.unions(id) ON DELETE RESTRICT,
 ADD CONSTRAINT customization_scope_parent_fk FOREIGN KEY (parent_scope_id) REFERENCES customization_scopes(id) ON DELETE RESTRICT,
 ADD CONSTRAINT customization_scope_shape CHECK (
 (kind='system' AND union_id IS NULL AND parent_scope_id IS NULL AND division_id IS NULL AND local_id IS NULL AND bargaining_unit_id IS NULL) OR
 (kind='union' AND union_id IS NOT NULL AND parent_scope_id IS NOT NULL AND division_id IS NULL AND local_id IS NULL AND bargaining_unit_id IS NULL) OR
 (kind='division' AND union_id IS NOT NULL AND parent_scope_id IS NOT NULL AND division_id IS NOT NULL AND local_id IS NULL AND bargaining_unit_id IS NULL) OR
 (kind='local' AND union_id IS NOT NULL AND parent_scope_id IS NOT NULL AND local_id IS NOT NULL AND bargaining_unit_id IS NULL) OR
 (kind='unit' AND union_id IS NOT NULL AND parent_scope_id IS NOT NULL AND local_id IS NOT NULL AND bargaining_unit_id IS NOT NULL));
--> statement-breakpoint
CREATE UNIQUE INDEX customization_scope_system ON customization_scopes(kind) WHERE kind='system';
--> statement-breakpoint
CREATE UNIQUE INDEX customization_scope_identity ON customization_scopes(kind, coalesce(union_id,''), coalesce(bargaining_unit_id,local_id,division_id,'')) WHERE kind<>'system';
--> statement-breakpoint
CREATE FUNCTION public.customization_scope_guard() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $$
DECLARE p public.customization_scopes%ROWTYPE; l public.locals%ROWTYPE;
BEGIN
 IF TG_OP='UPDATE' AND (to_jsonb(NEW)-'archived_at') IS DISTINCT FROM (to_jsonb(OLD)-'archived_at') THEN RAISE EXCEPTION 'scope identity is immutable'; END IF;
 IF NEW.kind='system' THEN RETURN NEW; END IF;
 SELECT * INTO p FROM public.customization_scopes WHERE id=NEW.parent_scope_id;
 IF NOT FOUND OR p.archived_at IS NOT NULL OR p.id=NEW.id THEN RAISE EXCEPTION 'invalid parent scope'; END IF;
 IF p.kind<>'system' AND p.union_id IS DISTINCT FROM NEW.union_id THEN RAISE EXCEPTION 'cross-union parent'; END IF;
 IF NOT EXISTS(SELECT 1 FROM public.unions WHERE id=NEW.union_id AND archived_at IS NULL) THEN RAISE EXCEPTION 'inactive union'; END IF;
 IF NEW.kind='union' AND p.kind<>'system' THEN RAISE EXCEPTION 'union parent required'; END IF;
 IF NEW.kind='division' AND (p.kind<>'union' OR NOT EXISTS(SELECT 1 FROM public.divisions WHERE id=NEW.division_id AND union_id=NEW.union_id AND archived_at IS NULL)) THEN RAISE EXCEPTION 'invalid division'; END IF;
 IF NEW.kind IN ('local','unit') THEN
  SELECT * INTO l FROM public.locals WHERE id=NEW.local_id AND union_id=NEW.union_id AND archived_at IS NULL;
  IF NOT FOUND OR l.division_id IS DISTINCT FROM NEW.division_id THEN RAISE EXCEPTION 'invalid local'; END IF;
 END IF;
 IF NEW.kind='local' AND NOT ((p.kind='union' AND NEW.division_id IS NULL) OR (p.kind='division' AND p.division_id=NEW.division_id)) THEN RAISE EXCEPTION 'invalid local parent'; END IF;
 IF NEW.kind='unit' AND (p.kind<>'local' OR p.local_id<>NEW.local_id OR NOT EXISTS(SELECT 1 FROM public.bargaining_units WHERE id=NEW.bargaining_unit_id AND local_id=NEW.local_id AND union_id=NEW.union_id)) THEN RAISE EXCEPTION 'invalid unit'; END IF;
 RETURN NEW;
END $$;
--> statement-breakpoint
CREATE TRIGGER customization_scope_guard BEFORE INSERT OR UPDATE ON customization_scopes FOR EACH ROW EXECUTE FUNCTION public.customization_scope_guard();
--> statement-breakpoint
CREATE FUNCTION public.customization_row_guard() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $$
DECLARE s public.customization_scopes%ROWTYPE; r public.customization_resources%ROWTYPE; ref text; j jsonb:=to_jsonb(NEW); oldj jsonb;
BEGIN
 SELECT * INTO s FROM public.customization_scopes WHERE id=NEW.scope_id;
 IF NOT FOUND OR s.union_id IS DISTINCT FROM NEW.union_id THEN RAISE EXCEPTION 'scope ownership mismatch'; END IF;
 IF TG_OP='UPDATE' THEN
  oldj:=to_jsonb(OLD);
  IF NEW.scope_id IS DISTINCT FROM OLD.scope_id OR NEW.union_id IS DISTINCT FROM OLD.union_id THEN RAISE EXCEPTION 'ownership is immutable'; END IF;
  IF TG_TABLE_NAME='customization_resources' AND (j->'key' IS DISTINCT FROM oldj->'key' OR j->'kind' IS DISTINCT FROM oldj->'kind' OR j->'id' IS DISTINCT FROM oldj->'id') THEN RAISE EXCEPTION 'resource identity is immutable'; END IF;
 END IF;
 IF j->>'resource_id' IS NOT NULL THEN
  SELECT * INTO r FROM public.customization_resources WHERE id=j->>'resource_id';
  IF NOT FOUND OR r.scope_id<>NEW.scope_id OR r.union_id IS DISTINCT FROM NEW.union_id THEN RAISE EXCEPTION 'resource ownership mismatch'; END IF;
 END IF;
 IF j->>'revision_id' IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.customization_revisions WHERE id=j->>'revision_id' AND resource_id=j->>'resource_id' AND scope_id=NEW.scope_id) THEN RAISE EXCEPTION 'revision ownership mismatch'; END IF;
 FOREACH ref IN ARRAY ARRAY[j->>'release_id',j->>'active_release_id',j->>'base_release_id',j->>'replaces_release_id'] LOOP
  IF ref IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.customization_releases WHERE id=ref AND resource_id=j->>'resource_id' AND scope_id=NEW.scope_id) THEN RAISE EXCEPTION 'release ownership mismatch'; END IF;
 END LOOP;
 IF j ? 'control_resource_ids' THEN
  FOR ref IN SELECT jsonb_array_elements_text(j->'control_resource_ids') LOOP
   IF NOT EXISTS(SELECT 1 FROM public.customization_resources WHERE id=ref AND (union_id IS NULL OR union_id=NEW.union_id)) THEN RAISE EXCEPTION 'control ownership mismatch'; END IF;
  END LOOP;
 END IF;
 RETURN NEW;
END $$;
--> statement-breakpoint
CREATE FUNCTION public.customization_immutable() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN RAISE EXCEPTION 'published customization history is immutable'; END $$;
--> statement-breakpoint
ALTER TABLE customization_resources ADD CONSTRAINT customization_resource_key_kind CHECK (key ~ ('^'||kind||':[a-zA-Z0-9][a-zA-Z0-9_-]{0,127}$') AND kind IN ('guide','brand','source','tool','workflow')),
 ADD CONSTRAINT customization_resource_slug CHECK (slug IS NULL OR slug ~ '^[a-z0-9][a-z0-9-]{0,127}$');
--> statement-breakpoint
ALTER TABLE customization_drafts ADD CONSTRAINT customization_draft_version CHECK (schema_version=1 AND lock_version>0 AND octet_length(payload::text)<=262144);
--> statement-breakpoint
ALTER TABLE customization_revisions ADD CONSTRAINT customization_revision_version CHECK (schema_version=1 AND revision_no>0 AND octet_length(payload::text)<=262144);
--> statement-breakpoint
ALTER TABLE customization_heads ADD CONSTRAINT customization_head_generation CHECK (generation>0);
--> statement-breakpoint
ALTER TABLE customization_policy ADD CONSTRAINT customization_policy_audience CHECK (audience IN ('public','verified_member','local_officer') AND policy_version>0);
--> statement-breakpoint
ALTER TABLE customization_section_controls ADD CONSTRAINT customization_section_audience CHECK (minimum_audience IN ('public','verified_member','local_officer') AND policy_version>0);
--> statement-breakpoint
ALTER TABLE customization_delivery_fragments ADD CONSTRAINT customization_fragment_shape CHECK (locale IN ('en','fr') AND minimum_audience IN ('public','verified_member','local_officer') AND ordinal>=0 AND jsonb_typeof(control_resource_ids)='array');
--> statement-breakpoint
-- Discovery metadata only; bodies are delivered as individually authorized fragments.
ALTER TABLE customization_public_projections ADD CONSTRAINT customization_projection_shape CHECK (locale IN ('en','fr') AND jsonb_typeof(public_dto)='object' AND public_dto-ARRAY['key','title','summary','canonicalPath']::text[]='{}'::jsonb);
--> statement-breakpoint
ALTER TABLE customization_maintenance_grants ADD CONSTRAINT customization_grant_shape CHECK (union_id IS NOT NULL AND ends_at>starts_at AND jsonb_typeof(capabilities)='array' AND jsonb_array_length(capabilities)>0 AND jsonb_typeof(resource_kinds)='array' AND jsonb_array_length(resource_kinds)>0);
--> statement-breakpoint
ALTER TABLE customization_assets ADD CONSTRAINT customization_asset_shape CHECK (bytes>0 AND bytes<=5242880 AND mime IN ('image/png','image/jpeg','image/webp') AND scan_status IN ('pending','clean','rejected'));
--> statement-breakpoint
CREATE FUNCTION public.customization_root(target_union text, system_read boolean DEFAULT false) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=pg_catalog,public AS $$
 SELECT (target_union IS NOT DISTINCT FROM nullif(current_setting('app.current_union_id',true),'') OR (system_read AND target_union IS NULL))
 AND current_setting('app.current_mfa_verified',true)='true'
 AND EXISTS(SELECT 1 FROM public.users u WHERE u.id=nullif(current_setting('app.current_user_id',true),'') AND u.archived_at IS NULL AND u.locked_at IS NULL AND u.roles ? 'platform_admin');
$$;
--> statement-breakpoint
CREATE FUNCTION public.customization_scope_live(target_scope text) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=pg_catalog,public AS $$
 WITH RECURSIVE chain AS (
  SELECT s.*,1 depth FROM public.customization_scopes s WHERE s.id=target_scope
  UNION ALL SELECT p.*,c.depth+1 FROM public.customization_scopes p JOIN chain c ON p.id=c.parent_scope_id WHERE c.depth<5
 )
 SELECT EXISTS(SELECT 1 FROM chain WHERE kind='system') AND NOT EXISTS(
  SELECT 1 FROM chain s WHERE s.archived_at IS NOT NULL
   OR (s.union_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.unions WHERE id=s.union_id AND archived_at IS NULL))
   OR (s.division_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.divisions WHERE id=s.division_id AND union_id=s.union_id AND archived_at IS NULL))
   OR (s.local_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.locals WHERE id=s.local_id AND union_id=s.union_id AND division_id IS NOT DISTINCT FROM s.division_id AND archived_at IS NULL))
   OR (s.bargaining_unit_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.bargaining_units WHERE id=s.bargaining_unit_id AND local_id=s.local_id AND union_id=s.union_id))
 );
$$;
--> statement-breakpoint
CREATE FUNCTION public.customization_audience(target_scope text, required_audience text) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=pg_catalog,public AS $$
 SELECT public.customization_scope_live(target_scope) AND EXISTS(
  SELECT 1 FROM public.customization_scopes s WHERE s.id=target_scope AND
  (s.union_id IS NULL OR s.union_id=nullif(current_setting('app.current_union_id',true),'')) AND
  (required_audience='public' OR (required_audience IN ('verified_member','local_officer') AND EXISTS(
   SELECT 1 FROM public.users u JOIN public.local_memberships m ON m.user_id=u.id JOIN public.locals l ON l.id=m.local_id AND l.union_id=m.union_id
   WHERE u.id=nullif(current_setting('app.current_user_id',true),'') AND u.archived_at IS NULL AND u.locked_at IS NULL
    AND m.union_id=s.union_id AND m.status='active' AND m.started_at<=now() AND m.ended_at IS NULL AND l.archived_at IS NULL
    AND (l.division_id IS NULL OR EXISTS(SELECT 1 FROM public.divisions d WHERE d.id=l.division_id AND d.union_id=l.union_id AND d.archived_at IS NULL))
    AND (s.division_id IS NULL OR s.division_id=l.division_id)
    AND (s.local_id IS NULL OR (s.local_id=m.local_id AND s.local_id=nullif(current_setting('app.current_local_id',true),'')))
    AND (s.bargaining_unit_id IS NULL OR s.bargaining_unit_id=m.bargaining_unit_id)
    AND (required_audience<>'local_officer' OR EXISTS(SELECT 1 FROM public.officer_assignments a WHERE a.user_id=u.id AND a.union_id=m.union_id AND a.local_id=m.local_id AND a.starts_at<=now() AND (a.ends_at IS NULL OR a.ends_at>now()) AND a.revoked_at IS NULL))
  )))
 );
$$;
--> statement-breakpoint
CREATE FUNCTION public.customization_current_access(target_resource text, target_release text, required_audience text, target_block text DEFAULT NULL) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=pg_catalog,public AS $$
 WITH RECURSIVE chain AS (
  SELECT s.*,r.key,r.scope_id target_scope,1 depth FROM public.customization_resources r JOIN public.customization_scopes s ON s.id=r.scope_id WHERE r.id=target_resource AND r.archived_at IS NULL
  UNION ALL SELECT p.*,c.key,c.target_scope,c.depth+1 FROM public.customization_scopes p JOIN chain c ON p.id=c.parent_scope_id WHERE c.depth<5
 ), controls AS (
  SELECT r.id,p.audience,p.enabled,p.withdrawn_at,p.entitlement_key FROM chain c JOIN public.customization_resources r ON r.scope_id=c.id AND r.key=c.key JOIN public.customization_policy p ON p.resource_id=r.id JOIN public.customization_heads h ON h.resource_id=r.id WHERE h.active_release_id IS NOT NULL OR p.withdrawn_at IS NOT NULL
 )
 SELECT EXISTS(SELECT 1 FROM public.customization_heads h WHERE h.resource_id=target_resource AND h.active_release_id=target_release)
 AND EXISTS(SELECT 1 FROM controls WHERE id=target_resource)
 AND EXISTS(SELECT 1 FROM chain WHERE depth=1 AND public.customization_audience(target_scope,required_audience))
 AND NOT EXISTS(SELECT 1 FROM controls p WHERE NOT p.enabled OR p.withdrawn_at IS NOT NULL OR p.entitlement_key IS NOT NULL OR NOT public.customization_audience((SELECT target_scope FROM chain WHERE depth=1),p.audience))
 AND NOT EXISTS(SELECT 1 FROM controls p JOIN public.customization_section_controls b ON b.resource_id=p.id WHERE b.block_id=target_block AND (b.withdrawn_at IS NOT NULL OR NOT public.customization_audience((SELECT target_scope FROM chain WHERE depth=1),b.minimum_audience)));
$$;
--> statement-breakpoint
CREATE FUNCTION public.customization_fragment_access(target_resource text,target_release text,required_audience text,target_block text,control_ids jsonb) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=pg_catalog,public AS $$
 SELECT public.customization_current_access(target_resource,target_release,required_audience,target_block)
 AND NOT EXISTS(SELECT 1 FROM jsonb_array_elements_text(control_ids) control_id
  LEFT JOIN public.customization_heads h ON h.resource_id=control_id
  WHERE h.active_release_id IS NULL OR NOT public.customization_current_access(control_id,h.active_release_id,'public'));
$$;

--> statement-breakpoint
ALTER TABLE customization_assets ADD CONSTRAINT customization_assets_scope_fk FOREIGN KEY (scope_id) REFERENCES public.customization_scopes(id) ON DELETE RESTRICT;
--> statement-breakpoint
CREATE TRIGGER customization_assets_guard BEFORE INSERT OR UPDATE ON customization_assets FOR EACH ROW EXECUTE FUNCTION public.customization_row_guard();

--> statement-breakpoint
ALTER TABLE customization_audit ADD CONSTRAINT customization_audit_scope_fk FOREIGN KEY (scope_id) REFERENCES public.customization_scopes(id) ON DELETE RESTRICT;
--> statement-breakpoint
CREATE TRIGGER customization_audit_guard BEFORE INSERT OR UPDATE ON customization_audit FOR EACH ROW EXECUTE FUNCTION public.customization_row_guard();

--> statement-breakpoint
ALTER TABLE customization_delivery_fragments ADD CONSTRAINT customization_delivery_fragments_scope_fk FOREIGN KEY (scope_id) REFERENCES public.customization_scopes(id) ON DELETE RESTRICT;
--> statement-breakpoint
CREATE TRIGGER customization_delivery_fragments_guard BEFORE INSERT OR UPDATE ON customization_delivery_fragments FOR EACH ROW EXECUTE FUNCTION public.customization_row_guard();

--> statement-breakpoint
ALTER TABLE customization_drafts ADD CONSTRAINT customization_drafts_scope_fk FOREIGN KEY (scope_id) REFERENCES public.customization_scopes(id) ON DELETE RESTRICT;
--> statement-breakpoint
CREATE TRIGGER customization_drafts_guard BEFORE INSERT OR UPDATE ON customization_drafts FOR EACH ROW EXECUTE FUNCTION public.customization_row_guard();

--> statement-breakpoint
ALTER TABLE customization_heads ADD CONSTRAINT customization_heads_scope_fk FOREIGN KEY (scope_id) REFERENCES public.customization_scopes(id) ON DELETE RESTRICT;
--> statement-breakpoint
CREATE TRIGGER customization_heads_guard BEFORE INSERT OR UPDATE ON customization_heads FOR EACH ROW EXECUTE FUNCTION public.customization_row_guard();

--> statement-breakpoint
ALTER TABLE customization_maintenance_grants ADD CONSTRAINT customization_maintenance_grants_scope_fk FOREIGN KEY (scope_id) REFERENCES public.customization_scopes(id) ON DELETE RESTRICT;
--> statement-breakpoint
CREATE TRIGGER customization_maintenance_grants_guard BEFORE INSERT OR UPDATE ON customization_maintenance_grants FOR EACH ROW EXECUTE FUNCTION public.customization_row_guard();

--> statement-breakpoint
ALTER TABLE customization_operations ADD CONSTRAINT customization_operations_scope_fk FOREIGN KEY (scope_id) REFERENCES public.customization_scopes(id) ON DELETE RESTRICT;
--> statement-breakpoint
CREATE TRIGGER customization_operations_guard BEFORE INSERT OR UPDATE ON customization_operations FOR EACH ROW EXECUTE FUNCTION public.customization_row_guard();

--> statement-breakpoint
ALTER TABLE customization_policy ADD CONSTRAINT customization_policy_scope_fk FOREIGN KEY (scope_id) REFERENCES public.customization_scopes(id) ON DELETE RESTRICT;
--> statement-breakpoint
CREATE TRIGGER customization_policy_guard BEFORE INSERT OR UPDATE ON customization_policy FOR EACH ROW EXECUTE FUNCTION public.customization_row_guard();

--> statement-breakpoint
ALTER TABLE customization_preset_bindings ADD CONSTRAINT customization_preset_bindings_scope_fk FOREIGN KEY (scope_id) REFERENCES public.customization_scopes(id) ON DELETE RESTRICT;
--> statement-breakpoint
CREATE TRIGGER customization_preset_bindings_guard BEFORE INSERT OR UPDATE ON customization_preset_bindings FOR EACH ROW EXECUTE FUNCTION public.customization_row_guard();

--> statement-breakpoint
ALTER TABLE customization_public_projections ADD CONSTRAINT customization_public_projections_scope_fk FOREIGN KEY (scope_id) REFERENCES public.customization_scopes(id) ON DELETE RESTRICT;
--> statement-breakpoint
CREATE TRIGGER customization_public_projections_guard BEFORE INSERT OR UPDATE ON customization_public_projections FOR EACH ROW EXECUTE FUNCTION public.customization_row_guard();

--> statement-breakpoint
ALTER TABLE customization_releases ADD CONSTRAINT customization_releases_scope_fk FOREIGN KEY (scope_id) REFERENCES public.customization_scopes(id) ON DELETE RESTRICT;
--> statement-breakpoint
CREATE TRIGGER customization_releases_guard BEFORE INSERT OR UPDATE ON customization_releases FOR EACH ROW EXECUTE FUNCTION public.customization_row_guard();

--> statement-breakpoint
ALTER TABLE customization_resources ADD CONSTRAINT customization_resources_scope_fk FOREIGN KEY (scope_id) REFERENCES public.customization_scopes(id) ON DELETE RESTRICT;
--> statement-breakpoint
CREATE TRIGGER customization_resources_guard BEFORE INSERT OR UPDATE ON customization_resources FOR EACH ROW EXECUTE FUNCTION public.customization_row_guard();

--> statement-breakpoint
ALTER TABLE customization_revisions ADD CONSTRAINT customization_revisions_scope_fk FOREIGN KEY (scope_id) REFERENCES public.customization_scopes(id) ON DELETE RESTRICT;
--> statement-breakpoint
CREATE TRIGGER customization_revisions_guard BEFORE INSERT OR UPDATE ON customization_revisions FOR EACH ROW EXECUTE FUNCTION public.customization_row_guard();

--> statement-breakpoint
ALTER TABLE customization_section_controls ADD CONSTRAINT customization_section_controls_scope_fk FOREIGN KEY (scope_id) REFERENCES public.customization_scopes(id) ON DELETE RESTRICT;
--> statement-breakpoint
CREATE TRIGGER customization_section_controls_guard BEFORE INSERT OR UPDATE ON customization_section_controls FOR EACH ROW EXECUTE FUNCTION public.customization_row_guard();

--> statement-breakpoint
ALTER TABLE customization_drafts ADD CONSTRAINT customization_drafts_resource_fk FOREIGN KEY (resource_id) REFERENCES public.customization_resources(id) ON DELETE RESTRICT;

--> statement-breakpoint
ALTER TABLE customization_heads ADD CONSTRAINT customization_heads_resource_fk FOREIGN KEY (resource_id) REFERENCES public.customization_resources(id) ON DELETE RESTRICT;

--> statement-breakpoint
ALTER TABLE customization_policy ADD CONSTRAINT customization_policy_resource_fk FOREIGN KEY (resource_id) REFERENCES public.customization_resources(id) ON DELETE RESTRICT;

--> statement-breakpoint
ALTER TABLE customization_section_controls ADD CONSTRAINT customization_section_controls_resource_fk FOREIGN KEY (resource_id) REFERENCES public.customization_resources(id) ON DELETE RESTRICT;

--> statement-breakpoint
ALTER TABLE customization_delivery_fragments ADD CONSTRAINT customization_delivery_fragments_resource_fk FOREIGN KEY (resource_id) REFERENCES public.customization_resources(id) ON DELETE RESTRICT;

--> statement-breakpoint
ALTER TABLE customization_public_projections ADD CONSTRAINT customization_public_projections_resource_fk FOREIGN KEY (resource_id) REFERENCES public.customization_resources(id) ON DELETE RESTRICT;

--> statement-breakpoint
ALTER TABLE customization_revisions ADD CONSTRAINT customization_revisions_resource_fk FOREIGN KEY (resource_id) REFERENCES public.customization_resources(id) ON DELETE RESTRICT;

--> statement-breakpoint
ALTER TABLE customization_releases ADD CONSTRAINT customization_releases_resource_fk FOREIGN KEY (resource_id) REFERENCES public.customization_resources(id) ON DELETE RESTRICT;

--> statement-breakpoint
ALTER TABLE customization_audit ADD CONSTRAINT customization_audit_resource_fk FOREIGN KEY (resource_id) REFERENCES public.customization_resources(id) ON DELETE RESTRICT;

--> statement-breakpoint
CREATE TRIGGER customization_revisions_immutable BEFORE UPDATE OR DELETE ON customization_revisions FOR EACH ROW EXECUTE FUNCTION public.customization_immutable();

--> statement-breakpoint
CREATE TRIGGER customization_releases_immutable BEFORE UPDATE OR DELETE ON customization_releases FOR EACH ROW EXECUTE FUNCTION public.customization_immutable();

--> statement-breakpoint
CREATE TRIGGER customization_delivery_fragments_immutable BEFORE UPDATE OR DELETE ON customization_delivery_fragments FOR EACH ROW EXECUTE FUNCTION public.customization_immutable();

--> statement-breakpoint
CREATE TRIGGER customization_public_projections_immutable BEFORE UPDATE OR DELETE ON customization_public_projections FOR EACH ROW EXECUTE FUNCTION public.customization_immutable();

--> statement-breakpoint
CREATE TRIGGER customization_audit_immutable BEFORE UPDATE OR DELETE ON customization_audit FOR EACH ROW EXECUTE FUNCTION public.customization_immutable();

--> statement-breakpoint
CREATE TRIGGER customization_operations_immutable BEFORE UPDATE OR DELETE ON customization_operations FOR EACH ROW EXECUTE FUNCTION public.customization_immutable();

--> statement-breakpoint
ALTER TABLE customization_assets ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY customization_assets_operator_read ON customization_assets FOR SELECT USING (public.customization_root(union_id,true));
--> statement-breakpoint
CREATE POLICY customization_assets_operator_write ON customization_assets FOR ALL USING (public.customization_root(union_id)) WITH CHECK (public.customization_root(union_id));

--> statement-breakpoint
ALTER TABLE customization_audit ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY customization_audit_operator_read ON customization_audit FOR SELECT USING (public.customization_root(union_id,true));
--> statement-breakpoint
CREATE POLICY customization_audit_operator_write ON customization_audit FOR ALL USING (public.customization_root(union_id)) WITH CHECK (public.customization_root(union_id));

--> statement-breakpoint
ALTER TABLE customization_delivery_fragments ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY customization_delivery_fragments_operator_read ON customization_delivery_fragments FOR SELECT USING (public.customization_root(union_id,true));
--> statement-breakpoint
CREATE POLICY customization_delivery_fragments_operator_write ON customization_delivery_fragments FOR ALL USING (public.customization_root(union_id)) WITH CHECK (public.customization_root(union_id));

--> statement-breakpoint
ALTER TABLE customization_drafts ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY customization_drafts_operator_read ON customization_drafts FOR SELECT USING (public.customization_root(union_id,true));
--> statement-breakpoint
CREATE POLICY customization_drafts_operator_write ON customization_drafts FOR ALL USING (public.customization_root(union_id)) WITH CHECK (public.customization_root(union_id));

--> statement-breakpoint
ALTER TABLE customization_heads ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY customization_heads_operator_read ON customization_heads FOR SELECT USING (public.customization_root(union_id,true));
--> statement-breakpoint
CREATE POLICY customization_heads_operator_write ON customization_heads FOR ALL USING (public.customization_root(union_id)) WITH CHECK (public.customization_root(union_id));

--> statement-breakpoint
ALTER TABLE customization_maintenance_grants ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY customization_maintenance_grants_operator_read ON customization_maintenance_grants FOR SELECT USING (public.customization_root(union_id,true));
--> statement-breakpoint
CREATE POLICY customization_maintenance_grants_operator_write ON customization_maintenance_grants FOR ALL USING (public.customization_root(union_id)) WITH CHECK (public.customization_root(union_id));

--> statement-breakpoint
ALTER TABLE customization_operations ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY customization_operations_operator_read ON customization_operations FOR SELECT USING (public.customization_root(union_id,true));
--> statement-breakpoint
CREATE POLICY customization_operations_operator_write ON customization_operations FOR ALL USING (public.customization_root(union_id)) WITH CHECK (public.customization_root(union_id));

--> statement-breakpoint
ALTER TABLE customization_policy ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY customization_policy_operator_read ON customization_policy FOR SELECT USING (public.customization_root(union_id,true));
--> statement-breakpoint
CREATE POLICY customization_policy_operator_write ON customization_policy FOR ALL USING (public.customization_root(union_id)) WITH CHECK (public.customization_root(union_id));

--> statement-breakpoint
ALTER TABLE customization_preset_bindings ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY customization_preset_bindings_operator_read ON customization_preset_bindings FOR SELECT USING (public.customization_root(union_id,true));
--> statement-breakpoint
CREATE POLICY customization_preset_bindings_operator_write ON customization_preset_bindings FOR ALL USING (public.customization_root(union_id)) WITH CHECK (public.customization_root(union_id));

--> statement-breakpoint
ALTER TABLE customization_public_projections ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY customization_public_projections_operator_read ON customization_public_projections FOR SELECT USING (public.customization_root(union_id,true));
--> statement-breakpoint
CREATE POLICY customization_public_projections_operator_write ON customization_public_projections FOR ALL USING (public.customization_root(union_id)) WITH CHECK (public.customization_root(union_id));

--> statement-breakpoint
ALTER TABLE customization_releases ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY customization_releases_operator_read ON customization_releases FOR SELECT USING (public.customization_root(union_id,true));
--> statement-breakpoint
CREATE POLICY customization_releases_operator_write ON customization_releases FOR ALL USING (public.customization_root(union_id)) WITH CHECK (public.customization_root(union_id));

--> statement-breakpoint
ALTER TABLE customization_resources ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY customization_resources_operator_read ON customization_resources FOR SELECT USING (public.customization_root(union_id,true));
--> statement-breakpoint
CREATE POLICY customization_resources_operator_write ON customization_resources FOR ALL USING (public.customization_root(union_id)) WITH CHECK (public.customization_root(union_id));

--> statement-breakpoint
ALTER TABLE customization_revisions ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY customization_revisions_operator_read ON customization_revisions FOR SELECT USING (public.customization_root(union_id,true));
--> statement-breakpoint
CREATE POLICY customization_revisions_operator_write ON customization_revisions FOR ALL USING (public.customization_root(union_id)) WITH CHECK (public.customization_root(union_id));

--> statement-breakpoint
ALTER TABLE customization_section_controls ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY customization_section_controls_operator_read ON customization_section_controls FOR SELECT USING (public.customization_root(union_id,true));
--> statement-breakpoint
CREATE POLICY customization_section_controls_operator_write ON customization_section_controls FOR ALL USING (public.customization_root(union_id)) WITH CHECK (public.customization_root(union_id));

--> statement-breakpoint
ALTER TABLE customization_scopes ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY customization_scopes_operator_read ON customization_scopes FOR SELECT USING (public.customization_root(union_id,true));
--> statement-breakpoint
CREATE POLICY customization_scopes_operator_write ON customization_scopes FOR ALL USING (public.customization_root(union_id)) WITH CHECK (public.customization_root(union_id));

--> statement-breakpoint
CREATE POLICY customization_fragments_reader ON customization_delivery_fragments FOR SELECT USING (public.customization_fragment_access(resource_id,release_id,minimum_audience,fragment_id,control_resource_ids));
--> statement-breakpoint
CREATE POLICY customization_projections_reader ON customization_public_projections FOR SELECT USING (public.customization_current_access(resource_id,release_id,'public') AND public.customization_audience(scope_id,'public'));

--> statement-breakpoint
REVOKE ALL ON FUNCTION public.customization_scope_guard() FROM PUBLIC;

--> statement-breakpoint
REVOKE ALL ON FUNCTION public.customization_row_guard() FROM PUBLIC;

--> statement-breakpoint
REVOKE ALL ON FUNCTION public.customization_immutable() FROM PUBLIC;

--> statement-breakpoint
REVOKE ALL ON FUNCTION public.customization_root(text,boolean) FROM PUBLIC;

--> statement-breakpoint
GRANT EXECUTE ON FUNCTION public.customization_root(text,boolean) TO unionops_app;

--> statement-breakpoint
REVOKE ALL ON FUNCTION public.customization_scope_live(text) FROM PUBLIC;

--> statement-breakpoint
GRANT EXECUTE ON FUNCTION public.customization_scope_live(text) TO unionops_app;

--> statement-breakpoint
REVOKE ALL ON FUNCTION public.customization_audience(text,text) FROM PUBLIC;

--> statement-breakpoint
GRANT EXECUTE ON FUNCTION public.customization_audience(text,text) TO unionops_app;

--> statement-breakpoint
REVOKE ALL ON FUNCTION public.customization_current_access(text,text,text,text) FROM PUBLIC;

--> statement-breakpoint
GRANT EXECUTE ON FUNCTION public.customization_current_access(text,text,text,text) TO unionops_app;

--> statement-breakpoint
REVOKE ALL ON FUNCTION public.customization_fragment_access(text,text,text,text,jsonb) FROM PUBLIC;

--> statement-breakpoint
GRANT EXECUTE ON FUNCTION public.customization_fragment_access(text,text,text,text,jsonb) TO unionops_app;
