'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import type { AuditRow } from './page';

const ACTION_LABELS: Record<string, string> = {
  invoice_issued: 'Invoice issued',
  payment_received: 'Payment received',
  vendor_payout_paid: 'Vendor payout paid',
  requirement_fulfilled: 'Requirement fulfilled',
};

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatMoney(n: number): string {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n);
}

interface AuditViewProps {
  entries: AuditRow[];
  actionOptions: { value: string; label: string }[];
  initialAction: string | null;
  limit: number;
}

export function AuditView({
  entries,
  actionOptions,
  initialAction,
  limit,
}: AuditViewProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  function setAction(action: string | null) {
    const p = new URLSearchParams(searchParams.toString());
    if (action) p.set('action', action);
    else p.delete('action');
    p.set('limit', String(limit));
    router.push(`/audit?${p.toString()}`, { scroll: false });
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Audit log</h1>
        <p className="mt-1 text-muted-foreground">
          Key actions: invoice issued, payment received, vendor payout paid, requirement fulfilled.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-4 rounded-xl border border-border bg-muted/20 p-4">
        <label className="flex items-center gap-2">
          <span className="text-sm font-medium text-muted-foreground">Action</span>
          <select
            className="h-9 rounded-lg border border-border bg-background px-3 text-sm"
            value={initialAction ?? ''}
            onChange={(e) => setAction(e.target.value || null)}
          >
            <option value="">All</option>
            {actionOptions.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </label>
      </div>

      <div className="glass-card overflow-hidden">
        {entries.length === 0 ? (
          <div className="p-12 text-center text-muted-foreground text-sm">
            No audit entries yet. Actions will appear here when you issue invoices, record payments, pay vendors, or fulfil requirements.
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="content-cell text-left font-medium px-4">Time</th>
                <th className="content-cell text-left font-medium px-4">Action</th>
                <th className="content-cell text-left font-medium px-4">Entity</th>
                <th className="content-cell text-left font-medium px-4">Details</th>
                <th className="content-cell w-10 px-2" aria-hidden><span className="sr-only">View</span></th>
              </tr>
            </thead>
            <tbody>
              {entries.map((e) => {
                const href =
                  e.entity_type === 'invoice' ? `/finance?id=${e.entity_id}` :
                  e.entity_type === 'payment_received' && e.meta?.invoice_id ? `/finance?id=${e.meta.invoice_id}` :
                  e.entity_type === 'vendor_payout' ? '/finance' :
                  e.entity_type === 'requirement' ? `/requirements?id=${e.entity_id}` : null;
                const details: string[] = [];
                if (e.meta?.amount != null) details.push(formatMoney(Number(e.meta.amount)));
                if (e.meta?.date) details.push(String(e.meta.date));
                if (e.meta?.paid_date) details.push(`Paid: ${e.meta.paid_date}`);
                return (
                  <tr key={e.id} className="border-b border-border/50 hover:bg-muted/30">
                    <td className="content-cell px-4 text-muted-foreground whitespace-nowrap">{formatDate(e.created_at)}</td>
                    <td className="content-cell px-4 font-medium">{ACTION_LABELS[e.action] ?? e.action}</td>
                    <td className="content-cell px-4 text-muted-foreground">{e.entity_type}</td>
                    <td className="content-cell px-4 text-muted-foreground">{details.join(' · ') || '—'}</td>
                    <td className="content-cell px-2">
                      {href && (
                        <Link href={href} className="text-primary hover:underline text-xs">
                          View
                        </Link>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
