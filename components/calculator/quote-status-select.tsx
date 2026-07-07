'use client';

// Status pill that's secretly a <select>: changing it submits straight to the
// setQuoteStatus server action, so the owner can flip draft → sent → accepted
// without leaving the list.

import { useRef, useTransition } from 'react';
import { setQuoteStatus } from '@/app/(app)/calculator/actions';
import { QUOTE_STATUSES, quoteStatusMeta } from '@/lib/projects/status';
import type { QuoteStatus } from '@/types/database.types';

export function QuoteStatusSelect({ quoteId, status }: { quoteId: string; status: QuoteStatus }) {
  const formRef = useRef<HTMLFormElement>(null);
  const [pending, start] = useTransition();
  const meta = quoteStatusMeta(status);

  return (
    <form ref={formRef} action={(fd) => start(() => setQuoteStatus(fd))}>
      <input type="hidden" name="id" value={quoteId} />
      <select
        name="status"
        value={status}
        disabled={pending}
        onChange={() => formRef.current?.requestSubmit()}
        className={`cursor-pointer appearance-none rounded-full border-0 px-2.5 py-0.5 text-[11px] font-medium outline-none ${meta.pill} disabled:opacity-60`}
      >
        {QUOTE_STATUSES.map((s) => (
          <option key={s.value} value={s.value}>{s.label}</option>
        ))}
      </select>
    </form>
  );
}
