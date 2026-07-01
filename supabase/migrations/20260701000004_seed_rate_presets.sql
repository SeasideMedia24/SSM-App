-- ============================================================================
-- Seed the calculator with a few PLACEHOLDER rate presets.
--
-- ⚠️  These numbers are made up. Edit them to Seaside Media's real rates —
--     either here (and re-run) or, once the app is running, in Settings.
--
-- `unit` is just a label shown next to the rate (e.g. "day", "hour").
--
-- Safe to re-run: the seed only inserts when the table is still empty, so
-- running this again won't create duplicate rows. (Once you've edited rates in
-- the app, this block does nothing.)
-- ============================================================================

insert into rate_presets (label, unit, default_rate)
select v.label, v.unit, v.default_rate
from (values
  ('Full shoot day',        'day',         1500.00),
  ('Half shoot day',        'half-day',     850.00),
  ('Editing',               'hour',         120.00),
  ('Color grade',           'deliverable',  400.00),
  ('Drone / aerial add-on', 'day',          500.00),
  ('Travel',                'day',          250.00)
) as v(label, unit, default_rate)
where not exists (select 1 from rate_presets);
