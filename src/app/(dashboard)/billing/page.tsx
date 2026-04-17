import { createClient } from '@/lib/supabase/server';
import { NextStepBanner } from '@/components/next-step-banner';
import { projectNameFromRelation, relationNameFromRelation } from '@/lib/utils';
import type { InvoiceStatus, InvoiceType } from '@/types';
import type { InvoiceRow, PaymentRow } from '../invoicing/invoice-detail-panel';
import { BillingView, type LifecycleStage, type PipelineRow } from './billing-view';

function currentBillingMonth(): string {
  const now = new Date();
  const yyyy = now.getUTCFullYear();
  const mm = String(now.getUTCMonth() + 1).padStart(2, '0');
  return `${yyyy}-${mm}`;
}

/**
 * Pipeline stage derivation:
 *
 *   fulfilment_status = cancelled              → Cancelled
 *   fulfilment_status = pending                → Pending
 *   fulfilment_status = in_progress            → In progress
 *   fulfilment_status = fulfilled:
 *     one-time project:
 *       no invoice_requirements link (non-cancelled invoice) → Ready to invoice
 *       link exists, invoice paid                             → Paid
 *       link exists, invoice draft/issued/overdue             → Invoiced
 *     monthly project (cycle = current calendar month):
 *       no monthly invoice for this project & month            → Ready to invoice
 *       monthly invoice exists, paid                           → Paid
 *       monthly invoice exists, not paid                       → Invoiced
 */
function deriveStage(args: {
  fulfilmentStatus: string;
  engagementType: 'one_time' | 'monthly';
  projectId: string;
  requirementId: string;
  reqIdToCoveringInvoice: Map<string, { id: string; status: InvoiceStatus }>;
  monthlyInvoiceByProject: Map<string, { id: string; status: InvoiceStatus }>;
}): { stage: LifecycleStage; coveringInvoiceId: string | null } {
  const {
    fulfilmentStatus,
    engagementType,
    projectId,
    requirementId,
    reqIdToCoveringInvoice,
    monthlyInvoiceByProject,
  } = args;

  if (fulfilmentStatus === 'cancelled') return { stage: 'cancelled', coveringInvoiceId: null };
  if (fulfilmentStatus === 'pending') return { stage: 'pending', coveringInvoiceId: null };
  if (fulfilmentStatus === 'in_progress') return { stage: 'in_progress', coveringInvoiceId: null };
  if (fulfilmentStatus !== 'fulfilled') return { stage: 'pending', coveringInvoiceId: null };

  if (engagementType === 'monthly') {
    const mi = monthlyInvoiceByProject.get(projectId);
    if (!mi) return { stage: 'ready_to_invoice', coveringInvoiceId: null };
    if (mi.status === 'paid') return { stage: 'paid', coveringInvoiceId: mi.id };
    return { stage: 'invoiced', coveringInvoiceId: mi.id };
  }

  const cov = reqIdToCoveringInvoice.get(requirementId);
  if (!cov) return { stage: 'ready_to_invoice', coveringInvoiceId: null };
  if (cov.status === 'paid') return { stage: 'paid', coveringInvoiceId: cov.id };
  return { stage: 'invoiced', coveringInvoiceId: cov.id };
}

