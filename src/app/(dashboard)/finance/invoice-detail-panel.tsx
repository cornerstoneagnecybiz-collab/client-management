'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import * as Select from '@radix-ui/react-select';
import { updateInvoice, recordPaymentReceived, deletePaymentReceived } from './actions';
import type { InvoiceStatus, InvoiceType } from '@/types';

const TYPE_LABELS: Record<InvoiceType, string> = {
  project: 'Project',
  milestone: 'Milestone',
  monthly: 'Monthly',
};

const STATUS_OPTIONS: { value: InvoiceStatus; label: string }[] = [
  { value: 'draft', label: 'Draft' },
  { value: 'issued', label: 'Issued' },
  { value: 'paid', label: 'Paid' },
  { value: 'overdue', label: 'Overdue' },
  { value: 'cancelled', label: 'Cancelled' },
];

function formatMoney(n: number): string {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n);
}

export interface InvoiceRow {
  id: string;
  project_id: string;
  project_name: string;
  type: InvoiceType;
  amount: number;
  status: InvoiceStatus;
  issue_date: string | null;
  due_date: string | null;
  billing_month: string | null;
  created_at: string;
}

export interface PaymentRow {
  id: string;
  amount: number;
  date: string;
  mode: string | null;
}

interface InvoiceDetailPanelProps {
  invoice: InvoiceRow;
  payments: PaymentRow[];
  onSuccess: () => void;
  onClose: () => void;
}

