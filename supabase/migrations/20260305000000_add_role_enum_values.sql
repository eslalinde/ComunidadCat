-- ==============================================
-- ADD NEW ROLE ENUM VALUES
-- ==============================================
-- These must be in a separate migration because PostgreSQL
-- requires new enum values added via ALTER TYPE ADD VALUE
-- to be committed before they can be referenced in the
-- same transaction (e.g., in CHECK constraints or functions).
-- ==============================================
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'zone_leader';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'zone_contributor';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'community_responsible';
