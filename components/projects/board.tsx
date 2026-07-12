'use client';

// The projects kanban. Columns match the owner's Notion pipeline, with live
// counts and drag-to-move (dnd-kit). Moves are optimistic and persisted via the
// moveProject server action. Cards sort by priority then closest due date.
// The Archived column is hidden behind a toggle.

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
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
import { compareProjects } from '@/lib/projects/sort';
import { moveProject } from '@/app/(app)/projects/actions';
import type { ProjectStatus } from '@/types/database.types';
import { ProjectCard, CardBody, type BoardProject } from './project-card';
import { useUndo } from '@/components/undo/undo-provider';

export function ProjectBoard({ initial }: { initial: BoardProject[] }) {
  const undo = useUndo();
  const [projects, setProjects] = useState(initial);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [showArchived, setShowArchived] = useState(false);
  const [mounted, setMounted] = useState(false);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  useEffect(() => setMounted(true), []);
  useEffect(() => setProjects(initial), [initial]);

  const active = projects.find((p) => p.id === activeId) ?? null;
  const columns = PROJECT_STATUSES.filter((c) => c.value !== 'archived' || showArchived);
  const archivedCount = projects.filter((p) => p.status === 'archived').length;

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
    const prevStatus = proj.status;
    setProjects((prev) => prev.map((p) => (p.id === proj.id ? { ...p, status: newStatus } : p)));
    void moveProject(proj.id, newStatus);
    // ⌘Z: send the card back where it was — server AND local optimistic state.
    const label = PROJECT_STATUSES.find((c) => c.value === newStatus)?.label ?? newStatus;
    undo.register({
      label: `Moved “${proj.title}” to ${label}`,
      undo: async () => {
        await moveProject(proj.id, prevStatus);
        setProjects((prev) => prev.map((p) => (p.id === proj.id ? { ...p, status: prevStatus } : p)));
      },
    });
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={pointerWithin}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onDragCancel={() => setActiveId(null)}
    >
      <div className="mb-3 flex justify-end">
        <button
          onClick={() => setShowArchived((s) => !s)}
          className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 transition-colors hover:border-teal hover:text-sea"
        >
          {showArchived ? 'Hide archived' : `Show archived${archivedCount ? ` (${archivedCount})` : ''}`}
        </button>
      </div>

      <div className="flex gap-3 overflow-x-auto pb-4">
        {columns.map((col) => (
          <Column
            key={col.value}
            status={col.value}
            label={col.label}
            pill={col.pill}
            soft={col.soft}
            projects={projects.filter((p) => p.status === col.value).sort(compareProjects)}
            activeId={activeId}
          />
        ))}
      </div>

      {/* Portal to <body> so the fixed overlay positions against the viewport
          (not a transformed ancestor) and sits under the cursor. */}
      {mounted &&
        createPortal(
          <DragOverlay dropAnimation={{ duration: 250, easing: 'cubic-bezier(0.18, 0.67, 0.6, 1.22)' }}>
            {active ? (
              <div className="w-64">
                <CardBody project={active} dragging />
              </div>
            ) : null}
          </DragOverlay>,
          document.body,
        )}
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
