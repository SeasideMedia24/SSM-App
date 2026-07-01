import { PageHeader, ComingSoon } from '@/components/page-header';

export default function CalculatorPage() {
  return (
    <>
      <PageHeader
        title="Price Calculator"
        description="Build a line-item quote from rate presets and save it against a client."
      />
      <ComingSoon phase="Phase 5" />
    </>
  );
}
