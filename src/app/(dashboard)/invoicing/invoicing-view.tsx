'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { SlidePanel } from '@/components/ui/slide-panel';
import { Plus, ChevronRight } from 'lucide-react';
import type { InvoiceStatus, InvoiceType } from '@/types';
import { NewInvoiceForm } from './new-invoice-form';
import { InvoiceDetailPanel, type InvoiceRow, type PaymentRow } from './invoice-detail-panel';
import { useDirtyConfirm } from '@/hooks/use-dirty-confirm';

const STATUS_LABELS: Record<InvoiceStatus, string> = {
  draft: 'Draft',
  issued: 'Issued',
  paid: 'Paid',
  overdue: 'Overdue',
  cancelled: 'Cancelled',
};

const TYPE_LABELS: Record<InvoiceType, string> = {
  project: 'Project',
  milestone: 'Milestone',
  monthly: 'Monthly',
};

function formatMoney(n: number): string {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n);
}

interface InvoicingViewProps {
  initialInvoices: InvoiceRow[];
  paymentsByInvoiceId: Record<string, PaymentRow[]>;
  projectOptions: { value: string; label: string; engagement_type?: 'one_time' | 'monthly' }[];
  initialOpenId?: string | null;
  initialCreateOpen?: boolean;
  projectFilter?: string | null;
  projectFilterLabel?: string | null;
  invoiceTypeFilter?: string | null;
  invoiceTypeFilterLabel?: string | null;
  showCancelled?: boolean;
}

function invoicingQuery(project?: string | null, type?: string | null, showCancelled?: boolean) {
  const p = new URLSearchParams();
  if (project) p.set('project', project);
  if (type) p.set('type', type);
  if (showCancelled) p.set('showCancelled', '1');
  const q = p.toString();
  return q ? `/invoicing?${q}` : '/invoicing';
}

