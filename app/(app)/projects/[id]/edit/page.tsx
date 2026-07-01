import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { PageHeader } from '@/components/page-header';
import { ProjectForm } from '@/components/projects/project-form';

export default async function EditProjectPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const [{ data: project }, { data: clients }] = await Promise.all([
    supabase.from('projects').select('*').eq('id', id).single(),
    supabase.from('clients').select('id, name').order('name'),
  ]);

  if (!project) notFound();

  return (
    <>
      <PageHeader title={`Edit ${project.title}`} description="Update this project’s details." />
      <ProjectForm clients={clients ?? []} project={project} />
    </>
  );
}
