-- ============================================================================
-- Row-Level Security (RLS)
--
-- HARD RULE (CLAUDE.md): RLS is ON for every table. We never disable it.
--
-- v1 is single-user, so the rule is simply "any signed-in user may read/write."
-- The policies are written with a clear seam so Phase 4 can swap the `true`
-- checks for an organization-membership check (per-org data isolation) without
-- restructuring anything.
--
-- `to authenticated` means: only requests carrying a valid logged-in user's
-- token are allowed. Anonymous requests (and the public/publishable key on its
-- own) get nothing.
--
-- Safe to re-run: each policy is dropped first (if present) then recreated.
-- ============================================================================

alter table profiles         enable row level security;
alter table clients          enable row level security;
alter table projects         enable row level security;
alter table tasks            enable row level security;
alter table quotes           enable row level security;
alter table quote_line_items enable row level security;
alter table rate_presets     enable row level security;

-- ── profiles ─────────────────────────────────────────────────────────────────
-- Everyone signed in can read profiles (needed to show assignee names).
-- A user may only edit their own profile row.
drop policy if exists "profiles: read for authenticated" on profiles;
create policy "profiles: read for authenticated"
  on profiles for select to authenticated using (true);

drop policy if exists "profiles: update own row" on profiles;
create policy "profiles: update own row"
  on profiles for update to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

-- ── clients / projects / tasks / quotes / quote_line_items / rate_presets ────
-- Phase 1: full access for any authenticated user.
-- Phase 4: replace `true` with e.g. `organization_id = current_user_org()`.
drop policy if exists "clients: all for authenticated" on clients;
create policy "clients: all for authenticated"
  on clients for all to authenticated using (true) with check (true);

drop policy if exists "projects: all for authenticated" on projects;
create policy "projects: all for authenticated"
  on projects for all to authenticated using (true) with check (true);

drop policy if exists "tasks: all for authenticated" on tasks;
create policy "tasks: all for authenticated"
  on tasks for all to authenticated using (true) with check (true);

drop policy if exists "quotes: all for authenticated" on quotes;
create policy "quotes: all for authenticated"
  on quotes for all to authenticated using (true) with check (true);

drop policy if exists "quote_line_items: all for authenticated" on quote_line_items;
create policy "quote_line_items: all for authenticated"
  on quote_line_items for all to authenticated using (true) with check (true);

drop policy if exists "rate_presets: all for authenticated" on rate_presets;
create policy "rate_presets: all for authenticated"
  on rate_presets for all to authenticated using (true) with check (true);
