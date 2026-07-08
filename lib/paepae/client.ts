// Server-ONLY Anthropic client for PaePae (Phase 2 assistant).
//
// ⚠️  The Anthropic API key is a secret. This module imports 'server-only' so the
//     build FAILS if it is ever pulled into a browser bundle — the same guardrail
//     the Supabase admin client uses. PaePae is only ever called from the server
//     route handler at app/api/paepae/chat/route.ts.

import 'server-only';
import Anthropic from '@anthropic-ai/sdk';

// The model PaePae runs on. Kept here as a single named constant so it is easy to
// find and change later without hunting through the route handler.
export const PAEPAE_MODEL = 'claude-opus-4-8';

// Reused across requests. The SDK reads ANTHROPIC_API_KEY from the environment.
let cached: Anthropic | null = null;

export function getAnthropic(): Anthropic {
  if (!process.env.ANTHROPIC_API_KEY) {
    // A clear, actionable error instead of a cryptic 401 later on.
    throw new Error(
      'ANTHROPIC_API_KEY is not set. Add it to .env.local (local) and Vercel (production). See .env.example.',
    );
  }
  cached ??= new Anthropic();
  return cached;
}
