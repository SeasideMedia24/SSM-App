import { createClient } from '@/lib/supabase/server';
import { PageHeader } from '@/components/page-header';
import { ProjectForm } from '@/components/projects/project-form';

export default async function NewProjectPage() {
  const supabase = await createClient();
  const { data: clients } = await supabase.from('clients').select('id, name').order('name');

  return (
    <>
      <PageHeader title="New project" description="Create a project — it starts pre-filled from your template." />
      <ProjectForm clients={clients ?? []} />
    </>
  );
}
