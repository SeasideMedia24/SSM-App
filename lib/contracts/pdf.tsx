// Renders a contract's body_md snapshot as a real, downloadable PDF via
// @react-pdf/renderer (server-only — used by the /contract/[token]/pdf route).
//
// We only ever parse OUR OWN template's markdown (lib/contracts/template.ts):
// "# " title, "## " section, "**bold**"/"_italic_" inline, "- " bullets,
// "1. " numbered items, plain paragraphs. This is a deliberate mini-parser for
// that exact shape — not a general markdown engine.

import { Document, Page, Text, View, Image, StyleSheet } from '@react-pdf/renderer';

// ── Mini markdown parsing ────────────────────────────────────────────────────

type Seg = { text: string; bold?: boolean; italic?: boolean };
type Block =
  | { kind: 'h1' | 'h2' | 'p'; segs: Seg[] }
  | { kind: 'li'; segs: Seg[]; marker: string };

// Inline: **bold** and _italic_, with the template's escaped "\_" unescaped.
function parseInline(raw: string): Seg[] {
  const text = raw.replaceAll('\\_', '_');
  const segs: Seg[] = [];
  // Split by **bold** first, then _italic_ inside the non-bold pieces.
  const boldParts = text.split(/\*\*([^*]+)\*\*/g);
  boldParts.forEach((part, i) => {
    if (part === '') return;
    if (i % 2 === 1) {
      segs.push({ text: part, bold: true });
      return;
    }
    const italicParts = part.split(/_([^_]+)_/g);
    italicParts.forEach((ip, j) => {
      if (ip === '') return;
      segs.push(j % 2 === 1 ? { text: ip, italic: true } : { text: ip });
    });
  });
  return segs;
}

export function parseContractMarkdown(md: string): Block[] {
  const blocks: Block[] = [];
  for (const rawLine of md.split('\n')) {
    const line = rawLine.trim();
    if (line === '') continue;
    if (line.startsWith('# ')) blocks.push({ kind: 'h1', segs: parseInline(line.slice(2)) });
    else if (line.startsWith('## ')) blocks.push({ kind: 'h2', segs: parseInline(line.slice(3)) });
    else if (line.startsWith('- ')) blocks.push({ kind: 'li', segs: parseInline(line.slice(2)), marker: '•' });
    else {
      const num = line.match(/^(\d+)\.\s+(.*)$/);
      if (num) blocks.push({ kind: 'li', segs: parseInline(num[2]), marker: `${num[1]}.` });
      else blocks.push({ kind: 'p', segs: parseInline(line) });
    }
  }
  return blocks;
}

// ── PDF document ─────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  page: { paddingTop: 48, paddingBottom: 56, paddingHorizontal: 56, fontSize: 9.5, fontFamily: 'Helvetica', color: '#1e293b', lineHeight: 1.5 },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 6, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: '#e2e8f0' },
  logo: { width: 34, height: 34 },
  brand: { fontSize: 14, fontFamily: 'Helvetica-Bold', letterSpacing: 1 },
  tagline: { fontSize: 6.5, letterSpacing: 2, color: '#0f766e', marginTop: 2 },
  h1: { fontSize: 14, fontFamily: 'Helvetica-Bold', marginTop: 14, marginBottom: 6 },
  h2: { fontSize: 11, fontFamily: 'Helvetica-Bold', marginTop: 12, marginBottom: 4 },
  p: { marginBottom: 5 },
  li: { flexDirection: 'row', marginBottom: 3, paddingLeft: 10 },
  liMarker: { width: 16 },
  bold: { fontFamily: 'Helvetica-Bold' },
  italic: { fontFamily: 'Helvetica-Oblique', color: '#475569' },
  sig: { marginTop: 18, paddingTop: 12, borderTopWidth: 1, borderTopColor: '#e2e8f0' },
  sigName: { fontFamily: 'Helvetica-Bold', fontSize: 11 },
  footer: { position: 'absolute', bottom: 28, left: 56, right: 56, fontSize: 7.5, color: '#94a3b8', textAlign: 'center' },
});

function Segments({ segs }: { segs: Seg[] }) {
  return (
    <>
      {segs.map((s, i) => (
        <Text key={i} style={s.bold ? styles.bold : s.italic ? styles.italic : undefined}>
          {s.text}
        </Text>
      ))}
    </>
  );
}

export function ContractPdf({
  bodyMd,
  logoPng,
  signature,
}: {
  bodyMd: string;
  logoPng: Uint8Array | null; // brand.png bytes (fetched by the route)
  signature: { name: string; title: string | null; signedAt: string } | null;
}) {
  const blocks = parseContractMarkdown(bodyMd);
  return (
    <Document title="Seaside Media — Contract Project Agreement" author="Seaside Media LLC">
      <Page size="LETTER" style={styles.page}>
        <View style={styles.headerRow} fixed>
          {logoPng && <Image src={{ data: Buffer.from(logoPng), format: 'png' }} style={styles.logo} />}
          <View>
            <Text style={styles.brand}>SEASIDE MEDIA</Text>
            <Text style={styles.tagline}>VIDEO PRODUCTION</Text>
          </View>
        </View>

        {blocks.map((b, i) => {
          if (b.kind === 'h1') return <Text key={i} style={styles.h1}><Segments segs={b.segs} /></Text>;
          if (b.kind === 'h2') return <Text key={i} style={styles.h2}><Segments segs={b.segs} /></Text>;
          if (b.kind === 'li')
            return (
              <View key={i} style={styles.li}>
                <Text style={styles.liMarker}>{b.marker}</Text>
                <Text style={{ flex: 1 }}><Segments segs={b.segs} /></Text>
              </View>
            );
          return <Text key={i} style={styles.p}><Segments segs={b.segs} /></Text>;
        })}

        {signature && (
          <View style={styles.sig} wrap={false}>
            <Text style={styles.h2}>Signed electronically</Text>
            <Text style={styles.sigName}>{signature.name}{signature.title ? `, ${signature.title}` : ''}</Text>
            <Text>Signed {signature.signedAt}</Text>
          </View>
        )}

        <Text
          style={styles.footer}
          render={({ pageNumber, totalPages }) => `Seaside Media LLC · seasidemedia.co · Page ${pageNumber} of ${totalPages}`}
          fixed
        />
      </Page>
    </Document>
  );
}
