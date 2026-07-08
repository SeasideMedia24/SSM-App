// PaePae chat endpoint (Phase 2, slice 1).
//
// This is the ONLY place the Anthropic key is used. The browser posts the
// conversation here; we run the tool loop server-side and stream PaePae's reply
// back as plain text. Auth + RLS are enforced: the same Supabase server client
// the rest of the app uses scopes every tool read to the signed-in user.

import { NextRequest } from 'next/server';
import { z } from 'zod';
import type Anthropic from '@anthropic-ai/sdk';
import { createClient } from '@/lib/supabase/server';
import { getAnthropic, PAEPAE_MODEL } from '@/lib/paepae/client';
import { paepaeSystemPrompt } from '@/lib/paepae/system';
import { paepaeTools, runTool } from '@/lib/paepae/tools';

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
    .max(50),
});

// Safety cap on how many times PaePae may call tools before answering, so a loop
// can never run away.
const MAX_TOOL_ROUNDS = 6;

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

  // 4. Stream the reply. We run the tool loop and forward text deltas as they come.
  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        for (let round = 0; round < MAX_TOOL_ROUNDS; round++) {
          const ms = anthropic.messages.stream({
            model: PAEPAE_MODEL,
            max_tokens: 12000,
            system,
            thinking: { type: 'adaptive' },
            tools: paepaeTools,
            messages,
          });

          // Forward visible text to the browser as it's generated.
          ms.on('text', (delta) => controller.enqueue(encoder.encode(delta)));

          const final = await ms.finalMessage();
          // Echo the full assistant turn (incl. thinking + tool_use blocks) back
          // into history so a follow-up tool round stays coherent on the same model.
          messages.push({ role: 'assistant', content: final.content });

          if (final.stop_reason !== 'tool_use') break;

          // Execute each requested read tool and feed results back.
          const toolResults: Anthropic.ToolResultBlockParam[] = [];
          for (const block of final.content) {
            if (block.type !== 'tool_use') continue;
            try {
              const out = await runTool(
                block.name,
                block.input as Record<string, unknown>,
                supabase,
              );
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
          messages.push({ role: 'user', content: toolResults });
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : 'unknown error';
        controller.enqueue(encoder.encode(`\n\n⚠️ PaePae hit a problem: ${message}`));
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'no-store',
    },
  });
}
