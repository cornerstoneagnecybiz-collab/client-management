// src/app/(dashboard)/dashboard/_lib/queries.ts
import { createClient } from '@/lib/supabase/server';
import {
  bucketLedgerByWeek,
  buildFunnel,
  computeAging,
  computeMtd,
  computeNextStep,
  computePendingCash,
  computePortfolioVariance,
} from './calc';
import type { DashboardData, ActivityItem, CollectItem, FulfilItem, PayItem } from './types';
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
function daysBetweenIso(fromIso: string | null, now: Date): number | null {
  if (!fromIso) return null;
  const from = new Date(`${fromIso}T00:00:00Z`).getTime();
  const n = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  return Math.floor((n - from) / 86_400_000);
}

export async function fetchDashboardData(now: Date = new Date()): Promise<DashboardData> {
  const supabase = await createClient();
  const windowStart = (() => {
    const d = new Date(now);
    d.setUTCDate(d.getUTCDate() - 100); // 13 weeks + buffer
    return d.toISOString().slice(0, 10);
  })();

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
  const aging = computeAging(
    invoices,
    payments,
    invoices.map((i) => ({ id: i.id, clientName: flatClientFromInvoice(i.projects) })),
    now,
  );
  const variance = computePortfolioVariance(projects, requirements, ledger);
  const funnel = buildFunnel({
    clients,
    vendors,
    projects: projects.length,
    requirements: requirements.length,
    openRequirements: requirements.filter(
      (r) => r.fulfilment_status === 'pending' || r.fulfilment_status === 'in_progress',
    ).length,
    unpaidInvoices: Array.from(
      new Set(
        invoices
          .filter((i) => i.status === 'issued' || i.status === 'overdue')
          .map((i) => i.id),
      ),
    ).length,
    pendingPayouts: payouts.filter((p) => p.status === 'pending').length,
  });

  const paidByInvoice = new Map<string, number>();
  for (const p of payments)
    paidByInvoice.set(p.invoice_id, (paidByInvoice.get(p.invoice_id) ?? 0) + p.amount);
  const outstandingInvoices = invoices.filter((i) => {
    if (i.status !== 'issued' && i.status !== 'overdue') return false;
    const paid = paidByInvoice.get(i.id) ?? 0;
    return i.amount - paid > 0;
  });
  const collectAll: CollectItem[] = outstandingInvoices
    .map((i) => ({
      invoice: i,
      clientName: flatClientFromInvoice(i.projects),
      projectName: flatName(i.projects),
      amountDue: i.amount - (paidByInvoice.get(i.id) ?? 0),
      daysOverdue:
        i.due_date && daysBetweenIso(i.due_date, now)! > 0 ? daysBetweenIso(i.due_date, now) : null,
      daysUntilDue:
        i.due_date && daysBetweenIso(i.due_date, now)! <= 0
          ? -(daysBetweenIso(i.due_date, now) ?? 0)
          : null,
    }))
    .sort(
      (a, b) => (b.daysOverdue ?? -1) - (a.daysOverdue ?? -1) || b.amountDue - a.amountDue,
    );
  const collect = collectAll.slice(0, 5);

  const payAll: PayItem[] = payouts
    .filter((p) => p.status === 'pending')
    .map((p) => {
      const reqObj = Array.isArray(p.requirements) ? p.requirements[0] : p.requirements;
      return {
        payout: p,
        vendorName: flatName(p.vendors),
        projectName: flatName(reqObj?.projects),
        daysUntilDue: null,
        daysOverdue: null,
      };
    })
    .sort((a, b) => b.payout.amount - a.payout.amount);
  const pay = payAll.slice(0, 5);
  const pendingPayoutsTop = payAll.slice(0, 3);

  const fulfilAll: FulfilItem[] = requirements
    .filter((r) => r.fulfilment_status === 'pending' || r.fulfilment_status === 'in_progress')
    .map((r) => ({
      requirement: r,
      projectName: flatName(r.projects),
      vendorName: flatName(r.vendors) === '—' ? null : flatName(r.vendors),
      daysOpen: daysBetweenIso(r.created_at.slice(0, 10), now) ?? 0,
    }))
    .sort((a, b) => b.daysOpen - a.daysOpen);
  const fulfil = fulfilAll.slice(0, 5);

  const recentSorted = [...ledger]
    .sort((a, b) => b.date.localeCompare(a.date) || b.created_at.localeCompare(a.created_at))
    .slice(0, 4);
  const recentActivity: ActivityItem[] = recentSorted.map((e) => ({
    id: e.id,
    type: e.type,
    amount: e.amount,
    projectName: flatName(e.projects),
    at: e.created_at,
  }));

  return {
    nextStep,
    weeks,
    mtdRevenue: mtd.revenue,
    mtdProfit: mtd.profit,
    pendingCash,
    collect,
    pay,
    fulfil,
    collectTotalCount: collectAll.length,
    payTotalCount: payAll.length,
    fulfilTotalCount: fulfilAll.length,
    funnel,
    aging,
    pendingPayoutsTop,
    recentActivity,
    variance,
  };
}
