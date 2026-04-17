// src/app/(dashboard)/dashboard/_lib/calc.ts
import type { Invoice, LedgerEntry, PaymentReceived, Project, Requirement, VendorPayout } from '@/types/database';
import type {
  ActivityItem,
  AgingBuckets,
  CollectItem,
  FulfilItem,
  FunnelStage,
  KpiValue,
  NextStep,
  PayItem,
  PendingCash,
  VariancePortfolio,
  WeekBucket,
} from './types';

const DAY_MS = 86_400_000;

/** ISO week: Monday is day 1. Returns YYYY-MM-DD of the Monday that starts the week containing `date`. */
export function isoWeekStart(date: Date): string {
  const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const day = d.getUTCDay(); // 0 = Sunday
  const mondayOffset = day === 0 ? -6 : 1 - day;
  d.setUTCDate(d.getUTCDate() + mondayOffset);
  return d.toISOString().slice(0, 10);
}

/** Groups ledger entries into 13 consecutive ISO weeks, oldest first, ending with the week containing `now`. */
export function bucketLedgerByWeek(entries: LedgerEntry[], now: Date): WeekBucket[] {
  const currentWeekStart = isoWeekStart(now);
  const buckets: WeekBucket[] = [];
  for (let i = 12; i >= 0; i--) {
    const ref = new Date(`${currentWeekStart}T00:00:00Z`);
    ref.setUTCDate(ref.getUTCDate() - i * 7);
    buckets.push({
      weekStart: ref.toISOString().slice(0, 10),
      moneyIn: 0,
      moneyOut: 0,
      profit: 0,
    });
  }
  const byKey = new Map(buckets.map((b) => [b.weekStart, b]));
  const earliest = buckets[0].weekStart;
  for (const e of entries) {
    if (e.type !== 'client_payment' && e.type !== 'vendor_payment') continue;
    const entryDate = new Date(`${e.date}T00:00:00Z`);
    const wk = isoWeekStart(entryDate);
    if (wk < earliest) continue;
    const b = byKey.get(wk);
    if (!b) continue;
    if (e.type === 'client_payment') b.moneyIn += e.amount;
    else b.moneyOut += e.amount;
  }
  for (const b of buckets) b.profit = b.moneyIn - b.moneyOut;
  return buckets;
}

export interface MtdResult {
  revenue: KpiValue;
  profit: KpiValue;
}

function monthBounds(date: Date): { start: Date; end: Date; dom: number } {
  const start = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1));
  const end = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0));
  return { start, end, dom: date.getUTCDate() };
}

function prevMonthWindow(date: Date, dom: number): { start: Date; cutoff: Date } {
  const start = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() - 1, 1));
  const lastDayPrev = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 0)).getUTCDate();
  const cappedDom = Math.min(dom, lastDayPrev);
  const cutoff = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), cappedDom, 23, 59, 59));
  return { start, cutoff };
}

function sumInRange(
  entries: LedgerEntry[],
  type: LedgerEntry['type'],
  startIso: string,
  endIso: string,
): number {
  let s = 0;
  for (const e of entries) {
    if (e.type !== type) continue;
    if (e.date < startIso || e.date > endIso) continue;
    s += e.amount;
  }
  return s;
}

function pctDelta(current: number, prior: number): number | null {
  if (prior === 0) return null;
  return ((current - prior) / prior) * 100;
}

function buildSparkline(
  entries: LedgerEntry[],
  monthStart: Date,
  throughDom: number,
  fn: (e: LedgerEntry) => number,
): number[] {
  const out: number[] = [];
  let running = 0;
  for (let d = 1; d <= throughDom; d++) {
    const dayIso = new Date(Date.UTC(monthStart.getUTCFullYear(), monthStart.getUTCMonth(), d))
      .toISOString().slice(0, 10);
    for (const e of entries) {
      if (e.date === dayIso) running += fn(e);
    }
    out.push(running);
  }
  return out;
}

