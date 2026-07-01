'use client';

// Delete a client, but only after an explicit in-UI confirmation
// (CLAUDE.md rule #4: no destructive action without confirmation).

import { useState } from 'react';
import { useFormStatus } from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';
import { deleteClient } from '@/app/(app)/clients/actions';
import { Button } from '@/components/ui/button';

function ConfirmButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" variant="danger" size="sm" disabled={pending}>
      {pending ? 'Deleting…' : 'Yes, delete'}
    </Button>
  );
}

export function DeleteClientButton({ clientId, clientName }: { clientId: string; clientName: string }) {
  const [confirming, setConfirming] = useState(false);

  return (
    <AnimatePresence mode="wait" initial={false}>
      {!confirming ? (
        <motion.div key="trigger" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
          <Button variant="secondary" size="sm" onClick={() => setConfirming(true)} className="!text-red-600 hover:!border-red-300 hover:!bg-red-50">
            Delete client
          </Button>
        </motion.div>
      ) : (
        <motion.div
          key="confirm"
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.96 }}
          className="flex items-center gap-3 rounded-xl border border-red-200 bg-red-50 px-3 py-2"
        >
          <span className="text-sm text-red-700">
            Delete <span className="font-medium">{clientName}</span> and all its projects and quotes?
          </span>
          <form action={deleteClient}>
            <input type="hidden" name="id" value={clientId} />
            <ConfirmButton />
          </form>
          <button
            type="button"
            onClick={() => setConfirming(false)}
            className="text-sm text-slate-500 hover:text-slate-700"
          >
            Cancel
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
