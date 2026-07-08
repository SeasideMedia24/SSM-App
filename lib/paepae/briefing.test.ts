// Tests for the briefing's pure logic — the date bucketing, pipeline counting,
// and quote splitting that decide what shows up as "needs attention". These run
// without a database; the fetch in getBriefing just feeds rows into these.

import { describe, it, expect } from 'vitest';
import { addDays, bucketTasks, pipelineByStage, bucketQuotes } from './briefing';

describe('addDays', () => {
  it('adds days in UTC without drift', () => {
    expect(addDays('2026-07-08', 7)).toBe('2026-07-15');
    expect(addDays('2026-07-08', 0)).toBe('2026-07-08');
  });

  it('rolls over month boundaries', () => {
    expect(addDays('2026-07-30', 3)).toBe('2026-08-02');
  });
});

describe('bucketTasks', () => {
  const today = '2026-07-08';
  const tasks = [
    { id: 'a', due_date: '2026-07-01' }, // overdue
    { id: 'b', due_date: '2026-07-08' }, // due today -> due soon
    { id: 'c', due_date: '2026-07-15' }, // last day of horizon -> due soon
    { id: 'd', due_date: '2026-07-16' }, // just past horizon -> neither
    { id: 'e', due_date: null }, // undated -> ignored
  ];

  it('splits overdue vs due-soon against a 7-day horizon', () => {
    const { overdue, dueSoon } = bucketTasks(tasks, today);
    expect(overdue.map((t) => t.id)).toEqual(['a']);
    expect(dueSoon.map((t) => t.id)).toEqual(['b', 'c']);
  });

  it('treats today as due-soon, not overdue', () => {
    const { overdue, dueSoon } = bucketTasks([{ id: 'x', due_date: today }], today);
    expect(overdue).toHaveLength(0);
    expect(dueSoon.map((t) => t.id)).toEqual(['x']);
  });

  it('ignores undated tasks entirely', () => {
    const { overdue, dueSoon } = bucketTasks([{ id: 'n', due_date: null }], today);
    expect(overdue).toHaveLength(0);
    expect(dueSoon).toHaveLength(0);
  });
});

describe('pipelineByStage', () => {
  it('counts per stage in board order and omits empty stages', () => {
    const result = pipelineByStage([
      { status: 'filming' },
      { status: 'idea_inquiry' },
      { status: 'filming' },
      { status: 'editing' },
    ]);
    // Board order is idea_inquiry, scripting_planning, filming, editing, ...
    expect(result).toEqual([
      { status: 'idea_inquiry', label: 'Idea / Inquiry', count: 1 },
      { status: 'filming', label: 'Filming', count: 2 },
      { status: 'editing', label: 'Editing', count: 1 },
    ]);
  });

  it('drops archived projects from the pipeline', () => {
    const result = pipelineByStage([{ status: 'archived' }, { status: 'editing' }]);
    expect(result.map((s) => s.status)).toEqual(['editing']);
  });
});

describe('bucketQuotes', () => {
  it('separates drafts and sent, ignoring resolved quotes', () => {
    const { draft, awaiting } = bucketQuotes([
      { id: '1', status: 'draft' },
      { id: '2', status: 'sent' },
      { id: '3', status: 'accepted' },
      { id: '4', status: 'declined' },
      { id: '5', status: 'draft' },
    ]);
    expect(draft.map((q) => q.id)).toEqual(['1', '5']);
    expect(awaiting.map((q) => q.id)).toEqual(['2']);
  });
});
