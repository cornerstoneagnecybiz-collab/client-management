import { createClient } from '@/lib/supabase/server';
import { FinanceView } from './finance-view';
import type { InvoiceType, InvoiceStatus } from '@/types';
import type { VendorPayoutStatus } from '@/types';
import { projectNameFromRelation, relationNameFromRelation } from '@/lib/utils';

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

export default async function FinancePage({
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
        <h1 className="text-2xl font-semibold tracking-tight">Finance</h1>
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

  const { data: payoutRows } = await supabase
    .from('vendor_payouts')
    .select(`
      id, requirement_id, vendor_id, amount, status, paid_date,
      requirements(service_catalog(service_name), projects(name)),
      vendors(name)
    `)
    .order('created_at', { ascending: false });

  const vendorPayouts: VendorPayoutRow[] = (payoutRows ?? []).map((r) => {
    const rawReq = r.requirements as unknown as { service_catalog?: { service_name?: string } | { service_name?: string }[] | null; projects?: unknown } | { service_catalog?: { service_name?: string } | { service_name?: string }[] | null; projects?: unknown }[] | null;
    const req = rawReq == null ? null : Array.isArray(rawReq) ? rawReq[0] : rawReq;
    const catalog = req?.service_catalog;
    const serviceName = (catalog && !Array.isArray(catalog) ? catalog.service_name : (Array.isArray(catalog) ? catalog[0]?.service_name : undefined)) ?? '—';
    const projectName = projectNameFromRelation(req?.projects);
    const vendorName = relationNameFromRelation(r.vendors);
    return {
      id: r.id,
      requirement_id: r.requirement_id,
      vendor_id: r.vendor_id,
      amount: r.amount,
      status: r.status as VendorPayoutStatus,
      paid_date: r.paid_date,
      service_name: serviceName,
      project_name: projectName,
      vendor_name: vendorName,
    };
  });

  const { data: reqList } = await supabase
    .from('requirements')
    .select('id, title, expected_vendor_cost, quantity, period_days, projects(name, engagement_type), service_catalog(service_name)')
    .order('created_at', { ascending: false });

  const requirementOptions =
    reqList?.map((r) => {
      const pName = projectNameFromRelation(r.projects, '');
      const catalog = r.service_catalog as unknown as { service_name?: string } | { service_name?: string }[] | null;
      const sName = (catalog == null ? '' : Array.isArray(catalog) ? catalog[0]?.service_name : catalog?.service_name) ?? '';
      const proj = r.projects as unknown as { engagement_type?: string } | { engagement_type?: string }[] | null;
      const engagementType = (Array.isArray(proj) ? proj[0]?.engagement_type : proj?.engagement_type) ?? 'one_time';
      const qtyPeriod =
        engagementType === 'one_time' && (r.quantity != null || r.period_days != null)
          ? ` · ${[r.quantity != null && r.quantity > 0 ? `Qty ${r.quantity}` : null, r.period_days != null && r.period_days > 0 ? `${r.period_days} days` : null].filter(Boolean).join(' × ')}`
          : '';
      const label = `${pName} · ${sName}${r.title && r.title !== sName ? ` — ${r.title}` : ''}${qtyPeriod}`;
      return { value: r.id, label, expected_vendor_cost: r.expected_vendor_cost ?? null };
    }) ?? [];

  const { data: vendors } = await supabase.from('vendors').select('id, name').order('name');
  const vendorOptions = vendors?.map((v) => ({ value: v.id, label: v.name })) ?? [];

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

  return (
    <FinanceView
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
      vendorPayouts={vendorPayouts}
      requirementOptions={requirementOptions}
      vendorOptions={vendorOptions}
    />
  );
}
