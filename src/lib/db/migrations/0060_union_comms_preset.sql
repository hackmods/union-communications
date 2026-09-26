-- Platform-admin brand style binding: Hub union → Comms Brand Kit preset id.
ALTER TABLE "unions" ADD COLUMN IF NOT EXISTS "comms_preset_id" text;
