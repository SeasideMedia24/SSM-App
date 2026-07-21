// Server-ONLY email sending via Resend. Two transactional emails today:
//   sendContractEmail  — "your agreement is ready to sign" + the e-sign link
//   sendWelcomeEmail   — post-signature welcome + the client's portal link
//
// Graceful when unconfigured: every send returns { ok:false, reason } instead
// of throwing, so signing/sending flows NEVER break because email isn't set up.
// Configure with RESEND_API_KEY + EMAIL_FROM (see .env.local.example). Until
// the seasidemedia.co domain is verified in Resend, EMAIL_FROM can be
// "onboarding@resend.dev" for testing (delivers, but shows Resend's domain).

import 'server-only';
import { Resend } from 'resend';

export function emailConfigured(): boolean {
  return Boolean(process.env.RESEND_API_KEY && process.env.EMAIL_FROM);
}

export type EmailResult = { ok: true } | { ok: false; reason: string };

const BRAND_INK = '#123B4F';
const BRAND_SEA = '#0f766e';

// One shared shell so both emails look like Seaside Media.
function shell(origin: string, title: string, bodyHtml: string): string {
  return `<!doctype html><html><body style="margin:0;background:#f1f5f9;padding:24px;font-family:Helvetica,Arial,sans-serif;color:#334155;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center">
    <table role="presentation" width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;padding:32px;">
      <tr><td style="padding-bottom:20px;border-bottom:1px solid #e2e8f0;">
        <img src="${origin}/brand/brand.png" alt="Seaside Media" width="40" height="40" style="vertical-align:middle;border-radius:4px;" />
        <span style="font-size:18px;font-weight:bold;letter-spacing:2px;color:${BRAND_INK};padding-left:10px;vertical-align:middle;">SEASIDE MEDIA</span>
      </td></tr>
      <tr><td style="padding-top:24px;">
        <h1 style="margin:0 0 12px;font-size:20px;color:${BRAND_INK};">${title}</h1>
        ${bodyHtml}
      </td></tr>
      <tr><td style="padding-top:28px;font-size:12px;color:#94a3b8;">
        Seaside Media · Video Production · <a href="https://seasidemedia.co" style="color:${BRAND_SEA};">seasidemedia.co</a>
      </td></tr>
    </table>
  </td></tr></table>
</body></html>`;
}

function button(href: string, label: string): string {
  return `<a href="${href}" style="display:inline-block;background:${BRAND_SEA};color:#ffffff;text-decoration:none;font-weight:bold;font-size:14px;padding:12px 24px;border-radius:12px;margin:16px 0;">${label}</a>`;
}

async function deliver(to: string, subject: string, html: string): Promise<EmailResult> {
  if (!emailConfigured()) return { ok: false, reason: 'Email isn’t set up yet (RESEND_API_KEY / EMAIL_FROM).' };
  try {
    const resend = new Resend(process.env.RESEND_API_KEY);
    const { error } = await resend.emails.send({ from: process.env.EMAIL_FROM!, to, subject, html });
    if (error) return { ok: false, reason: error.message };
    return { ok: true };
  } catch (e) {
    return { ok: false, reason: e instanceof Error ? e.message : 'Email failed to send.' };
  }
}

export async function sendContractEmail(opts: {
  origin: string;
  to: string;
  clientName: string;
  projectTitle: string;
  contractUrl: string;
}): Promise<EmailResult> {
  const first = opts.clientName.split(' ')[0] || 'there';
  const html = shell(
    opts.origin,
    'Your agreement is ready to sign',
    `<p style="margin:0 0 8px;line-height:1.6;">Hi ${first},</p>
     <p style="margin:0 0 8px;line-height:1.6;">Your agreement for <strong>${opts.projectTitle}</strong> is ready. Review it and sign online — it takes about a minute.</p>
     ${button(opts.contractUrl, 'Review & sign')}
     <p style="margin:8px 0 0;font-size:12px;color:#64748b;line-height:1.6;">This link is private to you. If anything looks off, just reply to this email.</p>`,
  );
  return deliver(opts.to, `Your Seaside Media agreement — ${opts.projectTitle}`, html);
}

export async function sendWelcomeEmail(opts: {
  origin: string;
  to: string;
  clientName: string;
  projectTitle: string;
  portalUrl: string;
}): Promise<EmailResult> {
  const first = opts.clientName.split(' ')[0] || 'there';
  const html = shell(
    opts.origin,
    `Welcome aboard, ${first}! 🎉`,
    `<p style="margin:0 0 8px;line-height:1.6;">Your agreement for <strong>${opts.projectTitle}</strong> is signed — we’re official.</p>
     <p style="margin:0 0 8px;line-height:1.6;">Your project hub has everything in one place: progress, timeline, payments, your kickoff booking, and brand uploads. Bookmark it — it stays with you for the whole project.</p>
     ${button(opts.portalUrl, 'Open your project hub')}
     <p style="margin:8px 0 0;font-size:12px;color:#64748b;line-height:1.6;">Questions about anything? Just reply — a real person answers.</p>`,
  );
  return deliver(opts.to, `Welcome to Seaside Media — ${opts.projectTitle}`, html);
}
