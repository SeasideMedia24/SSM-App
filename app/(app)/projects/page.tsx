import { PageHeader, ComingSoon } from '@/components/page-header';

export default function ProjectsPage() {
  return (
    <>
      <PageHeader
        title="Projects"
        description="Kanban board, list view, and PARA filter for all your work."
      />
      <ComingSoon phase="Phase 4" />
    </>
  );
}
