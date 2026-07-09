import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { PageHeader } from '@/components/page-header';
import { ContractorForm } from '@/components/contractor-form';

export default async function EditContractorPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: contractor } = await supabase.from('contractors').select('*').eq('id', id).single();
  if (!contractor) notFound();

  return (
    <>
      <PageHeader title={`Edit ${contractor.name}`} description="Update this team member’s details." />
      <ContractorForm contractor={contractor} />
    </>
  );
}
