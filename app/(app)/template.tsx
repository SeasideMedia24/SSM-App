// A template re-mounts on every navigation (unlike layout), so it's where the
// cinematic tab-to-tab transition plays. See components/page-transition.tsx.

import { PageTransition } from '@/components/page-transition';

export default function Template({ children }: { children: React.ReactNode }) {
  return <PageTransition>{children}</PageTransition>;
}
