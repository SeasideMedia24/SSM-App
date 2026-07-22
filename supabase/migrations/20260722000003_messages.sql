-- ============================================================================
-- Internal messaging v1 — project threads + direct messages.
--
--   threads             one conversation: kind 'project' (everyone assigned to
--                       the project + the owner) or 'dm' (explicit participants)
--   thread_participants who's in a DM + everyone's per-thread last_read_at
--                       (unread tracking); project-thread ACCESS derives from
--                       assignment, so rows there exist only for read-tracking
--   messages            the messages (append-only in v1)
--
-- Access = owner everywhere; a contractor sees a thread if they're a
-- participant OR it's the project thread of a project they're assigned to.
-- can_access_thread() wraps that for the policies; unread_message_count()
-- powers the nav badges on both surfaces.
--
-- Safe to re-run.
-- ============================================================================

create table if not exists threads (
  id         uuid primary key default gen_random_uuid(),
  kind       text not null check (kind in ('project', 'dm')),
  project_id uuid references projects (id) on delete cascade,
  created_at timestamptz not null default now()
);

-- One project thread per project.
create unique index if not exists idx_threads_one_per_project on threads (project_id) where kind = 'project';

create table if not exists thread_participants (
  thread_id    uuid not null references threads (id) on delete cascade,
  user_id      uuid not null references profiles (id) on delete cascade,
  last_read_at timestamptz,
  primary key (thread_id, user_id)
);

create table if not exists messages (
  id         uuid primary key default gen_random_uuid(),
  thread_id  uuid not null references threads (id) on delete cascade,
  sender_id  uuid not null references profiles (id) on delete cascade,
  body       text not null,
  created_at timestamptz not null default now()
);

create index if not exists idx_messages_thread on messages (thread_id, created_at);

-- ── Access helper ─────────────────────────────────────────────────────────────
create or replace function public.can_access_thread(tid uuid)
returns boolean
language sql security definer stable
set search_path = public
as $$
  select public.app_role() = 'owner'
    or exists (select 1 from thread_participants tp where tp.thread_id = tid and tp.user_id = auth.uid())
    or exists (
      select 1 from threads t
       where t.id = tid and t.kind = 'project' and t.project_id is not null
         and public.is_assigned_to_project(t.project_id)
    );
$$;

-- Unread = messages in threads I can access, from someone else, newer than my
-- last_read_at for that thread (never read → everything counts).
create or replace function public.unread_message_count()
returns int
language sql security definer stable
set search_path = public
as $$
  select count(*)::int
    from messages m
   where public.can_access_thread(m.thread_id)
     and m.sender_id <> auth.uid()
     and m.created_at > coalesce(
       (select tp.last_read_at from thread_participants tp
         where tp.thread_id = m.thread_id and tp.user_id = auth.uid()),
       '-infinity'::timestamptz);
$$;

-- ── RLS ───────────────────────────────────────────────────────────────────────
alter table threads enable row level security;
alter table thread_participants enable row level security;
alter table messages enable row level security;

drop policy if exists "threads: read accessible" on threads;
create policy "threads: read accessible" on threads
  for select to authenticated using (public.can_access_thread(id));

drop policy if exists "threads: owner write" on threads;
create policy "threads: owner write" on threads
  for all to authenticated using (public.app_role() = 'owner') with check (public.app_role() = 'owner');

drop policy if exists "participants: read accessible" on thread_participants;
create policy "participants: read accessible" on thread_participants
  for select to authenticated using (public.can_access_thread(thread_id));

drop policy if exists "participants: owner write" on thread_participants;
create policy "participants: owner write" on thread_participants
  for all to authenticated using (public.app_role() = 'owner') with check (public.app_role() = 'owner');

-- Anyone with thread access may create/update their OWN participant row — that's
-- how read-tracking works for project threads (access via assignment, no row yet).
drop policy if exists "participants: self upsert" on thread_participants;
create policy "participants: self upsert" on thread_participants
  for insert to authenticated
  with check (user_id = auth.uid() and public.can_access_thread(thread_id));

drop policy if exists "participants: self update" on thread_participants;
create policy "participants: self update" on thread_participants
  for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

drop policy if exists "messages: read accessible" on messages;
create policy "messages: read accessible" on messages
  for select to authenticated using (public.can_access_thread(thread_id));

drop policy if exists "messages: post as self" on messages;
create policy "messages: post as self" on messages
  for insert to authenticated
  with check (sender_id = auth.uid() and public.can_access_thread(thread_id));

-- ── Backfill: a project thread for every project that already has a team ─────
insert into threads (kind, project_id)
select 'project', pc.project_id
  from project_contractors pc
 where not exists (select 1 from threads t where t.kind = 'project' and t.project_id = pc.project_id)
 group by pc.project_id;
