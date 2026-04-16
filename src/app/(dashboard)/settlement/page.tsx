import { createClient } from '@/lib/supabase/server';
import { SettlementView, type PendingCollection, type PendingPayout } from './settlement-view';
import type { InvoiceRow, PaymentRow } from '@/app/(dashboard)/invoicing/invoice-detail-panel';
import type { InvoiceStatus, InvoiceType } from '@/types';
import { projectNameFromRelation, relationNameFromRelation } from '@/lib/utils';

export const dynamic = 'force-dynamic';

export default async function SettlementPage() {
  const supabase = await createClient();

  // Sync overdue invoices on load (same as invoicing page)
  await import('@/app/(dashboard)/invoicing/actions').then((m) => m.syncOverdueInvoices());

  // Pending collections: issued + overdue invoices
  const { data: invoiceRows, error: invError } = await supabase
    .from('invoices')
    .select('id, project_id, type, amount, status, issue_date, due_date, billing_month, created_at, projects(name)')
    .in('status', ['issued', 'overdue'])
    .order('due_date', { ascending: true });

  if (invError) {
    return (
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Settlement</h1>
        <p className="mt-2 text-sm text-red-500">Failed to load data: {invError.message}</p>
      </div>
    );
  }

  const invoices: InvoiceRow[] = (invoiceRows ?? []).map((r) => ({
    id: r.id,
    project_id: r.project_id,
    project_name: projectNameFromRelation(r.projects),
    type: r.type as InvoiceType,
    amount: Number(r.amount),
    status: r.status as InvoiceStatus,
    issue_date: r.issue_date,
    due_date: r.due_date,
    billing_month: r.billing_month ?? null,
    created_at: r.created_at,
  }));

  // Fetch all payments for these invoices
  const invoiceIds = invoices.map((i) => i.id);
  const { data: paymentRows } = invoiceIds.length > 0
    ? await supabase.from('payments_received').select('id, invoice_id, amount, date, mode').in('invoice_id', invoiceIds)
    : { data: null };

  const paymentsByInvoiceId: Record<string, PaymentRow[]> = {};
  for (const p of paymentRows ?? []) {
    const row: PaymentRow = { id: p.id, amount: Number(p.amount), date: p.date, mode: p.mode };
    if (!paymentsByInvoiceId[p.invoice_id]) paymentsByInvoiceId[p.invoice_id] = [];
    paymentsByInvoiceId[p.invoice_id].push(row);
  }

  const pendingCollections: PendingCollection[] = invoices.map((inv) => {
    const payments = paymentsByInvoiceId[inv.id] ?? [];
    const totalPaid = payments.reduce((s, p) => s + Number(p.amount), 0);
    const remaining = Math.max(0, inv.amount - totalPaid);
    return { invoice: inv, payments, remaining };
  }).filter((c) => c.remaining > 0);

  // Pending payouts: vendor_payouts where status = 'pending'
  const { data: payoutRows } = await supabase
    .from('vendor_payouts')
    .select('id, requirement_id, vendor_id, amount, requirements(service_name, projects(name)), vendors(name)')
    .eq('status', 'pending')
    .order('created_at', { ascending: true });

  const pendingPayouts: PendingPayout[] = (payoutRows ?? []).map((p) => {
    const req = p.requirements as unknown as { service_name?: string; projects?: unknown } | null;
    const serviceName = (req?.service_name as string) || '—';
    const projectName = projectNameFromRelation(req?.projects ?? null);
    const vendorName = relationNameFromRelation(p.vendors, '—');
    return {
      id: p.id,
      requirement_id: p.requirement_id,
      vendor_id: p.vendor_id,
      amount: Number(p.amount),
      service_name: serviceName,
      project_name: projectName,
      vendor_name: vendorName,
    };
  });

  return (
    <SettlementView
      pendingCollections={pendingCollections}
      pendingPayouts={pendingPayouts}
      paymentsByInvoiceId={paymentsByInvoiceId}
    />
  );
}
