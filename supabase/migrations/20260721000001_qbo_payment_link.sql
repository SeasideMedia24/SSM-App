-- ============================================================================
-- QuickBooks Payments: store each invoice's online payment link.
--
-- When the deposit invoice is pushed to QuickBooks with online payments
-- enabled, QB returns a hosted "Review and pay" URL (invoiceLink). We store it
-- so the portal and the public invoice page can show a real Pay Now button.
-- The link only exists once QuickBooks Payments is active on the company.
--
-- Safe to re-run.
-- ============================================================================

alter table invoices add column if not exists qbo_payment_link text;
