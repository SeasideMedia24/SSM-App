-- ============================================================================
-- messageable_users() — who the caller may start a DM with.
--
--   • owner  → every linked team member (contractors with a login)
--   • team   → the owner, plus anyone they share a project with
--
-- SECURITY DEFINER so a team member can see their project teammates without a
-- broad read policy on contractors/profiles. Powers the "New message" picker.
--
-- Safe to re-run.
-- ============================================================================

create or replace function public.messageable_users()
returns table (user_id uuid, name text)
language sql security definer stable
set search_path = public
as $$
  with me as (select auth.uid() as uid, public.app_role() as role)
  -- Owner sees every team member with a login.
  select c.user_id, coalesce(p.full_name, c.name) as name
    from contractors c
    join profiles p on p.id = c.user_id
   where (select role from me) = 'owner' and c.user_id is not null

  union

  -- Team members see the owner…
  select p.id, coalesce(p.full_name, 'Seaside Media')
    from profiles p, me
   where me.role <> 'owner' and p.role = 'owner'

  union

  -- …and their project teammates (other linked contractors on shared projects).
  select c2.user_id, coalesce(p2.full_name, c2.name)
    from me
    join contractors c1 on c1.user_id = me.uid
    join project_contractors pc1 on pc1.contractor_id = c1.id
    join project_contractors pc2 on pc2.project_id = pc1.project_id
    join contractors c2 on c2.id = pc2.contractor_id and c2.user_id is not null and c2.user_id <> me.uid
    join profiles p2 on p2.id = c2.user_id
   where me.role <> 'owner';
$$;
