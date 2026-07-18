// Pure URL → embed parsing for link/embed cards on the canvas. Unit-tested.
// YouTube/Vimeo become playable iframes; everything else (incl. Pinterest)
// renders as a rich link card.

export type EmbedProvider = 'youtube' | 'vimeo' | 'pinterest' | 'other';
export type EmbedInfo = { provider: EmbedProvider; embedId: string | null; url: string };

export function parseEmbed(rawUrl: string): EmbedInfo {
  const url = rawUrl.trim();

  const yt = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/|live\/)|youtu\.be\/)([\w-]{11})/);
  if (yt) return { provider: 'youtube', embedId: yt[1], url };

  const vi = url.match(/vimeo\.com\/(?:video\/)?(\d+)/);
  if (vi) return { provider: 'vimeo', embedId: vi[1], url };

  if (/pinterest\.[a-z.]+\//i.test(url) || /(^|\/\/)pin\.it\//i.test(url)) {
    return { provider: 'pinterest', embedId: null, url };
  }

  return { provider: 'other', embedId: null, url };
}

// The iframe src for a playable provider, or null if it should be a link card.
export function embedSrc(info: EmbedInfo): string | null {
  if (info.provider === 'youtube' && info.embedId) return `https://www.youtube.com/embed/${info.embedId}`;
  if (info.provider === 'vimeo' && info.embedId) return `https://player.vimeo.com/video/${info.embedId}`;
  return null;
}

// Clean hostname for a link card label.
export function hostLabel(rawUrl: string): string {
  try {
    return new URL(rawUrl.trim()).hostname.replace(/^www\./, '');
  } catch {
    return rawUrl.trim();
  }
}
