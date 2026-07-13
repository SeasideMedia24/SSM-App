-- ============================================================================
-- Contractors Slice B1 — team logins + the permission rewrite
-- (docs/CONTRACTOR-LOGINS-PLAN.md is the reviewed plan behind this.)
--
-- ⚠️ This migration ends the "any logged-in user can do everything" era.
-- Accounts and permissions ship TOGETHER, in this one file:
--
--   • profiles.role becomes meaningful: 'owner' (Jeremy) vs 'contractor'.
--     Every EXISTING profile is backfilled to 'owner'; every FUTURE signup
--     starts as 'contractor' (least privilege — owners are only ever promoted
--     by hand in SQL).
--   • Every "all for authenticated" policy is replaced with role rules:
--       owner       → unchanged, full access
--       contractor  → own contractor row (contact + rates editable),
--                     own assignments, assigned projects (+ their tasks,
--                     deliverables, milestones) read-only,
--                     own tasks: update status + worker note ONLY,
--                     money/clients/PaePae/Google/etc: NO policy → NO access.
--   • tasks.worker_note: a contractor's note on their own task.
--   • The signup trigger links an invited auth user to their contractor row
--     (via invite metadata) and stamps their role.
--
-- Safe to re-run. Public share/onboarding pages are unaffected (they use the
-- service-role client, which bypasses RLS by design).
-- ============================================================================

-- ── 0. Schema bits ──────────────────────────────────────────────────────────

alter table tasks add column if not exists worker_note text;

