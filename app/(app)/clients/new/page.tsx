import { PageHeader } from '@/components/page-header';
import { ClientForm } from '@/components/client-form';

export default function NewClientPage() {
  return (
    <>
      <PageHeader title="New client" description="Add a client to your hub." />
      <ClientForm />
    </>
  );
}
