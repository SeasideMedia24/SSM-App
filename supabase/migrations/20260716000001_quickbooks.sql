-- ============================================================================
-- QuickBooks Online integration — Slice 3
--
--   qbo_accounts   one row per user: the OAuth tokens + company (realm) that let
--                   the server create/send invoices in QuickBooks. Like
--                   google_accounts, tokens are only ever touched server-side and
--                   never reach the browser. QB rotates the refresh token on every
--                   refresh, so it's stored here and updated each time.
--
-- Also maps app records to their QuickBooks counterparts:
--   clients.qbo_customer_id   → the QB Customer
--   invoices.qbo_*            → the QB Invoice (id, doc number, sync time, error)
--
-- Payment status flows back automatically via the QB webhook (Phase 3d), which
-- matches on invoices.qbo_invoice_id.
--
-- Safe to re-run.
-- ============================================================================

create table if not exists qbo_accounts (
  user_id                 uuid primary key references auth.users (id) on delete cascade,
  realm_id                text not null,          -- QuickBooks company id
  refresh_token           text not null,          -- rotates on every refresh
  access_token            text,
  access_token_expires_at timestamptz,
  default_item_id         text,                   -- QB service item used for invoice lines
  company_name            text,
  connected_at            timestamptz not null default now()
);

alter table qbo_accounts enable row level security;

-- Each user manages only their own connection (single-user today; already shaped
-- for Phase 4 multi-user).
drop policy if exists "own qbo account" on qbo_accounts;
create policy "own qbo account" on qbo_accounts
  for all to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- App ↔ QuickBooks record mapping.
alter table clients  add column if not exists qbo_customer_id text;

alter table invoices add column if not exists qbo_invoice_id text;
alter table invoices add column if not exists qbo_doc_number text;
alter table invoices add column if not exists qbo_synced_at  timestamptz;
alter table invoices add column if not exists qbo_sync_error text;

-- The webhook looks invoices up by their QB id.
create index if not exists idx_invoices_qbo_invoice_id on invoices (qbo_invoice_id);
