import { PageHeader, ComingSoon } from '@/components/page-header';

export default function DashboardPage() {
  return (
    <>
      <PageHeader
        title="Dashboard"
        description="Active projects, upcoming due dates, and recent quotes at a glance."
      />
      <ComingSoon phase="Phase 6" />
    </>
  );
}
