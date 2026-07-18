-- ============================================================================
-- Brainstorming canvas (Slice 4) — a free-form pre-production space.
--
--   boards        one canvas, tagged by kind (storyboard / shotlist / brainstorm
--                 / storyline). Storyline renders in a timeline mode.
--   board_items   everything ON a board — notes, images, files, links, embeds —
--                 positioned in world coordinates (x,y,w,h) with a stacking z.
--
-- Owner-only for now (authenticated policies); per-org isolation slots in later
-- (Phase 4), same as the rest of the app. Media lives in the private
-- `brainstorm-media` bucket (signed URLs; no public policy needed).
--
-- Safe to re-run.
-- ============================================================================

create table if not exists boards (
  id         uuid primary key default gen_random_uuid(),
  kind       text not null check (kind in ('storyboard','shotlist','brainstorm','storyline')),
  title      text not null default 'Untitled',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists board_items (
  id         uuid primary key default gen_random_uuid(),
  board_id   uuid not null references boards (id) on delete cascade,
  type       text not null check (type in ('note','image','file','link','embed')),
  x          numeric not null default 0,
  y          numeric not null default 0,
  w          numeric not null default 220,
  h          numeric not null default 160,
  z          int not null default 0,
  rotation   numeric not null default 0,
  content    jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_board_items_board_id on board_items (board_id);

-- RLS ON for both (CLAUDE.md rule #2). v1: any authenticated user (the owner).
alter table boards enable row level security;
alter table board_items enable row level security;

drop policy if exists "boards: all for authenticated" on boards;
create policy "boards: all for authenticated"
  on boards for all to authenticated using (true) with check (true);

drop policy if exists "board_items: all for authenticated" on board_items;
create policy "board_items: all for authenticated"
  on board_items for all to authenticated using (true) with check (true);

-- Private bucket for uploaded canvas media (logos, stills, reference docs).
insert into storage.buckets (id, name, public)
values ('brainstorm-media', 'brainstorm-media', false)
on conflict (id) do nothing;
