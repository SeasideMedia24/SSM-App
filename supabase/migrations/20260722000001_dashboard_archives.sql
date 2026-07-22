-- ============================================================================
-- Dashboard: archivable "PaePae activity" and "Recent quotes" sections.
--
-- Both sections show the newest 10 unarchived items; everything older or
-- manually archived folds into a collapsed Archive below, so the dashboard
-- stays clean without deleting history.
--
--   paepae_actions.archived_at      — hides an action from the visible list
--   quotes.dashboard_archived_at    — hides a quote from the DASHBOARD only;
--                                     the Calculator's saved-quotes list is
--                                     untouched (deliberately separate from any
--                                     future full quote archive).
--
-- Safe to re-run.
-- ============================================================================

alter table paepae_actions add column if not exists archived_at timestamptz;
alter table quotes         add column if not exists dashboard_archived_at timestamptz;
