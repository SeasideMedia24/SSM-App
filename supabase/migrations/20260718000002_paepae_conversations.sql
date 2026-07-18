-- ============================================================================
-- PaePae: saved conversations.
--
-- The chat used to live only in browser memory — closing the dock or leaving
-- the page lost it. Each conversation is one row; `messages` holds the full
-- rich transcript (text, lookup chips, receipts, proposal cards + their
-- states) as the client renders it, so reopening restores everything.
--
-- Single-user: RLS authenticated, like the rest of the app.
-- Safe to re-run.
-- ============================================================================

create table if not exists paepae_conversations (
  id         uuid primary key default gen_random_uuid(),
  title      text not null default 'New chat',
  messages   jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table paepae_conversations enable row level security;

drop policy if exists "paepae_conversations: all for authenticated" on paepae_conversations;
create policy "paepae_conversations: all for authenticated"
  on paepae_conversations for all to authenticated using (true) with check (true);
