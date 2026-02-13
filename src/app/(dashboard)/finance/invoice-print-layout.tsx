'use client';

import Link from 'next/link';
import Image from 'next/image';
import { Printer, ArrowLeft, FileSpreadsheet } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { INVOICE_COMPANY } from '@/lib/invoice-branding';

function formatMoney(n: number): string {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2 }).format(n);
}

function formatDate(d: string | null): string {
  if (!d) return '—';
  return new Date(d + 'Z').toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

const STATUS_LABELS: Record<string, string> = {
  draft: 'Draft',
  issued: 'Issued',
  paid: 'Paid',
  overdue: 'Overdue',
  cancelled: 'Cancelled',
};

function formatBillingMonth(isoDate: string | null): string {
  if (!isoDate) return '';
  const d = new Date(isoDate + 'Z');
  return d.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
}

interface InvoicePrintLayoutProps {
  invoice: {
    id: string;
    type: string;
    amount: number;
    status: string;
    issue_date: string | null;
    due_date: string | null;
    billing_month: string | null;
    project_id: string;
    invoice_number?: string;
  };
  project?: { name: string };
  client?: { name: string; company: string | null; phone: string | null; email: string | null };
  lineItems: { description: string; type: string; qty: number; rate: number; amount: number }[];
  payments: { amount: number; date: string; mode: string | null }[];
  totalPaid: number;
  showTaxInvoice: boolean;
}

export function InvoicePrintLayout({
  invoice,
  project,
  client,
  lineItems,
  payments,
  totalPaid,
  showTaxInvoice,
}: InvoicePrintLayoutProps) {
  const taxToggle = showTaxInvoice;
  const invoiceNumber =
    invoice.invoice_number ??
    `INV-${invoice.issue_date ? invoice.issue_date.slice(0, 4) : new Date().getFullYear()}-${invoice.id.slice(0, 6).toUpperCase()}`;
  const typeLabel = invoice.type === 'project' ? 'Project' : invoice.type === 'milestone' ? 'Milestone' : 'Monthly';
  const billingMonthLabel = invoice.billing_month ? formatBillingMonth(invoice.billing_month) : '';
  const subtotal = lineItems.reduce((s, r) => s + r.amount, 0);

  const stampLabel = invoice.status.toUpperCase();
  const stampBadgeClass =
    invoice.status === 'paid'
      ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
      : invoice.status === 'overdue'
        ? 'bg-rose-100 text-rose-800 border-rose-300'
        : invoice.status === 'cancelled'
          ? 'bg-zinc-100 text-zinc-600 border-zinc-300'
          : invoice.status === 'issued'
            ? 'bg-blue-100 text-blue-800 border-blue-300'
            : 'bg-zinc-50 text-zinc-600 border-zinc-200';

  // Print = open invoice PDF (dedicated doc for printing, not browser screen print)
  const pdfUrl = `/finance/invoice/${invoice.id}/pdf${taxToggle ? '?tax=1' : ''}`;

  return (
    <div className="min-h-screen bg-white text-black print:bg-white">
      {/* Toolbar: hide when printing */}
      <div className="sticky top-0 z-50 flex items-center justify-between border-b border-border bg-muted/30 px-4 py-3 print:hidden">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/finance">
              <ArrowLeft className="h-4 w-4" />
              Back to Finance
            </Link>
          </Button>
          <Button
            size="sm"
            className="gap-2"
            asChild
          >
            <a href={pdfUrl} target="_blank" rel="noopener noreferrer">
              <Printer className="h-4 w-4" />
              Print
            </a>
          </Button>
          <Button size="sm" variant="outline" className="gap-2" asChild>
            <a href={`/finance/invoice/${invoice.id}/export/excel`} download={`${invoiceNumber}.xlsx`}>
              <FileSpreadsheet className="h-4 w-4" />
              Download Excel
            </a>
          </Button>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <span className="text-muted-foreground">Show as:</span>
          <Link
            href={`/finance/invoice/${invoice.id}/print?tax=1`}
            className={taxToggle ? 'font-medium text-foreground' : 'text-muted-foreground hover:underline'}
          >
            Tax invoice
          </Link>
          <span>|</span>
          <Link
            href={`/finance/invoice/${invoice.id}/print`}
            className={!taxToggle ? 'font-medium text-foreground' : 'text-muted-foreground hover:underline'}
          >
            Standard invoice
          </Link>
        </div>
      </div>

      <div className="relative mx-auto max-w-3xl px-6 py-8 print:py-6 print:px-0">
        {/* Diagonal watermark: low opacity so line items stay readable */}
        <div
          aria-hidden
          className="pointer-events-none absolute left-1/2 top-1/2 z-0 text-slate-400 opacity-[0.14] print:opacity-[0.16]"
          style={{
            transform: 'translate(-50%, -50%) rotate(-22deg)',
            fontSize: 'clamp(2.5rem, 10vw, 5.5rem)',
            fontWeight: 700,
            letterSpacing: '0.12em',
            whiteSpace: 'nowrap',
          }}
        >
          {stampLabel}
        </div>

        {/* Corner badge for clear status */}
        <div
          aria-hidden
          className={`pointer-events-none absolute right-0 top-0 z-10 rounded-bl-lg border border-b border-l px-4 py-2 text-xs font-semibold uppercase tracking-wider print:text-[11px] ${stampBadgeClass}`}
        >
          {stampLabel}
        </div>

        <div className="relative z-10">
          {/* A. Header */}
          <div className="flex items-start justify-between border-b-2 border-slate-200 pb-6">
            <div className="flex items-center gap-5">
              <div className="relative h-14 w-36 shrink-0 overflow-hidden rounded-lg print:h-12 print:w-32">
                <Image
                  src={INVOICE_COMPANY.logoPath}
                  alt={INVOICE_COMPANY.name}
                  fill
                  className="object-contain"
                  priority
                  unoptimized
                />
              </div>
              <div className="space-y-0.5">
                <p className="text-lg font-semibold tracking-tight text-slate-900">{INVOICE_COMPANY.name}</p>
                <p className="text-sm text-slate-600">{INVOICE_COMPANY.addressLine1}</p>
                <p className="text-sm text-slate-600">{INVOICE_COMPANY.state}</p>
                <p className="text-sm text-slate-600">{INVOICE_COMPANY.phone}</p>
              </div>
            </div>
          </div>

          {/* B. Title & invoice number */}
          <div className="mt-8 flex flex-wrap items-baseline justify-between gap-4">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 print:text-3xl">
              {taxToggle ? 'TAX INVOICE' : 'INVOICE'}
            </h1>
            <p className="text-sm font-medium text-slate-700">
              Invoice no. <span className="font-semibold tabular-nums text-slate-900">{invoiceNumber}</span>
            </p>
          </div>

          {/* C. Meta grid */}
          <div className="mt-5 grid grid-cols-2 gap-x-10 gap-y-2 text-sm">
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-slate-500">Type</p>
              <p className="font-medium text-slate-800">
                {typeLabel}
                {billingMonthLabel ? ` — ${billingMonthLabel}` : ''}
              </p>
            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-slate-500">Issue date</p>
              <p className="font-medium text-slate-800">{formatDate(invoice.issue_date)}</p>
            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-slate-500">Due date</p>
              <p className="font-medium text-slate-800">{formatDate(invoice.due_date)}</p>
            </div>
            <div className="col-span-2">
              <p className="text-xs font-medium uppercase tracking-wider text-slate-500">Project</p>
              <p className="font-medium text-slate-800">{project?.name ?? '—'}</p>
            </div>
          </div>

          {/* D. Bill to */}
          <div className="mt-6 rounded-lg border border-slate-200 bg-slate-50/50 px-4 py-3">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Bill to</p>
            <p className="mt-0.5 font-semibold text-slate-900">{client?.name ?? '—'}</p>
            {client?.company && <p className="text-sm text-slate-700">{client.company}</p>}
            {(client?.phone || client?.email) && (
              <p className="text-sm text-slate-600">
                {[client.phone, client.email].filter(Boolean).join(' · ') || 'Address from client master'}
              </p>
            )}
            {!client?.phone && !client?.email && (
              <p className="text-sm text-slate-500">Address from client master</p>
            )}
          </div>

          {/* E. Line items — no watermark overlap; full readability */}
          <div className="mt-6 overflow-hidden rounded-lg border border-slate-200">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-100/80">
                  <th className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-600 w-8">#</th>
                  <th className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-600">Description</th>
                  <th className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-600 w-24">Type</th>
                  <th className="px-3 py-3 text-right text-xs font-semibold uppercase tracking-wider text-slate-600 w-12">Qty</th>
                  <th className="px-3 py-3 text-right text-xs font-semibold uppercase tracking-wider text-slate-600 w-24">Rate (₹)</th>
                  <th className="px-3 py-3 text-right text-xs font-semibold uppercase tracking-wider text-slate-600 w-28">Amount (₹)</th>
                </tr>
              </thead>
              <tbody>
                {lineItems.map((row, i) => (
                  <tr
                    key={i}
                    className={`border-b border-slate-100 ${i % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}`}
                  >
                    <td className="px-3 py-3 text-slate-700">{i + 1}</td>
                    <td className="px-3 py-3 font-medium text-slate-900">{row.description}</td>
                    <td className="px-3 py-3 text-slate-700">{row.type}</td>
                    <td className="px-3 py-3 text-right tabular-nums text-slate-800">{row.qty}</td>
                    <td className="px-3 py-3 text-right tabular-nums text-slate-800">{formatMoney(row.rate)}</td>
                    <td className="px-3 py-3 text-right tabular-nums font-medium text-slate-900">{formatMoney(row.amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* F. Totals */}
          <div className="mt-5 flex justify-end">
            <div className="w-64 space-y-2 rounded-lg border border-slate-200 bg-slate-50/50 px-4 py-3 text-sm">
              {taxToggle && (
                <>
                  <div className="flex justify-between text-slate-700">
                    <span>Subtotal</span>
                    <span className="tabular-nums">{formatMoney(subtotal)}</span>
                  </div>
                  <div className="flex justify-between text-slate-500">
                    <span>Tax (GST)</span>
                    <span>—</span>
                  </div>
                </>
              )}
              <div className="flex justify-between border-t border-slate-200 pt-2 font-semibold text-slate-900">
                <span>Total (₹)</span>
                <span className="tabular-nums">{formatMoney(invoice.amount)}</span>
              </div>
            </div>
          </div>

          {/* G. Payments summary when applicable */}
          {payments.length > 0 && (
            <div className="mt-6 rounded-lg border border-slate-200 bg-slate-50/50 px-4 py-3">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Payments received</p>
              <ul className="mt-1 space-y-0.5 text-sm text-slate-700">
                {payments.map((p, i) => (
                  <li key={i} className="flex justify-between">
                    <span>{formatDate(p.date)} {p.mode ? ` · ${p.mode}` : ''}</span>
                    <span className="tabular-nums font-medium">{formatMoney(p.amount)}</span>
                  </li>
                ))}
              </ul>
              <p className="mt-2 border-t border-slate-200 pt-2 text-sm font-semibold text-slate-800">
                Total paid: {formatMoney(totalPaid)}
              </p>
            </div>
          )}

          {/* H. Signature */}
          <div className="mt-10 flex justify-end">
            <div className="w-48 text-center">
              <div className="relative mx-auto mb-1 h-12 w-32 print:h-10 print:w-28">
                <Image
                  src={INVOICE_COMPANY.signatoryImagePath}
                  alt="Authorised signatory"
                  fill
                  className="object-contain object-center"
                  unoptimized
                />
              </div>
              <p className="text-xs font-medium text-slate-600">Authorised signatory</p>
            </div>
          </div>

          {/* I. Footer */}
          <div className="mt-12 border-t border-slate-200 pt-4 text-center text-xs text-slate-500">
            <p>This is a computer-generated invoice.</p>
            <p>{taxToggle ? 'Tax invoice under GST.' : 'Not a tax invoice.'}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
