-- ============================================================================
-- Contracts: turn the tracking record into a signable document.
--
-- Contracts today are just a row (title, status, amount, signed_date). This adds
-- everything needed for the client-journey spine:
--   quote → auto-generated contract → client signs online → deposit invoice.
--
-- The contract body is rendered from the owner's template and SNAPSHOT into
-- body_md at send time, so later template edits never change an already-sent
-- contract (same principle as saved quotes / pricing).
--
-- The client signs at a private /contract/<share_token> link. That page is
-- anonymous, so signing writes go through the service-role admin client only —
-- RLS on `contracts` stays locked for anon (no anon policy is added here).
--
-- Safe to re-run.
-- ============================================================================

alter table contracts
  add column if not exists share_token        uuid,
  add column if not exists quote_id           uuid references quotes (id) on delete set null,
  add column if not exists effective_date     date,
  add column if not exists deposit_amount     numeric(12,2),
  add column if not exists production_amount  numeric(12,2),
  add column if not exists delivery_amount    numeric(12,2),
  -- Revisions: N rounds, each covering X% of the video (contract clause 1.2).
  add column if not exists revision_rounds    int not null default 2,
  add column if not exists revision_pct       int not null default 100,
  add column if not exists body_md            text,   -- rendered snapshot at send time
  add column if not exists deliverables_snapshot jsonb, -- deliverable lines captured at send time
  add column if not exists signer_name        text,
  add column if not exists signer_title       text,
  add column if not exists signed_at          timestamptz,
  add column if not exists signer_ip          text,
  add column if not exists deposit_invoice_id uuid references invoices (id) on delete set null;

-- The private e-sign link is looked up by token on every visit.
create index if not exists idx_contracts_share_token on contracts (share_token);
