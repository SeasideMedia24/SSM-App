-- ============================================================================
-- Client self-onboarding.
--
-- A prospective client fills out a public form (a generic intake link, or a
-- private per-client invite link). The submission is written server-side by the
-- service-role key (see lib/supabase/admin.ts) — RLS stays fully locked, so the
-- public anon key can never read or write these tables directly.
--
-- On submit the app also creates a client + draft project + draft contract; the
-- raw answers are kept here for the owner's reference.
--
-- Safe to re-run.
-- ============================================================================

-- Per-client invite support on the existing clients table.
alter table clients add column if not exists onboard_token uuid;         -- private invite token
alter table clients add column if not exists onboarded_at  timestamptz;  -- when they completed it
create index if not exists idx_clients_onboard_token on clients (onboard_token);

-- Raw onboarding answers (one row per completed form).
create table if not exists onboarding_submissions (
  id                  uuid primary key default gen_random_uuid(),
  name                text not null,
  company             text,
  email               text,
  phone               text,
  project_type        text,
  project_description text,
  budget_range        text,
  desired_timeline    text,
  heard_from          text,
  status              text not null default 'new',  -- new | reviewed
  client_id           uuid references clients (id) on delete set null,
  project_id          uuid references projects (id) on delete set null,
  created_at          timestamptz not null default now()
);

create index if not exists idx_onboarding_submissions_created on onboarding_submissions (created_at desc);

-- RLS ON. Signed-in users (the owner) can read/manage submissions. There is NO
-- policy for anon — public writes go through the service-role admin client only.
alter table onboarding_submissions enable row level security;

drop policy if exists "onboarding: all for authenticated" on onboarding_submissions;
create policy "onboarding: all for authenticated"
  on onboarding_submissions for all to authenticated using (true) with check (true);
