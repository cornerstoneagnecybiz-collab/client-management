'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { SlidePanel } from '@/components/ui/slide-panel';
import { Plus, ChevronRight } from 'lucide-react';
import type { InvoiceStatus, InvoiceType } from '@/types';
import { NewInvoiceForm } from '@/app/(dashboard)/finance/new-invoice-form';
import { InvoiceDetailPanel, type InvoiceRow, type PaymentRow } from '@/app/(dashboard)/finance/invoice-detail-panel';

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

interface ProjectInvoicesTabProps {
  projectId: string;
  projectName: string;
  invoices: InvoiceRow[];
  paymentsByInvoiceId: Record<string, PaymentRow[]>;
}

export function ProjectInvoicesTab({
  projectId,
  projectName,
  invoices,
  paymentsByInvoiceId,
}: ProjectInvoicesTabProps) {
  const router = useRouter();
  const [createOpen, setCreateOpen] = useState(false);
  const [detailId, setDetailId] = useState<string | null>(null);

  const selectedInvoice = detailId ? invoices.find((i) => i.id === detailId) : null;
  const selectedPayments = selectedInvoice ? (paymentsByInvoiceId[selectedInvoice.id] ?? []) : [];

  const projectOptions = [{ value: projectId, label: projectName }];

  function refresh() {
    router.refresh();
  }

  return (
    <>
      <div className="glass-card overflow-hidden">
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <h2 className="font-medium">Invoices</h2>
          <Button size="sm" onClick={() => setCreateOpen(true)}>
            <Plus className="h-4 w-4" />
            New invoice
          </Button>
        </div>
        {invoices.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground text-sm">
            No invoices for this project yet.
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
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
                  <td className="content-cell px-4 font-medium">{TYPE_LABELS[row.type]}</td>
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

      <SlidePanel open={createOpen} onOpenChange={setCreateOpen} title="New invoice">
        <NewInvoiceForm
          projectOptions={projectOptions}
          defaultProjectId={projectId}
          onSuccess={() => { setCreateOpen(false); refresh(); }}
          onCancel={() => setCreateOpen(false)}
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
