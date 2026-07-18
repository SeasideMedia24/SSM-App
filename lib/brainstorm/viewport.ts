// Pure pan/zoom geometry for the canvas. Kept out of the React component so the
// tricky coordinate math is unit-testable without a browser.
//
// A Viewport is the world→screen transform: a screen point = world*scale + (x,y),
// where (x,y) is the pan translation in screen pixels and scale is the zoom.

export type Viewport = { x: number; y: number; scale: number };
export type Point = { x: number; y: number };

export const MIN_SCALE = 0.2;
export const MAX_SCALE = 2.5;

export const clampScale = (s: number) => Math.min(MAX_SCALE, Math.max(MIN_SCALE, s));

export function screenToWorld(vp: Viewport, sx: number, sy: number): Point {
  return { x: (sx - vp.x) / vp.scale, y: (sy - vp.y) / vp.scale };
}

export function worldToScreen(vp: Viewport, wx: number, wy: number): Point {
  return { x: wx * vp.scale + vp.x, y: wy * vp.scale + vp.y };
}

// Zoom by a multiplicative factor, keeping the world point under the screen
// anchor (the cursor) fixed on screen.
export function zoomAround(vp: Viewport, anchorX: number, anchorY: number, factor: number): Viewport {
  const scale = clampScale(vp.scale * factor);
  const world = screenToWorld(vp, anchorX, anchorY);
  // Solve worldToScreen(new, world) === anchor  →  x = anchor - world*scale
  return { scale, x: anchorX - world.x * scale, y: anchorY - world.y * scale };
}

export function pan(vp: Viewport, dx: number, dy: number): Viewport {
  return { ...vp, x: vp.x + dx, y: vp.y + dy };
}

// World coordinate at the center of a viewport of the given pixel size — where
// newly-added items should land.
export function viewportCenterWorld(vp: Viewport, width: number, height: number): Point {
  return screenToWorld(vp, width / 2, height / 2);
}
