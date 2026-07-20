-- ============================================================================
-- Contracts: an adjustable production/shoot date.
--
-- The template's clause 3 ("Date(s)") read "TBD by Producer". This lets the
-- owner set a real production date on the contract, which renders into clause 3
-- (falling back to "TBD by Producer" when left blank).
--
-- Safe to re-run.
-- ============================================================================

alter table contracts add column if not exists production_date date;
