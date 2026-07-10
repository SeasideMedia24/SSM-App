-- ============================================================================
-- Contractors: full / half / hourly rates + self-onboarding support
--
-- Replaces the single default_rate/rate_unit with three explicit rates (matching
-- how the calculator books photographers: full day, half day, hourly). Adds
-- onboarded_at so a contractor can fill in their own details via an invite link
-- (no login — that's still Slice B).
--
-- Safe to re-run. The old columns are dropped; the table is new and empty.
-- ============================================================================

alter table contractors
  add column if not exists rate_full    numeric(12,2),
  add column if not exists rate_half    numeric(12,2),
  add column if not exists rate_hourly  numeric(12,2),
  add column if not exists onboarded_at timestamptz;

alter table contractors drop column if exists default_rate;
alter table contractors drop column if exists rate_unit;
