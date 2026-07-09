'use client';

// App sidebar. Deep coastal gradient, Bebas wordmark, and an animated pill
// that slides to the active section (Motion layoutId). "Projects" expands into
// its cross-project views. Edit NAV_ITEMS to add/rename/reorder sections.

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { logout } from '@/app/login/actions';

type NavChild = { href: string; label: string };
type NavItem = { href: string; label: string; icon: React.ReactNode; children?: NavChild[] };

const NAV_ITEMS: NavItem[] = [
  { href: '/dashboard', label: 'Dashboard', icon: <IconGrid /> },
  { href: '/clients', label: 'Clients', icon: <IconUsers /> },
  { href: '/inquiries', label: 'Inquiries', icon: <IconInbox /> },
  {
    href: '/projects',
    label: 'Projects',
    icon: <IconStack />,
    children: [
      { href: '/projects', label: 'Board' },
      { href: '/projects/deliverables', label: 'Deliverables' },
      { href: '/projects/contracts', label: 'Contracts' },
      { href: '/projects/expenses', label: 'Expenses' },
      { href: '/projects/budget', label: 'Budgets' },
    ],
  },
  { href: '/my-tasks', label: 'My Tasks', icon: <IconCheck /> },
  { href: '/calculator', label: 'Calculator', icon: <IconCalc /> },
  { href: '/invoices', label: 'Invoices', icon: <IconReceipt /> },
  { href: '/contractors', label: 'Contractors', icon: <IconTeam /> },
  { href: '/settings', label: 'Settings', icon: <IconGear /> },
];

// The global-view child paths (used so "Board" isn't marked active on them).
const GLOBAL_VIEW_PATHS = [
  '/projects/deliverables', '/projects/contracts',
  '/projects/expenses', '/projects/budget',
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
        {NAV_ITEMS.map((item) =>
          item.children ? (
            <NavGroup key={item.href} item={item} pathname={pathname} />
          ) : (
            <NavLink
              key={item.href}
              href={item.href}
              icon={item.icon}
              label={item.label}
              active={pathname === item.href || pathname.startsWith(item.href + '/')}
            />
          ),
        )}
      </nav>

      {/* PaePae is pinned to the bottom of the menu — the assistant is always
          one click away, sitting just above the account footer. */}
      <div className="px-3 pb-2 pt-1">
        <NavLink
          href="/paepae"
          icon={<IconSpark />}
          label="PaePae"
          active={pathname === '/paepae' || pathname.startsWith('/paepae/')}
        />
      </div>

      <div className="border-t border-white/10 px-5 py-4">
        <p className="mb-2 truncate text-xs text-white/50" title={userEmail}>{userEmail}</p>
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

function NavLink({ href, icon, label, active }: { href: string; icon: React.ReactNode; label: string; active: boolean }) {
  return (
    <Link href={href} className="relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors">
      {active && (
        <motion.span layoutId="nav-pill" className="absolute inset-0 rounded-xl border border-aqua/30 bg-aqua/15" transition={{ type: 'spring', stiffness: 500, damping: 38 }} />
      )}
      <span className={`relative z-10 transition-colors ${active ? 'text-aqua' : 'text-white/60'}`}>{icon}</span>
      <span className={`relative z-10 transition-colors ${active ? 'text-white' : 'text-white/70'}`}>{label}</span>
    </Link>
  );
}

function NavGroup({ item, pathname }: { item: NavItem; pathname: string }) {
  const parentActive = pathname.startsWith(item.href);
  const [open, setOpen] = useState(parentActive);

  return (
    <div>
      <div className="relative flex items-center rounded-xl">
        {parentActive && (
          <motion.span layoutId="nav-pill" className="absolute inset-0 rounded-xl border border-aqua/30 bg-aqua/15" transition={{ type: 'spring', stiffness: 500, damping: 38 }} />
        )}
        <Link href={item.href} className="relative z-10 flex flex-1 items-center gap-3 px-3 py-2.5 text-sm font-medium">
          <span className={`transition-colors ${parentActive ? 'text-aqua' : 'text-white/60'}`}>{item.icon}</span>
          <span className={`transition-colors ${parentActive ? 'text-white' : 'text-white/70'}`}>{item.label}</span>
        </Link>
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-label={open ? 'Collapse Projects' : 'Expand Projects'}
          className="relative z-10 px-2.5 py-2.5 text-white/50 transition-colors hover:text-white"
        >
          <Chevron open={open} />
        </button>
      </div>

      <AnimatePresence initial={false}>
        {open && (
          <motion.ul
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: 'easeInOut' }}
            className="overflow-hidden"
          >
            {item.children!.map((c) => {
              const active =
                c.href === '/projects'
                  ? pathname === '/projects' || (pathname.startsWith('/projects/') && !GLOBAL_VIEW_PATHS.includes(pathname))
                  : pathname === c.href;
              return (
                <li key={c.href}>
                  <Link
                    href={c.href}
                    className={`ml-9 block rounded-lg px-3 py-1.5 text-[13px] transition-colors ${active ? 'font-medium text-aqua' : 'text-white/55 hover:text-white'}`}
                  >
                    {c.label}
                  </Link>
                </li>
              );
            })}
          </motion.ul>
        )}
      </AnimatePresence>
    </div>
  );
}

