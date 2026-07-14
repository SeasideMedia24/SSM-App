-- ============================================================================
-- Tasks: soft-archive support for the My Tasks manager.
--
-- archived_at is null for live tasks and a timestamp once archived. Archiving
-- hides a task from the default My Tasks view without deleting it (reversible);
-- deleting stays a separate, explicitly-confirmed action.
--
-- Existing tasks RLS policies already cover this column — no policy change.
-- Safe to re-run.
-- ============================================================================

alter table tasks add column if not exists archived_at timestamptz;
