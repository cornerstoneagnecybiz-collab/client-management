'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowDownLeft, ArrowUpRight, FileText } from 'lucide-react';
import type { ActivityEntryRow } from './page';

const TYPE_LABELS: Record<string, string> = {
  client_invoice: 'Invoice issued',
  client_payment: 'Payment received',
  vendor_expected_cost: 'Vendor expected',
  vendor_payment: 'Vendor paid',
};

const TYPE_VARIANTS: Record<string, { bg: string; text: string; icon: React.ElementType }> = {
  client_invoice: { bg: 'bg-blue-500/10', text: 'text-blue-700 dark:text-blue-300', icon: FileText },
  client_payment: { bg: 'bg-emerald-500/10', text: 'text-emerald-700 dark:text-emerald-300', icon: ArrowDownLeft },
  vendor_expected_cost: { bg: 'bg-amber-500/10', text: 'text-amber-700 dark:text-amber-300', icon: FileText },
  vendor_payment: { bg: 'bg-rose-500/10', text: 'text-rose-700 dark:text-rose-300', icon: ArrowUpRight },
};

function formatMoney(n: number): string {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n);
}

function formatDate(d: string): string {
  return new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

interface ActivityViewProps {
  initialEntries: ActivityEntryRow[];
  projectOptions: { value: string; label: string }[];
  initialProjectId: string | null;
  initialDateFrom: string | null;
  initialDateTo: string | null;
}

export function ActivityView({
  initialEntries: entries,
  projectOptions,
  initialProjectId,
  initialDateFrom,
  initialDateTo,
}: ActivityViewProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  function updateFilters(updates: { project?: string | null; dateFrom?: string | null; dateTo?: string | null }) {
    const p = new URLSearchParams(searchParams.toString());
    if (updates.project !== undefined) {
      if (updates.project) p.set('project', updates.project);
      else p.delete('project');
    }
    if (updates.dateFrom !== undefined) {
      if (updates.dateFrom) p.set('dateFrom', updates.dateFrom);
      else p.delete('dateFrom');
    }
    if (updates.dateTo !== undefined) {
      if (updates.dateTo) p.set('dateTo', updates.dateTo);
      else p.delete('dateTo');
    }
    router.push(`/activity?${p.toString()}`, { scroll: false });
  }

  const byDate = new Map<string, ActivityEntryRow[]>();
  for (const e of entries) {
    const key = e.date;
    if (!byDate.has(key)) byDate.set(key, []);
    byDate.get(key)!.push(e);
  }
  const sortedDates = Array.from(byDate.keys()).sort((a, b) => b.localeCompare(a));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Activity</h1>
        <p className="mt-1 text-muted-foreground">
          History of invoices issued, payments received, and vendor payouts. Filter by project or date range.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-4 rounded-xl border border-border bg-muted/20 p-4">
        <div className="flex items-center gap-2">
          <label htmlFor="activity-project" className="text-sm font-medium text-muted-foreground">Project</label>
          <select
            id="activity-project"
            className="h-9 rounded-lg border border-border bg-background px-3 text-sm"
            value={initialProjectId ?? ''}
            onChange={(e) => updateFilters({ project: e.target.value || null })}
          >
            <option value="">All projects</option>
            {projectOptions.map((p) => (
              <option key={p.value} value={p.value}>{p.label}</option>
            ))}
          </select>
        </div>
        <div className="flex items-center gap-2">
          <label htmlFor="activity-from" className="text-sm font-medium text-muted-foreground">From</label>
          <input
            id="activity-from"
            type="date"
            className="h-9 rounded-lg border border-border bg-background px-3 text-sm"
            value={initialDateFrom ?? ''}
            onChange={(e) => updateFilters({ dateFrom: e.target.value || null })}
          />
        </div>
        <div className="flex items-center gap-2">
          <label htmlFor="activity-to" className="text-sm font-medium text-muted-foreground">To</label>
          <input
            id="activity-to"
            type="date"
            className="h-9 rounded-lg border border-border bg-background px-3 text-sm"
            value={initialDateTo ?? ''}
            onChange={(e) => updateFilters({ dateTo: e.target.value || null })}
          />
        </div>
      </div>

      <div className="space-y-6">
        {sortedDates.length === 0 ? (
          <div className="rounded-xl border border-border bg-card p-12 text-center text-muted-foreground text-sm">
            No activity in this period.
          </div>
        ) : (
          sortedDates.map((date) => (
            <div key={date}>
              <h2 className="mb-3 text-sm font-medium text-muted-foreground">{formatDate(date)}</h2>
              <ul className="space-y-2">
                {byDate.get(date)!.map((e) => {
                  const variant = TYPE_VARIANTS[e.type] ?? { bg: 'bg-muted', text: 'text-muted-foreground', icon: FileText };
                  const Icon = variant.icon;
                  const href =
                    e.type === 'client_invoice' || e.type === 'client_payment'
                      ? e.reference_id
                        ? `/finance?id=${e.reference_id}`
                        : `/finance`
                      : e.type === 'vendor_payment' && e.reference_id
                        ? `/finance`
                        : null;
                  return (
                    <li key={e.id}>
                      <div
                        className={`flex flex-wrap items-center justify-between gap-4 rounded-xl border border-border bg-card px-4 py-3 ${href ? '' : ''}`}
                      >
                        <div className="flex items-center gap-3">
                          <span className={`flex h-9 w-9 items-center justify-center rounded-lg ${variant.bg} ${variant.text}`}>
                            <Icon className="h-4 w-4" />
                          </span>
                          <div>
                            <p className="font-medium">{TYPE_LABELS[e.type] ?? e.type}</p>
                            <p className="text-sm text-muted-foreground">{e.project_name}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <span className="tabular-nums font-medium">{formatMoney(e.amount)}</span>
                          {href && (
                            <Link href={href} className="text-sm text-primary hover:underline">
                              View
                            </Link>
                          )}
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
