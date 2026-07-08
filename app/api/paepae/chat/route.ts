// PaePae chat endpoint (Phase 2, slice 2: draft & do).
//
// This is the ONLY place the Anthropic key is used. The browser posts the
// conversation here; we run the tool loop server-side and stream back
// newline-delimited JSON events the chat UI renders in order:
//
//   {"t":"text","d":"…"}                 — a chunk of PaePae's reply
//   {"t":"lookup","label":"…"}           — PaePae read something (chip in UI)
//   {"t":"proposal","proposal":{…}}      — a gated write for the user to Confirm
//   {"t":"error","message":"…"}          — something went wrong
//
// Proposals do NOT write anything. The Confirm button posts them to
// /api/paepae/execute, which re-validates and executes. Auth + RLS throughout.

import { NextRequest } from 'next/server';
import { z } from 'zod';
import type Anthropic from '@anthropic-ai/sdk';
import { createClient } from '@/lib/supabase/server';
import { getAnthropic, PAEPAE_MODEL } from '@/lib/paepae/client';
import { paepaeSystemPrompt } from '@/lib/paepae/system';
import { allPaepaeTools, runTool, actionFromToolName } from '@/lib/paepae/tools';
import { validateAction, buildProposal } from '@/lib/paepae/actions';

export const runtime = 'nodejs';

// The browser only ever sends plain-text turns. Tool round-trips happen inside a
// single request and are not part of this history.
const bodySchema = z.object({
  messages: z
    .array(
      z.object({
        role: z.enum(['user', 'assistant']),
        content: z.string().min(1).max(20000),
      }),
    )
    .min(1)
    .max(60),
});

// Safety cap on tool rounds per request, so a loop can never run away.
const MAX_TOOL_ROUNDS = 8;

// Friendly labels for the lookup chips.
const LOOKUP_LABELS: Record<string, string> = {
  list_clients: 'Checked clients',
  list_projects: 'Checked projects',
  list_tasks: 'Checked tasks',
  list_quotes: 'Checked quotes',
};

export async function POST(req: NextRequest) {
  // 1. Auth — must be signed in (defense in depth alongside the proxy/middleware).
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return new Response('Unauthorized', { status: 401 });

  // 2. Validate input server-side (never trust the client).
  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return new Response('Invalid JSON', { status: 400 });
  }
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) return new Response('Invalid request', { status: 400 });

  // 3. Anthropic client — clear error if the key is missing.
  let anthropic: Anthropic;
  try {
    anthropic = getAnthropic();
  } catch (err) {
    const message = err instanceof Error ? err.message : 'PaePae is not configured.';
    return new Response(message, { status: 500 });
  }

  const today = new Date().toISOString().slice(0, 10);
  const messages: Anthropic.MessageParam[] = parsed.data.messages.map((m) => ({
    role: m.role,
    content: m.content,
  }));
  const system = paepaeSystemPrompt(today);

  // 4. Stream NDJSON events while running the tool loop server-side.
  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const emit = (event: Record<string, unknown>) =>
        controller.enqueue(encoder.encode(JSON.stringify(event) + '\n'));

      try {
        for (let round = 0; round < MAX_TOOL_ROUNDS; round++) {
          const ms = anthropic.messages.stream({
            model: PAEPAE_MODEL,
            max_tokens: 12000,
            system,
            thinking: { type: 'adaptive' },
            tools: allPaepaeTools,
            messages,
          });

          // Forward visible text to the browser as it's generated.
          ms.on('text', (delta) => emit({ t: 'text', d: delta }));

          const final = await ms.finalMessage();
          // Echo the full assistant turn (incl. thinking + tool_use blocks) back
          // into history so follow-up tool rounds stay coherent on the same model.
          messages.push({ role: 'assistant', content: final.content });

          if (final.stop_reason !== 'tool_use') break;

          const toolResults: Anthropic.ToolResultBlockParam[] = [];
          for (const block of final.content) {
            if (block.type !== 'tool_use') continue;
            const input = block.input as Record<string, unknown>;
            const action = actionFromToolName(block.name);

            if (action) {
              // A gated write: validate, show the card, and make it crystal
              // clear to the model that nothing has run yet.
              const checked = validateAction(action, input);
              if (!checked.ok) {
                toolResults.push({
                  type: 'tool_result',
                  tool_use_id: block.id,
                  content: `Invalid proposal: ${checked.error}`,
                  is_error: true,
                });
                continue;
              }
              // buildProposal also verifies referenced records exist under RLS.
              // If an id doesn't resolve, we DON'T show a card — we hand the
              // error back so PaePae can look the id up again and retry.
              const built = await buildProposal(action, checked.params, supabase);
              if (!built.ok) {
                toolResults.push({
                  type: 'tool_result',
                  tool_use_id: block.id,
                  content: built.error,
                  is_error: true,
                });
                continue;
              }
              emit({ t: 'proposal', proposal: built.proposal });
              toolResults.push({
                type: 'tool_result',
                tool_use_id: block.id,
                content:
                  'Proposal card shown to the user. It has NOT been executed — the user must click Confirm. Briefly note what you proposed and wait; never claim it is done.',
              });
            } else {
              // A read tool.
              emit({ t: 'lookup', label: LOOKUP_LABELS[block.name] ?? `Ran ${block.name}` });
              try {
                const out = await runTool(block.name, input, supabase);
                toolResults.push({ type: 'tool_result', tool_use_id: block.id, content: out });
              } catch (err) {
                const message = err instanceof Error ? err.message : 'lookup failed';
                toolResults.push({
                  type: 'tool_result',
                  tool_use_id: block.id,
                  content: `Error: ${message}`,
                  is_error: true,
                });
              }
            }
          }
          messages.push({ role: 'user', content: toolResults });
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : 'unknown error';
        emit({ t: 'error', message });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      // NDJSON — one JSON event per line.
      'Content-Type': 'application/x-ndjson; charset=utf-8',
      'Cache-Control': 'no-store',
    },
  });
}
