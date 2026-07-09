-- ============================================================================
-- Contractors / Team (Slice A: records + assignments, owner-managed)
--
-- People who do the work: internal contractors, external contractors, and
-- employees. Each has a default rate; each can be assigned to projects with a
-- per-assignment rate (falling back to the default).
--
-- Slice A is owner-only and stays in the current single-user access model. The
-- `onboard_token` and `user_id` columns are added now (nullable, unused) so
-- Slice B — contractor logins + onboarding + role-based RLS — can build on this
-- without another schema change.
--
-- RLS on both tables (CLAUDE.md). Safe to re-run.
-- ============================================================================

do $$ begin
  create type contractor_type as enum ('internal', 'external', 'employee');
exception when duplicate_object then null;
end $$;

create table if not exists contractors (
  id            uuid primary key default gen_random_uuid(),
  name          text not null,
  email         text,
  phone         text,
  type          contractor_type not null default 'external',
  role          text,                 -- their craft, e.g. "Editor", "Camera Op"
  default_rate  numeric(12,2),
  rate_unit     text,                 -- e.g. "day", "hour", "project"
  notes         text,
  onboard_token text,                 -- Slice B: invite/onboarding (unused for now)
  user_id       uuid references profiles (id) on delete set null, -- Slice B: linked login
  created_at    timestamptz not null default now()
);

-- A contractor on a project, with the rate for that assignment.
create table if not exists project_contractors (
  id            uuid primary key default gen_random_uuid(),
  project_id    uuid not null references projects (id) on delete cascade,
  contractor_id uuid not null references contractors (id) on delete cascade,
  role          text,                 -- role on this project (optional override)
  rate          numeric(12,2),        -- rate for this assignment; null => default_rate
  rate_unit     text,
  created_at    timestamptz not null default now(),
  unique (project_id, contractor_id)
);

create index if not exists project_contractors_project_id_idx on project_contractors (project_id);
create index if not exists project_contractors_contractor_id_idx on project_contractors (contractor_id);

-- RLS: on for every table. Phase 1 / Slice A: any signed-in user (the owner).
-- Slice B will replace `true` with a per-role check so a contractor only sees
-- their own assignments and rate.
alter table contractors         enable row level security;
alter table project_contractors enable row level security;

drop policy if exists "contractors: all for authenticated" on contractors;
create policy "contractors: all for authenticated"
  on contractors for all to authenticated using (true) with check (true);

drop policy if exists "project_contractors: all for authenticated" on project_contractors;
create policy "project_contractors: all for authenticated"
  on project_contractors for all to authenticated using (true) with check (true);
