-- ============================================================================
-- Projects expansion — foundation for the per-project views.
--
-- Adds client-type tags, project tags, and the tables behind the future
-- Timeline / Deliverables / Contracts / Expenses / Budget views. The tables are
-- created now so no rebuild is needed when those views are built (Phase 4.3).
--
-- Safe to re-run (guards + drop-policy-then-create).
-- ============================================================================

-- ── Enums ────────────────────────────────────────────────────────────────────
do $$ begin
  create type client_type as enum ('new', 'inquiry', 'recurring', 'retainer', 'one_off');
exception when duplicate_object then null; end $$;

do $$ begin
  create type contract_status as enum ('draft', 'sent', 'signed', 'declined');
exception when duplicate_object then null; end $$;

-- ── Client-type tag + project tags ───────────────────────────────────────────
alter table clients  add column if not exists client_type client_type not null default 'new';
alter table projects add column if not exists tags text[] not null default '{}';

-- ── Per-project view tables ──────────────────────────────────────────────────
-- Deliverables: things being produced for the project.
create table if not exists deliverables (
  id          uuid primary key default gen_random_uuid(),
  project_id  uuid not null references projects (id) on delete cascade,
  title       text not null,
  description text,
  status      task_status not null default 'not_started',
  due_date    date,
  position    int not null default 0,
  created_at  timestamptz not null default now()
);

-- Contracts: agreements attached to the project.
create table if not exists contracts (
  id          uuid primary key default gen_random_uuid(),
  project_id  uuid not null references projects (id) on delete cascade,
  title       text not null,
  status      contract_status not null default 'draft',
  amount      numeric(12,2),
  signed_date date,
  file_url    text,
  notes       text,
  position    int not null default 0,
  created_at  timestamptz not null default now()
);

-- Expenses: money spent on the project.
create table if not exists expenses (
  id         uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects (id) on delete cascade,
  label      text not null,
  category   text,
  amount     numeric(12,2) not null default 0,
  spent_on   date,
  notes      text,
  position   int not null default 0,
  created_at timestamptz not null default now()
);

-- Budget lines: planned vs actual per line.
create table if not exists budget_lines (
  id             uuid primary key default gen_random_uuid(),
  project_id     uuid not null references projects (id) on delete cascade,
  label          text not null,
  planned_amount numeric(12,2) not null default 0,
  actual_amount  numeric(12,2) not null default 0,
  notes          text,
  position       int not null default 0,
  created_at     timestamptz not null default now()
);

-- Milestones: dated points for the Timeline view.
create table if not exists milestones (
  id         uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects (id) on delete cascade,
  title      text not null,
  date       date,
  status     task_status not null default 'not_started',
  position   int not null default 0,
  created_at timestamptz not null default now()
);

-- ── Indexes on the foreign keys ──────────────────────────────────────────────
create index if not exists idx_deliverables_project_id on deliverables (project_id);
create index if not exists idx_contracts_project_id    on contracts (project_id);
create index if not exists idx_expenses_project_id     on expenses (project_id);
create index if not exists idx_budget_lines_project_id on budget_lines (project_id);
create index if not exists idx_milestones_project_id   on milestones (project_id);

-- ── RLS: ON for every new table, authenticated full access (org-ready) ───────
alter table deliverables enable row level security;
alter table contracts    enable row level security;
alter table expenses     enable row level security;
alter table budget_lines enable row level security;
alter table milestones   enable row level security;

drop policy if exists "deliverables: all for authenticated" on deliverables;
create policy "deliverables: all for authenticated"
  on deliverables for all to authenticated using (true) with check (true);

drop policy if exists "contracts: all for authenticated" on contracts;
create policy "contracts: all for authenticated"
  on contracts for all to authenticated using (true) with check (true);

drop policy if exists "expenses: all for authenticated" on expenses;
create policy "expenses: all for authenticated"
  on expenses for all to authenticated using (true) with check (true);

drop policy if exists "budget_lines: all for authenticated" on budget_lines;
create policy "budget_lines: all for authenticated"
  on budget_lines for all to authenticated using (true) with check (true);

drop policy if exists "milestones: all for authenticated" on milestones;
create policy "milestones: all for authenticated"
  on milestones for all to authenticated using (true) with check (true);
