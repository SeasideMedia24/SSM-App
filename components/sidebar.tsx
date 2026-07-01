'use client';

// App sidebar navigation. Client component so it can highlight the active link.
// Edit NAV_ITEMS to add/rename/reorder sections.

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { logout } from '@/app/login/actions';

const NAV_ITEMS = [
  { href: '/dashboard', label: 'Dashboard' },
  { href: '/clients', label: 'Clients' },
  { href: '/projects', label: 'Projects' },
  { href: '/my-tasks', label: 'My Tasks' },
  { href: '/calculator', label: 'Calculator' },
  { href: '/settings', label: 'Settings' },
];

export function Sidebar({ userEmail }: { userEmail: string }) {
  const pathname = usePathname();

  return (
    <aside className="flex w-56 shrink-0 flex-col border-r border-slate-200 bg-white">
      <div className="px-4 py-5">
        <p className="text-sm font-semibold text-slate-900">Seaside Media</p>
        <p className="text-xs text-slate-500">Ops Hub</p>
      </div>

      <nav className="flex-1 px-2">
        {NAV_ITEMS.map((item) => {
          const active =
            pathname === item.href || pathname.startsWith(item.href + '/');
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`block rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                active
                  ? 'bg-slate-900 text-white'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
              }`}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-slate-200 px-4 py-3">
        <p className="mb-2 truncate text-xs text-slate-500" title={userEmail}>
          {userEmail}
        </p>
        <form action={logout}>
          <button
            type="submit"
            className="w-full rounded-md border border-slate-300 px-3 py-1.5 text-sm text-slate-700 transition-colors hover:bg-slate-100"
          >
            Sign out
          </button>
        </form>
      </div>
    </aside>
  );
}
