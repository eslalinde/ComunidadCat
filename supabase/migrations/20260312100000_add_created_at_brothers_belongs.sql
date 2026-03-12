-- Add created_at to brothers and belongs tables for "Nuevo" badge feature
-- Existing rows get current timestamp as default (no way to backfill actual creation dates)

ALTER TABLE brothers
  ADD COLUMN IF NOT EXISTS created_at timestamptz NOT NULL DEFAULT now();

ALTER TABLE belongs
  ADD COLUMN IF NOT EXISTS created_at timestamptz NOT NULL DEFAULT now();
