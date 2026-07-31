-- ============================================================================
-- Canvas 2.0 (C.1) — boards belong to projects, and the team can reach them.
--
-- Adds boards.project_id (nullable → freestanding owner-only boards still work).
-- Opens the canvas to assigned team members, gated by clearance:
--   • view (read)  = assigned to the board's project      (my_clearance >= 1)
--   • edit (write) = edit-clearance on that project        (my_clearance >= 2)
-- Freestanding boards (project_id is null) stay owner-only.
--
-- can_access_board / can_edit_board wrap the check for the board_items policies
-- (SECURITY DEFINER so they don't recurse through board RLS). Mirrors
-- my_clearance() from the clearance migration; keep them in sync.
--
-- Safe to re-run.
-- ============================================================================

alter table boards add column if not exists project_id uuid references projects (id) on delete set null;
create index if not exists idx_boards_project_id on boards (project_id);

-- ── Access helpers ───────────────────────────────────────────────────────────
create or replace function public.can_access_board(bid uuid)
returns boolean
language sql security definer stable
set search_path = public
as $$
  select exists (
    select 1 from boards b
     where b.id = bid
       and (
         public.app_role() = 'owner'
         or (b.project_id is not null and public.my_clearance(b.project_id) >= 1)
       )
  );
$$;

create or replace function public.can_edit_board(bid uuid)
returns boolean
language sql security definer stable
set search_path = public
as $$
  select exists (
    select 1 from boards b
     where b.id = bid
       and (
         public.app_role() = 'owner'
         or (b.project_id is not null and public.my_clearance(b.project_id) >= 2)
       )
  );
$$;

-- ── Boards RLS (replaces the owner-only policies from the clearance migration) ─
drop policy if exists "boards: owner all" on boards;
drop policy if exists "boards: all for authenticated" on boards;

create policy "boards: owner all" on boards
  for all to authenticated
  using (public.app_role() = 'owner') with check (public.app_role() = 'owner');

-- Assigned team members read their project's boards…
create policy "boards: team read" on boards
  for select to authenticated
  using (project_id is not null and public.my_clearance(project_id) >= 1);

-- …and edit-clearance (L2+) may create/update/delete them. The WITH CHECK keeps
-- a board attached to a project they're L2+ on (no re-homing elsewhere).
create policy "boards: team insert" on boards
  for insert to authenticated
  with check (project_id is not null and public.my_clearance(project_id) >= 2);

create policy "boards: team update" on boards
  for update to authenticated
  using (project_id is not null and public.my_clearance(project_id) >= 2)
  with check (project_id is not null and public.my_clearance(project_id) >= 2);

create policy "boards: team delete" on boards
  for delete to authenticated
  using (project_id is not null and public.my_clearance(project_id) >= 2);

-- ── Board items RLS (follow the parent board's access) ───────────────────────
drop policy if exists "board_items: owner all" on board_items;
drop policy if exists "board_items: all for authenticated" on board_items;

create policy "board_items: owner all" on board_items
  for all to authenticated
  using (public.app_role() = 'owner') with check (public.app_role() = 'owner');

create policy "board_items: team read" on board_items
  for select to authenticated using (public.can_access_board(board_id));

create policy "board_items: team insert" on board_items
  for insert to authenticated with check (public.can_edit_board(board_id));

create policy "board_items: team update" on board_items
  for update to authenticated
  using (public.can_edit_board(board_id)) with check (public.can_edit_board(board_id));

create policy "board_items: team delete" on board_items
  for delete to authenticated using (public.can_edit_board(board_id));
