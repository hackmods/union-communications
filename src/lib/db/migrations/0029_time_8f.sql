-- Time 8f: punch photo attachment linkage + hybrid slice photo refs on entries.

ALTER TABLE time_entries ADD COLUMN IF NOT EXISTS clock_in_photo_attachment_id text;
ALTER TABLE time_entries ADD COLUMN IF NOT EXISTS clock_out_photo_attachment_id text;

ALTER TABLE attachment_meta ADD COLUMN IF NOT EXISTS time_entry_id text;
ALTER TABLE attachment_meta ADD COLUMN IF NOT EXISTS punch_kind text;

CREATE INDEX IF NOT EXISTS attachment_meta_time_entry_idx
  ON attachment_meta (time_entry_id);
