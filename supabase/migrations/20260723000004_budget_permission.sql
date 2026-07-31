-- ============================================================================
-- Budget visibility — an explicit, off-by-default per-contractor permission.
--
-- Budget is owner-only today: contractors are redirected out of the owner app,
-- and `quotes` (which the budget is built from) have NO contractor RLS policy,
-- so deny-by-default already hides them. This adds the *opt-in* half: flip
-- `can_see_budget` on a specific trusted contractor and they may READ the quotes
-- of the projects they're assigned to — nothing else (no insert/update, no
-- pricing rate-card, no other project's quotes).
--
-- Deliberately NOT tied to clearance: budget access is orthogonal to L1/L2/L3
-- and is never granted by default at any level. See lib/auth/clearance.ts.
--
-- Safe to re-run.
-- ============================================================================

alter table contractors add column if not exists can_see_budget boolean not null default false;

-- Owner always; a contractor only if they're flagged AND assigned to `pid`.
create or replace function public.can_see_project_budget(pid uuid)
returns boolean
language sql security definer stable
set search_path = public
as $$
  select public.app_role() = 'owner'
    or exists (
      select 1
        from project_contractors pc
        join contractors c on c.id = pc.contractor_id
       where pc.project_id = pid
         and c.user_id = auth.uid()
         and c.can_see_budget = true
    );
$$;

-- Read path for budget-permitted contractors. This ADDS to the existing
-- "quotes: owner all" policy — Postgres OR's policies together, so it never
-- widens the owner's own access, only opens a scoped read for flagged people.
drop policy if exists "quotes: budget-permitted read" on quotes;
create policy "quotes: budget-permitted read" on quotes
  for select to authenticated
  using (project_id is not null and public.can_see_project_budget(project_id));
