// QuickBooks Online configuration — endpoints, scope, and env credential check.
// Production only (per the owner's choice). Keys live in env, server-side.
// Set QUICKBOOKS_CLIENT_ID / QUICKBOOKS_CLIENT_SECRET / QUICKBOOKS_WEBHOOK_VERIFIER_TOKEN
// in .env.local and Vercel (see .env.local.example).

export const QBO = {
  authorizeUrl: 'https://appcenter.intuit.com/connect/oauth2',
  tokenUrl: 'https://oauth.platform.intuit.com/oauth2/v1/tokens/bearer',
  // Production API base. Company (realm) id is appended per request.
  apiBase: 'https://quickbooks.api.intuit.com/v3/company',
  scope: 'com.intuit.quickbooks.accounting',
  // QuickBooks minor version — pins response shape so fields don't shift under us.
  minorVersion: '73',
} as const;

export function quickbooksConfigured(): boolean {
  return Boolean(process.env.QUICKBOOKS_CLIENT_ID && process.env.QUICKBOOKS_CLIENT_SECRET);
}

// Per-variable status for the Settings card, so a misconfigured deploy says
// exactly WHICH credential the server can't see (missing entirely vs present
// but blank). Reports presence only — never the values.
export type EnvVarState = 'ok' | 'missing' | 'empty';

export function quickbooksEnvStatus(): Record<'QUICKBOOKS_CLIENT_ID' | 'QUICKBOOKS_CLIENT_SECRET', EnvVarState> {
  const state = (v: string | undefined): EnvVarState =>
    v === undefined ? 'missing' : v.trim() === '' ? 'empty' : 'ok';
  return {
    QUICKBOOKS_CLIENT_ID: state(process.env.QUICKBOOKS_CLIENT_ID),
    QUICKBOOKS_CLIENT_SECRET: state(process.env.QUICKBOOKS_CLIENT_SECRET),
  };
}

// Basic-auth header for the token endpoint (client_id:client_secret, base64).
export function qboBasicAuth(): string {
  const raw = `${process.env.QUICKBOOKS_CLIENT_ID}:${process.env.QUICKBOOKS_CLIENT_SECRET}`;
  return `Basic ${Buffer.from(raw).toString('base64')}`;
}
