-- ============================================================================
-- Projects refinements: redefine client types, add project priority + type.
--
-- Client Type becomes a deliberate classification: Recurring / One-time /
-- Campaign (default One-time). Projects gain a priority (low/medium/high) and a
-- stored project_type (used for filtering + which template seeded it).
--
-- Safe to re-run. Tables have little data, so the enum swap is painless.
-- ============================================================================

-- ── clients.client_type → recurring / one_time / campaign ────────────────────
alter table clients alter column client_type drop default;
alter table clients alter column client_type type text;

-- Remap the old values to the new set (no-op once migrated).
update clients set client_type = case client_type
  when 'new'       then 'one_time'
  when 'inquiry'   then 'one_time'
  when 'recurring' then 'recurring'
  when 'retainer'  then 'recurring'
  when 'one_off'   then 'one_time'
  else 'one_time'
end;

drop type if exists client_type;
create type client_type as enum ('recurring', 'one_time', 'campaign');

alter table clients
  alter column client_type type client_type using client_type::client_type;
alter table clients alter column client_type set default 'one_time';

-- ── projects.priority (reuses the task_priority enum: low/medium/high) ────────
alter table projects add column if not exists priority task_priority not null default 'medium';

-- ── projects.project_type (slug of the chosen type; drives filter + template) ─
alter table projects add column if not exists project_type text;

-- Helpful indexes for the new board filters.
create index if not exists idx_projects_priority     on projects (priority);
create index if not exists idx_projects_project_type on projects (project_type);
create index if not exists idx_clients_client_type   on clients (client_type);