export function InvoiceDetailPanel({ invoice, payments, onSuccess, onClose }: InvoiceDetailPanelProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<InvoiceStatus>(invoice.status);
  const [type, setType] = useState<InvoiceType>(invoice.type);
  const [amount, setAmount] = useState(invoice.amount.toString());
  const [issueDate, setIssueDate] = useState(invoice.issue_date ?? '');
  const [dueDate, setDueDate] = useState(invoice.due_date ?? '');
  const [billingMonth, setBillingMonth] = useState(
    invoice.billing_month ? String(invoice.billing_month).slice(0, 7) : ''
  );
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentDate, setPaymentDate] = useState('');
  const [paymentMode, setPaymentMode] = useState('');

  const totalPaid = payments.reduce((s, p) => s + p.amount, 0);
  const balance = invoice.amount - totalPaid;

  // Pre-fill record-payment amount with balance due
  useEffect(() => {
    if (balance > 0) setPaymentAmount(balance.toString());
  }, [balance, invoice.id]);

  // Sync status when invoice is updated (e.g. auto-paid after recording payment)
  useEffect(() => {
    setStatus(invoice.status);
  }, [invoice.status]);

  async function handleSaveInvoice(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const amt = amount.trim() ? parseFloat(amount) : 0;
    const result = await updateInvoice(invoice.id, {
      type,
      amount: amt,
      status,
      issue_date: issueDate.trim() || null,
      due_date: dueDate.trim() || null,
      billing_month: type === 'monthly' && billingMonth ? `${billingMonth}-01` : null,
    });
    setLoading(false);
    if (result.error) {
      setError(result.error);
      return;
    }
    onSuccess();
  }

  async function handleRecordPayment(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const amt = paymentAmount.trim() ? parseFloat(paymentAmount) : NaN;
    if (isNaN(amt) || amt <= 0) {
      setError('Payment amount must be a positive number.');
      return;
    }
    if (!paymentDate.trim()) {
      setError('Payment date is required.');
      return;
    }
    setLoading(true);
    const result = await recordPaymentReceived({
      invoice_id: invoice.id,
      amount: amt,
      date: paymentDate.trim(),
      mode: paymentMode.trim() || null,
    });
    setLoading(false);
    if (result.error) {
      setError(result.error);
      return;
    }
    setPaymentAmount('');
    setPaymentDate('');
    setPaymentMode('');
    onSuccess();
  }

  return (
    <div className="space-y-6">
      <div>
        <p className="text-muted-foreground text-sm">{invoice.project_name}</p>
        <p className="font-medium">{TYPE_LABELS[invoice.type]} invoice · {formatMoney(invoice.amount)}</p>
      </div>

      <form onSubmit={handleSaveInvoice} className="space-y-4">
        <h3 className="text-sm font-medium text-muted-foreground">Invoice details</h3>
        <div>
          <Label className="mb-1.5 block">Type</Label>
          <Select.Root value={type} onValueChange={(v) => setType(v as InvoiceType)}>
            <Select.Trigger className="flex h-10 w-full items-center justify-between rounded-xl border border-border bg-background px-3 text-sm">
              <Select.Value />
              <Select.Icon />
            </Select.Trigger>
            <Select.Portal>
              <Select.Content className="z-[100] overflow-hidden rounded-xl border border-border bg-card shadow-lg" position="popper" sideOffset={4}>
                <Select.Viewport>
                  {(['project', 'milestone', 'monthly'] as const).map((t) => (
                    <Select.Item key={t} value={t} className="flex cursor-default items-center rounded-lg py-2 pl-3 pr-8 text-sm outline-none focus:bg-muted">
                      <Select.ItemText>{TYPE_LABELS[t]}</Select.ItemText>
                    </Select.Item>
                  ))}
                </Select.Viewport>
              </Select.Content>
            </Select.Portal>
          </Select.Root>
        </div>
        <div>
          <Label htmlFor="inv_amount" className="mb-1.5 block">Amount (₹)</Label>
          <Input id="inv_amount" type="number" min={0} step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="inv_issue_date" className="mb-1.5 block">Issue date</Label>
            <Input id="inv_issue_date" type="date" value={issueDate} onChange={(e) => setIssueDate(e.target.value)} />
          </div>
          <div>
            <Label htmlFor="inv_due_date" className="mb-1.5 block">Due date</Label>
            <Input id="inv_due_date" type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
          </div>
        </div>
        {type === 'monthly' && (
          <div>
            <Label htmlFor="inv_billing_month" className="mb-1.5 block">Billing month</Label>
            <Input
              id="inv_billing_month"
              type="month"
              value={billingMonth}
              onChange={(e) => setBillingMonth(e.target.value)}
            />
          </div>
        )}
        <div>
          <Label className="mb-1.5 block">Status</Label>
          <Select.Root value={status} onValueChange={(v) => setStatus(v as InvoiceStatus)}>
            <Select.Trigger className="flex h-10 w-full items-center justify-between rounded-xl border border-border bg-background px-3 text-sm">
              <Select.Value />
              <Select.Icon />
            </Select.Trigger>
            <Select.Portal>
              <Select.Content className="z-[100] overflow-hidden rounded-xl border border-border bg-card shadow-lg" position="popper" sideOffset={4}>
                <Select.Viewport>
                  {STATUS_OPTIONS.map((opt) => (
                    <Select.Item key={opt.value} value={opt.value} className="flex cursor-default items-center rounded-lg py-2 pl-3 pr-8 text-sm outline-none focus:bg-muted">
                      <Select.ItemText>{opt.label}</Select.ItemText>
                    </Select.Item>
                  ))}
                </Select.Viewport>
              </Select.Content>
            </Select.Portal>
          </Select.Root>
        </div>
        <Button type="submit" size="sm" disabled={loading}>{loading ? 'Saving…' : 'Save changes'}</Button>
      </form>

      <section>
        <h3 className="text-sm font-medium text-muted-foreground mb-2">Payments received</h3>
        <p className="text-sm text-muted-foreground mb-2">
          Total paid: {formatMoney(totalPaid)} · Balance: {formatMoney(balance)}
        </p>
        {payments.length > 0 ? (
          <ul className="mb-4 space-y-1 rounded-lg border border-border p-3 text-sm">
            {payments.map((p) => (
              <li key={p.id} className="flex items-center justify-between gap-2">
                <span>{new Date(p.date).toLocaleDateString('en-US')}{p.mode ? ` · ${p.mode}` : ''}</span>
                <span className="tabular-nums">{formatMoney(p.amount)}</span>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-7 text-xs text-destructive hover:text-destructive"
                  disabled={loading}
                  onClick={async () => {
                    if (!confirm('Remove this payment? The ledger entry will also be removed.')) return;
                    setError(null);
                    setLoading(true);
                    const result = await deletePaymentReceived(p.id);
                    setLoading(false);
                    if (result.error) {
                      setError(result.error);
                      return;
                    }
                    onSuccess();
                  }}
                >
                  Remove
                </Button>
              </li>
            ))}
          </ul>
        ) : null}
        <form onSubmit={handleRecordPayment} className="space-y-3 rounded-lg border border-border bg-muted/20 p-3">
          <h4 className="text-xs font-medium text-muted-foreground">Record payment</h4>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="pay_amount" className="mb-1 block text-xs">Amount (₹)</Label>
              <Input id="pay_amount" type="number" min="0.01" step="0.01" value={paymentAmount} onChange={(e) => setPaymentAmount(e.target.value)} placeholder="0" />
            </div>
            <div>
              <Label htmlFor="pay_date" className="mb-1 block text-xs">Date</Label>
              <Input id="pay_date" type="date" value={paymentDate} onChange={(e) => setPaymentDate(e.target.value)} />
            </div>
          </div>
          <div>
            <Label htmlFor="pay_mode" className="mb-1 block text-xs">Mode (e.g. NEFT, Cheque)</Label>
            <Input id="pay_mode" value={paymentMode} onChange={(e) => setPaymentMode(e.target.value)} placeholder="Optional" />
          </div>
          {error && <p className="text-xs text-red-500">{error}</p>}
          <Button type="submit" size="sm" disabled={loading}>Record payment</Button>
        </form>
      </section>

      <div className="flex flex-wrap gap-2">
        <Button variant="outline" size="sm" asChild>
          <Link href={`/finance/invoice/${invoice.id}/print`} target="_blank" rel="noopener noreferrer">
            Preview / Print
          </Link>
        </Button>
        <Button variant="outline" size="sm" onClick={onClose}>Close</Button>
        {status !== 'cancelled' && (
          <Button
            variant="destructive"
            size="sm"
            disabled={loading}
            onClick={async () => {
              if (!confirm('Void this invoice? Status will be set to Cancelled. You can still view it by enabling "Show cancelled".')) return;
              setError(null);
              setLoading(true);
              const result = await updateInvoice(invoice.id, { status: 'cancelled' });
              setLoading(false);
              if (result.error) {
                setError(result.error);
                return;
              }
              onSuccess();
            }}
          >
            Void invoice
          </Button>
        )}
      </div>
    </div>
  );
}
