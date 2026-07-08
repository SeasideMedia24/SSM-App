-- ============================================================================
-- PaePae action log
--
-- Records every write PaePae performs AFTER the user confirms it (the execute
-- step of the propose → confirm → execute gate). This powers the dashboard
-- "what PaePae did recently" box, so the owner can see — and click into — exactly
-- what happened over the last few days.
--
-- Read-only history: nothing else writes here except the execute route, and the
-- app never edits or deletes these rows.
--
-- Safe to re-run.
-- ============================================================================

create table if not exists paepae_actions (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references profiles (id) on delete cascade, -- who confirmed it
  action      text not null,                    -- e.g. 'create_task', 'update_quote'
  summary     text[] not null default '{}',     -- the confirmation card's human-readable lines
  result      text,                             -- the success message executeAction returned
  created_at  timestamptz not null default now()
);

-- The dashboard box queries the most recent rows.
create index if not exists paepae_actions_created_at_idx
  on paepae_actions (created_at desc);

-- RLS is ON for every table (CLAUDE.md hard rule). Phase 1: any signed-in user;
-- the `true` check is the seam for per-organization isolation in Phase 4.
alter table paepae_actions enable row level security;

drop policy if exists "paepae_actions: all for authenticated" on paepae_actions;
create policy "paepae_actions: all for authenticated"
  on paepae_actions for all to authenticated using (true) with check (true);
