-- ============================================================================
-- Shareable invoices: a private, unguessable link a client can view and the
-- owner can print / save as PDF — the same pattern as shareable quotes
-- (20260707000002). The public page reads via the server-side service-role
-- client only, so RLS stays fully locked for anon.
--
-- Safe to re-run.
-- ============================================================================

alter table invoices add column if not exists share_token uuid;
create index if not exists idx_invoices_share_token on invoices (share_token);