export default async function BillingPage({
  searchParams,
}: {
  searchParams: Promise<{
    project?: string;
    vendor?: string;
    type?: string;
    id?: string;
    new?: string;
    invoiceType?: string;
    showCancelled?: string;
  }>;
}) {
  const {
    project: projectFilter,
    vendor: vendorFilter,
    type: engagementFilter,
    id: openId,
    new: newParam,
    invoiceType: invoiceTypeFilter,
    showCancelled: showCancelledParam,
  } = await searchParams;

  const openCreatePanel = newParam === '1';
  const showCancelled = showCancelledParam === '1';
  const supabase = await createClient();

  await import('../invoicing/actions').then((m) => m.syncOverdueInvoices());

  // 1. Resolve project ids if an engagement-type filter is active (projects are filtered
  //    server-side by id-list to avoid a join where Supabase's relation filter is awkward).
  let projectIdsForType: string[] | null = null;
  if (engagementFilter === 'one_time' || engagementFilter === 'monthly') {
    const { data: projRows } = await supabase
      .from('projects')
      .select('id')
      .eq('engagement_type', engagementFilter);
    projectIdsForType = projRows?.map((p) => p.id) ?? [];
  }

  // 2. Requirements (left side of the pipeline).
  let reqQuery = supabase
    .from('requirements')
    .select(`
      id,
      project_id,
      service_name,
      service_category,
      pricing_type,
      title,
      description,
      delivery,
      assigned_vendor_id,
      client_price,
      expected_vendor_cost,
      quantity,
      period_days,
      unit_rate,
      vendor_unit_rate,
      fulfilment_status,
      created_at,
      projects(name, engagement_type),
      vendors(name)
    `)
    .order('created_at', { ascending: false });

  if (projectFilter) reqQuery = reqQuery.eq('project_id', projectFilter);
  if (vendorFilter) reqQuery = reqQuery.eq('assigned_vendor_id', vendorFilter);
  if (projectIdsForType !== null) {
    if (projectIdsForType.length === 0) reqQuery = reqQuery.eq('project_id', '00000000-0000-0000-0000-000000000000');
    else reqQuery = reqQuery.in('project_id', projectIdsForType);
  }

  const { data: reqRows, error: reqError } = await reqQuery;
  if (reqError) {
    return (
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Billing</h1>
        <p className="mt-2 text-sm text-red-500">Failed to load pipeline: {reqError.message}</p>
      </div>
    );
  }

  const reqProjectIds = Array.from(new Set((reqRows ?? []).map((r) => r.project_id)));
  const reqIds = (reqRows ?? []).map((r) => r.id);

  // 3. invoice_requirements links for one-time stage derivation.
  const reqIdToInvoiceIds = new Map<string, string[]>();
  const allLinkedInvoiceIds = new Set<string>();
  if (reqIds.length > 0) {
    const { data: linkRows } = await supabase
      .from('invoice_requirements')
      .select('requirement_id, invoice_id')
      .in('requirement_id', reqIds);
    for (const l of linkRows ?? []) {
      if (!l.requirement_id || !l.invoice_id) continue;
      if (!reqIdToInvoiceIds.has(l.requirement_id)) reqIdToInvoiceIds.set(l.requirement_id, []);
      reqIdToInvoiceIds.get(l.requirement_id)!.push(l.invoice_id);
      allLinkedInvoiceIds.add(l.invoice_id);
    }
  }

  // 4. Fetch (a) every invoice linked to any of our requirements AND (b) every current-cycle
  //    monthly invoice for any project in the result set. We merge into a single status map.
  const month = currentBillingMonth();
  const monthStart = `${month}-01`;
  const invoiceStatusById = new Map<string, InvoiceStatus>();
  const monthlyInvoiceByProject = new Map<string, { id: string; status: InvoiceStatus }>();

  if (allLinkedInvoiceIds.size > 0 || reqProjectIds.length > 0) {
    const orClauses: string[] = [];
    if (allLinkedInvoiceIds.size > 0) orClauses.push(`id.in.(${Array.from(allLinkedInvoiceIds).join(',')})`);
    if (reqProjectIds.length > 0) {
      orClauses.push(
        `and(type.eq.monthly,billing_month.eq.${monthStart},project_id.in.(${reqProjectIds.join(',')}))`,
      );
    }
    if (orClauses.length > 0) {
      const { data: invMeta } = await supabase
        .from('invoices')
        .select('id, project_id, status, type, billing_month')
        .or(orClauses.join(','))
        .neq('status', 'cancelled');
      for (const inv of invMeta ?? []) {
        invoiceStatusById.set(inv.id, inv.status as InvoiceStatus);
        if (inv.type === 'monthly' && typeof inv.billing_month === 'string' && inv.billing_month.startsWith(month)) {
          // If multiple monthly invoices for the same project+month exist (shouldn't, but),
          // prefer the most-paid one for stage derivation.
          const existing = monthlyInvoiceByProject.get(inv.project_id);
          if (!existing || (existing.status !== 'paid' && inv.status === 'paid')) {
            monthlyInvoiceByProject.set(inv.project_id, { id: inv.id, status: inv.status as InvoiceStatus });
          }
        }
      }
    }
  }

  // For one-time stage: the "covering" invoice for a requirement = first non-cancelled invoice
  // it's linked to, preferring paid > issued/draft/overdue (so Paid wins if there are ever
  // multiple links — should not happen in practice).
  const reqIdToCoveringInvoice = new Map<string, { id: string; status: InvoiceStatus }>();
  for (const [reqId, invIds] of reqIdToInvoiceIds.entries()) {
    let best: { id: string; status: InvoiceStatus } | null = null;
    for (const iid of invIds) {
      const status = invoiceStatusById.get(iid);
      if (!status) continue;
      if (!best) best = { id: iid, status };
      else if (best.status !== 'paid' && status === 'paid') best = { id: iid, status };
    }
    if (best) reqIdToCoveringInvoice.set(reqId, best);
  }

  // 5. Build pipeline rows.
  const pipeline: PipelineRow[] = (reqRows ?? []).map((r) => {
    const engagement: 'one_time' | 'monthly' = (() => {
      const proj = r.projects as unknown as { engagement_type?: string } | { engagement_type?: string }[] | null;
      const v = (Array.isArray(proj) ? proj[0]?.engagement_type : proj?.engagement_type) ?? 'one_time';
      return v === 'monthly' ? 'monthly' : 'one_time';
    })();

    const { stage, coveringInvoiceId } = deriveStage({
      fulfilmentStatus: r.fulfilment_status as string,
      engagementType: engagement,
      projectId: r.project_id,
      requirementId: r.id,
      reqIdToCoveringInvoice,
      monthlyInvoiceByProject,
    });

    return {
      id: r.id,
      project_id: r.project_id,
      project_name: projectNameFromRelation(r.projects),
      engagement_type: engagement,
      service_name: (r.service_name as string) || '—',
      service_category: (r.service_category as string | null) ?? null,
      pricing_type: (r.pricing_type as string) || 'fixed',
      title: r.title,
      description: r.description,
      delivery: (r.delivery as string) || 'vendor',
      assigned_vendor_id: r.assigned_vendor_id,
      vendor_name: (() => {
        const n = relationNameFromRelation(r.vendors, '');
        return n === '' ? null : n;
      })(),
      client_price: r.client_price,
      expected_vendor_cost: r.expected_vendor_cost,
      quantity: r.quantity != null ? Number(r.quantity) : null,
      period_days: r.period_days != null ? Number(r.period_days) : null,
      unit_rate: r.unit_rate != null ? Number(r.unit_rate) : null,
      vendor_unit_rate: r.vendor_unit_rate != null ? Number(r.vendor_unit_rate) : null,
      fulfilment_status: r.fulfilment_status,
      created_at: r.created_at,
      stage,
      covering_invoice_id: coveringInvoiceId,
    };
  });

  // 6. Invoices section (same query shape as the old /invoicing page).
  let invoiceQuery = supabase
    .from('invoices')
    .select('id, project_id, type, amount, status, issue_date, due_date, billing_month, created_at, projects(name)')
    .order('created_at', { ascending: false });
  if (projectFilter) invoiceQuery = invoiceQuery.eq('project_id', projectFilter);
  if (invoiceTypeFilter === 'monthly') invoiceQuery = invoiceQuery.eq('type', 'monthly');
  else if (invoiceTypeFilter === 'project') invoiceQuery = invoiceQuery.in('type', ['project', 'milestone']);
  if (!showCancelled) invoiceQuery = invoiceQuery.neq('status', 'cancelled');
  const { data: invoiceRows, error: invError } = await invoiceQuery;

  if (invError) {
    return (
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Billing</h1>
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
    if (!paymentsByInvoiceId[p.invoice_id]) paymentsByInvoiceId[p.invoice_id] = [];
    paymentsByInvoiceId[p.invoice_id].push({ id: p.id, amount: p.amount, date: p.date, mode: p.mode });
  }

  const { data: projects } = await supabase.from('projects').select('id, name, engagement_type').order('name');
  const { data: vendors } = await supabase.from('vendors').select('id, name').order('name');

  // 7. Banners.
  const pendingCollectTotal = invoices
    .filter((inv) => inv.status === 'issued' || inv.status === 'overdue')
    .reduce((sum, inv) => {
      const paid = (paymentsByInvoiceId[inv.id] ?? []).reduce((s, p) => s + p.amount, 0);
      return sum + Math.max(0, inv.amount - paid);
    }, 0);
  const formatMoney = (n: number) =>
    new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n);

  const readyToInvoiceCount = pipeline.filter((r) => r.stage === 'ready_to_invoice').length;
  const hasActiveFilter = !!(projectFilter || vendorFilter || engagementFilter || invoiceTypeFilter);

  const projectFilterLabel = projectFilter && projects?.length
    ? projects.find((x) => x.id === projectFilter)?.name ?? null
    : null;
  const vendorFilterLabel = vendorFilter && vendors?.length
    ? vendors.find((x) => x.id === vendorFilter)?.name ?? null
    : null;

  return (
    <div className="space-y-4">
      {!hasActiveFilter && readyToInvoiceCount > 0 && (
        <NextStepBanner
          message={`${readyToInvoiceCount} fulfilled requirement${readyToInvoiceCount !== 1 ? 's' : ''} ready to invoice.`}
          ctaLabel="Create invoice"
          href="/billing?new=1"
        />
      )}
      {!hasActiveFilter && pendingCollectTotal > 0 && (
        <NextStepBanner
          message={`${formatMoney(pendingCollectTotal)} pending collection.`}
          ctaLabel="Settle now"
          href="/settlement"
        />
      )}
      <BillingView
        initialPipeline={pipeline}
        initialInvoices={invoices}
        paymentsByInvoiceId={paymentsByInvoiceId}
        projectOptions={
          projects?.map((p) => ({
            value: p.id,
            label: p.name,
            engagement_type: (p.engagement_type as 'one_time' | 'monthly') ?? 'one_time',
          })) ?? []
        }
        vendorOptions={vendors?.map((v) => ({ value: v.id, label: v.name })) ?? []}
        initialOpenInvoiceId={openId ?? null}
        initialCreateOpen={openCreatePanel}
        projectFilter={projectFilter ?? null}
        projectFilterLabel={projectFilterLabel}
        vendorFilter={vendorFilter ?? null}
        vendorFilterLabel={vendorFilterLabel}
        engagementFilter={engagementFilter ?? null}
        invoiceTypeFilter={invoiceTypeFilter ?? null}
        showCancelled={showCancelled}
        currentBillingMonth={month}
      />
    </div>
  );
}
