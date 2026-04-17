// src/app/(dashboard)/dashboard/_lib/queries.ts
import { createClient } from '@/lib/supabase/server';
import {
  bucketLedgerByWeek,
  buildCollectItems,
  buildFulfilItems,
  buildFunnel,
  buildPayItems,
  buildRecentActivity,
  computeAging,
  computeMtd,
  computeNextStep,
  computePendingCash,
  computePortfolioVariance,
  outstandingByInvoice,
  type InvoiceDisplayName,
  type PayoutDisplayName,
  type RequirementDisplayName,
} from './calc';
import type { DashboardData } from './types';
import type {
  Invoice,
  LedgerEntry,
  PaymentReceived,
  Project,
  Requirement,
  VendorPayout,
} from '@/types/database';

interface InvoiceWithProject extends Invoice {
  projects:
    | { name: string; clients: { name: string } | { name: string }[] | null }
    | { name: string; clients: { name: string } | { name: string }[] | null }[]
    | null;
}
interface PayoutWithRelations extends VendorPayout {
  vendors: { name: string } | { name: string }[] | null;
  requirements:
    | { project_id: string; projects: { name: string } | { name: string }[] | null }
    | { project_id: string; projects: { name: string } | { name: string }[] | null }[]
    | null;
}
interface RequirementWithRelations extends Requirement {
  projects: { name: string } | { name: string }[] | null;
  vendors: { name: string } | { name: string }[] | null;
}
interface LedgerWithProject extends LedgerEntry {
  projects: { name: string } | { name: string }[] | null;
}

function flatName(rel: unknown): string {
  if (!rel) return '—';
  const r = rel as { name?: string } | { name?: string }[];
  return (Array.isArray(r) ? r[0]?.name : r?.name) ?? '—';
}
function flatClientFromInvoice(rel: unknown): string {
  if (!rel) return '—';
  const r = rel as { clients?: unknown } | { clients?: unknown }[];
  const projObj = Array.isArray(r) ? r[0] : r;
  return flatName(projObj?.clients);
}

