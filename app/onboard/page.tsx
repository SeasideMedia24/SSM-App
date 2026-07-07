// Generic public intake — anyone with this link can start onboarding. Creates a
// new lead (client + draft project + draft contract) for the owner to review.

import { OnboardingForm } from '@/components/onboarding-form';

export const metadata = { title: 'Start your project — Seaside Media' };

export default function OnboardPage() {
  return <OnboardingForm />;
}
