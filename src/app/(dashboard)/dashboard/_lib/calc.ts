// src/app/(dashboard)/dashboard/_lib/calc.ts
import type { LedgerEntry } from '@/types/database';
import type { KpiValue, WeekBucket } from './types';

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
