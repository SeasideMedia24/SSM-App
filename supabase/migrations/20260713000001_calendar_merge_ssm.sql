-- ============================================================================
-- Calendar: let a Google calendar merge into the "Seaside Media" bucket.
--
-- The dashboard calendar groups events into named chips. A Google calendar
-- flagged merge_ssm has its events folded under the same "Seaside Media" chip
-- as the app's own tasks/projects, so they toggle together "as if they were the
-- same calendar" (owner's request). Off by default.
--
-- Safe to re-run.
-- ============================================================================

alter table google_calendars add column if not exists merge_ssm boolean not null default false;
