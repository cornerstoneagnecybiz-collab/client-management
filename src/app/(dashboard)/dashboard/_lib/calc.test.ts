// src/app/(dashboard)/dashboard/_lib/calc.test.ts
import { describe, it, expect } from 'vitest';
import { bucketLedgerByWeek, computeMtd } from './calc';
import type { LedgerEntry } from '@/types/database';

function entry(partial: Partial<LedgerEntry>): LedgerEntry {
  return {
    id: partial.id ?? crypto.randomUUID(),
    project_id: partial.project_id ?? 'p1',
    type: partial.type ?? 'client_payment',
    amount: partial.amount ?? 0,
    reference_id: null,
    date: partial.date!,
    created_at: partial.created_at ?? partial.date!,
  };
}

describe('bucketLedgerByWeek', () => {
  const today = new Date('2026-04-17T12:00:00Z'); // Friday

  it('returns 13 buckets ending with the current ISO week', () => {
    const out = bucketLedgerByWeek([], today);
    expect(out).toHaveLength(13);
    expect(out[12].weekStart).toBe('2026-04-13'); // Monday of current week
    expect(out[0].weekStart).toBe('2026-01-19'); // 12 weeks earlier
  });

  it('sums client_payment into moneyIn and vendor_payment into moneyOut', () => {
    const rows: LedgerEntry[] = [
      entry({ type: 'client_payment', amount: 1000, date: '2026-04-14' }),
      entry({ type: 'client_payment', amount: 500, date: '2026-04-15' }),
      entry({ type: 'vendor_payment', amount: 300, date: '2026-04-16' }),
    ];
    const out = bucketLedgerByWeek(rows, today);
    const current = out[12];
    expect(current.moneyIn).toBe(1500);
    expect(current.moneyOut).toBe(300);
    expect(current.profit).toBe(1200);
  });

  it('ignores entry types other than client_payment / vendor_payment', () => {
    const rows: LedgerEntry[] = [
      entry({ type: 'client_invoice', amount: 9000, date: '2026-04-14' }),
      entry({ type: 'vendor_expected_cost', amount: 9000, date: '2026-04-14' }),
    ];
    const out = bucketLedgerByWeek(rows, today);
    expect(out[12].moneyIn).toBe(0);
    expect(out[12].moneyOut).toBe(0);
  });

  it('drops entries outside the 13-week window', () => {
    const rows: LedgerEntry[] = [
      entry({ type: 'client_payment', amount: 999, date: '2025-12-01' }),
    ];
    const out = bucketLedgerByWeek(rows, today);
    const totalIn = out.reduce((s, w) => s + w.moneyIn, 0);
    expect(totalIn).toBe(0);
  });

  it('places an entry on Sunday into the week that ends on that Sunday', () => {
    // Sunday 2026-04-12 belongs to the ISO week that starts Mon 2026-04-06
    const rows: LedgerEntry[] = [
      entry({ type: 'client_payment', amount: 700, date: '2026-04-12' }),
    ];
    const out = bucketLedgerByWeek(rows, today);
    const w = out.find((w) => w.weekStart === '2026-04-06');
    expect(w?.moneyIn).toBe(700);
  });
});

describe('computeMtd', () => {
  const today = new Date('2026-04-17T12:00:00Z'); // day-of-month 17

  it('returns zero value and null delta when ledger is empty', () => {
    const out = computeMtd([], today);
    expect(out.revenue.value).toBe(0);
    expect(out.revenue.deltaPct).toBeNull();
    expect(out.profit.value).toBe(0);
    expect(out.profit.deltaPct).toBeNull();
    expect(out.revenue.sparkline).toHaveLength(17); // day 1..17
  });

  it('sums client_payment for MTD revenue, current month only', () => {
    const rows: LedgerEntry[] = [
      entry({ type: 'client_payment', amount: 1000, date: '2026-04-01' }),
      entry({ type: 'client_payment', amount: 500,  date: '2026-04-16' }),
      entry({ type: 'client_payment', amount: 9999, date: '2026-03-30' }),
    ];
    const out = computeMtd(rows, today);
    expect(out.revenue.value).toBe(1500);
  });

  it('computes MTD profit as client_payment minus vendor_payment current month', () => {
    const rows: LedgerEntry[] = [
      entry({ type: 'client_payment', amount: 1000, date: '2026-04-10' }),
      entry({ type: 'vendor_payment', amount: 300,  date: '2026-04-12' }),
    ];
    const out = computeMtd(rows, today);
    expect(out.profit.value).toBe(700);
  });

  it('deltaPct compares MTD-through-today vs same day-of-month previous month', () => {
    const rows: LedgerEntry[] = [
      // Current month: ₹2000 through day 17
      entry({ type: 'client_payment', amount: 2000, date: '2026-04-10' }),
      // Prior month: ₹1000 through day 17 of March
      entry({ type: 'client_payment', amount: 1000, date: '2026-03-10' }),
      // Noise past day-17 of March should be ignored
      entry({ type: 'client_payment', amount: 5000, date: '2026-03-25' }),
    ];
    const out = computeMtd(rows, today);
    expect(out.revenue.deltaPct).toBeCloseTo(100, 5); // (2000-1000)/1000 * 100
  });

  it('sparkline accumulates day-by-day for the month', () => {
    const rows: LedgerEntry[] = [
      entry({ type: 'client_payment', amount: 100, date: '2026-04-01' }),
      entry({ type: 'client_payment', amount: 50,  date: '2026-04-03' }),
    ];
    const out = computeMtd(rows, today);
    expect(out.revenue.sparkline[0]).toBe(100);
    expect(out.revenue.sparkline[1]).toBe(100);
    expect(out.revenue.sparkline[2]).toBe(150);
    expect(out.revenue.sparkline.at(-1)).toBe(150);
  });
});
