'use client';

// Live messaging glue, mounted once in each shell (owner + team). Subscribes to
// message inserts over Supabase Realtime — RLS scopes delivery, so we only ever
// receive messages in threads we can access. On a new message from someone else
// it refreshes the route (updating the open thread AND the sidebar unread badge)
// and, unless you're already looking at that thread, shows a small toast.

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

type Toast = { id: string; threadId: string; body: string };

export function MessagesLive({ userId, basePath }: { userId: string; basePath: string }) {
  const router = useRouter();
  const [toasts, setToasts] = useState<Toast[]>([]);

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel('messages-live')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, (payload) => {
        const row = payload.new as { id: string; sender_id: string; thread_id: string; body: string };
        if (row.sender_id === userId) return; // my own send is handled by the composer

        router.refresh(); // updates the open thread + the unread badge in the shell

        const params = new URLSearchParams(window.location.search);
        const viewingThisThread = window.location.pathname.startsWith(basePath) && params.get('t') === row.thread_id;
        if (!viewingThisThread) {
          const toast = { id: row.id, threadId: row.thread_id, body: row.body };
          setToasts((prev) => [...prev.filter((t) => t.id !== toast.id), toast].slice(-3));
          setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== toast.id)), 6000);
        }
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [userId, basePath, router]);

  if (toasts.length === 0) return null;
  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2">
      {toasts.map((t) => (
        <button
          key={t.id}
          type="button"
          onClick={() => { setToasts((prev) => prev.filter((x) => x.id !== t.id)); router.push(`${basePath}?t=${t.threadId}`); }}
          className="w-72 rounded-xl border border-slate-200 bg-white px-4 py-3 text-left shadow-lg transition hover:border-teal"
        >
          <p className="text-xs font-semibold uppercase tracking-wide text-sea">New message</p>
          <p className="mt-0.5 line-clamp-2 text-sm text-slate-700">{t.body}</p>
        </button>
      ))}
    </div>
  );
}
