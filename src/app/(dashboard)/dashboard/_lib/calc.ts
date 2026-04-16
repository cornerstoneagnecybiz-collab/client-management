// src/app/(dashboard)/dashboard/_lib/calc.ts
import type { Invoice, LedgerEntry, PaymentReceived, Project, Requirement, VendorPayout } from '@/types/database';
import type { AgingBuckets, FunnelStage, KpiValue, NextStep, PendingCash, VariancePortfolio, WeekBucket } from './types';

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

function outstandingByInvoice(invoices: Invoice[], payments: PaymentReceived[]): Map<string, number> {
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
  /** Reserved for future use (invoice-client join); kept for API stability. */
  _clientNameByInvoiceId: Array<{ id: string; clientName: string }>,
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
    const days = inv.issue_date ? daysBetween(inv.issue_date, now) : 0;
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
    const lookup = _clientNameByInvoiceId.find((x) => x.id === oldest!.inv.id);
    buckets.oldestOpen = {
      invoiceId: oldest.inv.id,
      label: `INV-${oldest.inv.id.slice(0, 8)}`,
      clientName: lookup?.clientName ?? '—',
      daysOld: oldest.days,
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

export function computePortfolioVariance(
  projects: Project[],
  requirements: Requirement[],
  ledger: LedgerEntry[],
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

export function buildFunnel(input: FunnelInput): FunnelStage[] {
  const stages: FunnelStage[] = [
    { step: 1, label: 'Clients',      count: input.clients,          isBottleneck: false, href: '/clients' },
    { step: 2, label: 'Vendors',      count: input.vendors,          isBottleneck: false, href: '/vendors' },
    { step: 3, label: 'Projects',     count: input.projects,         isBottleneck: false, href: '/projects' },
    { step: 4, label: 'Requirements', count: input.requirements,     isBottleneck: false, href: '/requirements' },
    { step: 5, label: 'Fulfilments',  count: input.openRequirements, isBottleneck: false, href: '/fulfilments' },
    { step: 6, label: 'Invoicing',    count: input.unpaidInvoices,   isBottleneck: false, href: '/invoicing' },
    { step: 7, label: 'Settlement',   count: input.pendingPayouts,   isBottleneck: false, href: '/settlement' },
    { step: 8, label: 'Reports',      count: null,                   isBottleneck: false, href: '/reports' },
  ];
  const pendingStages = [stages[4], stages[5], stages[6]];
  const top = pendingStages.reduce<FunnelStage | null>(
    (acc, s) => ((s.count ?? 0) > (acc?.count ?? 0) ? s : acc),
    null,
  );
  if (top && (top.count ?? 0) > 0) top.isBottleneck = true;
  return stages;
}
