'use client';

// Inline-editable board title. Saves on blur / Enter.

import { useState } from 'react';
import { renameBoard } from '@/app/(canvas)/brainstorm/actions';

export function BoardTitle({ id, initialTitle }: { id: string; initialTitle: string }) {
  const [title, setTitle] = useState(initialTitle);

  return (
    <input
      value={title}
      onChange={(e) => setTitle(e.target.value)}
      onBlur={() => { if (title.trim() !== initialTitle) void renameBoard(id, title); }}
      onKeyDown={(e) => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); }}
      className="flex-1 rounded-md border border-transparent bg-transparent px-2 py-1 text-sm font-semibold text-ink outline-none hover:border-slate-200 focus:border-teal"
      aria-label="Board title"
    />
  );
}
