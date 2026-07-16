-- ============================================================================
-- Client onboarding portal — Slice 2
--
-- After a client signs, they get a private /portal/<token> hub to book the
-- creative kickoff, hand over brand assets, and see how revisions work. Clients
-- have no logins, so — like /contract and /onboard — the portal is anonymous and
-- gated entirely by the unguessable token; all reads/writes go through the
-- service-role admin client (no anon RLS policy is added).
--
--   client_portal   one row per project: the token + everything the client fills
--                    in (brand, tech/logistics, external links, kickoff booking).
--   portal_assets   files the client uploaded (stored in Supabase Storage; this
--                    table just indexes them). Storage bucket comes in the 2c
--                    migration.
--
-- Safe to re-run.
-- ============================================================================

create table if not exists client_portal (
  project_id   uuid primary key references projects (id) on delete cascade,
  portal_token uuid,
  brand        jsonb,
  tech         jsonb,
  links        jsonb,
  kickoff_at   timestamptz,
  kickoff_link text,
  submitted_at timestamptz,
  created_at   timestamptz not null default now()
);

create index if not exists idx_client_portal_token on client_portal (portal_token);

create table if not exists portal_assets (
  id           uuid primary key default gen_random_uuid(),
  project_id   uuid not null references projects (id) on delete cascade,
  storage_path text not null,
  filename     text not null,
  size         int,
  content_type text,
  created_at   timestamptz not null default now()
);

create index if not exists idx_portal_assets_project on portal_assets (project_id);

alter table client_portal enable row level security;
alter table portal_assets enable row level security;

-- Owner (authenticated) manages everything; anon reaches the portal only through
-- the admin client, gated by the token — so no anon policy here.
drop policy if exists "client_portal: all for authenticated" on client_portal;
create policy "client_portal: all for authenticated"
  on client_portal for all to authenticated using (true) with check (true);

drop policy if exists "portal_assets: all for authenticated" on portal_assets;
create policy "portal_assets: all for authenticated"
  on portal_assets for all to authenticated using (true) with check (true);
