'use client';

// A table row that navigates when you click anywhere on it — so the whole box
// is clickable, not just the linked text. Inner links still work normally.

import { useRouter } from 'next/navigation';

export function RowLink({ href, children }: { href: string; children: React.ReactNode }) {
  const router = useRouter();
  return (
    <tr
      onClick={() => router.push(href)}
      className="cursor-pointer border-b border-slate-100 last:border-0 hover:bg-slate-50"
    >
      {children}
    </tr>
  );
}
