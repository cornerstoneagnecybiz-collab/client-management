import Link from 'next/link';
import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { Button } from '@/components/ui/button';
import { ProjectTabs } from './project-tabs';
import { ArrowLeft } from 'lucide-react';
import { plannedProfit } from '@/types';
import type { ProjectStatus } from '@/types';
import type { InvoiceRow, PaymentRow } from '@/app/(dashboard)/finance/page';
import type { LedgerEntryRow } from '@/app/(dashboard)/ledger/page';
import type { ActivityItem } from './project-activity-tab';
import { projectNameFromRelation, relationNameFromRelation } from '@/lib/utils';

const STATUS_LABELS: Record<ProjectStatus, string> = {
  draft: 'Draft',
  active: 'Active',
  on_hold: 'On hold',
  completed: 'Completed',
  cancelled: 'Cancelled',
};

export default async function ProjectDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ addRequirement?: string }>;
}) {
  const { id } = await params;
  const { addRequirement: addRequirementParam } = await searchParams;
  const showAddRequirementCta = addRequirementParam === '1';
  const supabase = await createClient();
  const { data: project, error } = await supabase
    .from('projects')
    .select('id, name, status, engagement_type, start_date, end_date, created_at, clients(id, name)')
    .eq('id', id)
    .single();

  if (error || !project) notFound();

  const rawClient = project.clients as unknown as { id?: string; name?: string } | { id?: string; name?: string }[] | null;
  const client = rawClient == null ? null : Array.isArray(rawClient) ? rawClient[0] : rawClient;
  const clientName = client?.name ?? '—';

  const { data: reqRows } = await supabase
    .from('requirements')
    .select(`
      id, project_id, service_catalog_id, title, description, delivery,
      assigned_vendor_id, client_price, expected_vendor_cost, quantity, period_days, unit_rate,
      fulfilment_status, created_at,
      service_catalog(service_name, service_code),
      vendors(name)
    `)
    .eq('project_id', id)
    .order('created_at', { ascending: false });

  const engagementType = (project.engagement_type as 'one_time' | 'monthly') ?? 'one_time';
  const projectRequirements = (reqRows ?? []).map((r) => ({
    id: r.id,
    project_id: r.project_id,
    project_name: project.name,
    engagement_type: engagementType,
    service_catalog_id: r.service_catalog_id,
    service_name: (() => {
      const c = r.service_catalog as unknown as { service_name?: string; service_code?: string } | { service_name?: string; service_code?: string }[] | null;
      const cat = c == null ? null : Array.isArray(c) ? c[0] : c;
      return cat?.service_name ?? '—';
    })(),
    service_code: (() => {
      const c = r.service_catalog as unknown as { service_name?: string; service_code?: string } | { service_name?: string; service_code?: string }[] | null;
      const cat = c == null ? null : Array.isArray(c) ? c[0] : c;
      return cat?.service_code ?? '';
    })(),
    title: r.title,
    description: r.description,
    delivery: (r.delivery as string) || 'vendor',
    assigned_vendor_id: r.assigned_vendor_id,
    vendor_name: (() => { const n = relationNameFromRelation(r.vendors, ''); return n === '' ? null : n; })(),
    client_price: r.client_price,
    expected_vendor_cost: r.expected_vendor_cost,
    quantity: r.quantity != null ? Number(r.quantity) : null,
    period_days: r.period_days != null ? Number(r.period_days) : null,
    unit_rate: r.unit_rate != null ? Number(r.unit_rate) : null,
    fulfilment_status: r.fulfilment_status,
    created_at: r.created_at,
  }));

  const { data: invRows } = await supabase
    .from('invoices')
    .select('id, project_id, type, amount, status, issue_date, due_date, billing_month, created_at')
    .eq('project_id', id)
    .order('created_at', { ascending: false });

  const projectInvoices: InvoiceRow[] = (invRows ?? []).map((r) => ({
    id: r.id,
    project_id: r.project_id,
    project_name: project.name,
    type: r.type as InvoiceRow['type'],
    amount: r.amount,
    status: r.status as InvoiceRow['status'],
    issue_date: r.issue_date,
    due_date: r.due_date,
    billing_month: r.billing_month ?? null,
    created_at: r.created_at,
  }));

  let projectPaymentsByInvoiceId: Record<string, PaymentRow[]> = {};
  if (projectInvoices.length > 0) {
    const { data: paymentRows } = await supabase
      .from('payments_received')
      .select('id, invoice_id, amount, date, mode')
      .in('invoice_id', projectInvoices.map((i) => i.id));
    for (const p of paymentRows ?? []) {
      const row = { id: p.id, invoice_id: p.invoice_id, amount: p.amount, date: p.date, mode: p.mode };
      if (!projectPaymentsByInvoiceId[p.invoice_id]) projectPaymentsByInvoiceId[p.invoice_id] = [];
      projectPaymentsByInvoiceId[p.invoice_id].push(row);
    }
  }

  const { data: ledgerRows } = await supabase
    .from('ledger_entries')
    .select('id, project_id, type, amount, date, reference_id, created_at, projects(name)')
    .eq('project_id', id)
    .order('date', { ascending: false })
    .order('created_at', { ascending: false });

  const projectLedgerEntries: LedgerEntryRow[] = (ledgerRows ?? []).map((r) => ({
    id: r.id,
    project_id: r.project_id,
    project_name: projectNameFromRelation(r.projects, project.name),
    type: r.type as LedgerEntryRow['type'],
    amount: r.amount,
    date: r.date,
    reference_id: r.reference_id,
    created_at: r.created_at,
  }));

  const plannedProfitTotal = projectRequirements.reduce((sum, r) => {
    const p = plannedProfit(r.client_price, r.expected_vendor_cost);
    return sum + (p ?? 0);
  }, 0);
  const ledgerClientPayments = projectLedgerEntries.filter((e) => e.type === 'client_payment').reduce((s, e) => s + e.amount, 0);
  const ledgerVendorPaid = projectLedgerEntries.filter((e) => e.type === 'vendor_payment').reduce((s, e) => s + e.amount, 0);
  const actualProfitTotal = ledgerClientPayments - ledgerVendorPaid;

  // Activity feed: requirements, invoices, payments, vendor payouts
  const requirementIds = projectRequirements.map((r) => r.id);
  let projectPayouts: { id: string; requirement_id: string; amount: number; paid_date: string | null; created_at: string }[] = [];
  if (requirementIds.length > 0) {
    const { data: payoutRows } = await supabase
      .from('vendor_payouts')
      .select('id, requirement_id, amount, paid_date, created_at')
      .in('requirement_id', requirementIds);
    projectPayouts = (payoutRows ?? []).map((r) => ({
      id: r.id,
      requirement_id: r.requirement_id,
      amount: r.amount,
      paid_date: r.paid_date,
      created_at: r.created_at,
    }));
  }

  const activityItems: ActivityItem[] = [];
  for (const r of projectRequirements) {
    const qtyPeriod =
      r.engagement_type === 'one_time' && (r.quantity != null || r.period_days != null)
        ? ' · ' +
          [r.quantity != null && r.quantity > 0 ? `Qty ${r.quantity}` : null, r.period_days != null && r.period_days > 0 ? `${r.period_days} days` : null]
            .filter(Boolean)
            .join(' × ')
        : '';
    activityItems.push({
      id: `req-${r.id}`,
      date: r.created_at,
      type: 'requirement_created',
      label: `Requirement added: ${r.service_name}${r.title && r.title !== r.service_name ? ` — ${r.title}` : ''}${qtyPeriod}`,
      href: `/requirements?id=${r.id}`,
    });
  }
  for (const inv of projectInvoices) {
    activityItems.push({
      id: `inv-${inv.id}`,
      date: inv.created_at,
      type: 'invoice_created',
      label: `Invoice created (${inv.status}): ${inv.type}`,
      href: `/finance?id=${inv.id}`,
      amount: inv.amount,
    });
    if (inv.status === 'issued' && inv.issue_date) {
      activityItems.push({
        id: `inv-issued-${inv.id}`,
        date: inv.issue_date,
        type: 'invoice_issued',
        label: `Invoice issued: ${inv.type}`,
        href: `/finance?id=${inv.id}`,
        amount: inv.amount,
      });
    }
  }
  for (const inv of projectInvoices) {
    const payments = projectPaymentsByInvoiceId[inv.id] ?? [];
    for (const p of payments) {
      activityItems.push({
        id: `pay-${p.id}`,
        date: p.date,
        type: 'payment_received',
        label: 'Payment received',
        href: `/finance?id=${inv.id}`,
        amount: p.amount,
      });
    }
  }
  for (const po of projectPayouts) {
    activityItems.push({
      id: `payout-${po.id}`,
      date: po.created_at,
      type: 'payout_recorded',
      label: 'Vendor payout recorded',
      href: '/finance',
      amount: po.amount,
    });
    if (po.paid_date) {
      activityItems.push({
        id: `payout-paid-${po.id}`,
        date: po.paid_date,
        type: 'payout_paid',
        label: 'Vendor payout paid',
        href: '/finance',
        amount: po.amount,
      });
    }
  }
  activityItems.sort((a, b) => {
    const d = b.date.localeCompare(a.date);
    if (d !== 0) return d;
    return a.id.localeCompare(b.id);
  });

  const { data: notesRows } = await supabase
    .from('project_notes')
    .select('id, project_id, content, created_by, created_at, updated_at')
    .eq('project_id', id)
    .order('created_at', { ascending: false });

  const projectNotes = (notesRows ?? []).map((n) => ({
    id: n.id,
    project_id: n.project_id,
    content: n.content,
    created_by: n.created_by,
    created_at: n.created_at,
    updated_at: n.updated_at,
  }));

  const { data: docsRows } = await supabase
    .from('project_documents')
    .select('id, project_id, title, doc_type, content_json, created_at, updated_at')
    .eq('project_id', id)
    .order('updated_at', { ascending: false });

  const projectDocuments = (docsRows ?? []).map((d) => ({
    id: d.id,
    project_id: d.project_id,
    title: d.title,
    doc_type: d.doc_type as 'text' | 'sheet',
    content_json: d.content_json,
    created_at: d.created_at,
    updated_at: d.updated_at,
  }));

  const projectVendors = Array.from(
    new Map(
      projectRequirements
        .filter((r) => r.assigned_vendor_id && r.vendor_name)
        .map((r) => [r.assigned_vendor_id!, { id: r.assigned_vendor_id!, name: r.vendor_name! }])
    ).values()
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/projects" aria-label="Back to projects">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div className="min-w-0 flex-1">
          <h1 className="text-2xl font-semibold tracking-tight truncate">{project.name}</h1>
          <p className="text-muted-foreground text-sm mt-0.5">
            {clientName}
            {' · '}
            {project.engagement_type === 'monthly' ? 'Monthly retainer' : 'One-time project'}
            {' · '}
            {STATUS_LABELS[project.status as ProjectStatus]}
          </p>
        </div>
      </div>

      {showAddRequirementCta && (
        <Link
          href={`/requirements?project=${id}&new=1`}
          className="block rounded-xl border border-primary/20 bg-primary/5 p-4 text-center text-sm font-medium text-primary transition-colors hover:bg-primary/10"
        >
          Add your first requirement for this project →
        </Link>
      )}

      <ProjectTabs
        projectId={project.id}
        projectName={project.name}
        overview={{
          clientName,
          engagementType: (project.engagement_type as 'one_time' | 'monthly') ?? 'one_time',
          status: project.status as ProjectStatus,
          startDate: project.start_date,
          endDate: project.end_date,
          createdAt: project.created_at,
          plannedProfit: projectRequirements.length > 0 ? plannedProfitTotal : null,
          actualProfit: projectLedgerEntries.length > 0 ? actualProfitTotal : null,
        }}
        projectRequirements={projectRequirements}
        projectInvoices={projectInvoices}
        projectPaymentsByInvoiceId={projectPaymentsByInvoiceId}
        projectLedgerEntries={projectLedgerEntries}
        projectActivity={activityItems}
        projectNotes={projectNotes}
        projectDocuments={projectDocuments}
        projectVendors={projectVendors}
      />
    </div>
  );
}
