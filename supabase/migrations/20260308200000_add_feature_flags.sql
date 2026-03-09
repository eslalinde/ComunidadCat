-- Add feature flags JSONB column to profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS feature_flags jsonb NOT NULL DEFAULT '{}';

COMMENT ON COLUMN public.profiles.feature_flags IS
  'Per-user feature flag overrides. Keys are flag names, values are booleans.';
