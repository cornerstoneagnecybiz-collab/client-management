'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  FolderKanban,
  ClipboardList,
  ListChecks,
  Truck,
  Users,
  Wallet,
  BookOpen,
  Package,
  BarChart3,
  Settings,
  History,
  ScrollText,
} from 'lucide-react';
import { cn } from '@/lib/utils';

// Order reflects journey: people & entities → work → money → config
const nav = [
  { href: '/', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/activity', label: 'Activity', icon: History },
  { href: '/clients', label: 'Clients', icon: Users },
  { href: '/vendors', label: 'Vendors', icon: Truck },
  { href: '/projects', label: 'Projects', icon: FolderKanban },
  { href: '/requirements', label: 'Requirements', icon: ClipboardList },
  { href: '/fulfilments', label: 'Fulfilments', icon: ListChecks },
  { href: '/finance', label: 'Finance', icon: Wallet },
  { href: '/ledger', label: 'Ledger', icon: BookOpen },
  { href: '/catalog', label: 'Catalog', icon: Package },
  { href: '/reports', label: 'Reports', icon: BarChart3 },
  { href: '/audit', label: 'Audit', icon: ScrollText },
  { href: '/settings', label: 'Settings', icon: Settings },
];

export const SIDEBAR_WIDTH = 240;

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside
      className="fixed left-0 top-0 z-40 h-screen w-[var(--sidebar-width)] border-r border-border bg-card/80 backdrop-blur-xl"
      style={{ ['--sidebar-width' as string]: `${SIDEBAR_WIDTH}px` }}
    >
      <div className="flex h-full flex-col">
        <div className="flex h-14 items-center border-b border-border px-4">
          <Link href="/" className="font-semibold tracking-tight">
            Cornerstone OS
          </Link>
        </div>
        <nav className="flex-1 space-y-0.5 p-3">
          {nav.map((item) => {
            const isActive = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href));
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors',
                  isActive ? 'bg-primary/15 text-primary' : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                )}
              >
                <item.icon className="h-4 w-4 shrink-0" />
                {item.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </aside>
  );
}
