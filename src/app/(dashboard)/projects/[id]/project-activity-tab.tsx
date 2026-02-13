'use client';

import Link from 'next/link';
import {
  ClipboardList,
  FileText,
  Banknote,
  Wallet,
  ChevronRight,
} from 'lucide-react';

export type ActivityItem = {
  id: string;
  date: string;
  type: 'requirement_created' | 'invoice_created' | 'invoice_issued' | 'payment_received' | 'payout_recorded' | 'payout_paid';
  label: string;
  href?: string;
  amount?: number;
};

function formatMoney(n: number): string {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n);
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  if (d.toDateString() === today.toDateString()) return 'Today';
  if (d.toDateString() === yesterday.toDateString()) return 'Yesterday';
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit', hour12: true });
}

function IconForType({ type }: { type: ActivityItem['type'] }) {
  switch (type) {
    case 'requirement_created':
      return <ClipboardList className="h-4 w-4 text-muted-foreground" />;
    case 'invoice_created':
    case 'invoice_issued':
      return <FileText className="h-4 w-4 text-muted-foreground" />;
    case 'payment_received':
      return <Banknote className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />;
    case 'payout_recorded':
    case 'payout_paid':
      return <Wallet className="h-4 w-4 text-rose-600 dark:text-rose-400" />;
    default:
      return <ClipboardList className="h-4 w-4 text-muted-foreground" />;
  }
}

interface ProjectActivityTabProps {
  activity: ActivityItem[];
  projectName: string;
}

export function ProjectActivityTab({ activity, projectName }: ProjectActivityTabProps) {
  if (activity.length === 0) {
    return (
      <div className="glass-card p-12 text-center">
        <p className="text-muted-foreground">No activity yet for this project.</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Add requirements, create invoices, and record payments to see activity here.
        </p>
      </div>
    );
  }

  const byDate = new Map<string, ActivityItem[]>();
  for (const item of activity) {
    const key = item.date.slice(0, 10);
    if (!byDate.has(key)) byDate.set(key, []);
    byDate.get(key)!.push(item);
  }
  const sortedDates = Array.from(byDate.keys()).sort((a, b) => b.localeCompare(a));

  return (
    <div className="glass-card overflow-hidden">
      <div className="border-b border-border px-4 py-3">
        <h2 className="font-medium">Activity</h2>
        <p className="text-sm text-muted-foreground">Timeline of requirements, invoices, payments, and payouts.</p>
      </div>
      <div className="divide-y divide-border">
        {sortedDates.map((dateKey) => (
          <div key={dateKey} className="p-4">
            <p className="text-xs font-medium text-muted-foreground mb-3">{formatDate(dateKey)}</p>
            <ul className="space-y-2">
              {byDate.get(dateKey)!.map((item) => (
                <li key={item.id}>
                  {item.href ? (
                    <Link
                      href={item.href}
                      className="flex items-center gap-3 rounded-lg border border-border bg-card p-3 transition-colors hover:bg-muted/30"
                    >
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted">
                        <IconForType type={item.type} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium">{item.label}</p>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <span>{formatTime(item.date)}</span>
                          {item.amount != null && (
                            <span className="tabular-nums">{formatMoney(item.amount)}</span>
                          )}
                        </div>
                      </div>
                      <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                    </Link>
                  ) : (
                    <div className="flex items-center gap-3 rounded-lg border border-border bg-muted/10 p-3">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted">
                        <IconForType type={item.type} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium">{item.label}</p>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <span>{formatTime(item.date)}</span>
                          {item.amount != null && (
                            <span className="tabular-nums">{formatMoney(item.amount)}</span>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}
