import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { PageHeader } from '@/components/page-header';
import { ClientForm } from '@/components/client-form';

export default async function EditClientPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: client } = await supabase.from('clients').select('*').eq('id', id).single();

  if (!client) {
    notFound();
  }

  return (
    <>
      <PageHeader title={`Edit ${client.name}`} description="Update this client’s details." />
      <ClientForm client={client} />
    </>
  );
}
