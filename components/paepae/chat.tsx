'use client';

// PaePae chat panel (slice 2: draft & do). Talks only to the server routes —
// /api/paepae/chat for conversation, /api/paepae/execute when the user clicks
// Confirm on a proposal card. This component never sees a secret.
//
// The chat route streams NDJSON events; each assistant message is rendered as
// an ordered list of parts: markdown text, "looked something up" chips, and
// proposal cards. A proposal only executes when the user confirms it here.

import { useRef, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Button } from '@/components/ui/button';

// ── Types mirroring the server's stream events ──────────────────────────────

type ProposalPayload = {
  action: string;
  params: Record<string, unknown>;
  summary: string[];
};

type ProposalState = 'pending' | 'executing' | 'done' | 'cancelled' | 'error';

type Part =
  | { kind: 'text'; text: string }
  | { kind: 'lookup'; label: string }
  | {
      kind: 'proposal';
      proposal: ProposalPayload;
      state: ProposalState;
      result?: string;
    };

type Msg = { role: 'user' | 'assistant'; parts: Part[] };

// Friendly card titles per action.
const ACTION_TITLES: Record<string, string> = {
  create_task: 'Create task',
  update_task: 'Update task',
  create_project: 'Create project',
  update_project: 'Update project',
  create_client: 'Add client',
  update_client: 'Update client',
  create_quote: 'Save draft quote',
};

// Starter prompts for the empty state — tuned to what PaePae can actually do.
const SUGGESTIONS = [
  'Give me today’s digest — what needs my attention?',
  'Which quotes are still waiting on a client reply?',
  'Draft a follow-up email for a client with a pending quote.',
  'Create a task list for an upcoming shoot.',
];

