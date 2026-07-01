-- ============================================================================
-- Align project & task statuses to Seaside Media's real Notion workflow.
--
-- Phase 1 shipped generic statuses; the owner's actual pipeline (pulled from
-- Notion) is different. Tables are still empty, so this is safe.
--
--   projects.status : Idea/Inquiry → Scripting/Planning → Filming → Editing →
--                     Review/Revision → Scheduled → Archived
--   tasks.status    : Not started → In progress → Done
--
-- Technique: convert the column to text, swap the enum type, convert back.
-- Any legacy values are remapped first so this never fails even if a row exists.
-- Safe to re-run.
-- ============================================================================

-- ── projects.status ─────────────────────────────────────────────────────────
alter table projects alter column status drop default;
alter table projects alter column status type text;

-- Remap any old values to the closest new stage (no-op on an empty table).
update projects set status = case status
  when 'backlog'   then 'idea_inquiry'
  when 'active'    then 'filming'
  when 'in_review' then 'review_revision'
  when 'done'      then 'scheduled'
  when 'archived'  then 'archived'
  else status
end;

drop type if exists project_status;
create type project_status as enum (
  'idea_inquiry', 'scripting_planning', 'filming', 'editing',
  'review_revision', 'scheduled', 'archived'
);

alter table projects
  alter column status type project_status using status::project_status;
alter table projects alter column status set default 'idea_inquiry';

-- ── tasks.status ────────────────────────────────────────────────────────────
alter table tasks alter column status drop default;
alter table tasks alter column status type text;

update tasks set status = case status
  when 'todo'    then 'not_started'
  when 'blocked' then 'in_progress'
  else status
end;

drop type if exists task_status;
create type task_status as enum ('not_started', 'in_progress', 'done');

alter table tasks
  alter column status type task_status using status::task_status;
alter table tasks alter column status set default 'not_started';
