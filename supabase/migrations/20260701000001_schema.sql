-- ============================================================================
-- Seaside Media Ops Hub — v1 schema
-- Tables: profiles, clients, projects, tasks, quotes, quote_line_items,
--         rate_presets  (see BUILD-SPEC.md §3)
--
-- This file only creates the tables, enums and indexes.
-- Row-Level Security lives in the next migration (…_rls.sql) so it's easy to read.
--
-- Safe to re-run: everything is guarded with "if not exists" so running this
-- twice does nothing the second time (no scary "already exists" errors).
-- ============================================================================

-- gen_random_uuid() lives in the pgcrypto extension.
create extension if not exists pgcrypto;

-- ── Enums ───────────────────────────────────────────────────────────────────
-- These are the fixed sets of values used by status/category/priority columns.
-- To add a new option later: `alter type <name> add value '<new>';`
-- The DO/EXCEPTION blocks make each `create type` a no-op if it already exists.
do $$ begin
  create type project_status as enum ('backlog', 'active', 'in_review', 'done', 'archived');
exception when duplicate_object then null; end $$;

do $$ begin
  create type para_category as enum ('project', 'area', 'resource', 'archive');
exception when duplicate_object then null; end $$;

do $$ begin
  create type task_status as enum ('todo', 'in_progress', 'blocked', 'done');
exception when duplicate_object then null; end $$;

do $$ begin
  create type task_priority as enum ('low', 'medium', 'high');
exception when duplicate_object then null; end $$;

do $$ begin
  create type quote_status as enum ('draft', 'sent', 'accepted', 'declined');
exception when duplicate_object then null; end $$;

-- ── profiles ────────────────────────────────────────────────────────────────
-- Extends Supabase's built-in auth.users with app-facing fields.
-- A row is created automatically on signup (see …_profile_trigger.sql).
create table if not exists profiles (
  id         uuid primary key references auth.users (id) on delete cascade,
  full_name  text,
  role       text,
  avatar_url text,
  created_at timestamptz not null default now()
);

-- ── clients ─────────────────────────────────────────────────────────────────
create table if not exists clients (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  company    text,
  email      text,
  phone      text,
  notes      text,
  created_at timestamptz not null default now()
);

-- ── projects ────────────────────────────────────────────────────────────────
-- Deleting a client cascades to its projects (and onward to tasks/quotes).
-- Deletion is always confirmed in the UI before it happens.
create table if not exists projects (
  id            uuid primary key default gen_random_uuid(),
  client_id     uuid not null references clients (id) on delete cascade,
  title         text not null,
  description   text,
  status        project_status not null default 'backlog',
  para_category para_category  not null default 'project',
  start_date    date,
  due_date      date,
  created_at    timestamptz not null default now()
);

-- ── tasks ───────────────────────────────────────────────────────────────────
-- assignee_id is nullable; if a profile is removed the task stays but unassigns.
create table if not exists tasks (
  id          uuid primary key default gen_random_uuid(),
  project_id  uuid not null references projects (id) on delete cascade,
  title       text not null,
  description text,
  status      task_status   not null default 'todo',
  assignee_id uuid references profiles (id) on delete set null,
  priority    task_priority not null default 'medium',
  due_date    date,
  created_at  timestamptz not null default now()
);

-- ── quotes ──────────────────────────────────────────────────────────────────
-- project_id is optional (a quote can exist for a client with no project yet).
-- subtotal/total are stored in the client's currency as plain decimals.
create table if not exists quotes (
  id         uuid primary key default gen_random_uuid(),
  client_id  uuid not null references clients (id) on delete cascade,
  project_id uuid references projects (id) on delete set null,
  title      text not null,
  status     quote_status not null default 'draft',
  subtotal   numeric(12,2) not null default 0,
  total      numeric(12,2) not null default 0,
  notes      text,
  created_at timestamptz not null default now()
);

-- ── quote_line_items ────────────────────────────────────────────────────────
-- amount is normally quantity * rate; it's stored so historical quotes never
-- change if a preset rate is edited later. `position` controls display order.
create table if not exists quote_line_items (
  id       uuid primary key default gen_random_uuid(),
  quote_id uuid not null references quotes (id) on delete cascade,
  label    text not null,
  quantity numeric(12,2) not null default 1,
  unit     text,
  rate     numeric(12,2) not null default 0,
  amount   numeric(12,2) not null default 0,
  position int not null default 0
);

-- ── rate_presets ────────────────────────────────────────────────────────────
-- Reusable, editable rates the calculator offers so you don't retype them.
-- Seeded with placeholders in …_seed_rate_presets.sql — edit to your real rates.
create table if not exists rate_presets (
  id           uuid primary key default gen_random_uuid(),
  label        text not null,
  unit         text not null,
  default_rate numeric(12,2) not null default 0,
  created_at   timestamptz not null default now()
);

-- ── Indexes on foreign keys (keeps lookups fast as data grows) ───────────────
create index if not exists idx_projects_client_id        on projects (client_id);
create index if not exists idx_tasks_project_id          on tasks (project_id);
create index if not exists idx_tasks_assignee_id         on tasks (assignee_id);
create index if not exists idx_quotes_client_id          on quotes (client_id);
create index if not exists idx_quotes_project_id         on quotes (project_id);
create index if not exists idx_quote_line_items_quote_id on quote_line_items (quote_id);
