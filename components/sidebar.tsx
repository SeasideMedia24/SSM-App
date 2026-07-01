'use client';

// App sidebar. Deep coastal gradient, Bebas wordmark, and an animated pill
// that slides to the active section (Motion layoutId). Edit NAV_ITEMS to
// add/rename/reorder sections.

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion } from 'motion/react';
import { logout } from '@/app/login/actions';

const NAV_ITEMS: { href: string; label: string; icon: React.ReactNode }[] = [
  { href: '/dashboard', label: 'Dashboard', icon: <IconGrid /> },
  { href: '/clients', label: 'Clients', icon: <IconUsers /> },
  { href: '/projects', label: 'Projects', icon: <IconStack /> },
  { href: '/my-tasks', label: 'My Tasks', icon: <IconCheck /> },
  { href: '/calculator', label: 'Calculator', icon: <IconCalc /> },
  { href: '/settings', label: 'Settings', icon: <IconGear /> },
];

export function Sidebar({ userEmail }: { userEmail: string }) {
  const pathname = usePathname();

  return (
    <aside className="brand-gradient-deep flex w-60 shrink-0 flex-col text-white">
      <div className="px-5 py-6">
        <p className="font-display text-2xl leading-none tracking-wide text-white">SEASIDE MEDIA</p>
        <p className="mt-1 text-[11px] font-medium uppercase tracking-[0.25em] text-aqua">Ops Hub</p>
      </div>

      <nav className="flex-1 space-y-1 px-3">
        {NAV_ITEMS.map((item) => {
          const active = pathname === item.href || pathname.startsWith(item.href + '/');
          return (
            <Link
              key={item.href}
              href={item.href}
              className="relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors"
            >
              {active && (
                <motion.span
                  layoutId="nav-pill"
                  className="absolute inset-0 rounded-xl border border-aqua/30 bg-aqua/15"
                  transition={{ type: 'spring', stiffness: 500, damping: 38 }}
                />
              )}
              <span
                className={`relative z-10 transition-colors ${active ? 'text-aqua' : 'text-white/60'}`}
              >
                {item.icon}
              </span>
              <span
                className={`relative z-10 transition-colors ${
                  active ? 'text-white' : 'text-white/70 group-hover:text-white'
                }`}
              >
                {item.label}
              </span>
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-white/10 px-5 py-4">
        <p className="mb-2 truncate text-xs text-white/50" title={userEmail}>
          {userEmail}
        </p>
        <form action={logout}>
          <button
            type="submit"
            className="w-full rounded-xl border border-white/20 px-3 py-2 text-sm font-medium text-white/80 transition-colors hover:border-aqua/50 hover:bg-white/5 hover:text-white active:scale-[0.98]"
          >
            Sign out
          </button>
        </form>
      </div>
    </aside>
  );
}

// Minimal inline stroke icons (no icon-library dependency). ~18px, inherit color.
function iconProps() {
  return {
    width: 18,
    height: 18,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.8,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
  };
}
function IconGrid() {
  return (
    <svg {...iconProps()}>
      <rect x="3" y="3" width="7" height="7" rx="1.5" />
      <rect x="14" y="3" width="7" height="7" rx="1.5" />
      <rect x="3" y="14" width="7" height="7" rx="1.5" />
      <rect x="14" y="14" width="7" height="7" rx="1.5" />
    </svg>
  );
}
function IconUsers() {
  return (
    <svg {...iconProps()}>
      <circle cx="9" cy="8" r="3" />
      <path d="M15 11a3 3 0 1 0-1-5.83" />
      <path d="M3 20a6 6 0 0 1 12 0" />
      <path d="M17 14a6 6 0 0 1 4 6" />
    </svg>
  );
}
function IconStack() {
  return (
    <svg {...iconProps()}>
      <path d="M12 3 3 8l9 5 9-5-9-5Z" />
      <path d="m3 13 9 5 9-5" />
    </svg>
  );
}
function IconCheck() {
  return (
    <svg {...iconProps()}>
      <path d="M9 11l3 3L22 4" />
      <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
    </svg>
  );
}
function IconCalc() {
  return (
    <svg {...iconProps()}>
      <rect x="4" y="2" width="16" height="20" rx="2" />
      <path d="M8 6h8M8 10h.01M12 10h.01M16 10h.01M8 14h.01M12 14h.01M8 18h8" />
    </svg>
  );
}
function IconGear() {
  return (
    <svg {...iconProps()}>
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1Z" />
    </svg>
  );
}