export function computeMtd(entries: LedgerEntry[], now: Date): MtdResult {
  const { start, dom } = monthBounds(now);
  const startIso = start.toISOString().slice(0, 10);
  const todayIso = now.toISOString().slice(0, 10);

  const currentRevenue = sumInRange(entries, 'client_payment', startIso, todayIso);
  const currentVendorPaid = sumInRange(entries, 'vendor_payment', startIso, todayIso);
  const currentProfit = currentRevenue - currentVendorPaid;

  const prev = prevMonthWindow(now, dom);
  const prevStartIso = prev.start.toISOString().slice(0, 10);
  const prevCutoffIso = prev.cutoff.toISOString().slice(0, 10);
  const priorRevenue = sumInRange(entries, 'client_payment', prevStartIso, prevCutoffIso);
  const priorVendorPaid = sumInRange(entries, 'vendor_payment', prevStartIso, prevCutoffIso);
  const priorProfit = priorRevenue - priorVendorPaid;

  const revenueSpark = buildSparkline(entries, start, dom, (e) =>
    e.type === 'client_payment' ? e.amount : 0,
  );
  const profitSpark = buildSparkline(entries, start, dom, (e) => {
    if (e.type === 'client_payment') return e.amount;
    if (e.type === 'vendor_payment') return -e.amount;
    return 0;
  });

  return {
    revenue: { value: currentRevenue, deltaPct: pctDelta(currentRevenue, priorRevenue), sparkline: revenueSpark },
    profit: { value: currentProfit, deltaPct: pctDelta(currentProfit, priorProfit), sparkline: profitSpark },
  };
}

function daysBetween(fromIso: string, now: Date): number {
  const from = new Date(`${fromIso}T00:00:00Z`).getTime();
  const nowMs = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  return Math.floor((nowMs - from) / DAY_MS);
}

/**
 * Returns a Map of `invoiceId -> outstanding INR` for every invoice whose status
 * is 'issued' or 'overdue' AND whose remaining balance is strictly positive.
 * Fully-paid and non-billable invoices are excluded.
 */
export function outstandingByInvoice(
  invoices: Invoice[],
  payments: PaymentReceived[],
): Map<string, number> {
  const paidMap = new Map<string, number>();
  for (const p of payments) {
    paidMap.set(p.invoice_id, (paidMap.get(p.invoice_id) ?? 0) + p.amount);
  }
  const out = new Map<string, number>();
  for (const inv of invoices) {
    if (inv.status !== 'issued' && inv.status !== 'overdue') continue;
    const paid = paidMap.get(inv.id) ?? 0;
    const due = inv.amount - paid;
    if (due > 0) out.set(inv.id, due);
  }
  return out;
}

export function computeAging(
  invoices: Invoice[],
  payments: PaymentReceived[],
  /** `invoiceId -> clientName` for the "oldest open" callout. Missing entries fall back to "—". */
  clientNameByInvoiceId: Array<{ id: string; clientName: string }>,
  now: Date,
): AgingBuckets {
  const outstanding = outstandingByInvoice(invoices, payments);
  const buckets: AgingBuckets = {
    current: { amount: 0, count: 0 },
    stale: { amount: 0, count: 0 },
    overdue: { amount: 0, count: 0 },
    total: 0,
    oldestOpen: null,
  };
  let oldest: { inv: Invoice; days: number } | null = null;
  for (const inv of invoices) {
    const due = outstanding.get(inv.id);
    if (!due) continue;
    // Drop invoices with no issue_date (data hygiene issue) rather than
    // silently treating them as 0 days old — they would skew `oldestOpen`.
    if (!inv.issue_date) continue;
    const days = daysBetween(inv.issue_date, now);
    if (days <= 30) {
      buckets.current.amount += due;
      buckets.current.count += 1;
    } else if (days <= 60) {
      buckets.stale.amount += due;
      buckets.stale.count += 1;
    } else {
      buckets.overdue.amount += due;
      buckets.overdue.count += 1;
    }
    buckets.total += due;
    if (!oldest || days > oldest.days) oldest = { inv, days };
  }
  if (oldest) {
    const { inv, days } = oldest;
    const lookup = clientNameByInvoiceId.find((x) => x.id === inv.id);
    buckets.oldestOpen = {
      invoiceId: inv.id,
      label: `INV-${inv.id.slice(0, 8)}`,
      clientName: lookup?.clientName ?? '—',
      daysOld: days,
    };
  }
  return buckets;
}

