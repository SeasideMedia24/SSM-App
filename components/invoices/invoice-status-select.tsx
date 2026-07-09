'use client';

// Inline status pill for an invoice: draft → sent → paid. Writes through the
// server action; mirrors the quote status control.

import { useTransition } from 'react';
import { setInvoiceStatus } from '@/app/(app)/invoices/actions';
import { INVOICE_STATUSES, invoiceStatusMeta } from '@/lib/projects/status';
import type { InvoiceStatus } from '@/types/database.types';

export function InvoiceStatusSelect({ invoiceId, status }: { invoiceId: string; status: InvoiceStatus }) {
  const [pending, start] = useTransition();
  const meta = invoiceStatusMeta(status);

  return (
    <select
      value={status}
      disabled={pending}
      onChange={(e) => {
        const fd = new FormData();
        fd.set('id', invoiceId);
        fd.set('status', e.target.value);
        start(() => {
          void setInvoiceStatus(fd);
        });
      }}
      aria-label="Invoice status"
      className={`cursor-pointer appearance-none rounded-full border-0 px-2.5 py-0.5 text-[11px] font-medium outline-none ${meta.pill} disabled:opacity-60`}
    >
      {INVOICE_STATUSES.map((s) => (
        <option key={s.value} value={s.value}>
          {s.label}
        </option>
      ))}
    </select>
  );
}
