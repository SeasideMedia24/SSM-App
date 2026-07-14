-- ============================================================================
-- Calculator: drop the redundant actor A/B/C tier feature.
--
-- Actors are already covered by the seeded crew roles (Principal / Secondary /
-- Extra Actor(s) in 20260707000001), so the separate tier card added in
-- 20260712000002 was a second, overlapping way to add actors. We removed it in
-- the app; this clears its now-unused config rows so Settings → "The numbers"
-- stays tidy. The per-permit fee (also added in 20260712000002) stays.
--
-- Safe to re-run.
-- ============================================================================

delete from pricing_config
where key in ('actor_high', 'actor_medium', 'actor_low');