export function computePendingCash(
  invoices: Invoice[],
  payments: PaymentReceived[],
  pendingPayouts: VendorPayout[],
): PendingCash {
  const outstanding = outstandingByInvoice(invoices, payments);
  let toCollect = 0;
  for (const v of outstanding.values()) toCollect += v;
  const toPay = pendingPayouts
    .filter((p) => p.status === 'pending')
    .reduce((s, p) => s + p.amount, 0);
  return { toCollect, toPay, net: toCollect - toPay };
}

export function computeNextStep(counts: {
  clients: number;
  projects: number;
  requirements: number;
}): NextStep | null {
  if (counts.clients === 0) return {
    label: 'Add your first client',
    href: '/clients',
    description: 'Clients are the starting point. Then you can create projects for them.',
  };
  if (counts.projects === 0) return {
    label: 'Create a project',
    href: '/projects/new',
    description: 'Link a project to a client to track work and billing.',
  };
  if (counts.requirements === 0) return {
    label: 'Add requirements',
    href: '/requirements',
    description: 'Define scope, assign vendors, and set pricing per project.',
  };
  return null;
}

/**
 * Portfolio variance = (actual - planned) / |planned| * 100, across active projects.
 * `ledger` should cover the full lifetime of the active projects (not just a recent
 * window) so historical client/vendor payments flow into `actual`.
 */
export function computePortfolioVariance(
  projects: Project[],
  requirements: Requirement[],
  ledger: Pick<LedgerEntry, 'project_id' | 'type' | 'amount'>[],
): VariancePortfolio {
  const activeIds = new Set(projects.filter((p) => p.status === 'active').map((p) => p.id));
  if (activeIds.size === 0) return { variancePct: null, favourable: true };

  let planned = 0;
  for (const r of requirements) {
    if (!activeIds.has(r.project_id)) continue;
    if (r.client_price == null || r.expected_vendor_cost == null) continue;
    planned += r.client_price - r.expected_vendor_cost;
  }
  let received = 0;
  let paid = 0;
  for (const e of ledger) {
    if (!activeIds.has(e.project_id)) continue;
    if (e.type === 'client_payment') received += e.amount;
    else if (e.type === 'vendor_payment') paid += e.amount;
  }
  const actual = received - paid;
  if (planned === 0) return { variancePct: null, favourable: actual >= 0 };
  const variancePct = ((actual - planned) / Math.abs(planned)) * 100;
  return { variancePct, favourable: actual >= planned };
}

export interface FunnelInput {
  clients: number;
  vendors: number;
  projects: number;
  requirements: number;
  openRequirements: number;
  unpaidInvoices: number;
  pendingPayouts: number;
}

/**
 * Sidebar pipeline funnel. Returns stages in the same order as the left nav.
 *
 * The original spec describes an 8-stage flow (Fulfilments + Invoicing as
 * separate steps). Those two have since been merged into a single `Billing`
 * step (see `docs/superpowers/specs/2026-04-17-billing-merge-design.md`)
 * because both represent "work that hasn't yet been billed or collected" and
 * were being used as one mental unit in practice. If that merge is ever
 * reverted, add the two stages back here and the header copy in
 * `pipeline-pulse.tsx` will auto-update (it reads `stages.length`).
 */
export function buildFunnel(input: FunnelInput): FunnelStage[] {
  const billingCount = input.openRequirements + input.unpaidInvoices;
  const stages: FunnelStage[] = [
    { step: 1, label: 'Clients',      count: input.clients,          isBottleneck: false, href: '/clients' },
    { step: 2, label: 'Vendors',      count: input.vendors,          isBottleneck: false, href: '/vendors' },
    { step: 3, label: 'Projects',     count: input.projects,         isBottleneck: false, href: '/projects' },
    { step: 4, label: 'Requirements', count: input.requirements,     isBottleneck: false, href: '/requirements' },
    { step: 5, label: 'Billing',      count: billingCount,           isBottleneck: false, href: '/billing' },
    { step: 6, label: 'Settlement',   count: input.pendingPayouts,   isBottleneck: false, href: '/settlement' },
    { step: 7, label: 'Reports',      count: null,                   isBottleneck: false, href: '/reports' },
  ];
  const pendingStages = [stages[4], stages[5]];
  const top = pendingStages.reduce<FunnelStage | null>(
    (acc, s) => ((s.count ?? 0) > (acc?.count ?? 0) ? s : acc),
    null,
  );
  if (top && (top.count ?? 0) > 0) top.isBottleneck = true;
  return stages;
}

