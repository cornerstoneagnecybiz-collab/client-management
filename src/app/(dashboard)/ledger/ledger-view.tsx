'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { SlidePanel } from '@/components/ui/slide-panel';
import { Plus, ChevronRight, ArrowDownLeft, ArrowUpRight, FileText, Banknote } from 'lucide-react';
import { actualProfit } from '@/types';
import { NewEntryForm } from './new-entry-form';
import { EntryDetailPanel, type LedgerEntryRow } from './entry-detail-panel';

const TYPE_LABELS: Record<string, string> = {
  client_invoice: 'Client invoice',
  client_payment: 'Client payment',
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

interface LedgerViewProps {
  initialEntries: LedgerEntryRow[];
  projectOptions: { value: string; label: string }[];
  initialProjectId: string | null;
  initialDateFrom: string | null;
  initialDateTo: string | null;
  singleProject?: { id: string; name: string };
}

export function LedgerView({
  initialEntries,
  projectOptions,
  initialProjectId,
  initialDateFrom,
  initialDateTo,
  singleProject,
}: LedgerViewProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [entries, setEntries] = useState(initialEntries);
  const [addOpen, setAddOpen] = useState(false);
  const [detailId, setDetailId] = useState<string | null>(null);

  useEffect(() => {
    setEntries(initialEntries);
  }, [initialEntries]);

  const totals = useMemo(() => {
    let clientInvoices = 0;
    let clientPayments = 0;
    let vendorExpected = 0;
    let vendorPaid = 0;
    for (const e of entries) {
      switch (e.type) {
        case 'client_invoice':
          clientInvoices += e.amount;
          break;
        case 'client_payment':
          clientPayments += e.amount;
          break;
        case 'vendor_expected_cost':
          vendorExpected += e.amount;
          break;
        case 'vendor_payment':
          vendorPaid += e.amount;
          break;
      }
    }
    const actual = actualProfit(clientPayments, vendorPaid);
    return { clientInvoices, clientPayments, vendorExpected, vendorPaid, actualProfit: actual };
  }, [entries]);

  const selectedEntry = detailId ? entries.find((e) => e.id === detailId) : null;

  function refresh() {
    router.refresh();
  }

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
    router.push(`/ledger?${p.toString()}`, { scroll: false });
  }

  const projectId = singleProject?.id ?? initialProjectId;
  const projectOptionsForForm = singleProject ? [{ value: singleProject.id, label: singleProject.name }] : projectOptions;

  return (
    <>
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Ledger</h1>
            <p className="mt-1 text-muted-foreground">
              Single source of truth for client and vendor money flow. Actual profit = client payments − vendor payments.
            </p>
          </div>
          <Button onClick={() => setAddOpen(true)}>
            <Plus className="h-4 w-4" />
            Add entry
          </Button>
        </div>

        {/* Summary cards */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <div className="glass-card rounded-xl p-4">
            <p className="text-xs font-medium text-muted-foreground">Client invoices</p>
            <p className="mt-1 text-xl font-semibold tabular-nums">{formatMoney(totals.clientInvoices)}</p>
            <p className="text-xs text-muted-foreground">Billed to clients</p>
          </div>
          <div className="glass-card rounded-xl p-4 border-l-2 border-emerald-500/50">
            <p className="text-xs font-medium text-muted-foreground">Client payments</p>
            <p className="mt-1 text-xl font-semibold tabular-nums text-emerald-600 dark:text-emerald-400">{formatMoney(totals.clientPayments)}</p>
            <p className="text-xs text-muted-foreground">Received</p>
          </div>
          <div className="glass-card rounded-xl p-4">
            <p className="text-xs font-medium text-muted-foreground">Vendor expected</p>
            <p className="mt-1 text-xl font-semibold tabular-nums">{formatMoney(totals.vendorExpected)}</p>
            <p className="text-xs text-muted-foreground">Expected cost</p>
          </div>
          <div className="glass-card rounded-xl p-4 border-l-2 border-rose-500/50">
            <p className="text-xs font-medium text-muted-foreground">Vendor paid</p>
            <p className="mt-1 text-xl font-semibold tabular-nums text-rose-600 dark:text-rose-400">{formatMoney(totals.vendorPaid)}</p>
            <p className="text-xs text-muted-foreground">Outflow</p>
          </div>
          <div className="glass-card rounded-xl p-4 bg-primary/5 border border-primary/20">
            <p className="text-xs font-medium text-muted-foreground">Actual profit</p>
            <p className={`mt-1 text-xl font-semibold tabular-nums ${totals.actualProfit >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
              {formatMoney(totals.actualProfit)}
            </p>
            <p className="text-xs text-muted-foreground">Received − paid</p>
          </div>
        </div>

        {/* Filters — only when not single-project */}
        {!singleProject && (
          <div className="glass-card flex flex-wrap items-end gap-4 rounded-xl p-4">
            <div className="min-w-[180px]">
              <Label htmlFor="filter_project" className="mb-1.5 block text-xs">Project</Label>
              <select
                id="filter_project"
                className="flex h-10 w-full items-center justify-between rounded-xl border border-border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                value={initialProjectId ?? ''}
                onChange={(e) => updateFilters({ project: e.target.value || null })}
              >
                <option value="">All projects</option>
                {projectOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>
            <div>
              <Label htmlFor="filter_date_from" className="mb-1.5 block text-xs">From date</Label>
              <Input
                id="filter_date_from"
                type="date"
                className="h-10"
                value={initialDateFrom ?? ''}
                onChange={(e) => updateFilters({ dateFrom: e.target.value || null })}
              />
            </div>
            <div>
              <Label htmlFor="filter_date_to" className="mb-1.5 block text-xs">To date</Label>
              <Input
                id="filter_date_to"
                type="date"
                className="h-10"
                value={initialDateTo ?? ''}
                onChange={(e) => updateFilters({ dateTo: e.target.value || null })}
              />
            </div>
          </div>
        )}

        {/* Entries table */}
        <div className="glass-card overflow-hidden">
          {entries.length === 0 ? (
            <div className="p-12 text-center">
              <Banknote className="mx-auto h-12 w-12 text-muted-foreground/50" />
              <p className="mt-3 text-muted-foreground">No ledger entries yet.</p>
              <p className="mt-1 text-sm text-muted-foreground">Add an entry manually or record payments and vendor payouts in Finance to sync.</p>
              <Button className="mt-4" variant="outline" onClick={() => setAddOpen(true)}>
                <Plus className="h-4 w-4" />
                Add entry
              </Button>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="content-cell text-left font-medium px-4">Date</th>
                  {!singleProject && <th className="content-cell text-left font-medium px-4">Project</th>}
                  <th className="content-cell text-left font-medium px-4">Type</th>
                  <th className="content-cell text-right font-medium px-4">Amount</th>
                  <th className="content-cell w-10 px-2" aria-hidden><span className="sr-only">Open</span></th>
                </tr>
              </thead>
              <tbody>
                {entries.map((row, index) => {
                  const variant = TYPE_VARIANTS[row.type] ?? { bg: 'bg-muted', text: 'text-muted-foreground', icon: FileText };
                  const Icon = variant.icon;
                  const isInflow = row.type === 'client_payment';
                  const isOutflow = row.type === 'vendor_payment';
                  return (
                    <tr
                      key={row.id}
                      role="button"
                      tabIndex={0}
                      className={`border-b border-border/50 hover:bg-muted/30 transition-colors cursor-pointer ${index % 2 === 1 ? 'bg-muted/5' : ''}`}
                      onClick={() => setDetailId(row.id)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          setDetailId(row.id);
                        }
                      }}
                    >
                      <td className="content-cell px-4 text-muted-foreground">
                        {new Date(row.date).toLocaleDateString('en-US')}
                      </td>
                      {!singleProject && (
                        <td className="content-cell px-4 font-medium">{row.project_name}</td>
                      )}
                      <td className="content-cell px-4">
                        <span className={`inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-xs font-medium ${variant.bg} ${variant.text}`}>
                          <Icon className="h-3.5 w-3.5" />
                          {TYPE_LABELS[row.type] ?? row.type}
                        </span>
                      </td>
                      <td className={`content-cell px-4 text-right tabular-nums font-medium ${isInflow ? 'text-emerald-600 dark:text-emerald-400' : isOutflow ? 'text-rose-600 dark:text-rose-400' : ''}`}>
                        {isInflow ? '+' : isOutflow ? '−' : ''}{formatMoney(row.amount)}
                      </td>
                      <td className="content-cell px-2 text-muted-foreground">
                        <ChevronRight className="h-4 w-4 shrink-0" aria-hidden />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      <SlidePanel open={addOpen} onOpenChange={setAddOpen} title="Add ledger entry">
        <NewEntryForm
          projectOptions={projectOptionsForForm}
          defaultProjectId={projectId ?? ''}
          onSuccess={() => { setAddOpen(false); refresh(); }}
          onCancel={() => setAddOpen(false)}
        />
      </SlidePanel>

      <SlidePanel open={!!selectedEntry} onOpenChange={(open) => !open && setDetailId(null)} title={selectedEntry ? TYPE_LABELS[selectedEntry.type] ?? 'Entry' : 'Entry'}>
        {selectedEntry && (
          <EntryDetailPanel
            entry={selectedEntry}
            onSuccess={() => { setDetailId(null); refresh(); }}
            onClose={() => setDetailId(null)}
          />
        )}
      </SlidePanel>
    </>
  );
}
