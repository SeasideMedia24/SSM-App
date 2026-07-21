-- ============================================================================
-- Client portal: a "files ready to review" link (e.g. Frame.io).
--
-- When the owner is ready to hand over footage for review, they paste the
-- Frame.io (or any) review URL on the project. The portal then shows the client
-- a clear "Review your files" section — hidden until the link is set.
--
-- Safe to re-run.
-- ============================================================================

alter table client_portal add column if not exists review_link text;