export function InvoicingView({
  initialInvoices,
  paymentsByInvoiceId,
  projectOptions,
  initialOpenId,
  initialCreateOpen = false,
  projectFilter,
  projectFilterLabel,
  invoiceTypeFilter,
  showCancelled = false,
}: InvoicingViewProps) {
  const router = useRouter();
  const [invoices, setInvoices] = useState(initialInvoices);
  const [createOpen, setCreateOpen] = useState(initialCreateOpen);
  const [detailId, setDetailId] = useState<string | null>(initialOpenId ?? null);

  useEffect(() => {
    if (initialCreateOpen) setCreateOpen(true);
  }, [initialCreateOpen]);

  useEffect(() => {
    setInvoices(initialInvoices);
  }, [initialInvoices]);

  useEffect(() => {
    if (initialOpenId) setDetailId(initialOpenId);
  }, [initialOpenId]);

  const selectedInvoice = detailId ? invoices.find((i) => i.id === detailId) : null;
  const selectedPayments = selectedInvoice ? (paymentsByInvoiceId[selectedInvoice.id] ?? []) : [];

  const newInvoiceDirty = useDirtyConfirm(() => setCreateOpen(false));

  function refresh() {
    router.refresh();
  }

  return (
    <>
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Invoicing</h1>
            <p className="mt-1 text-muted-foreground">
              {projectFilterLabel ?? 'Invoices and payments received.'}
            </p>
          </div>
          <Button onClick={() => setCreateOpen(true)}>
            <Plus className="h-4 w-4" />
            New invoice
          </Button>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm text-muted-foreground">Invoice type:</span>
          <Link href={invoicingQuery(projectFilter, null, showCancelled)} className={`rounded-lg px-3 py-1.5 text-sm font-medium ${!invoiceTypeFilter ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-muted/80'}`}>
            All
          </Link>
          <Link href={invoicingQuery(projectFilter, 'monthly', showCancelled)} className={`rounded-lg px-3 py-1.5 text-sm font-medium ${invoiceTypeFilter === 'monthly' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-muted/80'}`}>
            Monthly
          </Link>
          <Link href={invoicingQuery(projectFilter, 'project', showCancelled)} className={`rounded-lg px-3 py-1.5 text-sm font-medium ${invoiceTypeFilter === 'project' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-muted/80'}`}>
            Project &amp; milestone
          </Link>
          <span className="ml-2 border-l border-border pl-2 text-sm text-muted-foreground">Cancelled:</span>
          <Link href={invoicingQuery(projectFilter, invoiceTypeFilter, !showCancelled)} className={`rounded-lg px-3 py-1.5 text-sm font-medium ${showCancelled ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-muted/80'}`}>
            {showCancelled ? 'Hide cancelled' : 'Show cancelled'}
          </Link>
        </div>

        <div className="glass-card overflow-hidden">
          <div className="border-b border-border px-4 py-3">
            <h2 className="font-medium">Invoices</h2>
          </div>
          {invoices.length === 0 ? (
            <div className="p-12 text-center text-muted-foreground text-sm">
              No invoices yet. Create one for a project.
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="content-cell text-left font-medium px-4">Project</th>
                  <th className="content-cell text-left font-medium px-4">Type</th>
                  <th className="content-cell text-right font-medium px-4">Amount</th>
                  <th className="content-cell text-left font-medium px-4">Status</th>
                  <th className="content-cell text-left font-medium px-4">Due date</th>
                  <th className="content-cell w-10 px-2" aria-hidden>
                    <span className="sr-only">Open</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {invoices.map((row, index) => (
                  <tr
                    key={row.id}
                    role="button"
                    tabIndex={0}
                    className={`border-b border-border/50 hover:bg-muted/30 transition-colors cursor-pointer ${index % 2 === 1 ? 'bg-muted/10' : ''}`}
                    onClick={() => setDetailId(row.id)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        setDetailId(row.id);
                      }
                    }}
                  >
                    <td className="content-cell px-4 font-medium">{row.project_name}</td>
                    <td className="content-cell px-4 text-muted-foreground">{TYPE_LABELS[row.type]}</td>
                    <td className="content-cell px-4 text-right tabular-nums">{formatMoney(row.amount)}</td>
                    <td className="content-cell px-4">
                      <span className="inline-flex items-center rounded-lg px-2 py-0.5 text-xs font-medium bg-muted text-muted-foreground">
                        {STATUS_LABELS[row.status]}
                      </span>
                    </td>
                    <td className="content-cell px-4 text-muted-foreground">
                      {row.due_date ? new Date(row.due_date).toLocaleDateString('en-US') : '—'}
                    </td>
                    <td className="content-cell px-2 text-muted-foreground">
                      <ChevronRight className="h-4 w-4 shrink-0" aria-hidden />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      <SlidePanel
        open={createOpen}
        onOpenChange={newInvoiceDirty.handleOpenChange}
        title="New invoice"
        description="Bill a client for a project or milestone."
        variant="form"
      >
        <NewInvoiceForm
          projectOptions={projectOptions}
          defaultProjectId={projectFilter ?? ''}
          onDirtyChange={newInvoiceDirty.setDirty}
          onSuccess={() => { newInvoiceDirty.closeConfirmed(); refresh(); }}
          onCancel={() => newInvoiceDirty.handleOpenChange(false)}
        />
      </SlidePanel>

      <SlidePanel open={!!selectedInvoice} onOpenChange={(open) => !open && setDetailId(null)} title={selectedInvoice ? `${TYPE_LABELS[selectedInvoice.type]} invoice` : 'Invoice'}>
        {selectedInvoice && (
          <InvoiceDetailPanel
            invoice={selectedInvoice}
            payments={selectedPayments}
            onSuccess={() => { setDetailId(null); refresh(); }}
            onClose={() => setDetailId(null)}
          />
        )}
      </SlidePanel>
    </>
  );
}
