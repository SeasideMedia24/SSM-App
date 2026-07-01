'use client';

// Cinematic tab-to-tab transition. On every navigation the (app) template
// re-mounts, which re-runs this component and plays a full-screen coastal
// "dissolve", then the page content rises into focus.
//
// All tabs use the same effect (dissolve) by request. The Overlay below still
// supports wipe / iris / split / curtain — to rotate per tab again, pick an
// effect from the pathname and pass it in.
//
// Overlays are pointer-events-none and unmount once finished, so they never
// block interaction. Opacity/transform/clip-path keep it GPU-friendly.

import { useState } from 'react';
import { motion } from 'motion/react';

type Effect = 'wipe' | 'iris' | 'split' | 'curtain' | 'dissolve';

const EFFECT: Effect = 'dissolve';
const EASE = [0.76, 0, 0.24, 1] as const;

export function PageTransition({ children }: { children: React.ReactNode }) {
  const [done, setDone] = useState(false);

  // Overlays are `absolute`, so they cover only the white content area (their
  // positioned ancestor is <main>) — the sidebar stays put during transitions.
  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 16, filter: 'blur(10px)' }}
        animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
        transition={{ duration: 0.5, delay: 0.12, ease: [0.22, 1, 0.36, 1] }}
      >
        {children}
      </motion.div>
      {!done && <Overlay effect={EFFECT} onDone={() => setDone(true)} />}
    </>
  );
}

function Overlay({ effect, onDone }: { effect: Effect; onDone: () => void }) {
  const panel =
    'brand-gradient-deep pointer-events-none absolute inset-0 z-50 will-change-transform';

  if (effect === 'dissolve') {
    return (
      <motion.div
        className={panel}
        initial={{ opacity: 1 }}
        animate={{ opacity: 0 }}
        transition={{ duration: 0.55, ease: 'easeInOut' }}
        onAnimationComplete={onDone}
      />
    );
  }

  if (effect === 'iris') {
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
    return (
      <>
        <motion.div
          className="brand-gradient-deep pointer-events-none absolute inset-x-0 top-0 z-50 h-1/2 will-change-transform"
          initial={{ y: '0%' }}
          animate={{ y: '-100%' }}
          transition={{ duration: 0.6, ease: EASE }}
        >
          <Edge side="bottom" />
        </motion.div>
        <motion.div
          className="brand-gradient-deep pointer-events-none absolute inset-x-0 bottom-0 z-50 h-1/2 will-change-transform"
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

function Edge({ side }: { side: 'right' | 'bottom' | 'top' }) {
  const map = {
    right: 'inset-y-0 right-0 w-1.5 bg-gradient-to-b',
    bottom: 'inset-x-0 bottom-0 h-1.5 bg-gradient-to-r',
    top: 'inset-x-0 top-0 h-1.5 bg-gradient-to-r',
  } as const;
  return <div className={`absolute ${map[side]} from-aqua via-aqua-light to-teal`} />;
}
