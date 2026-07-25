-- Time 8e: GPS consent timestamp on roster workers.
ALTER TABLE time_workers ADD COLUMN IF NOT EXISTS gps_consent_at timestamptz;
