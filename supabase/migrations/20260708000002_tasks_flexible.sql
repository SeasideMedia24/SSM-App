-- ============================================================================
-- Flexible task attachment
--
-- Tasks used to require a project. They can now attach to a project, a client,
-- or stand alone — so the owner can create to-dos from My Tasks and point them
-- at whatever they relate to.
--
--  * project_id becomes optional (was NOT NULL).
--  * a new optional client_id links a task to a client directly.
--
-- Existing tasks are unaffected (they keep their project_id). RLS already covers
-- the tasks table ("tasks: all for authenticated").
--
-- Safe to re-run.
-- ============================================================================

alter table tasks alter column project_id drop not null;

alter table tasks
  add column if not exists client_id uuid references clients (id) on delete set null;

create index if not exists tasks_client_id_idx on tasks (client_id);