export function PaePaeChat() {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  // Keep the newest content in view as it streams in.
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages]);

  // Flatten rich messages into the plain-text history the server expects.
  // Proposal outcomes are folded in so PaePae knows what actually happened.
  function historyFor(msgs: Msg[]): { role: 'user' | 'assistant'; content: string }[] {
    return msgs
      .map((m) => ({ role: m.role, content: m.parts.map(partToText).join('\n').trim() }))
      .filter((m) => m.content.length > 0);
  }

  async function send(text: string) {
    const trimmed = text.trim();
    if (!trimmed || busy) return;

    const next: Msg[] = [...messages, { role: 'user', parts: [{ kind: 'text', text: trimmed }] }];
    // Add an empty assistant message we'll stream parts into.
    setMessages([...next, { role: 'assistant', parts: [] }]);
    setInput('');
    setBusy(true);

    try {
      const res = await fetch('/api/paepae/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: historyFor(next) }),
      });

      // A redirect to /login means the session expired mid-chat.
      if (res.redirected || res.headers.get('content-type')?.includes('text/html')) {
        setMessages((m) =>
          appendPart(m, { kind: 'text', text: '⚠️ You’ve been signed out. Refresh the page and log in again.' }),
        );
        return;
      }
      if (!res.ok || !res.body) {
        const detail = (await res.text().catch(() => '')) || 'Something went wrong.';
        setMessages((m) => appendPart(m, { kind: 'text', text: `⚠️ ${detail}` }));
        return;
      }

      // Parse the NDJSON stream line by line.
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() ?? ''; // keep the trailing partial line
        for (const line of lines) {
          if (!line.trim()) continue;
          handleEvent(JSON.parse(line));
        }
      }
      if (buffer.trim()) handleEvent(JSON.parse(buffer));
    } catch {
      setMessages((m) =>
        appendPart(m, {
          kind: 'text',
          text: '⚠️ PaePae could not be reached. Check your connection and try again.',
        }),
      );
    } finally {
      setBusy(false);
    }
  }

  function handleEvent(ev: { t: string; d?: string; label?: string; proposal?: ProposalPayload; message?: string }) {
    if (ev.t === 'text' && ev.d) {
      setMessages((m) => appendText(m, ev.d!));
    } else if (ev.t === 'lookup' && ev.label) {
      setMessages((m) => appendPart(m, { kind: 'lookup', label: ev.label! }));
    } else if (ev.t === 'proposal' && ev.proposal) {
      setMessages((m) =>
        appendPart(m, { kind: 'proposal', proposal: ev.proposal!, state: 'pending' }),
      );
    } else if (ev.t === 'error' && ev.message) {
      setMessages((m) => appendPart(m, { kind: 'text', text: `⚠️ PaePae hit a problem: ${ev.message}` }));
    }
  }

  // Confirm or cancel a proposal (identified by message + part index).
  async function decide(mi: number, pi: number, confirmed: boolean) {
    const part = messages[mi]?.parts[pi];
    if (!part || part.kind !== 'proposal' || part.state !== 'pending') return;

    if (!confirmed) {
      setProposal(mi, pi, { state: 'cancelled' });
      return;
    }

    setProposal(mi, pi, { state: 'executing' });
    try {
      const res = await fetch('/api/paepae/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: part.proposal.action,
          params: part.proposal.params,
          summary: part.proposal.summary,
        }),
      });
      if (res.redirected || res.headers.get('content-type')?.includes('text/html')) {
        setProposal(mi, pi, { state: 'error', result: 'You’ve been signed out. Refresh and log in, then ask PaePae again.' });
        return;
      }
      const out = (await res.json()) as { ok: boolean; message?: string; error?: string };
      if (out.ok) {
        setProposal(mi, pi, { state: 'done', result: out.message });
        router.refresh(); // refresh server components so the app reflects the change
      } else {
        setProposal(mi, pi, { state: 'error', result: out.error ?? 'The action failed.' });
      }
    } catch {
      setProposal(mi, pi, { state: 'error', result: 'Could not reach the server.' });
    }
  }

  function setProposal(mi: number, pi: number, patch: Partial<Extract<Part, { kind: 'proposal' }>>) {
    setMessages((m) =>
      m.map((msg, i) =>
        i !== mi
          ? msg
          : {
              ...msg,
              parts: msg.parts.map((p, j) => (j === pi && p.kind === 'proposal' ? { ...p, ...patch } : p)),
            },
      ),
    );
  }

  const showEmpty = messages.length === 0;

  return (
    <div className="flex h-[calc(100vh-11rem)] flex-col rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div ref={scrollRef} className="flex-1 space-y-4 overflow-y-auto px-5 py-6">
        {showEmpty ? (
          <div className="mx-auto max-w-lg pt-10 text-center">
            <div className="mb-3 inline-flex h-12 w-12 items-center justify-center rounded-2xl brand-gradient text-lg font-semibold text-white">
              P
            </div>
            <h2 className="font-display text-2xl tracking-wide text-ink">Heyyy, I&rsquo;m PaePae!</h2>
            <p className="mt-1 text-sm text-slate-500">
              Your studio assistant. I can look things up, draft messages, and manage tasks,
              projects, clients, and quotes — every change shows you a card to confirm first.
            </p>
            <div className="mt-6 grid gap-2 sm:grid-cols-2">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  onClick={() => send(s)}
                  className="rounded-xl border border-slate-200 px-3 py-2.5 text-left text-sm text-slate-600 transition-colors hover:border-teal hover:bg-slate-50 hover:text-ink"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        ) : (
          messages.map((m, mi) => (
            <Message
              key={mi}
              msg={m}
              busy={busy && mi === messages.length - 1}
              onDecide={(pi, ok) => decide(mi, pi, ok)}
            />
          ))
        )}
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          send(input);
        }}
        className="flex items-end gap-2 border-t border-slate-100 p-3"
      >
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              send(input);
            }
          }}
          rows={1}
          placeholder="Ask PaePae anything about the studio…"
          className="max-h-40 flex-1 resize-none rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm text-ink outline-none focus:border-teal focus:ring-2 focus:ring-aqua/40"
        />
        <Button type="submit" disabled={busy || !input.trim()}>
          {busy ? 'Thinking…' : 'Send'}
        </Button>
      </form>
    </div>
  );
}

// ── Rendering ────────────────────────────────────────────────────────────────

