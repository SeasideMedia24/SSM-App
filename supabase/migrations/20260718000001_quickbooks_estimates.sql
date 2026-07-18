-- ============================================================================
-- QuickBooks: estimate-first sending
--
-- Seaside's flow is estimate-first — PaePae sends an ESTIMATE for the client to
-- approve, and QuickBooks converts the accepted estimate into an invoice (in QB).
-- Track the QB estimate alongside the existing qbo_invoice_* columns so both the
-- estimate and (later) the converted invoice can be referenced.
--
-- Safe to re-run.
-- ============================================================================

alter table invoices add column if not exists qbo_estimate_id      text;
alter table invoices add column if not exists qbo_estimate_number  text;
alter table invoices add column if not exists qbo_estimate_sent_at timestamptz;

create index if not exists idx_invoices_qbo_estimate_id on invoices (qbo_estimate_id);
