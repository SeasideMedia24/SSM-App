'use client';

// A project card on the kanban board. Draggable via dnd-kit; a plain click
// (no drag) opens the project. CardBody is shared between the in-place card and
// the floating DragOverlay copy.

import { useRouter } from 'next/navigation';
import { useDraggable } from '@dnd-kit/core';
import { projectStatusMeta } from '@/lib/projects/status';
import type { ProjectStatus } from '@/types/database.types';

export type BoardProject = {
  id: string;
  title: string;
  status: ProjectStatus;
  clientName: string | null;
  tags: string[];
  due_date: string | null;
};

function formatDue(date: string | null) {
  if (!date) return null;
  return new Date(date + 'T00:00:00').toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

export function CardBody({ project, dragging }: { project: BoardProject; dragging?: boolean }) {
  const meta = projectStatusMeta(project.status);
  const due = formatDue(project.due_date);
  return (
    <div
      className={`relative rounded-xl border border-slate-200 bg-white p-3 shadow-sm transition-all ${
        dragging ? 'rotate-2 scale-[1.03] shadow-xl' : 'hover:-translate-y-0.5 hover:shadow-md'
      }`}
    >
      <span className={`absolute inset-y-2 left-0 w-1 rounded-full ${meta.bar}`} aria-hidden="true" />
      <div className="pl-2">
        <p className="line-clamp-2 text-sm font-medium text-ink">{project.title}</p>
        {project.clientName && <p className="mt-0.5 text-xs text-slate-500">{project.clientName}</p>}
        {(project.tags.length > 0 || due) && (
          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            {project.tags.slice(0, 3).map((t) => (
              <span key={t} className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] text-slate-600">
                {t}
              </span>
            ))}
            {due && (
              <span className="ml-auto text-[11px] font-medium text-slate-400">{due}</span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export function ProjectCard({ project, isActive }: { project: BoardProject; isActive: boolean }) {
  const router = useRouter();
  const { attributes, listeners, setNodeRef } = useDraggable({ id: project.id });

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      onClick={() => router.push(`/projects/${project.id}`)}
      className={`cursor-grab touch-none select-none active:cursor-grabbing ${isActive ? 'opacity-30' : ''}`}
    >
      <CardBody project={project} />
    </div>
  );
}