function Chevron({ open }: { open: boolean }) {
  return (
    <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round"
      className={`transition-transform duration-200 ${open ? 'rotate-180' : ''}`}>
      <path d="m6 9 6 6 6-6" />
    </svg>
  );
}

// Minimal inline stroke icons (no icon-library dependency). ~18px, inherit color.
function iconProps() {
  return {
    width: 18, height: 18, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor',
    strokeWidth: 1.8, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const,
  };
}
function IconGrid() {
  return (
    <svg {...iconProps()}>
      <rect x="3" y="3" width="7" height="7" rx="1.5" /><rect x="14" y="3" width="7" height="7" rx="1.5" />
      <rect x="3" y="14" width="7" height="7" rx="1.5" /><rect x="14" y="14" width="7" height="7" rx="1.5" />
    </svg>
  );
}
function IconUsers() {
  return (
    <svg {...iconProps()}>
      <circle cx="9" cy="8" r="3" /><path d="M15 11a3 3 0 1 0-1-5.83" /><path d="M3 20a6 6 0 0 1 12 0" /><path d="M17 14a6 6 0 0 1 4 6" />
    </svg>
  );
}
function IconSpark() {
  return (
    <svg {...iconProps()}>
      <path d="M12 3v4M12 17v4M3 12h4M17 12h4" />
      <path d="M12 8a4 4 0 0 0 4 4 4 4 0 0 0-4 4 4 4 0 0 0-4-4 4 4 0 0 0 4-4Z" />
    </svg>
  );
}
function IconInbox() {
  return (
    <svg {...iconProps()}>
      <path d="M22 12h-6l-2 3h-4l-2-3H2" />
      <path d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z" />
    </svg>
  );
}
function IconStack() {
  return (
    <svg {...iconProps()}>
      <path d="M12 3 3 8l9 5 9-5-9-5Z" /><path d="m3 13 9 5 9-5" />
    </svg>
  );
}
function IconCheck() {
  return (
    <svg {...iconProps()}>
      <path d="M9 11l3 3L22 4" /><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
    </svg>
  );
}
function IconCalc() {
  return (
    <svg {...iconProps()}>
      <rect x="4" y="2" width="16" height="20" rx="2" /><path d="M8 6h8M8 10h.01M12 10h.01M16 10h.01M8 14h.01M12 14h.01M8 18h8" />
    </svg>
  );
}
function IconReceipt() {
  return (
    <svg {...iconProps()}>
      <path d="M4 2v20l2-1.5L8 22l2-1.5L12 22l2-1.5L16 22l2-1.5L20 22V2l-2 1.5L16 2l-2 1.5L12 2l-2 1.5L8 2 6 3.5 4 2Z" />
      <path d="M8 7h8M8 11h8M8 15h5" />
    </svg>
  );
}
function IconTeam() {
  return (
    <svg {...iconProps()}>
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
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
