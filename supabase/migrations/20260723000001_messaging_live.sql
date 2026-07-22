-- ============================================================================
-- Messaging B.2 — live delivery, item links, team-initiated DMs.
--
--   • add `messages` to the realtime publication so clients get inserts live
--   • messages.ref_type/ref_id — attach a project/task/deliverable to a message
--   • thread_participants.notified_at — debounce the email fallback
--   • shares_project(other) — do the caller and `other` share a project?
--   • start_dm(other) — SECURITY DEFINER: reuse/create the 1:1 DM (checks
--     shares_project). Team members can't insert threads directly (RLS stays
--     owner-write); DM creation is funnelled through this one guarded function,
--     avoiding brittle chicken-and-egg INSERT policies.
--
-- Safe to re-run.
-- ============================================================================

-- Live delivery (idempotent add to the realtime publication).
do $$ begin
  if not exists (
    select 1 from pg_publication_tables
     where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'messages'
  ) then
    alter publication supabase_realtime add table messages;
  end if;
end $$;

-- Attach an item to a message (a click-through chip in the UI).
alter table messages add column if not exists ref_type text check (ref_type in ('project', 'task', 'deliverable'));
alter table messages add column if not exists ref_id   uuid;

-- Email-fallback debounce: when we last emailed this participant about unread.
alter table thread_participants add column if not exists notified_at timestamptz;

-- Do the caller and `other` share a project? Owner shares with everyone.
create or replace function public.shares_project(other uuid)
returns boolean
language sql security definer stable
set search_path = public
as $$
  select public.app_role() = 'owner'
    or coalesce((select role from profiles where id = other), 'none') = 'owner'
    or exists (
      select 1
        from project_contractors pc1
        join contractors c1 on c1.id = pc1.contractor_id and c1.user_id = auth.uid()
        join project_contractors pc2 on pc2.project_id = pc1.project_id
        join contractors c2 on c2.id = pc2.contractor_id and c2.user_id = other
    );
$$;

-- Reuse or create the 1:1 DM between the caller and `other`. Guarded so a team
-- member can only start a DM with the owner or a project teammate.
create or replace function public.start_dm(other uuid)
returns uuid
language plpgsql security definer
set search_path = public
as $$
declare tid uuid;
begin
  if auth.uid() is null then raise exception 'Not authenticated'; end if;
  if other = auth.uid() then raise exception 'Cannot message yourself'; end if;
  if not public.shares_project(other) then raise exception 'Not allowed to message this person'; end if;

  select t.id into tid
    from threads t
   where t.kind = 'dm'
     and (select count(*) from thread_participants p where p.thread_id = t.id) = 2
     and exists (select 1 from thread_participants p where p.thread_id = t.id and p.user_id = auth.uid())
     and exists (select 1 from thread_participants p where p.thread_id = t.id and p.user_id = other)
   limit 1;

  if tid is null then
    insert into threads (kind) values ('dm') returning id into tid;
    insert into thread_participants (thread_id, user_id) values (tid, auth.uid()), (tid, other);
  end if;
  return tid;
end;
$$;
