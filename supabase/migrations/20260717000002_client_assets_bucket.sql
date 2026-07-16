-- ============================================================================
-- Client portal — private Storage bucket for uploaded brand assets (Slice 2c)
--
-- Clients upload logos/brand files from the portal. They go into a PRIVATE
-- bucket: uploads happen via short-lived signed upload URLs minted server-side
-- (token-gated), and the owner reads them via signed download URLs. Because all
-- access is mediated by the service-role admin client / signed URLs, no public
-- policy is needed on the bucket.
--
-- Safe to re-run.
-- ============================================================================

insert into storage.buckets (id, name, public)
values ('client-assets', 'client-assets', false)
on conflict (id) do nothing;
