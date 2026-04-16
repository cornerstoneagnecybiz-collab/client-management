// src/app/(dashboard)/dashboard/_lib/calc.ts
import type { LedgerEntry } from '@/types/database';
import type { WeekBucket } from './types';

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
