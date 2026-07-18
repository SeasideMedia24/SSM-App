import { describe, it, expect } from 'vitest';
import {
  screenToWorld, worldToScreen, zoomAround, clampScale, viewportCenterWorld, type Viewport,
} from './viewport';
import { parseEmbed, embedSrc, hostLabel } from './embed';

describe('viewport geometry', () => {
  const vp: Viewport = { x: 100, y: 50, scale: 2 };

  it('round-trips screen ↔ world', () => {
    const w = screenToWorld(vp, 300, 250);
    expect(w).toEqual({ x: 100, y: 100 });
    expect(worldToScreen(vp, w.x, w.y)).toEqual({ x: 300, y: 250 });
  });

  it('clamps scale to [0.2, 2.5]', () => {
    expect(clampScale(10)).toBe(2.5);
    expect(clampScale(0.01)).toBe(0.2);
    expect(clampScale(1)).toBe(1);
  });

  it('keeps the anchor world-point fixed while zooming', () => {
    const anchor = { x: 640, y: 360 };
    const before = screenToWorld(vp, anchor.x, anchor.y);
    const zoomed = zoomAround(vp, anchor.x, anchor.y, 1.25);
    const after = screenToWorld(zoomed, anchor.x, anchor.y);
    expect(after.x).toBeCloseTo(before.x, 6);
    expect(after.y).toBeCloseTo(before.y, 6);
    expect(zoomed.scale).toBeCloseTo(2.5, 6); // 2 * 1.25 clamped at 2.5
  });

  it('computes the world center of the viewport', () => {
    const c = viewportCenterWorld({ x: 0, y: 0, scale: 1 }, 800, 600);
    expect(c).toEqual({ x: 400, y: 300 });
  });
});

describe('embed parsing', () => {
  it('detects YouTube in all common URL shapes', () => {
    for (const u of [
      'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
      'https://youtu.be/dQw4w9WgXcQ',
      'https://www.youtube.com/embed/dQw4w9WgXcQ',
      'https://www.youtube.com/shorts/dQw4w9WgXcQ',
    ]) {
      const e = parseEmbed(u);
      expect(e.provider).toBe('youtube');
      expect(e.embedId).toBe('dQw4w9WgXcQ');
      expect(embedSrc(e)).toBe('https://www.youtube.com/embed/dQw4w9WgXcQ');
    }
  });

  it('detects Vimeo', () => {
    const e = parseEmbed('https://vimeo.com/123456789');
    expect(e.provider).toBe('vimeo');
    expect(embedSrc(e)).toBe('https://player.vimeo.com/video/123456789');
  });

  it('flags Pinterest as a link card (no iframe)', () => {
    expect(parseEmbed('https://www.pinterest.com/pin/12345/').provider).toBe('pinterest');
    expect(parseEmbed('https://pin.it/abc').provider).toBe('pinterest');
    expect(embedSrc(parseEmbed('https://pin.it/abc'))).toBeNull();
  });

  it('treats unknown URLs as plain links', () => {
    const e = parseEmbed('https://example.com/some/page');
    expect(e.provider).toBe('other');
    expect(embedSrc(e)).toBeNull();
    expect(hostLabel('https://www.example.com/x')).toBe('example.com');
  });
});
