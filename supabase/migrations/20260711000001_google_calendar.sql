-- ============================================================================
-- Google Calendar (read-only sync) — Phase 3, slice 1
--
-- Two tables:
--   google_accounts   one row per user: the OAuth refresh token that lets the
--                      server read their Google Calendar. Tokens are only ever
--                      touched by server code; they never reach the browser.
--   google_calendars  the user's calendars (from Google's calendar list) with
--                      an `included` flag so Settings can choose which ones
--                      feed the dashboard calendar (e.g. only "Home").
--
-- Safe to re-run.
-- ============================================================================

create table if not exists google_accounts (
  user_id uuid primary key references auth.users (id) on delete cascade,
  email text,
  refresh_token text not null,
  access_token text,
  access_token_expires_at timestamptz,
  connected_at timestamptz not null default now()
);

create table if not exists google_calendars (
  user_id uuid not null references auth.users (id) on delete cascade,
  id text not null,           -- Google's calendar id
  summary text not null default '',
  color text,
  is_primary boolean not null default false,
  included boolean not null default true,
  primary key (user_id, id)
);

alter table google_accounts  enable row level security;
alter table google_calendars enable row level security;

-- Each user manages only their own connection (single-user today; already
-- shaped for Phase 4 multi-user).
drop policy if exists "own google account" on google_accounts;
create policy "own google account" on google_accounts
  for all to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "own google calendars" on google_calendars;
create policy "own google calendars" on google_calendars
  for all to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
