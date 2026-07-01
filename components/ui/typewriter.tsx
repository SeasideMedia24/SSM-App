'use client';

// Types text out character-by-character. Layout is reserved up-front (the full
// text is rendered invisibly) so nothing shifts as it types. Speed auto-tunes so
// long strings don't drag — total reveal stays roughly under a second.
//
// Accessibility: the real text is exposed via aria-label and the animated glyphs
// are aria-hidden; respects prefers-reduced-motion (shows instantly).

import { createElement, useEffect, useState, type ElementType } from 'react';

export function Typewriter({
  text,
  as = 'span',
  className = '',
  speed,
  startDelay = 100,
  cursor = true,
}: {
  text: string;
  as?: ElementType;
  className?: string;
  speed?: number;
  startDelay?: number;
  cursor?: boolean;
}) {
  const [n, setN] = useState(0);

  // Per-character delay: ~26ms, but faster for long strings (cap ~1s total).
  const perChar = speed ?? Math.max(9, Math.min(26, Math.round(700 / Math.max(text.length, 1))));

  useEffect(() => {
    if (typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setN(text.length);
      return;
    }
    setN(0);
    let i = 0;
    let tick: ReturnType<typeof setTimeout>;
    const startTimer = setTimeout(function step() {
      i += 1;
      setN(i);
      if (i < text.length) tick = setTimeout(step, perChar);
    }, startDelay);
    return () => {
      clearTimeout(startTimer);
      clearTimeout(tick);
    };
  }, [text, perChar, startDelay]);

  const typing = n < text.length;

  return createElement(
    as,
    { className, 'aria-label': text },
    <span aria-hidden="true">
      <span>{text.slice(0, n)}</span>
      {cursor && (
        <span className={typing ? 'animate-pulse text-teal' : 'opacity-0'}>|</span>
      )}
      <span className="opacity-0">{text.slice(n)}</span>
    </span>,
  );
}
