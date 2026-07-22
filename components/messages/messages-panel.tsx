'use client';

// The two-pane messages UI, shared by the owner (/messages) and the team
// (/my-messages): thread list on the left, the open conversation on the right.
// Opening a thread stamps it read; sending refreshes via the server action.

import Link from 'next/link';
import { useEffect, useRef, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { postMessage, markThreadRead, type MessageRef } from '@/app/(app)/messages/actions';
import type { ThreadSummary, ThreadMessage, AttachableItems } from '@/lib/messages/queries';

const REF_ICON: Record<MessageRef['type'], string> = { project: '📁', task: '✅', deliverable: '🎬' };

function timeLabel(iso: string): string {
  const d = new Date(iso);
  const today = new Date();
  const sameDay = d.toDateString() === today.toDateString();
  return sameDay
    ? d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
    : d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export function MessagesPanel({
  threads,
  selectedId,
  messages,
  basePath,
  emptyHint,
  attachable,
}: {
  threads: ThreadSummary[];
  selectedId: string | null;
  messages: ThreadMessage[];
  basePath: string; // '/messages' (owner) or '/my-messages' (team)
  emptyHint: string;
  attachable: AttachableItems;
}) {
  const selected = threads.find((t) => t.id === selectedId) ?? null;

  return (
    <div className="grid min-h-[28rem] grid-cols-1 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm md:grid-cols-[16rem_1fr]">
      {/* Thread list */}
      <aside className="border-b border-slate-200 md:border-b-0 md:border-r">
        {threads.length === 0 ? (
          <p className="p-4 text-sm text-slate-400">{emptyHint}</p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {threads.map((t) => (
              <li key={t.id}>
                <Link
                  href={`${basePath}?t=${t.id}`}
                  className={`flex flex-col gap-0.5 px-4 py-3 transition-colors hover:bg-slate-50 ${t.id === selectedId ? 'bg-teal/5' : ''}`}
                >
                  <span className="flex items-center gap-2">
                    <span className={`truncate text-sm ${t.unread ? 'font-semibold text-ink' : 'text-slate-700'}`}>
                      {t.kind === 'project' ? `# ${t.title}` : t.title}
                    </span>
                    {t.unread && <span className="h-2 w-2 shrink-0 rounded-full bg-sea" aria-label="Unread" />}
                    {t.lastAt && <span className="ml-auto shrink-0 text-[10px] text-slate-400">{timeLabel(t.lastAt)}</span>}
                  </span>
                  {t.lastBody && <span className="truncate text-xs text-slate-400">{t.lastBody}</span>}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </aside>

      {/* Conversation */}
      {selected ? (
        <ChatPane key={selected.id} threadId={selected.id} title={selected.kind === 'project' ? `# ${selected.title}` : selected.title} messages={messages} attachable={attachable} />
      ) : (
        <div className="flex items-center justify-center p-10 text-sm text-slate-400">
          {threads.length === 0 ? 'No conversations yet.' : 'Pick a conversation.'}
        </div>
      )}
    </div>
  );
}

function ChatPane({ threadId, title, messages, attachable }: { threadId: string; title: string; messages: ThreadMessage[]; attachable: AttachableItems }) {
  const router = useRouter();
  const [body, setBody] = useState('');
  const [ref, setRef] = useState<{ type: MessageRef['type']; id: string; label: string } | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const bottomRef = useRef<HTMLDivElement>(null);

  // Opening (or receiving new messages in) a thread marks it read.
  useEffect(() => {
    markThreadRead(threadId);
  }, [threadId, messages.length]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: 'end' });
  }, [messages.length]);

  function send() {
    const text = body.trim();
    if (!text || pending) return;
    const attached: MessageRef | null = ref ? { type: ref.type, id: ref.id } : null;
    start(async () => {
      setError(null);
      const res = await postMessage(threadId, text, attached);
      if (res.ok) {
        setBody('');
        setRef(null);
        router.refresh();
      } else {
        setError(res.error ?? 'Could not send.');
      }
    });
  }

  return (
    <section className="flex max-h-[70vh] flex-col">
      <header className="border-b border-slate-100 px-4 py-3">
        <h2 className="text-sm font-semibold text-ink">{title}</h2>
      </header>

      <div className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
        {messages.length === 0 && <p className="text-sm text-slate-400">No messages yet — say hi 👋</p>}
        {messages.map((m) => (
          <div key={m.id} className={`flex flex-col ${m.mine ? 'items-end' : 'items-start'}`}>
            <div className={`max-w-[85%] rounded-2xl px-3.5 py-2 text-sm ${m.mine ? 'brand-gradient text-white' : 'bg-slate-100 text-slate-800'}`}>
              {!m.mine && <p className="mb-0.5 text-[10px] font-semibold uppercase tracking-wide opacity-70">{m.senderName}</p>}
              {m.ref && (
                <p className={`mb-1 inline-flex items-center gap-1 rounded-lg px-2 py-0.5 text-xs ${m.mine ? 'bg-white/20' : 'bg-white'}`}>
                  <span>{REF_ICON[m.ref.kind]}</span>
                  <span className="font-medium">{m.ref.label}</span>
                </p>
              )}
              <p className="whitespace-pre-wrap">{m.body}</p>
            </div>
            <span className="mt-0.5 text-[10px] text-slate-400">{timeLabel(m.createdAt)}</span>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      <footer className="border-t border-slate-100 p-3">
        {error && <p className="mb-1 text-xs text-red-600">{error}</p>}
        {ref && (
          <div className="mb-1.5 inline-flex items-center gap-1.5 rounded-lg bg-slate-100 px-2 py-1 text-xs text-slate-600">
            <span>{REF_ICON[ref.type]}</span>
            <span className="font-medium">{ref.label}</span>
            <button type="button" onClick={() => setRef(null)} className="ml-0.5 text-slate-400 hover:text-red-600" aria-label="Remove attachment">×</button>
          </div>
        )}
        <div className="flex items-end gap-2">
          <div className="relative">
            <button
              type="button"
              onClick={() => setPickerOpen((o) => !o)}
              title="Attach a project, task, or deliverable"
              className="shrink-0 rounded-xl border border-slate-200 px-3 py-2.5 text-sm text-slate-500 hover:border-teal hover:text-sea"
            >
              ＋
            </button>
            {pickerOpen && (
              <>
                <button type="button" aria-hidden className="fixed inset-0 z-10 cursor-default" onClick={() => setPickerOpen(false)} />
                <div className="absolute bottom-12 left-0 z-20 max-h-72 w-64 overflow-y-auto rounded-xl border border-slate-200 bg-white p-1 shadow-lg">
                  <AttachGroup label="Projects" icon={REF_ICON.project} items={attachable.projects} onPick={(id, label) => { setRef({ type: 'project', id, label }); setPickerOpen(false); }} />
                  <AttachGroup label="Tasks" icon={REF_ICON.task} items={attachable.tasks} onPick={(id, label) => { setRef({ type: 'task', id, label }); setPickerOpen(false); }} />
                  <AttachGroup label="Deliverables" icon={REF_ICON.deliverable} items={attachable.deliverables} onPick={(id, label) => { setRef({ type: 'deliverable', id, label }); setPickerOpen(false); }} />
                  {attachable.projects.length + attachable.tasks.length + attachable.deliverables.length === 0 && (
                    <p className="px-2 py-2 text-xs text-slate-400">Nothing to attach yet.</p>
                  )}
                </div>
              </>
            )}
          </div>
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); }
            }}
            rows={1}
            placeholder="Write a message…"
            className="max-h-32 min-h-[2.75rem] flex-1 resize-none rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-teal"
          />
          <button
            type="button"
            disabled={pending || !body.trim()}
            onClick={send}
            className="brand-gradient shrink-0 rounded-xl px-5 py-2.5 text-sm font-semibold text-white transition hover:brightness-110 disabled:opacity-50"
          >
            {pending ? '…' : 'Send'}
          </button>
        </div>
        <p className="mt-1 text-[11px] text-slate-400">Enter to send · Shift+Enter for a new line</p>
      </footer>
    </section>
  );
}

function AttachGroup({ label, icon, items, onPick }: { label: string; icon: string; items: { id: string; title: string }[]; onPick: (id: string, title: string) => void }) {
  if (items.length === 0) return null;
  return (
    <div className="py-1">
      <p className="px-2 pb-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-400">{label}</p>
      {items.map((it) => (
        <button
          key={it.id}
          type="button"
          onClick={() => onPick(it.id, it.title)}
          className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-sm text-slate-700 hover:bg-slate-50"
        >
          <span>{icon}</span>
          <span className="truncate">{it.title}</span>
        </button>
      ))}
    </div>
  );
}
