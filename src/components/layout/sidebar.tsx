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
  BarChart3,
  Settings,
  ScrollText,
  Handshake,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const flowSteps = [
  { href: '/clients', label: 'Clients', icon: Users, step: 1 },
  { href: '/vendors', label: 'Vendors', icon: Truck, step: 2 },
  { href: '/projects', label: 'Projects', icon: FolderKanban, step: 3 },
  { href: '/requirements', label: 'Requirements', icon: ClipboardList, step: 4 },
  { href: '/fulfilments', label: 'Fulfilments', icon: ListChecks, step: 5 },
  { href: '/invoicing', label: 'Invoicing', icon: Wallet, step: 6 },
  { href: '/settlement', label: 'Settlement', icon: Handshake, step: 7 },
  { href: '/reports', label: 'Reports', icon: BarChart3, step: 8 },
];

const secondaryNav = [
  { href: '/ledger', label: 'Ledger', icon: BookOpen },
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

        <nav className="flex-1 overflow-y-auto p-3 flex flex-col gap-0.5">
          {/* Dashboard — always top, no step number */}
          {(() => {
            const isActive = pathname === '/';
            return (
              <Link
                href="/"
                className={cn(
                  'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors mb-1',
                  isActive ? 'bg-primary/15 text-primary' : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                )}
              >
                <LayoutDashboard className="h-4 w-4 shrink-0" />
                Dashboard
              </Link>
            );
          })()}

          {/* Flow label */}
          <p className="px-3 pt-1 pb-1 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60">
            Flow
          </p>

          {/* 8-step flow */}
          {flowSteps.map(({ href, label, icon: Icon, step }) => {
            const isActive = pathname === href || pathname.startsWith(href + '/');
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors',
                  isActive ? 'bg-primary/15 text-primary' : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                )}
              >
                <span className={cn(
                  'flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold border',
                  isActive
                    ? 'bg-primary text-primary-foreground border-primary'
                    : 'border-border text-muted-foreground/60'
                )}>
                  {step}
                </span>
                <Icon className="h-4 w-4 shrink-0" />
                {label}
              </Link>
            );
          })}

          {/* Divider + secondary nav */}
          <hr className="my-2 border-border" />

          {secondaryNav.map(({ href, label, icon: Icon }) => {
            const isActive = pathname === href || pathname.startsWith(href + '/');
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors',
                  isActive ? 'bg-primary/15 text-primary' : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                )}
              >
                <Icon className="h-4 w-4 shrink-0" />
                {label}
              </Link>
            );
          })}
        </nav>
      </div>
    </aside>
  );
}
