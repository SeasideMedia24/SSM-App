'use client';

// Shared add/edit form for a client. Pass an existing client to edit, or leave
// it undefined to create a new one.

import Link from 'next/link';
import { useActionState } from 'react';
import { useFormStatus } from 'react-dom';
import { motion } from 'motion/react';
import { saveClient, type ClientFormState } from '@/app/(app)/clients/actions';
import { Button } from '@/components/ui/button';
import { CLIENT_TYPES } from '@/lib/projects/status';
import type { Database } from '@/types/database.types';

type Client = Database['public']['Tables']['clients']['Row'];

const initialState: ClientFormState = { error: null };

function SaveButton({ editing }: { editing: boolean }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? 'Saving…' : editing ? 'Save changes' : 'Create client'}
    </Button>
  );
}

const fieldClass =
  'rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-ink outline-none transition-shadow focus:border-teal focus:ring-2 focus:ring-aqua/40';

export function ClientForm({ client }: { client?: Client }) {
  const [state, formAction] = useActionState(saveClient, initialState);
  const editing = Boolean(client);

  return (
    <form action={formAction} className="flex max-w-xl flex-col gap-4">
      {client && <input type="hidden" name="id" value={client.id} />}

      <div className="flex flex-col gap-1.5">
        <label htmlFor="name" className="text-sm font-medium text-slate-700">
          Name <span className="text-red-500">*</span>
        </label>
        <input id="name" name="name" required defaultValue={client?.name ?? ''} className={fieldClass} />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="company" className="text-sm font-medium text-slate-700">
            Company
          </label>
          <input id="company" name="company" defaultValue={client?.company ?? ''} className={fieldClass} />
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="client_type" className="text-sm font-medium text-slate-700">
            Client type
          </label>
          <select id="client_type" name="client_type" defaultValue={client?.client_type ?? 'one_time'} className={fieldClass}>
            {CLIENT_TYPES.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="email" className="text-sm font-medium text-slate-700">
            Email
          </label>
          <input id="email" name="email" type="email" defaultValue={client?.email ?? ''} className={fieldClass} />
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="phone" className="text-sm font-medium text-slate-700">
            Phone
          </label>
          <input id="phone" name="phone" defaultValue={client?.phone ?? ''} className={fieldClass} />
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="notes" className="text-sm font-medium text-slate-700">
          Notes
        </label>
        <textarea id="notes" name="notes" rows={4} defaultValue={client?.notes ?? ''} className={fieldClass} />
      </div>

      {state.error && (
        <motion.p
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700"
          role="alert"
        >
          {state.error}
        </motion.p>
      )}

      <div className="flex items-center gap-3">
        <SaveButton editing={editing} />
        <Link
          href={client ? `/clients/${client.id}` : '/clients'}
          className="text-sm text-slate-500 hover:text-slate-700"
        >
          Cancel
        </Link>
      </div>
    </form>
  );
}
