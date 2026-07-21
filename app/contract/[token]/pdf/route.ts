// Downloadable PDF of a sent/signed contract at /contract/<token>/pdf.
// Anonymous like the signing page itself: the unguessable token is the whole
// gate, the lookup runs on the admin client, and only the matching contract's
// snapshot (body_md) is ever rendered. Served as an attachment so the browser
// downloads instead of printing.

import { createElement } from 'react';
import { NextRequest, NextResponse } from 'next/server';
import { renderToBuffer } from '@react-pdf/renderer';
import { createAdminClient } from '@/lib/supabase/admin';
import { ContractPdf } from '@/lib/contracts/pdf';

export async function GET(req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  if (!token) return new NextResponse('Not found', { status: 404 });

  const admin = createAdminClient();
  const { data: contract } = await admin
    .from('contracts')
    .select('body_md, title, signer_name, signer_title, signed_at')
    .eq('share_token', token)
    .maybeSingle();
  if (!contract?.body_md) return new NextResponse('Not found', { status: 404 });

  // Brand emblem for the header — fetched from our own deployment so the route
  // needs no filesystem access (works the same locally and on Vercel).
  const logoPng = await fetch(new URL('/brand/brand.png', req.nextUrl.origin))
    .then((r) => (r.ok ? r.arrayBuffer() : null))
    .then((b) => (b ? new Uint8Array(b) : null))
    .catch(() => null);

  const signature = contract.signer_name
    ? {
        name: contract.signer_name,
        title: contract.signer_title,
        signedAt: contract.signed_at
          ? new Date(contract.signed_at).toLocaleString('en-US', { dateStyle: 'long', timeStyle: 'short' })
          : '',
      }
    : null;

  // createElement's inferred props don't match react-pdf's DocumentProps even
  // though the component renders a <Document> — cast once at the boundary.
  const element = createElement(ContractPdf, {
    bodyMd: contract.body_md,
    logoPng,
    signature,
  }) as Parameters<typeof renderToBuffer>[0];
  const pdf = await renderToBuffer(element);

  const filename = `Seaside-Media-Agreement${contract.signer_name ? '-signed' : ''}.pdf`;
  return new NextResponse(new Uint8Array(pdf), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Cache-Control': 'no-store',
    },
  });
}
