// Shared button style tokens. This file has NO "use client" directive on purpose
// so both server components (via buttonClass) and the client Button can use it.

export type Variant = 'primary' | 'secondary' | 'danger' | 'ghost';
export type Size = 'sm' | 'md';

export const base =
  'inline-flex items-center justify-center gap-2 rounded-xl font-medium transition-[filter,background-color,border-color,box-shadow] duration-150 disabled:opacity-60 disabled:pointer-events-none focus:outline-none focus-visible:ring-2 focus-visible:ring-aqua/60 focus-visible:ring-offset-2';

export const sizes: Record<Size, string> = {
  sm: 'px-3 py-1.5 text-sm',
  md: 'px-4 py-2.5 text-sm',
};

export const variants: Record<Variant, string> = {
  primary: 'brand-gradient text-white shadow-lg shadow-deep/20 hover:brightness-110',
  secondary: 'bg-white text-ink border border-slate-200 hover:border-teal hover:bg-slate-50',
  danger: 'bg-red-600 text-white shadow-lg shadow-red-600/20 hover:brightness-110',
  ghost: 'text-slate-600 hover:bg-slate-100 hover:text-ink',
};

// For links styled as buttons (server-safe; gets a snappy active:scale via CSS).
export function buttonClass(variant: Variant = 'primary', size: Size = 'md') {
  return `${base} ${sizes[size]} ${variants[variant]} active:scale-[0.97]`;
}