export async function fetchDashboardData(now: Date = new Date()): Promise<DashboardData> {
  const supabase = await createClient();
  const windowStart = (() => {
    const d = new Date(now);
    d.setUTCDate(d.getUTCDate() - 100); // 13 weeks + buffer
    return d.toISOString().slice(0, 10);
  })();

  // Two ledger reads:
  //   - `ledgerRes` (windowed): feeds the 13-week chart and MTD KPIs.
  //   - `activeLedgerRes` (full history, scoped to active projects): feeds
  //     `computePortfolioVariance` so variance reflects lifetime actuals, not
  //     whatever happens to fall inside the chart window.
  const [
    clientsCountRes,
    vendorsCountRes,
    projectsRes,
    requirementsRes,
    ledgerRes,
    invoicesRes,
    paymentsRes,
    payoutsRes,
  ] = await Promise.all([
    supabase.from('clients').select('id', { count: 'exact', head: true }),
    supabase.from('vendors').select('id', { count: 'exact', head: true }),
    supabase.from('projects').select('*'),
    supabase.from('requirements').select('*, projects(name), vendors:assigned_vendor_id(name)'),
    supabase.from('ledger_entries').select('*, projects(name)').gte('date', windowStart),
    supabase.from('invoices').select('*, projects(name, clients(name))'),
    supabase.from('payments_received').select('*'),
    supabase.from('vendor_payouts').select('*, vendors(name), requirements(project_id, projects(name))'),
  ]);

  const projects: Project[] = projectsRes.data ?? [];
  const requirements: RequirementWithRelations[] =
    (requirementsRes.data as RequirementWithRelations[]) ?? [];
  const ledger: LedgerWithProject[] = (ledgerRes.data as LedgerWithProject[]) ?? [];
  const invoices: InvoiceWithProject[] = (invoicesRes.data as InvoiceWithProject[]) ?? [];
  const payments: PaymentReceived[] = paymentsRes.data ?? [];
  const payouts: PayoutWithRelations[] = (payoutsRes.data as PayoutWithRelations[]) ?? [];

  const activeProjectIds = projects.filter((p) => p.status === 'active').map((p) => p.id);
  const activeLedgerRes = activeProjectIds.length
    ? await supabase
        .from('ledger_entries')
        .select('project_id, type, amount, date')
        .in('project_id', activeProjectIds)
    : { data: [] as Pick<LedgerEntry, 'project_id' | 'type' | 'amount' | 'date'>[] };
  const activeLedger = (activeLedgerRes.data ?? []) as Pick<
    LedgerEntry,
    'project_id' | 'type' | 'amount' | 'date'
  >[];

  // --- Display-name maps (keep join-flattening in the repository layer) ---
  const invoiceNames = new Map<string, InvoiceDisplayName>(
    invoices.map((i) => [
      i.id,
      { clientName: flatClientFromInvoice(i.projects), projectName: flatName(i.projects) },
    ]),
  );
  const payoutNames = new Map<string, PayoutDisplayName>(
    payouts.map((p) => {
      const reqObj = Array.isArray(p.requirements) ? p.requirements[0] : p.requirements;
      return [
        p.id,
        { vendorName: flatName(p.vendors), projectName: flatName(reqObj?.projects) },
      ];
    }),
  );
  const requirementNames = new Map<string, RequirementDisplayName>(
    requirements.map((r) => {
      const vendorName = flatName(r.vendors);
      return [
        r.id,
        { projectName: flatName(r.projects), vendorName: vendorName === '—' ? null : vendorName },
      ];
    }),
  );
  const projectNames = new Map<string, string>(
    ledger.map((e) => [e.project_id, flatName(e.projects)] as const),
  );

  const clients = clientsCountRes.count ?? 0;
  const vendors = vendorsCountRes.count ?? 0;

  const nextStep = computeNextStep({
    clients,
    projects: projects.length,
    requirements: requirements.length,
  });

  const weeks = bucketLedgerByWeek(ledger, now);
  const mtd = computeMtd(ledger, now);
  const pendingCash = computePendingCash(invoices, payments, payouts);
  const outstanding = outstandingByInvoice(invoices, payments);
  const aging = computeAging(
    invoices,
    payments,
    invoices.map((i) => ({ id: i.id, clientName: flatClientFromInvoice(i.projects) })),
    now,
  );
  const variance = computePortfolioVariance(projects, requirements, activeLedger);

  const funnel = buildFunnel({
    clients,
    vendors,
    projects: projects.length,
    requirements: requirements.length,
    openRequirements: requirements.filter(
      (r) => r.fulfilment_status === 'pending' || r.fulfilment_status === 'in_progress',
    ).length,
    // Count real outstanding cash, not just invoice status — a paid-but-not-
    // status-flipped invoice shouldn't be flagged as a bottleneck.
    unpaidInvoices: outstanding.size,
    pendingPayouts: payouts.filter((p) => p.status === 'pending').length,
  });

  const collectAll = buildCollectItems(invoices, payments, invoiceNames, now);
  const payAll = buildPayItems(payouts, payoutNames);
  const fulfilAll = buildFulfilItems(requirements, requirementNames, now);
  const recentActivity = buildRecentActivity(ledger, projectNames, 4);

  const pendingPayTotal = payAll.reduce((s, i) => s + i.payout.amount, 0);

  return {
    nextStep,
    weeks,
    mtdRevenue: mtd.revenue,
    mtdProfit: mtd.profit,
    pendingCash,
    collect: collectAll.slice(0, 5),
    pay: payAll.slice(0, 5),
    fulfil: fulfilAll.slice(0, 5),
    collectTotalCount: collectAll.length,
    payTotalCount: payAll.length,
    fulfilTotalCount: fulfilAll.length,
    funnel,
    aging,
    pendingPayoutsTop: payAll.slice(0, 3),
    pendingPayTotal,
    recentActivity,
    variance,
  };
}
