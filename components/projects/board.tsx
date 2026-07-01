'use client';

// The projects kanban. Seven columns matching the owner's Notion pipeline, with
// live counts and drag-to-move between columns (dnd-kit). Moves are optimistic
// (UI updates instantly) and persisted via the moveProject server action.

import { useState } from 'react';
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  useDroppable,
  pointerWithin,
  type DragStartEvent,
  type DragEndEvent,
} from '@dnd-kit/core';
import { PROJECT_STATUSES } from '@/lib/projects/status';
import { moveProject } from '@/app/(app)/projects/actions';
import type { ProjectStatus } from '@/types/database.types';
import { ProjectCard, CardBody, type BoardProject } from './project-card';

export function ProjectBoard({ initial }: { initial: BoardProject[] }) {
  const [projects, setProjects] = useState(initial);
  const [activeId, setActiveId] = useState<string | null>(null);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  const active = projects.find((p) => p.id === activeId) ?? null;

  function onDragStart(e: DragStartEvent) {
    setActiveId(String(e.active.id));
  }

  function onDragEnd(e: DragEndEvent) {
    setActiveId(null);
    const { active, over } = e;
    if (!over) return;
    const newStatus = String(over.id) as ProjectStatus;
    const proj = projects.find((p) => p.id === String(active.id));
    if (!proj || proj.status === newStatus) return;
    // Optimistic update, then persist.
    setProjects((prev) => prev.map((p) => (p.id === proj.id ? { ...p, status: newStatus } : p)));
    void moveProject(proj.id, newStatus);
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={pointerWithin}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onDragCancel={() => setActiveId(null)}
    >
      <div className="flex gap-3 overflow-x-auto pb-4">
        {PROJECT_STATUSES.map((col) => (
          <Column
            key={col.value}
            status={col.value}
            label={col.label}
            pill={col.pill}
            soft={col.soft}
            projects={projects.filter((p) => p.status === col.value)}
            activeId={activeId}
          />
        ))}
      </div>
      <DragOverlay dropAnimation={{ duration: 250, easing: 'cubic-bezier(0.18, 0.67, 0.6, 1.22)' }}>
        {active ? (
          <div className="w-64">
            <CardBody project={active} dragging />
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}

function Column({
  status,
  label,
  pill,
  soft,
  projects,
  activeId,
}: {
  status: ProjectStatus;
  label: string;
  pill: string;
  soft: string;
  projects: BoardProject[];
  activeId: string | null;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: status });

  return (
    <div
      ref={setNodeRef}
      className={`flex w-64 shrink-0 flex-col rounded-2xl border p-2.5 transition-colors ${soft} ${
        isOver ? 'border-teal ring-2 ring-aqua/40' : 'border-slate-200'
      }`}
    >
      <div className="mb-2 flex items-center gap-2 px-1">
        <span className={`rounded-md px-2 py-0.5 text-xs font-semibold ${pill}`}>{label}</span>
        <span className="text-xs font-medium text-slate-400">{projects.length}</span>
      </div>
      <div className="flex flex-col gap-2">
        {projects.map((p) => (
          <ProjectCard key={p.id} project={p} isActive={activeId === p.id} />
        ))}
        {projects.length === 0 && (
          <div className="rounded-xl border border-dashed border-slate-200 py-6 text-center text-xs text-slate-300">
            Drop here
          </div>
        )}
      </div>
    </div>
  );
}
