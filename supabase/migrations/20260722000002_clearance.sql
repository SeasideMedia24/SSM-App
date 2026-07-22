-- ============================================================================
-- Team clearance — 3 levels, per person with a per-project override.
--
--   Level 1 · View   — read the projects they're assigned to (tasks,
--                      deliverables, milestones) + update their OWN tasks'
--                      status/note (unchanged from before).
--   Level 2 · Edit   — everything in L1, plus create/update tasks,
--                      deliverables, and milestones on their projects.
--   Level 3 · Full   — everything in L2, plus read/update that project's
--                      contracts and read its invoices. Never owner-only
--                      surfaces (clients, pricing, PaePae, settings).
--
--   contractors.clearance          — the person's default level (1–3)
--   project_contractors.clearance  — optional per-assignment override
--   effective level on a project   = override ?? person default
--   my_clearance(pid)              — 3 for the owner, 0 when not assigned
--
-- Deletes stay owner-only at every level (safety default).
--
-- ALSO closes a real gap: boards/board_items were readable+writable by ANY
-- authenticated login ("all for authenticated"). They tighten to owner-only
-- here; per-project team access arrives with boards.project_id (canvas batch).
--
-- Safe to re-run.
-- ============================================================================

-- ── Columns ──────────────────────────────────────────────────────────────────
alter table contractors         add column if not exists clearance smallint not null default 1;
alter table project_contractors add column if not exists clearance smallint;

do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'contractors_clearance_range') then
    alter table contractors add constraint contractors_clearance_range check (clearance between 1 and 3);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'project_contractors_clearance_range') then
    alter table project_contractors add constraint project_contractors_clearance_range check (clearance between 1 and 3);
  end if;
end $$;

-- ── Effective clearance ──────────────────────────────────────────────────────
-- SECURITY DEFINER so RLS policies can call it without recursing into the
-- tables it reads. Owner is always 3; unassigned is 0.
create or replace function public.my_clearance(pid uuid)
returns int
language sql security definer stable
set search_path = public
as $$
  select case
    when public.app_role() = 'owner' then 3
    else coalesce(
      (select coalesce(pc.clearance, c.clearance, 1)::int
         from project_contractors pc
         join contractors c on c.id = pc.contractor_id
        where pc.project_id = pid
          and c.user_id = auth.uid()
        limit 1),
      0)
  end;
$$;

-- ── Level 2: create/update project items on assigned projects ────────────────
-- (Owner-all policies already exist on all three tables; these ADD contractor
-- abilities. Deletes are deliberately not granted.)

drop policy if exists "tasks: L2 insert on project" on tasks;
create policy "tasks: L2 insert on project" on tasks
  for insert to authenticated
  with check (project_id is not null and public.my_clearance(project_id) >= 2);

drop policy if exists "tasks: L2 update on project" on tasks;
create policy "tasks: L2 update on project" on tasks
  for update to authenticated
  using (project_id is not null and public.my_clearance(project_id) >= 2)
  with check (project_id is not null and public.my_clearance(project_id) >= 2);

drop policy if exists "deliverables: L2 insert" on deliverables;
create policy "deliverables: L2 insert" on deliverables
  for insert to authenticated
  with check (public.my_clearance(project_id) >= 2);

drop policy if exists "deliverables: L2 update" on deliverables;
create policy "deliverables: L2 update" on deliverables
  for update to authenticated
  using (public.my_clearance(project_id) >= 2)
  with check (public.my_clearance(project_id) >= 2);

drop policy if exists "milestones: L2 insert" on milestones;
create policy "milestones: L2 insert" on milestones
  for insert to authenticated
  with check (public.my_clearance(project_id) >= 2);

drop policy if exists "milestones: L2 update" on milestones;
create policy "milestones: L2 update" on milestones
  for update to authenticated
  using (public.my_clearance(project_id) >= 2)
  with check (public.my_clearance(project_id) >= 2);

-- The task column-guard now respects clearance: L2+ may edit the real fields
-- (title, description, priority, due date, assignee, status, note) on their
-- projects, while L1 keeps the original status/note-only rule for OWN tasks.
-- Nobody but the owner can move a task between projects/clients.
create or replace function public.enforce_contractor_task_update()
returns trigger
language plpgsql security definer
set search_path = public
as $$
begin
  if public.app_role() = 'contractor' then
    -- Structural fields are locked for every contractor level.
    if new.id is distinct from old.id
      or new.project_id is distinct from old.project_id
      or new.client_id is distinct from old.client_id
      or new.created_at is distinct from old.created_at
    then
      raise exception 'Only the owner can move a task between projects.';
    end if;
    -- Below L2 (or on tasks outside any project), only status + note may change.
    if old.project_id is null or public.my_clearance(old.project_id) < 2 then
      if new.title is distinct from old.title
        or new.description is distinct from old.description
        or new.assignee_id is distinct from old.assignee_id
        or new.priority is distinct from old.priority
        or new.due_date is distinct from old.due_date
      then
        raise exception 'Contractors can only change a task''s status or note.';
      end if;
    end if;
  end if;
  return new;
end;
$$;

-- ── Level 3: that project's contracts + invoices ─────────────────────────────

drop policy if exists "contracts: L3 read" on contracts;
create policy "contracts: L3 read" on contracts
  for select to authenticated
  using (public.my_clearance(project_id) >= 3);

drop policy if exists "contracts: L3 update" on contracts;
create policy "contracts: L3 update" on contracts
  for update to authenticated
  using (public.my_clearance(project_id) >= 3)
  with check (public.my_clearance(project_id) >= 3);

drop policy if exists "invoices: L3 read" on invoices;
create policy "invoices: L3 read" on invoices
  for select to authenticated
  using (project_id is not null and public.my_clearance(project_id) >= 3);

drop policy if exists "invoice_line_items: L3 read" on invoice_line_items;
create policy "invoice_line_items: L3 read" on invoice_line_items
  for select to authenticated
  using (exists (
    select 1 from invoices i
     where i.id = invoice_line_items.invoice_id
       and i.project_id is not null
       and public.my_clearance(i.project_id) >= 3
  ));

-- ── Close the boards gap (owner-only until boards get project_id) ────────────
drop policy if exists "boards: all for authenticated" on boards;
create policy "boards: owner all" on boards
  for all to authenticated using (public.app_role() = 'owner') with check (public.app_role() = 'owner');

drop policy if exists "board_items: all for authenticated" on board_items;
create policy "board_items: owner all" on board_items
  for all to authenticated using (public.app_role() = 'owner') with check (public.app_role() = 'owner');
