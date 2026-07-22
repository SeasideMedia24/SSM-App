-- ============================================================================
-- Granular assignment: deliverables can be assigned to a specific person.
--
-- Tasks already have assignee_id; deliverables didn't. An assignee can read
-- their deliverable even before other clearance grants it (the assign flow also
-- auto-adds them to the project, so L1 read applies too — this is a safety net).
-- Editing is still governed by L2 clearance.
--
-- Safe to re-run.
-- ============================================================================

alter table deliverables add column if not exists assignee_id uuid references profiles (id) on delete set null;
create index if not exists idx_deliverables_assignee on deliverables (assignee_id);

drop policy if exists "deliverables: assignee read" on deliverables;
create policy "deliverables: assignee read" on deliverables
  for select to authenticated
  using (assignee_id = auth.uid());
