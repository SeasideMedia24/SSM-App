-- ============================================================================
-- Pricing engine for the Production Price Calculator.
--
-- Mirrors the owner's "Price Calculator - SSM" Google Sheet: crew day/half/hour
-- rates, per-page-minute pre/post services, and single-number config (markup,
-- rental tiers, discounts). All of it is editable in Settings — changing a rate
-- affects NEW quotes only; saved quotes keep the amounts they were built with.
--
-- Also adds quotes.calculator_state so a saved quote reopens with the exact
-- picker selections it was built from.
--
-- Safe to re-run.
-- ============================================================================

-- Crew roles ------------------------------------------------------------------
-- kind: 'standard'     — billed by the shoot's day/half/hour amounts
--       'photographer' — has its own booking type (day/half/hourly) per quote
--       'drone'        — billed hourly against the quote's drone hours
create table if not exists pricing_roles (
  id           uuid primary key default gen_random_uuid(),
  name         text not null unique,
  kind         text not null default 'standard' check (kind in ('standard','photographer','drone')),
  day_rate     numeric(12,2) not null default 0,
  half_rate    numeric(12,2) not null default 0,
  hour_rate    numeric(12,2) not null default 0,
  has_quantity boolean not null default false,  -- role can be booked ×N (e.g. 2 grips)
  sort         int not null default 0
);

-- Pre/Post services billed per page-minute ------------------------------------
create table if not exists pricing_page_services (
  id        uuid primary key default gen_random_uuid(),
  name      text not null unique,
  phase     text not null check (phase in ('pre','post')),
  page_rate numeric(12,2) not null default 0,
  sort      int not null default 0
);

-- Single-number knobs (markup, rental tiers, discounts, flat fees) -------------
create table if not exists pricing_config (
  key   text primary key,
  value numeric(12,4) not null default 0
);

-- Saved picker selections, so "Open" restores the calculator exactly.
alter table quotes add column if not exists calculator_state jsonb;

-- RLS ON for everything (CLAUDE.md rule #2).
alter table pricing_roles enable row level security;
alter table pricing_page_services enable row level security;
alter table pricing_config enable row level security;

drop policy if exists "pricing_roles: all for authenticated" on pricing_roles;
create policy "pricing_roles: all for authenticated"
  on pricing_roles for all to authenticated using (true) with check (true);

drop policy if exists "pricing_page_services: all for authenticated" on pricing_page_services;
create policy "pricing_page_services: all for authenticated"
  on pricing_page_services for all to authenticated using (true) with check (true);

drop policy if exists "pricing_config: all for authenticated" on pricing_config;
create policy "pricing_config: all for authenticated"
  on pricing_config for all to authenticated using (true) with check (true);

-- Seeds — the exact rates the Google Sheet's formulas charge -------------------
insert into pricing_roles (name, kind, day_rate, half_rate, hour_rate, has_quantity, sort) values
  ('DP',                    'standard',     1500,  800, 200, false, 10),
  ('Director',              'standard',      800,  500, 150, false, 20),
  ('Producer',              'standard',      800,  500, 150, false, 30),
  ('AD',                    'standard',      700,  350, 125, true,  40),
  ('Sound',                 'standard',      425,  300,  50, true,  50),
  ('Cam Op(s)',             'standard',      400,  300,  50, true,  60),
  ('Gaffer',                'standard',      400,  300,  50, false, 70),
  ('Grip(s)',               'standard',      200,  125,  25, true,  80),
  ('Drone Operator',        'drone',           0,    0, 200, true,  90),
  ('Art Director',          'standard',      400,  300,  50, true, 100),
  ('Principal Actor(s)',    'standard',      800,  400, 100, true, 110),
  ('Secondary Actor(s)',    'standard',      400,  200,  50, true, 120),
  ('Extra(s)',              'standard',      200,  100,  30, true, 130),
  ('Photographer (Event/Stills)', 'photographer', 2000, 1000, 200, true, 140),
  ('Photographer (BTS)',    'photographer', 1000,  500, 100, true, 150),
  ('PA',                    'standard',      350,  200,  35, true, 160)
on conflict (name) do nothing;

insert into pricing_page_services (name, phase, page_rate, sort) values
  ('Writer (script)', 'pre',   50, 10),
  ('Storyboard',      'pre',   75, 20),
  ('Shotlist',        'pre',   75, 30),
  ('Editor',          'post', 100, 10),
  ('Colorist',        'post',  35, 20),
  ('Sound Mixer',     'post',  20, 30),
  ('Composer',        'post',  75, 40)
on conflict (name) do nothing;

insert into pricing_config (key, value) values
  ('markup',              2.5),
  ('about_us_fee',        500),
  ('short_rate',          150),
  ('rental_low',          500),
  ('rental_medium_low',  1000),
  ('rental_medium',      2000),
  ('rental_high',        3500),
  ('discount_referral',     7),
  ('discount_first_time',   7),
  ('discount_military',    10)
on conflict (key) do nothing;
