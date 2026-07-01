import { PageHeader, ComingSoon } from '@/components/page-header';

export default function SettingsPage() {
  return (
    <>
      <PageHeader
        title="Settings"
        description="Manage rate presets and (later) team members."
      />
      <ComingSoon phase="Phase 7" />
    </>
  );
}
