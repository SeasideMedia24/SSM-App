-- ============================================================================
-- Invoices
--
-- An invoice is generated from a quote: it copies the quote's line items and
-- total, linked to the same client (and project), and can be edited afterward.
-- Lifecycle: draft → sent → paid. "Overdue" is derived in the app (sent and
-- past the due date), not stored.
--
-- Mirrors the quotes / quote_line_items shape. RLS on both tables (CLAUDE.md).
-- Safe to re-run.
-- ============================================================================

do $$ begin
  create type invoice_status as enum ('draft', 'sent', 'paid');
exception when duplicate_object then null;
end $$;

create table if not exists invoices (
  id             uuid primary key default gen_random_uuid(),
  client_id      uuid not null references clients (id) on delete cascade,
  project_id     uuid references projects (id) on delete set null,
  quote_id       uuid references quotes (id) on delete set null, -- source quote, if any
  invoice_number text,                                           -- human-facing number, optional
  title          text not null,
  status         invoice_status not null default 'draft',
  notes          text,
  subtotal       numeric(12,2) not null default 0,
  total          numeric(12,2) not null default 0,
  issue_date     date,
  due_date       date,
  sent_at        timestamptz,
  paid_at        timestamptz,
  created_at     timestamptz not null default now()
);

-- Amount is stored (quantity * rate) so a later rate change never rewrites a
-- historical invoice. `position` controls display order.
create table if not exists invoice_line_items (
  id         uuid primary key default gen_random_uuid(),
  invoice_id uuid not null references invoices (id) on delete cascade,
  label      text not null,
  quantity   numeric(12,2) not null default 1,
  unit       text,
  rate       numeric(12,2) not null default 0,
  amount     numeric(12,2) not null default 0,
  position   int not null default 0
);

create index if not exists invoices_created_at_idx on invoices (created_at desc);
create index if not exists invoice_line_items_invoice_id_idx on invoice_line_items (invoice_id);

-- RLS: on for every table. Phase 1: any signed-in user; the `true` check is the
-- seam for per-organization isolation in Phase 4.
alter table invoices           enable row level security;
alter table invoice_line_items enable row level security;

drop policy if exists "invoices: all for authenticated" on invoices;
create policy "invoices: all for authenticated"
  on invoices for all to authenticated using (true) with check (true);

drop policy if exists "invoice_line_items: all for authenticated" on invoice_line_items;
create policy "invoice_line_items: all for authenticated"
  on invoice_line_items for all to authenticated using (true) with check (true);
