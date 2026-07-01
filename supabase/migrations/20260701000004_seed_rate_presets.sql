-- ============================================================================
-- Seed the calculator with a few PLACEHOLDER rate presets.
--
-- ⚠️  These numbers are made up. Edit them to Seaside Media's real rates —
--     either here (and re-run) or, once the app is running, in Settings.
--
-- `unit` is just a label shown next to the rate (e.g. "day", "hour").
-- ============================================================================

insert into rate_presets (label, unit, default_rate) values
  ('Full shoot day',        'day',         1500.00),
  ('Half shoot day',        'half-day',     850.00),
  ('Editing',               'hour',         120.00),
  ('Color grade',           'deliverable',  400.00),
  ('Drone / aerial add-on', 'day',          500.00),
  ('Travel',                'day',          250.00);
