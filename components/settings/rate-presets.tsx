'use client';

// Rate preset manager for Settings. Each row is its own small form: click a
// field, change it, Save appears. "Add preset" opens one empty row. Deleting
// asks for confirmation first. These presets feed the Price Calculator.

import { useState } from 'react';
import { useActionState } from 'react';
import { useFormStatus } from 'react-dom';
import { savePreset, deletePreset, type PresetFormState } from '@/app/(app)/settings/actions';
import { money } from '@/lib/projects/format';

const field =
  'rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-sm text-ink outline-none transition-shadow focus:border-teal focus:ring-2 focus:ring-aqua/40';

export type Preset = { id: string; label: string; unit: string; default_rate: number };

function SaveButton({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className="rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-slate-700 disabled:opacity-60">
      {pending ? 'Saving…' : label}
    </button>
  );
}

// Lives INSIDE the row's <form> — forms can't nest, so the confirm button uses
// React 19's formAction to submit the same form to deletePreset instead.
// deletePreset only reads the hidden "id" field.
function DeleteControl() {
  const [confirming, setConfirming] = useState(false);
  if (!confirming) {
    return (
      <button type="button" onClick={() => setConfirming(true)} className="text-xs font-medium text-slate-400 hover:text-red-600">
        Delete
      </button>
    );
  }
  return (
    <span className="inline-flex items-center gap-2">
      <button
        type="submit"
        formAction={deletePreset}
        formNoValidate
        className="rounded-lg bg-red-600 px-2.5 py-1 text-xs font-medium text-white hover:bg-red-500"
      >
        Yes, delete
      </button>
      <button type="button" onClick={() => setConfirming(false)} className="text-xs text-slate-500 hover:text-slate-700">
        Cancel
      </button>
    </span>
  );
}

// One editable preset row (also used, without id, as the "add new" row).
function PresetRow({ preset, onDone }: { preset?: Preset; onDone?: () => void }) {
  const [state, action] = useActionState<PresetFormState, FormData>(
    async (prev, fd) => {
      const result = await savePreset(prev, fd);
      if (!result.error) onDone?.();
      return result;
    },
    { error: null },
  );

  return (
    <form action={action} className="flex flex-col gap-2">
      <div className="grid grid-cols-[1fr_7rem_7rem_auto_auto] items-center gap-2">
        {preset && <input type="hidden" name="id" value={preset.id} />}
        <input name="label" defaultValue={preset?.label ?? ''} placeholder="e.g. Full shoot day" required className={field} />
        <input name="unit" defaultValue={preset?.unit ?? ''} placeholder="day / hour" required className={field} />
        <input
          name="default_rate"
          type="number" min="0" step="0.01"
          defaultValue={preset ? String(preset.default_rate) : ''}
          placeholder="0.00"
          required
          className={field}
        />
        <SaveButton label={preset ? 'Save' : 'Add'} />
        {preset ? <DeleteControl /> : (
          <button type="button" onClick={onDone} className="text-xs text-slate-500 hover:text-slate-700">Cancel</button>
        )}
      </div>
      {state.error && <p className="text-xs text-red-600" role="alert">{state.error}</p>}
    </form>
  );
}

export function RatePresets({ presets }: { presets: Preset[] }) {
  const [adding, setAdding] = useState(false);

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <p className="mb-4 text-sm text-slate-500">
        These feed the Price Calculator’s “Add from preset” menu. Changing a rate here affects new quotes only —
        saved quotes keep the numbers they were built with.
      </p>

      <div className="mb-1.5 grid grid-cols-[1fr_7rem_7rem_auto_auto] gap-2 px-1 text-xs font-medium uppercase tracking-wide text-slate-500">
        <span>Preset</span><span>Unit</span><span>Rate</span><span /><span />
      </div>

      <div className="flex flex-col gap-2">
        {presets.map((p) => <PresetRow key={`${p.id}-${p.label}-${p.unit}-${p.default_rate}`} preset={p} />)}
        {presets.length === 0 && !adding && (
          <p className="py-4 text-center text-sm text-slate-400">No presets yet — add your Seaside Media rates.</p>
        )}
        {adding ? (
          <PresetRow onDone={() => setAdding(false)} />
        ) : (
          <div>
            <button
              type="button"
              onClick={() => setAdding(true)}
              className="mt-1 rounded-xl border border-slate-200 px-3 py-2 text-sm font-medium text-slate-600 transition-colors hover:border-teal hover:text-sea"
            >
              + Add preset
            </button>
          </div>
        )}
      </div>

      <p className="mt-4 text-xs text-slate-400">
        Example rates: {money(1500)}/day full shoot, {money(120)}/hour editing — replace the seeded placeholders with your real numbers.
      </p>
    </div>
  );
}
