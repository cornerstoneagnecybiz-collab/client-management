'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { SlidePanel } from '@/components/ui/slide-panel';
import { recordPaymentReceived, updateVendorPayout } from '@/app/(dashboard)/invoicing/actions';
import { InvoiceDetailPanel, type InvoiceRow, type PaymentRow } from '@/app/(dashboard)/invoicing/invoice-detail-panel';
import { CheckCircle2 } from 'lucide-react';

export type PendingCollection = {
  invoice: InvoiceRow;
  payments: PaymentRow[];
  remaining: number;
};

export type PendingPayout = {
  id: string;
  requirement_id: string;
  vendor_id: string;
  amount: number;
  service_name: string;
  project_name: string;
  vendor_name: string;
};

function formatMoney(n: number): string {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n);
}

function formatDate(d: string | null): string {
  if (!d) return '—';
  return new Date(d + 'T00:00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

interface SettlementViewProps {
  pendingCollections: PendingCollection[];
  pendingPayouts: PendingPayout[];
  paymentsByInvoiceId: Record<string, PaymentRow[]>;
}

function RecordPaymentPanel({
  collection,
  onClose,
}: {
  collection: PendingCollection;
  onClose: () => void;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [amount, setAmount] = useState(String(collection.remaining.toFixed(2)));
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [mode, setMode] = useState('');
  const [error, setError] = useState<string | null>(null);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const amt = parseFloat(amount);
    if (isNaN(amt) || amt <= 0) { setError('Enter a valid amount'); return; }
    startTransition(async () => {
      const res = await recordPaymentReceived({ invoice_id: collection.invoice.id, amount: amt, date, mode: mode || null });
      if (res.error) { setError(res.error); return; }
      router.refresh();
      onClose();
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 p-4">
      <div className="rounded-lg bg-muted/40 p-3 text-sm space-y-1">
        <p className="font-medium">{collection.invoice.project_name}</p>
        <p className="text-muted-foreground">Invoice amount: {formatMoney(collection.invoice.amount)}</p>
        <p className="text-muted-foreground">Already paid: {formatMoney(collection.invoice.amount - collection.remaining)}</p>
        <p className="font-medium text-foreground">Remaining: {formatMoney(collection.remaining)}</p>
      </div>
      <div className="space-y-1">
        <Label htmlFor="pay-amount">Amount</Label>
        <Input id="pay-amount" type="number" step="0.01" min="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} required />
      </div>
      <div className="space-y-1">
        <Label htmlFor="pay-date">Date</Label>
        <Input id="pay-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
      </div>
      <div className="space-y-1">
        <Label htmlFor="pay-mode">Payment mode (optional)</Label>
        <Input id="pay-mode" placeholder="e.g. NEFT, UPI, Cheque" value={mode} onChange={(e) => setMode(e.target.value)} />
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
      <div className="flex gap-2 pt-2">
        <Button type="submit" disabled={isPending}>{isPending ? 'Saving…' : 'Record payment'}</Button>
        <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
      </div>
    </form>
  );
}

function MarkPaidPanel({
  payout,
  onClose,
}: {
  payout: PendingPayout;
  onClose: () => void;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [error, setError] = useState<string | null>(null);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      const res = await updateVendorPayout(payout.id, { status: 'paid', paid_date: date });
      if (res.error) { setError(res.error); return; }
      router.refresh();
      onClose();
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 p-4">
      <div className="rounded-lg bg-muted/40 p-3 text-sm space-y-1">
        <p className="font-medium">{payout.vendor_name}</p>
        <p className="text-muted-foreground">{payout.service_name} — {payout.project_name}</p>
        <p className="font-medium text-foreground">Amount: {formatMoney(payout.amount)}</p>
      </div>
      <div className="space-y-1">
        <Label htmlFor="paid-date">Payment date</Label>
        <Input id="paid-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
      <div className="flex gap-2 pt-2">
        <Button type="submit" disabled={isPending}>{isPending ? 'Saving…' : 'Mark as paid'}</Button>
        <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
      </div>
    </form>
  );
}

export function SettlementView({
  pendingCollections,
  pendingPayouts,
  paymentsByInvoiceId,
}: SettlementViewProps) {
  const [recordPaymentFor, setRecordPaymentFor] = useState<PendingCollection | null>(null);
  const [markPaidFor, setMarkPaidFor] = useState<PendingPayout | null>(null);
  const [openInvoiceId, setOpenInvoiceId] = useState<string | null>(null);

  const totalToCollect = pendingCollections.reduce((s, c) => s + c.remaining, 0);
  const totalToPay = pendingPayouts.reduce((s, p) => s + p.amount, 0);
  const netPosition = totalToCollect - totalToPay;

  const openInvoice = openInvoiceId
    ? pendingCollections.find((c) => c.invoice.id === openInvoiceId)?.invoice ?? null
    : null;

  const allSettled = pendingCollections.length === 0 && pendingPayouts.length === 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Settlement</h1>
        <p className="text-muted-foreground text-sm mt-0.5">Clear pending collections and vendor payouts.</p>
      </div>

      {/* KPI summary */}
      <div className="grid grid-cols-3 gap-4">
        <div className="glass-card p-4">
          <p className="text-xs text-muted-foreground uppercase tracking-wide">To collect</p>
          <p className="text-2xl font-semibold mt-1 text-green-600">{formatMoney(totalToCollect)}</p>
          <p className="text-xs text-muted-foreground mt-0.5">{pendingCollections.length} invoice{pendingCollections.length !== 1 ? 's' : ''}</p>
        </div>
        <div className="glass-card p-4">
          <p className="text-xs text-muted-foreground uppercase tracking-wide">To pay</p>
          <p className="text-2xl font-semibold mt-1 text-red-500">{formatMoney(totalToPay)}</p>
          <p className="text-xs text-muted-foreground mt-0.5">{pendingPayouts.length} payout{pendingPayouts.length !== 1 ? 's' : ''}</p>
        </div>
        <div className="glass-card p-4">
          <p className="text-xs text-muted-foreground uppercase tracking-wide">Net position</p>
          <p className={`text-2xl font-semibold mt-1 ${netPosition >= 0 ? 'text-green-600' : 'text-red-500'}`}>
            {formatMoney(netPosition)}
          </p>
          <p className="text-xs text-muted-foreground mt-0.5">Collect − Pay</p>
        </div>
      </div>

      {allSettled && (
        <div className="glass-card p-8 flex flex-col items-center justify-center gap-3 text-center">
          <CheckCircle2 className="h-10 w-10 text-green-500" />
          <p className="font-medium">Nothing pending — you&apos;re up to date</p>
          <p className="text-sm text-muted-foreground">All invoices collected and vendor payouts settled.</p>
        </div>
      )}

      {/* Pending collections */}
      {pendingCollections.length > 0 && (
        <div className="glass-card">
          <div className="px-4 pt-4 pb-2">
            <h2 className="text-base font-semibold">Pending collections</h2>
            <p className="text-xs text-muted-foreground">Issued and overdue invoices with an unpaid balance.</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-xs text-muted-foreground">
                  <th className="px-4 py-2 text-left font-medium">Project</th>
                  <th className="px-4 py-2 text-left font-medium">Status</th>
                  <th className="px-4 py-2 text-right font-medium">Invoice</th>
                  <th className="px-4 py-2 text-right font-medium">Paid</th>
                  <th className="px-4 py-2 text-right font-medium">Remaining</th>
                  <th className="px-4 py-2 text-left font-medium">Due</th>
                  <th className="px-4 py-2" />
                </tr>
              </thead>
              <tbody className="divide-y">
                {pendingCollections.map((c) => (
                  <tr
                    key={c.invoice.id}
                    className="hover:bg-muted/30 cursor-pointer"
                    onClick={() => setOpenInvoiceId(c.invoice.id)}
                  >
                    <td className="px-4 py-3 font-medium">{c.invoice.project_name}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                        c.invoice.status === 'overdue'
                          ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                          : 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
                      }`}>
                        {c.invoice.status === 'overdue' ? 'Overdue' : 'Issued'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">{formatMoney(c.invoice.amount)}</td>
                    <td className="px-4 py-3 text-right text-muted-foreground">{formatMoney(c.invoice.amount - c.remaining)}</td>
                    <td className="px-4 py-3 text-right font-semibold">{formatMoney(c.remaining)}</td>
                    <td className="px-4 py-3 text-muted-foreground">{formatDate(c.invoice.due_date)}</td>
                    <td className="px-4 py-3">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={(e) => { e.stopPropagation(); setRecordPaymentFor(c); }}
                      >
                        Record payment
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Pending payouts */}
      {pendingPayouts.length > 0 && (
        <div className="glass-card">
          <div className="px-4 pt-4 pb-2">
            <h2 className="text-base font-semibold">Pending vendor payouts</h2>
            <p className="text-xs text-muted-foreground">Payouts that haven&apos;t been marked as paid yet.</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-xs text-muted-foreground">
                  <th className="px-4 py-2 text-left font-medium">Project</th>
                  <th className="px-4 py-2 text-left font-medium">Service</th>
                  <th className="px-4 py-2 text-left font-medium">Vendor</th>
                  <th className="px-4 py-2 text-right font-medium">Amount</th>
                  <th className="px-4 py-2" />
                </tr>
              </thead>
              <tbody className="divide-y">
                {pendingPayouts.map((p) => (
                  <tr key={p.id} className="hover:bg-muted/30">
                    <td className="px-4 py-3 font-medium">{p.project_name}</td>
                    <td className="px-4 py-3 text-muted-foreground">{p.service_name}</td>
                    <td className="px-4 py-3">{p.vendor_name}</td>
                    <td className="px-4 py-3 text-right font-semibold">{formatMoney(p.amount)}</td>
                    <td className="px-4 py-3">
                      <Button size="sm" variant="outline" onClick={() => setMarkPaidFor(p)}>
                        Mark paid
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Record payment slide panel */}
      <SlidePanel
        open={!!recordPaymentFor}
        onOpenChange={(o) => { if (!o) setRecordPaymentFor(null); }}
        title="Record payment"
      >
        {recordPaymentFor && (
          <RecordPaymentPanel
            collection={recordPaymentFor}
            onClose={() => setRecordPaymentFor(null)}
          />
        )}
      </SlidePanel>

      {/* Mark payout paid slide panel */}
      <SlidePanel
        open={!!markPaidFor}
        onOpenChange={(o) => { if (!o) setMarkPaidFor(null); }}
        title="Mark payout as paid"
      >
        {markPaidFor && (
          <MarkPaidPanel
            payout={markPaidFor}
            onClose={() => setMarkPaidFor(null)}
          />
        )}
      </SlidePanel>

      {/* Invoice detail slide panel */}
      <SlidePanel
        open={!!openInvoice}
        onOpenChange={(o) => { if (!o) setOpenInvoiceId(null); }}
        title="Invoice details"
      >
        {openInvoice && (
          <InvoiceDetailPanel
            invoice={openInvoice}
            payments={paymentsByInvoiceId[openInvoice.id] ?? []}
            onSuccess={() => setOpenInvoiceId(null)}
            onClose={() => setOpenInvoiceId(null)}
          />
        )}
      </SlidePanel>
    </div>
  );
}
