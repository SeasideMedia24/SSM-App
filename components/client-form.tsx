'use client';

// Shared add/edit form for a client. Pass an existing client to edit, or leave
// it undefined to create a new one.

import Link from 'next/link';
import { useActionState } from 'react';
import { useFormStatus } from 'react-dom';
import { saveClient, type ClientFormState } from '@/app/(app)/clients/actions';
import type { Database } from '@/types/database.types';

type Client = Database['public']['Tables']['clients']['Row'];

const initialState: ClientFormState = { error: null };

function SaveButton({ editing }: { editing: boolean }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-slate-700 disabled:opacity-60"
    >
      {pending ? 'Saving…' : editing ? 'Save changes' : 'Create client'}
    </button>
  );
}

const fieldClass =
  'rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-900 focus:ring-1 focus:ring-slate-900';

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

      <div className="flex flex-col gap-1.5">
        <label htmlFor="company" className="text-sm font-medium text-slate-700">
          Company
        </label>
        <input id="company" name="company" defaultValue={client?.company ?? ''} className={fieldClass} />
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
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">
          {state.error}
        </p>
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
