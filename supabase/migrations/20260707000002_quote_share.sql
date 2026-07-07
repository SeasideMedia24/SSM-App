-- ============================================================================
-- Shareable quotes: a private, unguessable link a client can view (and the
-- owner can print / save as PDF). Same pattern as client onboarding invites —
-- the public page reads via the server-side service-role client only, so RLS
-- stays fully locked for anon.
--
-- Safe to re-run.
-- ============================================================================

alter table quotes add column if not exists share_token uuid;
create index if not exists idx_quotes_share_token on quotes (share_token);
