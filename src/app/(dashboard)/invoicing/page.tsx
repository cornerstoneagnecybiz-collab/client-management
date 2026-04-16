import { createClient } from '@/lib/supabase/server';
import { InvoicingView } from './invoicing-view';
import { NextStepBanner } from '@/components/next-step-banner';
import type { InvoiceType, InvoiceStatus } from '@/types';
import type { VendorPayoutStatus } from '@/types';
import { projectNameFromRelation } from '@/lib/utils';

export type InvoiceRow = {
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
};

export type PaymentRow = {
  id: string;
  invoice_id: string;
  amount: number;
  date: string;
  mode: string | null;
};

export type VendorPayoutRow = {
  id: string;
  requirement_id: string;
  vendor_id: string;
  amount: number;
  status: VendorPayoutStatus;
  paid_date: string | null;
  service_name: string;
  project_name: string;
  vendor_name: string;
};

export default async function InvoicingPage({
  searchParams,
}: {
  searchParams: Promise<{ id?: string; project?: string; type?: string; showCancelled?: string; new?: string }>;
}) {
  const { id: openId, project: projectFilter, type: invoiceTypeFilter, showCancelled: showCancelledParam, new: newParam } = await searchParams;
  const openCreatePanel = newParam === '1';
  const showCancelled = showCancelledParam === '1';
  const supabase = await createClient();

  await import('./actions').then((m) => m.syncOverdueInvoices());

  let invoiceQuery = supabase
    .from('invoices')
    .select('id, project_id, type, amount, status, issue_date, due_date, billing_month, created_at, projects(name)')
    .order('created_at', { ascending: false });
  if (projectFilter) {
    invoiceQuery = invoiceQuery.eq('project_id', projectFilter);
  }
  if (invoiceTypeFilter === 'monthly') {
    invoiceQuery = invoiceQuery.eq('type', 'monthly');
  } else if (invoiceTypeFilter === 'project') {
    invoiceQuery = invoiceQuery.in('type', ['project', 'milestone']);
  }
  if (!showCancelled) {
    invoiceQuery = invoiceQuery.neq('status', 'cancelled');
  }
  const { data: invoiceRows, error: invError } = await invoiceQuery;

  if (invError) {
    return (
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Invoicing</h1>
        <p className="mt-2 text-sm text-red-500">Failed to load invoices: {invError.message}</p>
      </div>
    );
  }

  const invoices: InvoiceRow[] = (invoiceRows ?? []).map((r) => ({
    id: r.id,
    project_id: r.project_id,
    project_name: projectNameFromRelation(r.projects),
    type: r.type as InvoiceType,
    amount: r.amount,
    status: r.status as InvoiceStatus,
    issue_date: r.issue_date,
    due_date: r.due_date,
    billing_month: r.billing_month ?? null,
    created_at: r.created_at,
  }));

  const { data: paymentRows } = await supabase
    .from('payments_received')
    .select('id, invoice_id, amount, date, mode');

  const paymentsByInvoiceId: Record<string, PaymentRow[]> = {};
  for (const p of paymentRows ?? []) {
    const row = { id: p.id, invoice_id: p.invoice_id, amount: p.amount, date: p.date, mode: p.mode };
    if (!paymentsByInvoiceId[p.invoice_id]) paymentsByInvoiceId[p.invoice_id] = [];
    paymentsByInvoiceId[p.invoice_id].push(row);
  }

  const { data: projects } = await supabase.from('projects').select('id, name, engagement_type').order('name');

  let projectFilterLabel: string | null = null;
  if (projectFilter && projects?.length) {
    const p = projects.find((x) => x.id === projectFilter);
    if (p) projectFilterLabel = `Invoices for ${p.name}`;
  }
  const invoiceTypeFilterLabel =
    invoiceTypeFilter === 'monthly'
      ? 'Monthly invoices'
      : invoiceTypeFilter === 'project'
        ? 'Project & milestone invoices'
        : null;

  // Banner: issued/overdue invoices with unpaid balance → settlement
  const pendingCollectTotal = invoices
    .filter((inv) => inv.status === 'issued' || inv.status === 'overdue')
    .reduce((sum, inv) => {
      const paid = (paymentsByInvoiceId[inv.id] ?? []).reduce((s, p) => s + p.amount, 0);
      return sum + Math.max(0, inv.amount - paid);
    }, 0);
  const formatMoney = (n: number) =>
    new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n);

  return (
    <div className="space-y-4">
      {pendingCollectTotal > 0 && !projectFilter && !invoiceTypeFilter && (
        <NextStepBanner
          message={`${formatMoney(pendingCollectTotal)} pending collection.`}
          ctaLabel="Settle now"
          href="/settlement"
        />
      )}
      <InvoicingView
      initialInvoices={invoices}
      paymentsByInvoiceId={paymentsByInvoiceId}
      projectOptions={projects?.map((p) => ({ value: p.id, label: p.name, engagement_type: (p.engagement_type as 'one_time' | 'monthly') ?? 'one_time' })) ?? []}
      initialOpenId={openId ?? null}
      initialCreateOpen={openCreatePanel}
      projectFilter={projectFilter ?? null}
      projectFilterLabel={projectFilterLabel}
      invoiceTypeFilter={invoiceTypeFilter ?? null}
      invoiceTypeFilterLabel={invoiceTypeFilterLabel}
      showCancelled={showCancelled}
      />
    </div>
  );
}
