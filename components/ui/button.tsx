'use client';

// Brand button with instant tactile feedback (spring press via Motion).
// Variants: primary (coastal gradient), secondary (outline), danger, ghost.
// Style tokens live in ./button-styles so server components can reuse them.

import { motion, type HTMLMotionProps } from 'motion/react';
import { base, sizes, variants, type Variant, type Size } from './button-styles';

export function Button({
  variant = 'primary',
  size = 'md',
  className = '',
  children,
  ...props
}: HTMLMotionProps<'button'> & { variant?: Variant; size?: Size }) {
  return (
    <motion.button
      whileTap={{ scale: 0.96 }}
      whileHover={{ y: -1 }}
      transition={{ type: 'spring', stiffness: 500, damping: 30 }}
      className={`${base} ${sizes[size]} ${variants[variant]} ${className}`}
      {...props}
    >
      {children}
    </motion.button>
  );
}

export { buttonClass } from './button-styles';
