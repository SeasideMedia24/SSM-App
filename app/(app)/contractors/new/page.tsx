import { PageHeader } from '@/components/page-header';
import { ContractorForm } from '@/components/contractor-form';

export default function NewContractorPage() {
  return (
    <>
      <PageHeader title="New contractor" description="Add someone to your team." />
      <ContractorForm />
    </>
  );
}
