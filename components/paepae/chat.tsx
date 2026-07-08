'use client';

// PaePae chat panel. Talks only to /api/paepae/chat (server-side), which holds
// the Anthropic key — this component never sees a secret. It streams the reply
// token-by-token into the last assistant bubble.

import { useRef, useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';

type Msg = { role: 'user' | 'assistant'; content: string };

// A few starter prompts for the empty state — tuned to what PaePae can actually do.
const SUGGESTIONS = [
  'What needs my attention this week?',
  'Summarise my active projects.',
  'Draft a friendly check-in email to a client.',
  'Which quotes are still pending?',
];

export function PaePaeChat() {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Keep the newest message in view as content streams in.
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages]);

  async function send(text: string) {
    const trimmed = text.trim();
    if (!trimmed || busy) return;

    const next: Msg[] = [...messages, { role: 'user', content: trimmed }];
    // Add an empty assistant bubble we'll stream into.
    setMessages([...next, { role: 'assistant', content: '' }]);
    setInput('');
    setBusy(true);

    try {
      const res = await fetch('/api/paepae/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: next }),
      });

      if (!res.ok || !res.body) {
        const detail = (await res.text().catch(() => '')) || 'Something went wrong.';
        setMessages((m) => replaceLast(m, `⚠️ ${detail}`));
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let acc = '';
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        acc += decoder.decode(value, { stream: true });
        setMessages((m) => replaceLast(m, acc));
      }
    } catch {
      setMessages((m) => replaceLast(m, '⚠️ PaePae could not be reached. Check your connection and try again.'));
    } finally {
      setBusy(false);
    }
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
            <h2 className="font-display text-2xl tracking-wide text-ink">Kia ora, I&rsquo;m PaePae</h2>
            <p className="mt-1 text-sm text-slate-500">
              Your studio assistant. I can look up your projects, tasks, quotes, and clients to
              help you organise, summarise, and draft. I suggest — you decide.
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
          messages.map((m, i) => <Bubble key={i} msg={m} busy={busy && i === messages.length - 1} />)
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

function Bubble({ msg, busy }: { msg: Msg; busy: boolean }) {
  const isUser = msg.role === 'user';
  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`max-w-[80%] whitespace-pre-wrap rounded-2xl px-4 py-2.5 text-sm ${
          isUser
            ? 'brand-gradient text-white'
            : 'border border-slate-200 bg-slate-50 text-ink'
        }`}
      >
        {msg.content || (busy ? <Dots /> : null)}
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

// Replace the content of the last (assistant) message in the list.
function replaceLast(list: Msg[], content: string): Msg[] {
  const copy = list.slice();
  copy[copy.length - 1] = { ...copy[copy.length - 1], content };
  return copy;
}