-- Existing accounts (Jeremy's) are the owner; enforce the two-role vocabulary.
update profiles set role = 'owner' where role is null or role not in ('owner', 'contractor');

-- ── 1. Role helpers (SECURITY DEFINER so policies can read them cheaply) ────

create or replace function public.app_role()
returns text
language sql stable security definer
set search_path = public
as $$
  select coalesce((select role from profiles where id = auth.uid()), 'none');
$$;

create or replace function public.my_contractor_id()
returns uuid
language sql stable security definer
set search_path = public
as $$
  select id from contractors where user_id = auth.uid() limit 1;
$$;

create or replace function public.is_assigned_to_project(pid uuid)
returns boolean
language sql stable security definer
set search_path = public
as $$
  select exists (
    select 1 from project_contractors pc
    where pc.project_id = pid and pc.contractor_id = public.my_contractor_id()
  );
$$;

-- ── 2. Signup trigger: least-privilege role + contractor linking ────────────
-- Every new auth user starts as 'contractor' (there is no public signup path;
-- invites are the only way in, and owners are promoted manually). If the invite
-- carried a contractor_id, link the login to that contractor record.

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  cid uuid;
begin
  insert into public.profiles (id, full_name, role)
  values (new.id, new.raw_user_meta_data ->> 'full_name', 'contractor')
  on conflict (id) do nothing;

  cid := nullif(new.raw_user_meta_data ->> 'contractor_id', '')::uuid;
  if cid is not null then
    update public.contractors set user_id = new.id
    where id = cid and user_id is null;
  end if;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ── 3. Column guards (RLS gates rows; these triggers gate COLUMNS) ──────────

-- Contractors may flip status / write worker_note on their tasks — nothing else.
create or replace function public.enforce_contractor_task_update()
returns trigger
language plpgsql security definer
set search_path = public
as $$
begin
  if public.app_role() = 'contractor' then
    if new.id is distinct from old.id
      or new.project_id is distinct from old.project_id
      or new.client_id is distinct from old.client_id
      or new.title is distinct from old.title
      or new.description is distinct from old.description
      or new.assignee_id is distinct from old.assignee_id
      or new.priority is distinct from old.priority
      or new.due_date is distinct from old.due_date
      or new.created_at is distinct from old.created_at
    then
      raise exception 'Contractors can only change a task''s status or note.';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists contractor_task_update_guard on tasks;
create trigger contractor_task_update_guard
  before update on tasks
  for each row execute function public.enforce_contractor_task_update();

-- Contractors may edit their own contact details + rates — not their type,
-- linkage, or onboarding fields.
create or replace function public.enforce_contractor_self_update()
returns trigger
language plpgsql security definer
set search_path = public
as $$
begin
  if public.app_role() = 'contractor' then
    if new.id is distinct from old.id
      or new.type is distinct from old.type
      or new.user_id is distinct from old.user_id
      or new.onboard_token is distinct from old.onboard_token
      or new.onboarded_at is distinct from old.onboarded_at
      or new.created_at is distinct from old.created_at
    then
      raise exception 'Contractors can only change their own contact details and rates.';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists contractor_self_update_guard on contractors;
create trigger contractor_self_update_guard
  before update on contractors
  for each row execute function public.enforce_contractor_self_update();

-- ── 4. The permission rewrite ────────────────────────────────────────────────
-- profiles keeps its existing policies (read for authenticated — names only —
-- and update-own-row). google_accounts / google_calendars are already
-- per-user. EVERYTHING else changes below.

-- Owner-only tables: money, clients, leads, PaePae. No contractor policy at
-- all — deny-by-default is the safety net.
drop policy if exists "clients: all for authenticated" on clients;
create policy "clients: owner all" on clients
  for all to authenticated using (public.app_role() = 'owner') with check (public.app_role() = 'owner');

drop policy if exists "quotes: all for authenticated" on quotes;
create policy "quotes: owner all" on quotes
  for all to authenticated using (public.app_role() = 'owner') with check (public.app_role() = 'owner');

drop policy if exists "quote_line_items: all for authenticated" on quote_line_items;
create policy "quote_line_items: owner all" on quote_line_items
  for all to authenticated using (public.app_role() = 'owner') with check (public.app_role() = 'owner');

drop policy if exists "rate_presets: all for authenticated" on rate_presets;
create policy "rate_presets: owner all" on rate_presets
  for all to authenticated using (public.app_role() = 'owner') with check (public.app_role() = 'owner');

drop policy if exists "pricing_roles: all for authenticated" on pricing_roles;
create policy "pricing_roles: owner all" on pricing_roles
  for all to authenticated using (public.app_role() = 'owner') with check (public.app_role() = 'owner');

drop policy if exists "pricing_page_services: all for authenticated" on pricing_page_services;
create policy "pricing_page_services: owner all" on pricing_page_services
  for all to authenticated using (public.app_role() = 'owner') with check (public.app_role() = 'owner');

drop policy if exists "pricing_config: all for authenticated" on pricing_config;
create policy "pricing_config: owner all" on pricing_config
  for all to authenticated using (public.app_role() = 'owner') with check (public.app_role() = 'owner');

drop policy if exists "contracts: all for authenticated" on contracts;
create policy "contracts: owner all" on contracts
  for all to authenticated using (public.app_role() = 'owner') with check (public.app_role() = 'owner');

drop policy if exists "expenses: all for authenticated" on expenses;
create policy "expenses: owner all" on expenses
  for all to authenticated using (public.app_role() = 'owner') with check (public.app_role() = 'owner');

drop policy if exists "budget_lines: all for authenticated" on budget_lines;
create policy "budget_lines: owner all" on budget_lines
  for all to authenticated using (public.app_role() = 'owner') with check (public.app_role() = 'owner');

drop policy if exists "paepae_actions: all for authenticated" on paepae_actions;
create policy "paepae_actions: owner all" on paepae_actions
  for all to authenticated using (public.app_role() = 'owner') with check (public.app_role() = 'owner');

drop policy if exists "invoices: all for authenticated" on invoices;
create policy "invoices: owner all" on invoices
  for all to authenticated using (public.app_role() = 'owner') with check (public.app_role() = 'owner');

drop policy if exists "invoice_line_items: all for authenticated" on invoice_line_items;
create policy "invoice_line_items: owner all" on invoice_line_items
  for all to authenticated using (public.app_role() = 'owner') with check (public.app_role() = 'owner');

drop policy if exists "onboarding: all for authenticated" on onboarding_submissions;
create policy "onboarding: owner all" on onboarding_submissions
  for all to authenticated using (public.app_role() = 'owner') with check (public.app_role() = 'owner');

-- Projects: owner everything; contractors read the ones they're assigned to.
drop policy if exists "projects: all for authenticated" on projects;
create policy "projects: owner all" on projects
  for all to authenticated using (public.app_role() = 'owner') with check (public.app_role() = 'owner');
create policy "projects: contractor read assigned" on projects
  for select to authenticated using (public.is_assigned_to_project(id));

-- Tasks: owner everything; contractors read tasks on assigned projects (plus
-- any task assigned directly to them) and update ONLY their own (the trigger
-- above limits which columns).
drop policy if exists "tasks: all for authenticated" on tasks;
create policy "tasks: owner all" on tasks
  for all to authenticated using (public.app_role() = 'owner') with check (public.app_role() = 'owner');
create policy "tasks: contractor read" on tasks
  for select to authenticated using (
    assignee_id = auth.uid()
    or (project_id is not null and public.is_assigned_to_project(project_id))
  );
create policy "tasks: contractor update own" on tasks
  for update to authenticated
  using (assignee_id = auth.uid())
  with check (assignee_id = auth.uid());

-- Deliverables & milestones: owner everything; contractors read on assigned projects.
drop policy if exists "deliverables: all for authenticated" on deliverables;
create policy "deliverables: owner all" on deliverables
  for all to authenticated using (public.app_role() = 'owner') with check (public.app_role() = 'owner');
create policy "deliverables: contractor read assigned" on deliverables
  for select to authenticated using (public.is_assigned_to_project(project_id));

drop policy if exists "milestones: all for authenticated" on milestones;
create policy "milestones: owner all" on milestones
  for all to authenticated using (public.app_role() = 'owner') with check (public.app_role() = 'owner');
create policy "milestones: contractor read assigned" on milestones
  for select to authenticated using (public.is_assigned_to_project(project_id));

-- Contractors table: owner everything; a contractor sees and edits ONLY their
-- own row (the trigger above limits which columns).
drop policy if exists "contractors: all for authenticated" on contractors;
create policy "contractors: owner all" on contractors
  for all to authenticated using (public.app_role() = 'owner') with check (public.app_role() = 'owner');
create policy "contractors: self read" on contractors
  for select to authenticated using (user_id = auth.uid());
create policy "contractors: self update" on contractors
  for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Assignments: owner everything; contractors see their own.
drop policy if exists "project_contractors: all for authenticated" on project_contractors;
create policy "project_contractors: owner all" on project_contractors
  for all to authenticated using (public.app_role() = 'owner') with check (public.app_role() = 'owner');
create policy "project_contractors: contractor read own" on project_contractors
  for select to authenticated using (contractor_id = public.my_contractor_id());
