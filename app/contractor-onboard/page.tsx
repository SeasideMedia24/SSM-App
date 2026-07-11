// Generic public self-serve intake for a new team member — no token needed.
// The owner shares /contractor-onboard from the Onboarding tab; anyone who
// opens it can add themselves, creating a new contractor record to review.

import { ContractorIntakeForm } from '@/components/contractor-intake-form';

export const metadata = { title: 'Join the team — Seaside Media' };

export default function ContractorIntakePage() {
  return <ContractorIntakeForm />;
}
