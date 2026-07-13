-- ============================================================================
-- Calculator: actor/model tiers + permits
--
-- Four new pricing_config rates (all default $0 so nothing changes until the
-- owner sets them in Settings → Edit rates):
--   actor_high / actor_medium / actor_low  — per-actor day rate by tier
--   permit                                 — per-permit fee
--
-- Actors are billed like crew (marked up); permits are a pass-through cost
-- (billed at cost, like travel). Safe to re-run — inserts only if absent so an
-- owner's edited values are never overwritten.
-- ============================================================================

insert into pricing_config (key, value)
values
  ('actor_high', 0),
  ('actor_medium', 0),
  ('actor_low', 0),
  ('permit', 0)
on conflict (key) do nothing;