export interface InvoiceDisplayName {
  clientName: string;
  projectName: string;
}

export interface PayoutDisplayName {
  vendorName: string;
  projectName: string;
}

export interface RequirementDisplayName {
  projectName: string;
  vendorName: string | null;
}

/**
 * Whole days from `fromIso` (UTC midnight) to `now` (UTC midnight).
 * Positive means `now` is after `fromIso`. Null if `fromIso` is null.
 */
function daysBetweenOrNull(fromIso: string | null, now: Date): number | null {
  if (!fromIso) return null;
  const from = new Date(`${fromIso}T00:00:00Z`).getTime();
  const n = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  return Math.floor((n - from) / DAY_MS);
}

/**
 * Builds the "Collect" queue: outstanding invoices with amount due, overdue
 * status, and display names. Sorted by days-overdue desc, then amount desc.
 */
export function buildCollectItems(
  invoices: Invoice[],
  payments: PaymentReceived[],
  displayNames: Map<string, InvoiceDisplayName>,
  now: Date,
): CollectItem[] {
  const outstanding = outstandingByInvoice(invoices, payments);
  return invoices
    .filter((i) => outstanding.has(i.id))
    .map<CollectItem>((i) => {
      const dueDelta = daysBetweenOrNull(i.due_date, now);
      const names = displayNames.get(i.id);
      return {
        invoice: i,
        clientName: names?.clientName ?? '—',
        projectName: names?.projectName ?? '—',
        amountDue: outstanding.get(i.id) ?? 0,
        daysOverdue: dueDelta != null && dueDelta > 0 ? dueDelta : null,
        daysUntilDue: dueDelta != null && dueDelta <= 0 ? -dueDelta : null,
      };
    })
    .sort(
      (a, b) => (b.daysOverdue ?? -1) - (a.daysOverdue ?? -1) || b.amountDue - a.amountDue,
    );
}

/**
 * Builds the "Pay" queue: pending vendor payouts sorted by amount desc.
 * `VendorPayout` has no due date in the schema today, so overdue cannot be
 * computed — see `docs/superpowers/specs/2026-04-17-dashboard-redesign-design.md`.
 */
export function buildPayItems(
  payouts: VendorPayout[],
  displayNames: Map<string, PayoutDisplayName>,
): PayItem[] {
  return payouts
    .filter((p) => p.status === 'pending')
    .map<PayItem>((p) => {
      const names = displayNames.get(p.id);
      return {
        payout: p,
        vendorName: names?.vendorName ?? '—',
        projectName: names?.projectName ?? '—',
        daysUntilDue: null,
        daysOverdue: null,
      };
    })
    .sort((a, b) => b.payout.amount - a.payout.amount);
}

/**
 * Builds the "Fulfil" queue: open requirements (pending or in_progress),
 * sorted by days open desc.
 */
export function buildFulfilItems(
  requirements: Requirement[],
  displayNames: Map<string, RequirementDisplayName>,
  now: Date,
): FulfilItem[] {
  return requirements
    .filter((r) => r.fulfilment_status === 'pending' || r.fulfilment_status === 'in_progress')
    .map<FulfilItem>((r) => {
      const names = displayNames.get(r.id);
      return {
        requirement: r,
        projectName: names?.projectName ?? '—',
        vendorName: names?.vendorName ?? null,
        daysOpen: daysBetweenOrNull(r.created_at.slice(0, 10), now) ?? 0,
      };
    })
    .sort((a, b) => b.daysOpen - a.daysOpen);
}

/**
 * Returns the most recent N ledger entries, newest first. Sort keys are
 * `date` (YYYY-MM-DD) then `created_at` ISO timestamp as a tiebreaker.
 */
export function buildRecentActivity(
  ledger: LedgerEntry[],
  projectNameById: Map<string, string>,
  limit: number,
): ActivityItem[] {
  return [...ledger]
    .sort((a, b) => b.date.localeCompare(a.date) || b.created_at.localeCompare(a.created_at))
    .slice(0, limit)
    .map<ActivityItem>((e) => ({
      id: e.id,
      type: e.type,
      amount: e.amount,
      projectName: projectNameById.get(e.project_id) ?? '—',
      at: e.created_at,
    }));
}
