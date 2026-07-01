'use client';

// Cinematic tab-to-tab transitions. On every navigation the (app) template
// re-mounts, which re-runs this component and plays a full-screen coastal
// transition, then the page content rises into focus.
//
// Several distinct effects rotate by route so switching tabs never feels
// repetitive: wipe, dissolve, iris (circle reveal), split (barn doors), curtain.
//
// All overlays are pointer-events-none and unmount once finished, so they never
// block interaction. Transforms/opacity/clip-path keep it GPU-friendly.

import { useMemo, useState } from 'react';
import { usePathname } from 'next/navigation';
import { motion } from 'motion/react';

const EFFECTS = ['wipe', 'iris', 'split', 'curtain', 'dissolve'] as const;
type Effect = (typeof EFFECTS)[number];

// Deterministic pick per path (stable across SSR/hydration; different per tab).
function effectForPath(path: string): Effect {
  let h = 0;
  for (let i = 0; i < path.length; i++) h = (h * 31 + path.charCodeAt(i)) >>> 0;
  return EFFECTS[h % EFFECTS.length];
}

const EASE = [0.76, 0, 0.24, 1] as const; // strong easeInOut for a snappy sweep

export function PageTransition({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const effect = useMemo(() => effectForPath(pathname), [pathname]);
  const [done, setDone] = useState(false);

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 16, filter: 'blur(10px)' }}
        animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
        transition={{ duration: 0.55, delay: 0.22, ease: [0.22, 1, 0.36, 1] }}
      >
        {children}
      </motion.div>
      {!done && <Overlay effect={effect} onDone={() => setDone(true)} />}
    </>
  );
}

function Overlay({ effect, onDone }: { effect: Effect; onDone: () => void }) {
  const panel =
    'brand-gradient-deep pointer-events-none fixed inset-0 z-50 will-change-transform';

  if (effect === 'dissolve') {
    return (
      <motion.div
        className={panel}
        initial={{ opacity: 1 }}
        animate={{ opacity: 0 }}
        transition={{ duration: 0.6, ease: 'easeInOut' }}
        onAnimationComplete={onDone}
      />
    );
  }

  if (effect === 'iris') {
    // The overlay shrinks to a point at the centre, revealing the page.
    return (
      <motion.div
        className={panel}
        initial={{ clipPath: 'circle(150% at 50% 50%)' }}
        animate={{ clipPath: 'circle(0% at 50% 50%)' }}
        transition={{ duration: 0.7, ease: EASE }}
        onAnimationComplete={onDone}
      />
    );
  }

  if (effect === 'curtain') {
    // Rises up off the screen like a theatre curtain.
    return (
      <motion.div
        className={panel}
        initial={{ y: '0%' }}
        animate={{ y: '-100%' }}
        transition={{ duration: 0.6, ease: EASE }}
        onAnimationComplete={onDone}
      >
        <Edge side="bottom" />
      </motion.div>
    );
  }

  if (effect === 'split') {
    // Two panels part vertically (barn doors) to reveal the page.
    return (
      <>
        <motion.div
          className="brand-gradient-deep pointer-events-none fixed inset-x-0 top-0 z-50 h-1/2 will-change-transform"
          initial={{ y: '0%' }}
          animate={{ y: '-100%' }}
          transition={{ duration: 0.6, ease: EASE }}
        >
          <Edge side="bottom" />
        </motion.div>
        <motion.div
          className="brand-gradient-deep pointer-events-none fixed inset-x-0 bottom-0 z-50 h-1/2 will-change-transform"
          initial={{ y: '0%' }}
          animate={{ y: '100%' }}
          transition={{ duration: 0.6, ease: EASE }}
          onAnimationComplete={onDone}
        >
          <Edge side="top" />
        </motion.div>
      </>
    );
  }

  // wipe — sweeps off to the right, revealing the page left-to-right.
  return (
    <motion.div
      className={panel}
      initial={{ x: '0%' }}
      animate={{ x: '105%' }}
      transition={{ duration: 0.6, ease: EASE }}
      onAnimationComplete={onDone}
    >
      <Edge side="right" />
    </motion.div>
  );
}

// A bright aqua leading edge that gives the sweeping panels a sense of speed.
function Edge({ side }: { side: 'right' | 'bottom' | 'top' }) {
  const map = {
    right: 'inset-y-0 right-0 w-1.5 bg-gradient-to-b',
    bottom: 'inset-x-0 bottom-0 h-1.5 bg-gradient-to-r',
    top: 'inset-x-0 top-0 h-1.5 bg-gradient-to-r',
  } as const;
  return <div className={`absolute ${map[side]} from-aqua via-aqua-light to-teal`} />;
}