function Message({
  msg,
  busy,
  onDecide,
}: {
  msg: Msg;
  busy: boolean;
  onDecide: (partIndex: number, confirmed: boolean) => void;
}) {
  const isUser = msg.role === 'user';

  if (isUser) {
    const text = msg.parts.map(partToText).join('\n');
    return (
      <div className="flex justify-end">
        <div className="max-w-[80%] whitespace-pre-wrap rounded-2xl brand-gradient px-4 py-2.5 text-sm text-white">
          {text}
        </div>
      </div>
    );
  }

  return (
    <div className="flex justify-start">
      <div className="max-w-[85%] space-y-2">
        {msg.parts.length === 0 && busy && (
          <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2.5">
            <Dots />
          </div>
        )}
        {msg.parts.map((part, pi) => {
          if (part.kind === 'lookup') {
            return (
              <span
                key={pi}
                className="mr-1 inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] text-slate-500"
              >
                <IconSearch /> {part.label}
              </span>
            );
          }
          if (part.kind === 'proposal') {
            return <ProposalCard key={pi} part={part} onDecide={(ok) => onDecide(pi, ok)} />;
          }
          return (
            <div
              key={pi}
              className="paepae-md rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-ink"
            >
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{part.text}</ReactMarkdown>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// The confirmation card — the human half of PaePae's propose → confirm gate.
function ProposalCard({
  part,
  onDecide,
}: {
  part: Extract<Part, { kind: 'proposal' }>;
  onDecide: (confirmed: boolean) => void;
}) {
  const { proposal, state, result } = part;
  const title = ACTION_TITLES[proposal.action] ?? proposal.action;

  return (
    <div className="overflow-hidden rounded-2xl border border-teal/40 bg-white shadow-sm">
      <div className="brand-gradient flex items-center gap-2 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-white">
        <IconBolt /> {title}
        <span className="ml-auto font-normal normal-case tracking-normal text-white/80">
          needs your OK
        </span>
      </div>
      <ul className="space-y-1 px-4 py-3 text-sm text-slate-700">
        {proposal.summary.map((line, i) => (
          <li key={i}>{line}</li>
        ))}
      </ul>
      <div className="flex items-center gap-2 border-t border-slate-100 px-4 py-2.5">
        {state === 'pending' && (
          <>
            <Button size="sm" onClick={() => onDecide(true)}>
              Confirm
            </Button>
            <Button size="sm" variant="ghost" onClick={() => onDecide(false)}>
              Cancel
            </Button>
          </>
        )}
        {state === 'executing' && <span className="text-xs text-slate-500">Working…</span>}
        {state === 'done' && (
          <span className="text-xs font-medium text-emerald-600">✓ {result ?? 'Done.'}</span>
        )}
        {state === 'cancelled' && <span className="text-xs text-slate-400">Cancelled — nothing was changed.</span>}
        {state === 'error' && (
          <span className="text-xs font-medium text-red-600">⚠️ {result ?? 'The action failed.'}</span>
        )}
      </div>
    </div>
  );
}

// Three pulsing dots shown while we wait for the first token.
function Dots() {
  return (
    <span className="inline-flex gap-1 py-1">
      <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-slate-400 [animation-delay:-0.3s]" />
      <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-slate-400 [animation-delay:-0.15s]" />
      <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-slate-400" />
    </span>
  );
}

function IconSearch() {
  return (
    <svg width={11} height={11} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round">
      <circle cx="11" cy="11" r="7" />
      <path d="m21 21-4.3-4.3" />
    </svg>
  );
}

function IconBolt() {
  return (
    <svg width={12} height={12} viewBox="0 0 24 24" fill="currentColor">
      <path d="M13 2 4.5 13.5H11L9.5 22 19 10h-6.5L13 2Z" />
    </svg>
  );
}

// ── History helpers ──────────────────────────────────────────────────────────

// Flatten one part to text for the conversation history. Proposal outcomes are
// spelled out so PaePae knows what was and wasn't executed.
function partToText(part: Part): string {
  switch (part.kind) {
    case 'text':
      return part.text;
    case 'lookup':
      return '';
    case 'proposal': {
      const what = `${part.proposal.action}: ${part.proposal.summary.join('; ')}`;
      switch (part.state) {
        case 'done':
          return `[Proposed ${what} — the user CONFIRMED it and it executed successfully.]`;
        case 'cancelled':
          return `[Proposed ${what} — the user CANCELLED it; nothing was changed.]`;
        case 'error':
          return `[Proposed ${what} — the user confirmed but it FAILED: ${part.result ?? 'unknown error'}.]`;
        default:
          return `[Proposed ${what} — still awaiting the user's decision.]`;
      }
    }
  }
}

// Append a part to the last (assistant) message.
function appendPart(list: Msg[], part: Part): Msg[] {
  const copy = list.slice();
  const last = copy[copy.length - 1];
  copy[copy.length - 1] = { ...last, parts: [...last.parts, part] };
  return copy;
}

// Append streamed text, merging into a trailing text part when there is one.
function appendText(list: Msg[], delta: string): Msg[] {
  const copy = list.slice();
  const last = copy[copy.length - 1];
  const parts = last.parts.slice();
  const tail = parts[parts.length - 1];
  if (tail && tail.kind === 'text') {
    parts[parts.length - 1] = { kind: 'text', text: tail.text + delta };
  } else {
    parts.push({ kind: 'text', text: delta });
  }
  copy[copy.length - 1] = { ...last, parts };
  return copy;
}
