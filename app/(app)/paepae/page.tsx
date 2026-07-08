// PaePae — Seaside Media's in-house assistant (Phase 2, slice 1).
// Read-only, draft & suggest. The chat panel is a client component; all the
// Claude work happens server-side in app/api/paepae/chat/route.ts.

import { PageHeader } from '@/components/page-header';
import { PaePaeChat } from '@/components/paepae/chat';

export default function PaePaePage() {
  return (
    <>
      <PageHeader
        title="PaePae"
        description="Your studio assistant — it reads your data to help you plan and draft. It suggests; you decide."
      />
      <PaePaeChat />
    </>
  );
}
