# Dashboard Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace `src/app/(dashboard)/page.tsx` with a Cockpit Grid command-center dashboard featuring a 90-day cash-flow combo chart, three MTD KPIs, a tabbed action queue, an 8-step pipeline pulse, invoice aging, pending payouts, and a recent-activity feed.

**Architecture:** Server-Component dashboard split into three layers per `.cursorrules`: thin `page.tsx` orchestrator, `_lib/queries.ts` (Supabase repository calls), `_lib/calc.ts` (pure derivation functions — tested), and a set of focused widget components receiving already-derived DTO props. No schema changes; all data computed from existing tables.

**Tech Stack:** Next.js 15 App Router · React 19 Server Components · Supabase (`@supabase/ssr`, publishable key + RLS) · Tailwind CSS · Lucide icons · Vitest (new; for pure-function tests) · Hand-rolled SVG for the cash-flow chart (no new runtime dep).

**Spec:** [docs/superpowers/specs/2026-04-17-dashboard-redesign-design.md](../specs/2026-04-17-dashboard-redesign-design.md)

---

## File Structure

```
src/app/(dashboard)/
  page.tsx                              MODIFY — thin orchestrator
  loading.tsx                           CREATE — skeleton grid
  dashboard/                            CREATE folder
    _lib/
      types.ts                          CREATE — DashboardData DTO
      queries.ts                        CREATE — fetchDashboardData()
      calc.ts                           CREATE — pure derivation funcs
      calc.test.ts                      CREATE — vitest tests
    kpi-tile.tsx                        CREATE
    kpi-strip.tsx                       CREATE
    cash-flow-chart.tsx                 CREATE
    onboarding-banner.tsx               CREATE
    action-queue.tsx                    CREATE
    pipeline-pulse.tsx                  CREATE
    invoice-aging.tsx                   CREATE
    pending-payouts.tsx                 CREATE
    recent-activity.tsx                 CREATE
    variance-pill.tsx                   CREATE

package.json                            MODIFY — add vitest + test script
vitest.config.ts                        CREATE — vitest config
```

Pattern: `page.tsx` imports `fetchDashboardData` from `_lib/queries.ts`, pipes raw rows through `_lib/calc.ts` to produce a typed `DashboardData` DTO, then hands slices of that DTO to each widget. Widgets never query the DB.

---

## Task 0: Vitest setup

**Files:**
- Create: `vitest.config.ts`
- Modify: `package.json` — add devDeps + `test` script

- [ ] **Step 1: Install vitest as a dev dependency**

```bash
npm install --save-dev vitest@^2 @vitest/coverage-v8@^2
```

Expected: `package.json` devDependencies gains `vitest` and `@vitest/coverage-v8`. No lockfile errors.

- [ ] **Step 2: Create `vitest.config.ts`**

```ts
import { defineConfig } from 'vitest/config';
import { fileURLToPath, URL } from 'node:url';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
    globals: false,
  },
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
});
```

- [ ] **Step 3: Add `test` script to `package.json`**

In `"scripts"`, add:

```json
"test": "vitest run",
"test:watch": "vitest"
```

- [ ] **Step 4: Verify vitest runs (no tests yet)**

Run: `npm test`
Expected: exits 0 with "No test files found" — confirms vitest is wired correctly.

- [ ] **Step 5: Commit**

```bash
git add package.json package-lock.json vitest.config.ts
git commit -m "chore: add vitest for dashboard calc unit tests"
```

---

## Task 1: Scaffold DTO types

**Files:**
- Create: `src/app/(dashboard)/dashboard/_lib/types.ts`

- [ ] **Step 1: Create the DTO types file**

```ts
// src/app/(dashboard)/dashboard/_lib/types.ts
import type { Invoice, LedgerEntry, Requirement, VendorPayout } from '@/types/database';

/** One weekly bucket on the cash-flow chart. */
export interface WeekBucket {
  /** ISO date of the Monday that starts this week (YYYY-MM-DD). */
  weekStart: string;
  moneyIn: number;
  moneyOut: number;
  /** moneyIn - moneyOut */
  profit: number;
}

export interface KpiValue {
  value: number;
  /** % change vs same day-of-month last month; null if prior period has no data. */
  deltaPct: number | null;
  /** Last N points for the sparkline (daily cumulative MTD). */
  sparkline: number[];
}

export interface PendingCash {
  /** Outstanding client receivables (invoice total - payments received). */
  toCollect: number;
  /** Pending vendor payouts total. */
  toPay: number;
  /** toCollect - toPay */
  net: number;
}

export interface CollectItem {
  invoice: Invoice;
  clientName: string;
  projectName: string;
  amountDue: number;
  daysOverdue: number | null;
  daysUntilDue: number | null;
}

export interface PayItem {
  payout: VendorPayout;
  vendorName: string;
  projectName: string;
  daysUntilDue: number | null;
  daysOverdue: number | null;
}

export interface FulfilItem {
  requirement: Requirement;
  projectName: string;
  vendorName: string | null;
  daysOpen: number;
}

export interface FunnelStage {
  step: number;
  label: string;
  count: number | null;
  /** True if this is the detected bottleneck (only among pending/open stages). */
  isBottleneck: boolean;
  href: string;
}

export interface AgingBuckets {
  /** 0-30 day bucket (amount, count) */
  current: { amount: number; count: number };
  /** 31-60 day bucket */
  stale: { amount: number; count: number };
  /** 60+ day bucket */
  overdue: { amount: number; count: number };
  total: number;
  oldestOpen: {
    invoiceId: string;
    label: string;
    clientName: string;
    daysOld: number;
  } | null;
}

export interface ActivityItem {
  id: string;
  type: LedgerEntry['type'];
  amount: number;
  projectName: string;
  at: string;
}

export interface VariancePortfolio {
  /** Σ planned_profit - Σ actual_profit, as percentage of planned. Null if no active projects. */
  variancePct: number | null;
  /** True if actual >= planned (green), false if below (red). */
  favourable: boolean;
}

export interface NextStep {
  label: string;
  href: string;
  description: string;
}

export interface DashboardData {
  /** Null when Clients/Projects/Requirements chain is complete. */
  nextStep: NextStep | null;
  weeks: WeekBucket[]; // 13 buckets, oldest first
  mtdRevenue: KpiValue;
  mtdProfit: KpiValue;
  pendingCash: PendingCash;
  collect: CollectItem[]; // top 5
  pay: PayItem[]; // top 5
  fulfil: FulfilItem[]; // top 5
  collectTotalCount: number;
  payTotalCount: number;
  fulfilTotalCount: number;
  funnel: FunnelStage[]; // 8 stages in sidebar order
  aging: AgingBuckets;
  pendingPayoutsTop: PayItem[]; // top 3 (subset of `pay`)
  recentActivity: ActivityItem[]; // last 4
  variance: VariancePortfolio;
}
```

- [ ] **Step 2: Typecheck passes**

Run: `npx tsc --noEmit`
Expected: exits 0 (file is standalone; no consumers yet).

- [ ] **Step 3: Commit**

```bash
git add src/app/\(dashboard\)/dashboard/_lib/types.ts
git commit -m "feat(dashboard): scaffold DashboardData DTO types"
```

---

## Task 2: Calc — weekly cash-flow bucketing (TDD)

**Files:**
- Create: `src/app/(dashboard)/dashboard/_lib/calc.ts`
- Create: `src/app/(dashboard)/dashboard/_lib/calc.test.ts`

- [ ] **Step 1: Write the failing tests**

```ts
// src/app/(dashboard)/dashboard/_lib/calc.test.ts
import { describe, it, expect } from 'vitest';
import { bucketLedgerByWeek } from './calc';
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
```

- [ ] **Step 2: Run tests — expect failure**

Run: `npm test`
Expected: FAIL — `bucketLedgerByWeek` is not exported from `./calc`.

- [ ] **Step 3: Implement `bucketLedgerByWeek` in `calc.ts`**

```ts
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
```

- [ ] **Step 4: Run tests — expect all passing**

Run: `npm test`
Expected: `bucketLedgerByWeek` — 5 passing.

- [ ] **Step 5: Commit**

```bash
git add src/app/\(dashboard\)/dashboard/_lib/calc.ts src/app/\(dashboard\)/dashboard/_lib/calc.test.ts
git commit -m "feat(dashboard): weekly cash-flow bucketing with tests"
```

---

## Task 3: Calc — MTD aggregates + delta vs prior month (TDD)

**Files:**
- Modify: `src/app/(dashboard)/dashboard/_lib/calc.ts`
- Modify: `src/app/(dashboard)/dashboard/_lib/calc.test.ts`

- [ ] **Step 1: Append failing tests**

Add to the bottom of `calc.test.ts`:

```ts
import { computeMtd } from './calc';

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
```

- [ ] **Step 2: Run tests — expect failure**

Run: `npm test`
Expected: FAIL — `computeMtd` not exported.

- [ ] **Step 3: Implement `computeMtd`**

Append to `calc.ts`:

```ts
import type { KpiValue } from './types';

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
  if (prior === 0) return current === 0 ? 0 : null;
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
```

- [ ] **Step 4: Run tests — expect all passing**

Run: `npm test`
Expected: all tests in `calc.test.ts` pass (both Task 2 and Task 3 describes green).

- [ ] **Step 5: Commit**

```bash
git add src/app/\(dashboard\)/dashboard/_lib/calc.ts src/app/\(dashboard\)/dashboard/_lib/calc.test.ts
git commit -m "feat(dashboard): MTD revenue & profit with prior-month delta"
```

---

## Task 4: Calc — aging buckets, pending cash, next step (TDD)

**Files:**
- Modify: `src/app/(dashboard)/dashboard/_lib/calc.ts`
- Modify: `src/app/(dashboard)/dashboard/_lib/calc.test.ts`

- [ ] **Step 1: Append failing tests**

```ts
import { computeAging, computePendingCash, computeNextStep } from './calc';
import type { Invoice, PaymentReceived, VendorPayout } from '@/types/database';

function invoice(p: Partial<Invoice>): Invoice {
  return {
    id: p.id ?? crypto.randomUUID(),
    project_id: 'p1',
    type: 'project',
    amount: p.amount ?? 1000,
    status: p.status ?? 'issued',
    issue_date: p.issue_date ?? '2026-01-01',
    due_date: p.due_date ?? null,
    billing_month: null,
    created_at: p.created_at ?? p.issue_date ?? '2026-01-01',
    updated_at: p.updated_at ?? p.issue_date ?? '2026-01-01',
  };
}

function payment(invoice_id: string, amount: number): PaymentReceived {
  return { id: crypto.randomUUID(), invoice_id, amount, date: '2026-01-15', mode: null, created_at: '2026-01-15' };
}

describe('computeAging', () => {
  const today = new Date('2026-04-17T12:00:00Z');

  it('returns empty structure when no invoices', () => {
    const out = computeAging([], [], [], today);
    expect(out.total).toBe(0);
    expect(out.oldestOpen).toBeNull();
  });

  it('ignores fully-paid invoices', () => {
    const inv = invoice({ id: 'i1', amount: 500, issue_date: '2026-02-01' });
    const out = computeAging([inv], [payment('i1', 500)], [], today);
    expect(out.total).toBe(0);
  });

  it('buckets outstanding amount by age since issue_date', () => {
    const rows = [
      invoice({ id: 'a', amount: 1000, issue_date: '2026-04-10' }), // 7d -> current
      invoice({ id: 'b', amount: 2000, issue_date: '2026-03-10' }), // 38d -> stale
      invoice({ id: 'c', amount: 3000, issue_date: '2026-01-10' }), // 97d -> overdue
    ];
    const out = computeAging(rows, [], [], today);
    expect(out.current.amount).toBe(1000);
    expect(out.stale.amount).toBe(2000);
    expect(out.overdue.amount).toBe(3000);
    expect(out.total).toBe(6000);
    expect(out.oldestOpen?.invoiceId).toBe('c');
    expect(out.oldestOpen?.daysOld).toBe(97);
  });
});

describe('computePendingCash', () => {
  const today = new Date('2026-04-17T12:00:00Z');
  it('nets outstanding invoices against pending payouts', () => {
    const inv = invoice({ id: 'i1', amount: 1000, issue_date: '2026-04-01' });
    const po: VendorPayout = {
      id: 'po1', requirement_id: 'r1', vendor_id: 'v1', amount: 400, status: 'pending',
      paid_date: null, created_at: '2026-04-01', updated_at: '2026-04-01',
    };
    const out = computePendingCash([inv], [payment('i1', 200)], [po]);
    expect(out.toCollect).toBe(800);
    expect(out.toPay).toBe(400);
    expect(out.net).toBe(400);
  });
});

describe('computeNextStep', () => {
  it('prompts "Add your first client" when there are no clients', () => {
    const out = computeNextStep({ clients: 0, projects: 0, requirements: 0 });
    expect(out?.href).toBe('/clients');
  });
  it('prompts "Create a project" when clients exist but no projects', () => {
    const out = computeNextStep({ clients: 1, projects: 0, requirements: 0 });
    expect(out?.href).toBe('/projects/new');
  });
  it('prompts "Add requirements" when projects exist but no requirements', () => {
    const out = computeNextStep({ clients: 3, projects: 2, requirements: 0 });
    expect(out?.href).toBe('/requirements');
  });
  it('returns null once all three tables are non-empty', () => {
    const out = computeNextStep({ clients: 3, projects: 2, requirements: 5 });
    expect(out).toBeNull();
  });
});
```

- [ ] **Step 2: Run tests — expect failure**

Run: `npm test`
Expected: FAIL — three symbols not exported.

- [ ] **Step 3: Implement the three functions**

Append to `calc.ts`:

```ts
import type { Invoice, PaymentReceived, VendorPayout } from '@/types/database';
import type { AgingBuckets, NextStep, PendingCash } from './types';

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
```

- [ ] **Step 4: Run tests — expect all passing**

Run: `npm test`
Expected: Task 2 + 3 + 4 all green.

- [ ] **Step 5: Commit**

```bash
git add src/app/\(dashboard\)/dashboard/_lib/calc.ts src/app/\(dashboard\)/dashboard/_lib/calc.test.ts
git commit -m "feat(dashboard): invoice aging, pending cash, next-step detection"
```

---

## Task 5: Calc — portfolio variance + funnel bottleneck (TDD)

**Files:**
- Modify: `src/app/(dashboard)/dashboard/_lib/calc.ts`
- Modify: `src/app/(dashboard)/dashboard/_lib/calc.test.ts`

- [ ] **Step 1: Append failing tests**

```ts
import { computePortfolioVariance, buildFunnel } from './calc';
import type { Project, Requirement } from '@/types/database';

function proj(p: Partial<Project>): Project {
  return {
    id: p.id ?? crypto.randomUUID(),
    client_id: 'c1',
    name: p.name ?? 'P',
    status: p.status ?? 'active',
    engagement_type: 'one_time',
    start_date: null, end_date: null,
    created_at: '2026-01-01', updated_at: '2026-01-01',
  };
}

function req(p: Partial<Requirement>): Requirement {
  return {
    id: p.id ?? crypto.randomUUID(),
    project_id: p.project_id ?? 'p1',
    service_name: 'X',
    service_category: null,
    pricing_type: 'fixed',
    title: 'T',
    description: null,
    delivery: 'vendor',
    assigned_vendor_id: null,
    client_price: p.client_price ?? 0,
    expected_vendor_cost: p.expected_vendor_cost ?? 0,
    quantity: null, period_days: null, unit_rate: null, vendor_unit_rate: null,
    fulfilment_status: p.fulfilment_status ?? 'pending',
    created_at: '2026-01-01', updated_at: '2026-01-01',
  };
}

describe('computePortfolioVariance', () => {
  it('returns null variance when no active projects', () => {
    const out = computePortfolioVariance([], [], []);
    expect(out.variancePct).toBeNull();
  });

  it('calculates variance = (actual - planned) / planned * 100 across active projects', () => {
    const projects = [proj({ id: 'p1', status: 'active' })];
    const requirements = [
      req({ project_id: 'p1', client_price: 10000, expected_vendor_cost: 6000 }), // planned = 4000
    ];
    // actual = 3000 (received 9000 - paid 6000)
    const ledger: LedgerEntry[] = [
      entry({ project_id: 'p1', type: 'client_payment', amount: 9000, date: '2026-01-01' }),
      entry({ project_id: 'p1', type: 'vendor_payment', amount: 6000, date: '2026-01-01' }),
    ];
    const out = computePortfolioVariance(projects, requirements, ledger);
    // planned=4000, actual=3000 -> variance -25%
    expect(out.variancePct).toBeCloseTo(-25, 5);
    expect(out.favourable).toBe(false);
  });
});

describe('buildFunnel', () => {
  it('returns 8 stages with counts in sidebar order', () => {
    const out = buildFunnel({
      clients: 3, vendors: 5, projects: 2, requirements: 10,
      openRequirements: 4, unpaidInvoices: 2, pendingPayouts: 1,
    });
    expect(out).toHaveLength(8);
    expect(out.map((s) => s.label)).toEqual([
      'Clients','Vendors','Projects','Requirements','Fulfilments','Invoicing','Settlement','Reports',
    ]);
    expect(out[0].count).toBe(3);
    expect(out[4].count).toBe(4); // Fulfilments = openRequirements
    expect(out[7].count).toBeNull(); // Reports has no count
  });

  it('flags the pending stage with the highest count as bottleneck', () => {
    const out = buildFunnel({
      clients: 50, vendors: 30, projects: 20, requirements: 10,
      openRequirements: 6, unpaidInvoices: 3, pendingPayouts: 1,
    });
    const bottleneck = out.find((s) => s.isBottleneck);
    expect(bottleneck?.label).toBe('Fulfilments');
    // Ensure Clients (biggest total count) is NOT the bottleneck
    expect(out[0].isBottleneck).toBe(false);
  });

  it('no bottleneck flag when all pending stages are zero', () => {
    const out = buildFunnel({
      clients: 1, vendors: 1, projects: 1, requirements: 1,
      openRequirements: 0, unpaidInvoices: 0, pendingPayouts: 0,
    });
    expect(out.every((s) => !s.isBottleneck)).toBe(true);
  });
});
```

- [ ] **Step 2: Run tests — expect failure**

Run: `npm test`
Expected: FAIL — `computePortfolioVariance`, `buildFunnel` not exported.

- [ ] **Step 3: Implement both functions**

Append to `calc.ts`:

```ts
import type { Project, Requirement } from '@/types/database';
import type { FunnelStage, VariancePortfolio } from './types';

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
```

- [ ] **Step 4: Run tests — expect all passing**

Run: `npm test`
Expected: every describe block green.

- [ ] **Step 5: Commit**

```bash
git add src/app/\(dashboard\)/dashboard/_lib/calc.ts src/app/\(dashboard\)/dashboard/_lib/calc.test.ts
git commit -m "feat(dashboard): portfolio variance + pipeline funnel with bottleneck detection"
```

---

## Task 6: Queries — `fetchDashboardData`

**Files:**
- Create: `src/app/(dashboard)/dashboard/_lib/queries.ts`

Not TDD — IO-bound Supabase calls. Verified by running the dev server in Task 15.

- [ ] **Step 1: Create `queries.ts` skeleton**

```ts
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
  Client,
  Invoice,
  LedgerEntry,
  PaymentReceived,
  Project,
  Requirement,
  Vendor,
  VendorPayout,
} from '@/types/database';

interface InvoiceWithProject extends Invoice {
  projects: { name: string; clients: { name: string } | { name: string }[] | null } | { name: string; clients: { name: string } | { name: string }[] | null }[] | null;
}
interface PayoutWithRelations extends VendorPayout {
  vendors: { name: string } | { name: string }[] | null;
  requirements: { project_id: string; projects: { name: string } | { name: string }[] | null } | { project_id: string; projects: { name: string } | { name: string }[] | null }[] | null;
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
```

- [ ] **Step 2: Add the main fetch function**

Append to `queries.ts`:

```ts
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
  const requirements: RequirementWithRelations[] = (requirementsRes.data as RequirementWithRelations[]) ?? [];
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
    openRequirements: requirements.filter((r) => r.fulfilment_status === 'pending' || r.fulfilment_status === 'in_progress').length,
    unpaidInvoices: Array.from(new Set(invoices.filter((i) => i.status === 'issued' || i.status === 'overdue').map((i) => i.id))).length,
    pendingPayouts: payouts.filter((p) => p.status === 'pending').length,
  });

  // Build Collect items
  const paidByInvoice = new Map<string, number>();
  for (const p of payments) paidByInvoice.set(p.invoice_id, (paidByInvoice.get(p.invoice_id) ?? 0) + p.amount);
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
      daysOverdue: i.due_date && daysBetweenIso(i.due_date, now)! > 0 ? daysBetweenIso(i.due_date, now) : null,
      daysUntilDue: i.due_date && daysBetweenIso(i.due_date, now)! <= 0 ? -(daysBetweenIso(i.due_date, now) ?? 0) : null,
    }))
    .sort((a, b) => (b.daysOverdue ?? -1) - (a.daysOverdue ?? -1) || b.amountDue - a.amountDue);
  const collect = collectAll.slice(0, 5);

  // Build Pay items
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

  // Build Fulfil items
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

  // Recent activity
  const recentSorted = [...ledger]
    .sort((a, b) => (b.date.localeCompare(a.date)) || b.created_at.localeCompare(a.created_at))
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
```

- [ ] **Step 3: Typecheck passes**

Run: `npx tsc --noEmit`
Expected: exits 0.

- [ ] **Step 4: Commit**

```bash
git add src/app/\(dashboard\)/dashboard/_lib/queries.ts
git commit -m "feat(dashboard): fetchDashboardData orchestrating queries + derivation"
```

---

## Task 7: Orchestrator page.tsx (renders raw data dump first)

Purpose: replace the current `page.tsx` with the new orchestrator skeleton that calls `fetchDashboardData` and renders a verification dump. Widgets come in subsequent tasks, each swapping out part of the dump.

**Files:**
- Modify: `src/app/(dashboard)/page.tsx` (full rewrite)

- [ ] **Step 1: Replace `page.tsx`**

```tsx
// src/app/(dashboard)/page.tsx
import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { fetchDashboardData } from './dashboard/_lib/queries';

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const data = await fetchDashboardData();

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground text-sm">Command center.</p>
      </header>
      <pre className="glass-card p-4 text-xs overflow-auto max-h-[70vh]">
        {JSON.stringify(data, null, 2)}
      </pre>
    </div>
  );
}
```

- [ ] **Step 2: Run dev server + verify data flows**

Run: `npm run dev`
Open `http://localhost:3000/` while signed in. Expected: see the JSON dump of `DashboardData` with sensible values for your current DB state. If any field is missing or mistyped, fix the corresponding query in `queries.ts` before moving on.

- [ ] **Step 3: Commit**

```bash
git add src/app/\(dashboard\)/page.tsx
git commit -m "feat(dashboard): orchestrator page calls fetchDashboardData (temp raw dump)"
```

---

## Task 8: KpiTile primitive + KpiStrip composite

**Files:**
- Create: `src/app/(dashboard)/dashboard/kpi-tile.tsx`
- Create: `src/app/(dashboard)/dashboard/kpi-strip.tsx`
- Modify: `src/app/(dashboard)/page.tsx` (wire `KpiStrip`)

- [ ] **Step 1: Create `kpi-tile.tsx`**

```tsx
// src/app/(dashboard)/dashboard/kpi-tile.tsx
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Props {
  label: string;
  value: string;
  deltaPct?: number | null;
  deltaSuffix?: string;
  sparkline?: number[];
  accentColor?: 'emerald' | 'violet' | 'default';
  contextLine?: string;
}

export function KpiTile({
  label, value, deltaPct, deltaSuffix = 'vs last month',
  sparkline, accentColor = 'default', contextLine,
}: Props) {
  const strokeColor =
    accentColor === 'emerald' ? '#34d399' :
    accentColor === 'violet' ? '#a78bfa' :
    '#8a93ab';

  return (
    <div className="rounded-xl border border-border bg-card/60 p-4 backdrop-blur-xl">
      <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
        {label}
      </div>
      <div className="mt-1 text-2xl font-bold tracking-tight tabular-nums">{value}</div>
      {deltaPct != null && (
        <div
          className={cn(
            'mt-0.5 inline-flex items-center gap-1 text-[11px] font-semibold',
            deltaPct > 0.5 && 'text-emerald-400',
            deltaPct < -0.5 && 'text-rose-400',
            Math.abs(deltaPct) <= 0.5 && 'text-muted-foreground',
          )}
        >
          {deltaPct > 0.5 ? <TrendingUp className="h-3 w-3" /> :
            deltaPct < -0.5 ? <TrendingDown className="h-3 w-3" /> :
            <Minus className="h-3 w-3" />}
          {deltaPct > 0 ? '+' : ''}{deltaPct.toFixed(1)}% {deltaSuffix}
        </div>
      )}
      {contextLine && <div className="mt-0.5 text-[11px] text-muted-foreground">{contextLine}</div>}
      {sparkline && sparkline.length > 1 && (
        <Sparkline values={sparkline} stroke={strokeColor} />
      )}
    </div>
  );
}

function Sparkline({ values, stroke }: { values: number[]; stroke: string }) {
  const max = Math.max(...values, 1);
  const min = Math.min(...values, 0);
  const range = max - min || 1;
  const w = 120, h = 22;
  const pts = values.map((v, i) => {
    const x = (i / (values.length - 1 || 1)) * w;
    const y = h - ((v - min) / range) * h;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(' ');
  return (
    <svg className="mt-1.5 h-[22px] w-full" viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none">
      <polyline fill="none" stroke={stroke} strokeWidth="1.5" points={pts} />
    </svg>
  );
}
```

- [ ] **Step 2: Create `kpi-strip.tsx`**

```tsx
// src/app/(dashboard)/dashboard/kpi-strip.tsx
import type { DashboardData } from './_lib/types';
import { KpiTile } from './kpi-tile';

function formatINR(n: number): string {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n);
}

export function KpiStrip({ data }: { data: DashboardData }) {
  const { toCollect, toPay, net } = data.pendingCash;
  return (
    <div className="flex flex-col gap-3.5">
      <KpiTile
        label="MTD revenue"
        value={formatINR(data.mtdRevenue.value)}
        deltaPct={data.mtdRevenue.deltaPct}
        sparkline={data.mtdRevenue.sparkline}
        accentColor="emerald"
      />
      <KpiTile
        label="MTD profit"
        value={formatINR(data.mtdProfit.value)}
        deltaPct={data.mtdProfit.deltaPct}
        sparkline={data.mtdProfit.sparkline}
        accentColor="violet"
      />
      <KpiTile
        label="Pending cash position"
        value={formatINR(net)}
        contextLine={`${formatINR(toCollect)} to collect − ${formatINR(toPay)} to pay`}
      />
    </div>
  );
}
```

- [ ] **Step 3: Replace JSON dump in `page.tsx` with grid + KpiStrip**

```tsx
// src/app/(dashboard)/page.tsx
import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { fetchDashboardData } from './dashboard/_lib/queries';
import { KpiStrip } from './dashboard/kpi-strip';

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const data = await fetchDashboardData();

  return (
    <div className="space-y-4">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground text-sm">Command center.</p>
      </header>
      <div className="grid grid-cols-12 gap-3.5">
        <div className="col-span-12 lg:col-span-8 rounded-2xl border border-border bg-card/60 p-4 backdrop-blur-xl">
          <div className="text-xs text-muted-foreground">Chart placeholder</div>
        </div>
        <div className="col-span-12 lg:col-span-4">
          <KpiStrip data={data} />
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Run dev server, verify tiles render**

Run: `npm run dev`
Expected: three stacked KPI tiles on the right of a placeholder panel; delta and sparklines render when data exists.

- [ ] **Step 5: Commit**

```bash
git add src/app/\(dashboard\)/dashboard/kpi-tile.tsx src/app/\(dashboard\)/dashboard/kpi-strip.tsx src/app/\(dashboard\)/page.tsx
git commit -m "feat(dashboard): KpiTile primitive + KpiStrip (3 MTD tiles)"
```

---

## Task 9: CashFlowChart (hand-rolled SVG)

**Files:**
- Create: `src/app/(dashboard)/dashboard/cash-flow-chart.tsx`
- Modify: `src/app/(dashboard)/page.tsx`

- [ ] **Step 1: Create the chart component**

```tsx
// src/app/(dashboard)/dashboard/cash-flow-chart.tsx
import Link from 'next/link';
import type { WeekBucket } from './_lib/types';

interface Props {
  weeks: WeekBucket[];
  legendRight?: React.ReactNode;
}

export function CashFlowChart({ weeks, legendRight }: Props) {
  const isEmpty = weeks.every((w) => w.moneyIn === 0 && w.moneyOut === 0);
  const maxVal = Math.max(
    1,
    ...weeks.map((w) => Math.max(w.moneyIn, w.moneyOut)),
  );
  const minProfit = Math.min(0, ...weeks.map((w) => w.profit));
  const maxProfit = Math.max(1, ...weeks.map((w) => w.profit));
  const profitRange = Math.max(1, maxProfit - minProfit);
  const W = 600, H = 240;
  const groupW = W / weeks.length; // ~46px
  const barW = Math.max(6, groupW * 0.35);
  const gap = 3;

  return (
    <section className="rounded-2xl border border-border bg-card/60 p-5 backdrop-blur-xl">
      <header className="mb-3 flex items-center justify-between">
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            Cash flow — last 90 days
          </div>
          <div className="text-[11px] text-muted-foreground/70 mt-0.5">Weekly buckets · INR</div>
        </div>
        <Link href="/ledger" className="text-[11px] font-medium text-primary hover:underline">
          Ledger →
        </Link>
      </header>
      {isEmpty ? (
        <div className="flex h-[200px] items-center justify-center text-sm text-muted-foreground">
          No cash movement yet — record a payment or payout to see the trend.
        </div>
      ) : (
        <svg viewBox={`0 0 ${W} ${H}`} className="h-[220px] w-full" preserveAspectRatio="none">
          <line x1="0" y1={H * 0.85} x2={W} y2={H * 0.85} stroke="rgba(255,255,255,0.08)" strokeDasharray="2 4" />
          {weeks.map((w, i) => {
            const x0 = i * groupW + groupW * 0.15;
            const inH = (w.moneyIn / maxVal) * (H * 0.8);
            const outH = (w.moneyOut / maxVal) * (H * 0.8);
            return (
              <g key={w.weekStart}>
                <rect x={x0} y={H * 0.85 - inH} width={barW} height={inH} fill="#34d399" opacity="0.85" rx="1" />
                <rect x={x0 + barW + gap} y={H * 0.85 - outH} width={barW} height={outH} fill="#fb7185" opacity="0.85" rx="1" />
              </g>
            );
          })}
          <polyline
            fill="none"
            stroke="#a78bfa"
            strokeWidth="2"
            points={weeks.map((w, i) => {
              const x = i * groupW + groupW / 2;
              const y = H * 0.85 - ((w.profit - minProfit) / profitRange) * (H * 0.7);
              return `${x.toFixed(1)},${y.toFixed(1)}`;
            }).join(' ')}
          />
        </svg>
      )}
      <div className="mt-3 flex items-center gap-4 text-[11px] text-muted-foreground">
        <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-sm bg-emerald-400" /> Money in</span>
        <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-sm bg-rose-400" /> Money out</span>
        <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-violet-400" /> Profit</span>
        <span className="ml-auto">{legendRight}</span>
      </div>
    </section>
  );
}
```

- [ ] **Step 2: Swap the chart placeholder in `page.tsx`**

Replace the placeholder div with:

```tsx
<div className="col-span-12 lg:col-span-8">
  <CashFlowChart weeks={data.weeks} />
</div>
```

Import at top:

```tsx
import { CashFlowChart } from './dashboard/cash-flow-chart';
```

- [ ] **Step 3: Verify in browser**

Run: `npm run dev`
Expected: bars + profit line render. Empty state shows the "No cash movement yet" message.

- [ ] **Step 4: Commit**

```bash
git add src/app/\(dashboard\)/dashboard/cash-flow-chart.tsx src/app/\(dashboard\)/page.tsx
git commit -m "feat(dashboard): 13-week combo cash-flow chart"
```

---

## Task 10: OnboardingBanner

**Files:**
- Create: `src/app/(dashboard)/dashboard/onboarding-banner.tsx`
- Modify: `src/app/(dashboard)/page.tsx`

- [ ] **Step 1: Create `onboarding-banner.tsx`**

```tsx
// src/app/(dashboard)/dashboard/onboarding-banner.tsx
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import type { NextStep } from './_lib/types';

export function OnboardingBanner({ step }: { step: NextStep }) {
  return (
    <Link
      href={step.href}
      className="flex items-center gap-3 rounded-xl border border-primary/30 bg-gradient-to-r from-primary/15 to-primary/5 px-4 py-2.5 text-sm transition-colors hover:from-primary/20 hover:to-primary/10"
    >
      <ArrowRight className="h-4 w-4 shrink-0 text-primary" />
      <span>
        Next step: <span className="font-semibold text-primary">{step.label}</span>{' '}
        <span className="text-muted-foreground">— {step.description}</span>
      </span>
    </Link>
  );
}
```

- [ ] **Step 2: Render conditionally in `page.tsx`**

Just before the grid:

```tsx
{data.nextStep && <OnboardingBanner step={data.nextStep} />}
```

Import:

```tsx
import { OnboardingBanner } from './dashboard/onboarding-banner';
```

- [ ] **Step 3: Verify**

Manual: with an empty DB (or by temporarily forcing `data.nextStep` to a stub value), confirm the banner shows; with a full DB, confirm it hides.

- [ ] **Step 4: Commit**

```bash
git add src/app/\(dashboard\)/dashboard/onboarding-banner.tsx src/app/\(dashboard\)/page.tsx
git commit -m "feat(dashboard): slim onboarding banner for incomplete setup"
```

---

## Task 11: ActionQueue (tabbed Collect / Pay / Fulfil)

**Files:**
- Create: `src/app/(dashboard)/dashboard/action-queue.tsx`
- Modify: `src/app/(dashboard)/page.tsx`

- [ ] **Step 1: Create `action-queue.tsx` as a Client Component (tab state)**

```tsx
// src/app/(dashboard)/dashboard/action-queue.tsx
'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowRight, Check } from 'lucide-react';
import type { CollectItem, FulfilItem, PayItem } from './_lib/types';
import { cn } from '@/lib/utils';

function formatINR(n: number): string {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n);
}

type Tab = 'collect' | 'pay' | 'fulfil';

interface Props {
  collect: CollectItem[];
  pay: PayItem[];
  fulfil: FulfilItem[];
  collectCount: number;
  payCount: number;
  fulfilCount: number;
}

export function ActionQueue(p: Props) {
  const defaultTab: Tab =
    p.collectCount > 0 ? 'collect' :
    p.payCount > 0 ? 'pay' :
    p.fulfilCount > 0 ? 'fulfil' : 'collect';
  const [tab, setTab] = useState<Tab>(defaultTab);

  return (
    <section className="rounded-2xl border border-border bg-card/60 p-5 backdrop-blur-xl">
      <header className="mb-3 flex items-center justify-between">
        <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          Needs attention
        </div>
        <Link
          href={tab === 'collect' ? '/invoicing' : tab === 'pay' ? '/settlement' : '/fulfilments'}
          className="text-[11px] font-medium text-primary hover:underline"
        >
          View all →
        </Link>
      </header>
      <div className="mb-3 flex gap-1 rounded-lg bg-muted/30 p-1">
        <TabButton active={tab === 'collect'} onClick={() => setTab('collect')} label="Collect" count={p.collectCount} />
        <TabButton active={tab === 'pay'}     onClick={() => setTab('pay')}     label="Pay"     count={p.payCount} />
        <TabButton active={tab === 'fulfil'}  onClick={() => setTab('fulfil')}  label="Fulfil"  count={p.fulfilCount} />
      </div>
      {tab === 'collect' && (p.collect.length > 0
        ? <ul>{p.collect.map((c) => <CollectRow key={c.invoice.id} item={c} />)}</ul>
        : <EmptyState text="Nothing to collect — clear." />)}
      {tab === 'pay' && (p.pay.length > 0
        ? <ul>{p.pay.map((i) => <PayRow key={i.payout.id} item={i} />)}</ul>
        : <EmptyState text="Nothing to pay — clear." />)}
      {tab === 'fulfil' && (p.fulfil.length > 0
        ? <ul>{p.fulfil.map((i) => <FulfilRow key={i.requirement.id} item={i} />)}</ul>
        : <EmptyState text="Nothing to fulfil — clear." />)}
    </section>
  );
}

function TabButton({ active, onClick, label, count }: { active: boolean; onClick: () => void; label: string; count: number }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'flex flex-1 items-center justify-center gap-2 rounded-md px-3 py-1.5 text-[12px] font-semibold transition-colors',
        active ? 'bg-primary/20 text-primary' : 'text-muted-foreground hover:text-foreground',
      )}
    >
      {label}
      <span className={cn('rounded-full px-1.5 py-0.5 text-[10px]', active ? 'bg-primary/25 text-primary' : 'bg-muted text-foreground/70')}>
        {count}
      </span>
    </button>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="flex items-center justify-center gap-2 py-10 text-sm text-muted-foreground">
      <Check className="h-4 w-4" /> {text}
    </div>
  );
}

function CollectRow({ item }: { item: CollectItem }) {
  const overdueBadge = item.daysOverdue != null && item.daysOverdue > 0
    ? `overdue ${item.daysOverdue}d`
    : item.daysUntilDue != null
      ? `due in ${item.daysUntilDue}d`
      : 'no due date';
  const amountClass = item.daysOverdue != null && item.daysOverdue > 0
    ? 'text-rose-400'
    : item.daysUntilDue != null && item.daysUntilDue <= 7 ? 'text-amber-400' : '';
  return (
    <li className="grid grid-cols-[1fr_auto_auto] items-center gap-3 border-b border-border py-2.5 last:border-0">
      <div>
        <div className="text-[13px] font-semibold">INV-{item.invoice.id.slice(0, 8)} · {item.clientName}</div>
        <div className="text-[11px] text-muted-foreground">
          {item.projectName} · {overdueBadge}
        </div>
      </div>
      <div className={cn('font-semibold tabular-nums', amountClass)}>{formatINR(item.amountDue)}</div>
      <Link href="/invoicing" className="text-[12px] font-medium text-primary hover:underline inline-flex items-center gap-1">
        Record <ArrowRight className="h-3 w-3" />
      </Link>
    </li>
  );
}

function PayRow({ item }: { item: PayItem }) {
  return (
    <li className="grid grid-cols-[1fr_auto_auto] items-center gap-3 border-b border-border py-2.5 last:border-0">
      <div>
        <div className="text-[13px] font-semibold">{item.vendorName}</div>
        <div className="text-[11px] text-muted-foreground">{item.projectName}</div>
      </div>
      <div className="font-semibold tabular-nums">{formatINR(item.payout.amount)}</div>
      <Link href="/settlement" className="text-[12px] font-medium text-primary hover:underline inline-flex items-center gap-1">
        Pay <ArrowRight className="h-3 w-3" />
      </Link>
    </li>
  );
}

function FulfilRow({ item }: { item: FulfilItem }) {
  return (
    <li className="grid grid-cols-[1fr_auto_auto] items-center gap-3 border-b border-border py-2.5 last:border-0">
      <div>
        <div className="text-[13px] font-semibold">{item.requirement.title || item.requirement.service_name}</div>
        <div className="text-[11px] text-muted-foreground">
          {item.projectName} · {item.vendorName ?? 'no vendor'} · {item.daysOpen}d open
        </div>
      </div>
      <div className="text-[11px] uppercase tracking-wider text-muted-foreground">{item.requirement.fulfilment_status}</div>
      <Link href="/fulfilments" className="text-[12px] font-medium text-primary hover:underline inline-flex items-center gap-1">
        Open <ArrowRight className="h-3 w-3" />
      </Link>
    </li>
  );
}
```

- [ ] **Step 2: Wire into `page.tsx`**

After the hero row, add a second grid row:

```tsx
<div className="col-span-12 lg:col-span-7">
  <ActionQueue
    collect={data.collect}
    pay={data.pay}
    fulfil={data.fulfil}
    collectCount={data.collectTotalCount}
    payCount={data.payTotalCount}
    fulfilCount={data.fulfilTotalCount}
  />
</div>
```

Import:

```tsx
import { ActionQueue } from './dashboard/action-queue';
```

- [ ] **Step 3: Verify in browser**

Run: `npm run dev`
Expected: tabs switch; default tab picks the first non-empty bucket; empty states show the check icon message.

- [ ] **Step 4: Commit**

```bash
git add src/app/\(dashboard\)/dashboard/action-queue.tsx src/app/\(dashboard\)/page.tsx
git commit -m "feat(dashboard): tabbed action queue (Collect/Pay/Fulfil)"
```

---

## Task 12: PipelinePulse (8-step funnel)

**Files:**
- Create: `src/app/(dashboard)/dashboard/pipeline-pulse.tsx`
- Modify: `src/app/(dashboard)/page.tsx`

- [ ] **Step 1: Create `pipeline-pulse.tsx`**

```tsx
// src/app/(dashboard)/dashboard/pipeline-pulse.tsx
import Link from 'next/link';
import type { FunnelStage } from './_lib/types';
import { cn } from '@/lib/utils';

export function PipelinePulse({ stages }: { stages: FunnelStage[] }) {
  const maxCount = Math.max(1, ...stages.map((s) => s.count ?? 0));
  const bottleneck = stages.find((s) => s.isBottleneck);

  return (
    <section className="rounded-2xl border border-border bg-card/60 p-5 backdrop-blur-xl">
      <header className="mb-3 flex items-center justify-between">
        <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          Pipeline pulse
        </div>
        <span className="text-[11px] text-muted-foreground/70">8-step flow</span>
      </header>
      <ul className="space-y-1">
        {stages.map((s) => {
          const pct = s.count == null ? 0 : (s.count / maxCount) * 100;
          return (
            <li key={s.step}>
              <Link
                href={s.href}
                className={cn(
                  'grid grid-cols-[92px_1fr_32px] items-center gap-2 rounded-md px-2 py-1.5 text-[12px] transition-colors hover:bg-muted/30',
                  s.isBottleneck && 'bg-amber-500/10',
                )}
              >
                <span className={cn(
                  'truncate font-medium',
                  s.isBottleneck ? 'text-amber-400' : 'text-muted-foreground',
                )}>
                  {s.step}. {s.label}
                </span>
                <span className="relative h-[12px] overflow-hidden rounded-sm bg-muted/30">
                  <span
                    className={cn(
                      'absolute inset-y-0 left-0 rounded-sm opacity-60',
                      s.isBottleneck ? 'bg-amber-400' : 'bg-primary',
                    )}
                    style={{ width: `${pct}%` }}
                  />
                </span>
                <span className={cn(
                  'text-right font-semibold tabular-nums',
                  s.isBottleneck && 'text-amber-400',
                )}>
                  {s.count == null ? '—' : s.count}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
      {bottleneck && (
        <p className="mt-3 text-[11px] text-amber-400">
          Bottleneck at {bottleneck.label} — {bottleneck.count} items waiting.
        </p>
      )}
    </section>
  );
}
```

- [ ] **Step 2: Wire into `page.tsx`**

```tsx
<div className="col-span-12 lg:col-span-5">
  <PipelinePulse stages={data.funnel} />
</div>
```

Import:

```tsx
import { PipelinePulse } from './dashboard/pipeline-pulse';
```

- [ ] **Step 3: Verify in browser**

Expected: 8 rows, bars proportional, bottleneck row highlighted amber when a pending stage has a count.

- [ ] **Step 4: Commit**

```bash
git add src/app/\(dashboard\)/dashboard/pipeline-pulse.tsx src/app/\(dashboard\)/page.tsx
git commit -m "feat(dashboard): 8-step pipeline pulse with bottleneck highlight"
```

---

## Task 13: InvoiceAging

**Files:**
- Create: `src/app/(dashboard)/dashboard/invoice-aging.tsx`
- Modify: `src/app/(dashboard)/page.tsx`

- [ ] **Step 1: Create `invoice-aging.tsx`**

```tsx
// src/app/(dashboard)/dashboard/invoice-aging.tsx
import Link from 'next/link';
import type { AgingBuckets } from './_lib/types';

function formatINR(n: number): string {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n);
}

export function InvoiceAging({ aging }: { aging: AgingBuckets }) {
  if (aging.total === 0) {
    return (
      <section className="rounded-2xl border border-border bg-card/60 p-5 backdrop-blur-xl">
        <header className="mb-3 flex items-center justify-between">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Invoice aging</div>
        </header>
        <p className="text-center text-sm text-muted-foreground py-8">No outstanding invoices.</p>
      </section>
    );
  }
  const total = aging.total || 1;
  const pct = (n: number) => (n / total) * 100;
  return (
    <section className="rounded-2xl border border-border bg-card/60 p-5 backdrop-blur-xl">
      <header className="mb-3 flex items-center justify-between">
        <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Invoice aging</div>
        <span className="text-[11px] text-muted-foreground/70 tabular-nums">{formatINR(aging.total)} total</span>
      </header>
      <div className="flex h-[10px] overflow-hidden rounded-full">
        <div className="bg-emerald-400/70" style={{ width: `${pct(aging.current.amount)}%` }} />
        <div className="bg-amber-400/70"   style={{ width: `${pct(aging.stale.amount)}%` }} />
        <div className="bg-rose-400/70"    style={{ width: `${pct(aging.overdue.amount)}%` }} />
      </div>
      <div className="mt-3 grid grid-cols-3 gap-3 text-[11px] text-muted-foreground">
        <div>0–30d<br /><span className="tabular-nums text-foreground font-semibold">{formatINR(aging.current.amount)}</span> <span className="text-muted-foreground/70">({aging.current.count})</span></div>
        <div>31–60d<br /><span className="tabular-nums text-foreground font-semibold">{formatINR(aging.stale.amount)}</span> <span className="text-muted-foreground/70">({aging.stale.count})</span></div>
        <div>60+d<br /><span className="tabular-nums text-rose-400 font-semibold">{formatINR(aging.overdue.amount)}</span> <span className="text-muted-foreground/70">({aging.overdue.count})</span></div>
      </div>
      {aging.oldestOpen && (
        <p className="mt-4 text-[11px] text-muted-foreground">
          Oldest open:{' '}
          <span className="font-semibold text-foreground">
            {aging.oldestOpen.label} · {aging.oldestOpen.clientName}
          </span>{' '}
          · {aging.oldestOpen.daysOld} days ·{' '}
          <Link href="/invoicing" className="text-primary hover:underline">Nudge client</Link>
        </p>
      )}
    </section>
  );
}
```

- [ ] **Step 2: Add to `page.tsx` bottom grid row**

```tsx
<div className="col-span-12 md:col-span-6 lg:col-span-4">
  <InvoiceAging aging={data.aging} />
</div>
```

Import:

```tsx
import { InvoiceAging } from './dashboard/invoice-aging';
```

- [ ] **Step 3: Verify in browser**

Expected: stacked bar renders when aging.total > 0; empty state otherwise.

- [ ] **Step 4: Commit**

```bash
git add src/app/\(dashboard\)/dashboard/invoice-aging.tsx src/app/\(dashboard\)/page.tsx
git commit -m "feat(dashboard): invoice aging widget with oldest-open callout"
```

---

## Task 14: PendingPayouts (always-visible bottom panel)

**Files:**
- Create: `src/app/(dashboard)/dashboard/pending-payouts.tsx`
- Modify: `src/app/(dashboard)/page.tsx`

- [ ] **Step 1: Create `pending-payouts.tsx`**

```tsx
// src/app/(dashboard)/dashboard/pending-payouts.tsx
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import type { PayItem } from './_lib/types';

function formatINR(n: number): string {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n);
}

export function PendingPayouts({ items }: { items: PayItem[] }) {
  const total = items.reduce((s, i) => s + i.payout.amount, 0);
  return (
    <section className="rounded-2xl border border-border bg-card/60 p-5 backdrop-blur-xl">
      <header className="mb-3 flex items-center justify-between">
        <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Pending payouts</div>
        <span className="text-[11px] text-muted-foreground/70 tabular-nums">
          {formatINR(total)} / {items.length} vendor{items.length !== 1 ? 's' : ''}
        </span>
      </header>
      {items.length === 0 ? (
        <p className="text-center text-sm text-muted-foreground py-8">All caught up on payouts.</p>
      ) : (
        <ul>
          {items.map((item) => (
            <li key={item.payout.id} className="grid grid-cols-[1fr_auto_auto] items-center gap-3 border-b border-border py-2.5 last:border-0">
              <div>
                <div className="text-[13px] font-semibold">{item.vendorName}</div>
                <div className="text-[11px] text-muted-foreground">{item.projectName}</div>
              </div>
              <div className="font-semibold tabular-nums">{formatINR(item.payout.amount)}</div>
              <Link href="/settlement" className="text-[12px] font-medium text-primary hover:underline inline-flex items-center gap-1">
                Pay <ArrowRight className="h-3 w-3" />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
```

- [ ] **Step 2: Add to `page.tsx` bottom row**

```tsx
<div className="col-span-12 md:col-span-6 lg:col-span-5">
  <PendingPayouts items={data.pendingPayoutsTop} />
</div>
```

Import:

```tsx
import { PendingPayouts } from './dashboard/pending-payouts';
```

- [ ] **Step 3: Verify in browser**

Expected: top-3 pending payouts list; empty state shows "All caught up".

- [ ] **Step 4: Commit**

```bash
git add src/app/\(dashboard\)/dashboard/pending-payouts.tsx src/app/\(dashboard\)/page.tsx
git commit -m "feat(dashboard): always-visible pending payouts bottom panel"
```

---

## Task 15: RecentActivity

**Files:**
- Create: `src/app/(dashboard)/dashboard/recent-activity.tsx`
- Modify: `src/app/(dashboard)/page.tsx`

- [ ] **Step 1: Create `recent-activity.tsx`**

```tsx
// src/app/(dashboard)/dashboard/recent-activity.tsx
import Link from 'next/link';
import type { ActivityItem } from './_lib/types';
import { cn } from '@/lib/utils';

function formatINR(n: number): string {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n);
}

function relativeTime(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  const min = Math.floor(ms / 60000);
  if (min < 60) return `${Math.max(1, min)}m`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h`;
  return `${Math.floor(hr / 24)}d`;
}

export function RecentActivity({ items }: { items: ActivityItem[] }) {
  return (
    <section className="rounded-2xl border border-border bg-card/60 p-5 backdrop-blur-xl">
      <header className="mb-3 flex items-center justify-between">
        <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Recent activity</div>
        <Link href="/activity" className="text-[11px] font-medium text-primary hover:underline">Log →</Link>
      </header>
      {items.length === 0 ? (
        <p className="text-center text-sm text-muted-foreground py-8">No activity yet.</p>
      ) : (
        <ul>
          {items.map((i) => {
            const isIn = i.type === 'client_payment';
            const isOut = i.type === 'vendor_payment';
            const sign = isIn ? '+' : isOut ? '−' : '';
            const dotClass = isIn ? 'bg-emerald-400' : isOut ? 'bg-rose-400' : 'bg-blue-400';
            const amountClass = isIn ? 'text-emerald-400' : isOut ? 'text-rose-400' : '';
            return (
              <li key={i.id} className="flex items-center gap-2.5 border-b border-border py-2 last:border-0 text-[12px]">
                <span className={cn('h-2 w-2 shrink-0 rounded-full', dotClass)} />
                <div className="flex-1 min-w-0">
                  <div className="truncate font-semibold capitalize">{i.type.replace(/_/g, ' ')}</div>
                  <div className="truncate text-[11px] text-muted-foreground">{i.projectName} · {relativeTime(i.at)}</div>
                </div>
                <span className={cn('tabular-nums', amountClass)}>
                  {i.type === 'client_invoice' || i.type === 'vendor_expected_cost' ? '' : `${sign}${formatINR(i.amount)}`}
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
```

- [ ] **Step 2: Add to `page.tsx` bottom row**

```tsx
<div className="col-span-12 md:col-span-12 lg:col-span-3">
  <RecentActivity items={data.recentActivity} />
</div>
```

Import:

```tsx
import { RecentActivity } from './dashboard/recent-activity';
```

- [ ] **Step 3: Verify in browser**

- [ ] **Step 4: Commit**

```bash
git add src/app/\(dashboard\)/dashboard/recent-activity.tsx src/app/\(dashboard\)/page.tsx
git commit -m "feat(dashboard): compact recent activity feed"
```

---

## Task 16: VariancePill (tucked into chart legend)

**Files:**
- Create: `src/app/(dashboard)/dashboard/variance-pill.tsx`
- Modify: `src/app/(dashboard)/dashboard/cash-flow-chart.tsx` (accept `legendRight`)
- Modify: `src/app/(dashboard)/page.tsx`

- [ ] **Step 1: Create `variance-pill.tsx`**

```tsx
// src/app/(dashboard)/dashboard/variance-pill.tsx
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import type { VariancePortfolio } from './_lib/types';
import { cn } from '@/lib/utils';

export function VariancePill({ v }: { v: VariancePortfolio }) {
  if (v.variancePct == null) return null;
  return (
    <Link
      href="/reports"
      className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card/50 px-2.5 py-1 text-[11px] text-muted-foreground hover:border-primary/40"
    >
      Portfolio variance{' '}
      <span className={cn('font-semibold tabular-nums', v.favourable ? 'text-emerald-400' : 'text-rose-400')}>
        {v.variancePct > 0 ? '+' : ''}{v.variancePct.toFixed(1)}%
      </span>
      <ArrowRight className="h-3 w-3 text-primary" />
    </Link>
  );
}
```

- [ ] **Step 2: Pass the pill into `CashFlowChart` legend**

In `page.tsx`, update the chart usage:

```tsx
<CashFlowChart weeks={data.weeks} legendRight={<VariancePill v={data.variance} />} />
```

Import:

```tsx
import { VariancePill } from './dashboard/variance-pill';
```

No change needed to `cash-flow-chart.tsx` — it already accepts `legendRight`.

- [ ] **Step 3: Verify in browser**

Expected: a small "Portfolio variance +X.X% →" pill in the top-right of the chart's legend row; hidden when no active projects.

- [ ] **Step 4: Commit**

```bash
git add src/app/\(dashboard\)/dashboard/variance-pill.tsx src/app/\(dashboard\)/page.tsx
git commit -m "feat(dashboard): portfolio variance pill in cash-flow legend"
```

---

## Task 17: loading.tsx skeleton

**Files:**
- Create: `src/app/(dashboard)/loading.tsx`

- [ ] **Step 1: Create the skeleton**

```tsx
// src/app/(dashboard)/loading.tsx
export default function DashboardLoading() {
  const panel = 'rounded-2xl border border-border bg-card/60 animate-pulse';
  return (
    <div className="space-y-4">
      <div>
        <div className="h-7 w-32 rounded bg-muted/40" />
        <div className="mt-1 h-4 w-56 rounded bg-muted/30" />
      </div>
      <div className="grid grid-cols-12 gap-3.5">
        <div className={`${panel} col-span-12 lg:col-span-8 h-[290px]`} />
        <div className="col-span-12 lg:col-span-4 flex flex-col gap-3.5">
          <div className={`${panel} h-[88px]`} />
          <div className={`${panel} h-[88px]`} />
          <div className={`${panel} h-[88px]`} />
        </div>
        <div className={`${panel} col-span-12 lg:col-span-7 h-[280px]`} />
        <div className={`${panel} col-span-12 lg:col-span-5 h-[280px]`} />
        <div className={`${panel} col-span-12 md:col-span-6 lg:col-span-4 h-[180px]`} />
        <div className={`${panel} col-span-12 md:col-span-6 lg:col-span-5 h-[180px]`} />
        <div className={`${panel} col-span-12 md:col-span-12 lg:col-span-3 h-[180px]`} />
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify skeleton by throttling the network**

Open the dashboard with Chrome DevTools → Network → "Slow 3G". Expected: skeleton grid shows pulsing panels matching the real layout before content swaps in.

- [ ] **Step 3: Commit**

```bash
git add src/app/\(dashboard\)/loading.tsx
git commit -m "feat(dashboard): skeleton loading.tsx mirroring grid layout"
```

---

## Task 18: Polish pass + manual smoke + final commit

**Files:**
- Modify: `src/app/(dashboard)/page.tsx` (final polish — header copy, section spacing)

- [ ] **Step 1: Finalize `page.tsx` structure**

```tsx
// src/app/(dashboard)/page.tsx
import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { fetchDashboardData } from './dashboard/_lib/queries';
import { CashFlowChart } from './dashboard/cash-flow-chart';
import { KpiStrip } from './dashboard/kpi-strip';
import { OnboardingBanner } from './dashboard/onboarding-banner';
import { ActionQueue } from './dashboard/action-queue';
import { PipelinePulse } from './dashboard/pipeline-pulse';
import { InvoiceAging } from './dashboard/invoice-aging';
import { PendingPayouts } from './dashboard/pending-payouts';
import { RecentActivity } from './dashboard/recent-activity';
import { VariancePill } from './dashboard/variance-pill';

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const data = await fetchDashboardData();

  return (
    <div className="space-y-4">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
        <p className="text-sm text-muted-foreground">Command center.</p>
      </header>

      {data.nextStep && <OnboardingBanner step={data.nextStep} />}

      <div className="grid grid-cols-12 gap-3.5">
        <div className="col-span-12 lg:col-span-8">
          <CashFlowChart weeks={data.weeks} legendRight={<VariancePill v={data.variance} />} />
        </div>
        <div className="col-span-12 lg:col-span-4">
          <KpiStrip data={data} />
        </div>

        <div className="col-span-12 lg:col-span-7">
          <ActionQueue
            collect={data.collect}
            pay={data.pay}
            fulfil={data.fulfil}
            collectCount={data.collectTotalCount}
            payCount={data.payTotalCount}
            fulfilCount={data.fulfilTotalCount}
          />
        </div>
        <div className="col-span-12 lg:col-span-5">
          <PipelinePulse stages={data.funnel} />
        </div>

        <div className="col-span-12 md:col-span-6 lg:col-span-4">
          <InvoiceAging aging={data.aging} />
        </div>
        <div className="col-span-12 md:col-span-6 lg:col-span-5">
          <PendingPayouts items={data.pendingPayoutsTop} />
        </div>
        <div className="col-span-12 md:col-span-12 lg:col-span-3">
          <RecentActivity items={data.recentActivity} />
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Run manual-verification checklist**

With the dev server running (`npm run dev`), step through these scenarios:

- [ ] **Fresh DB (zero clients):** Onboarding banner shows "Add your first client"; every widget renders its empty state; no errors.
- [ ] **Partial DB (clients + projects, no requirements):** Banner shows "Add requirements"; KPIs show ₹0 with no delta; pipeline funnel shows Clients and Projects bars.
- [ ] **Full DB:** Banner hidden; chart bars + profit line render; 3 KPI tiles show realistic values with deltas + sparklines; action queue default tab is first non-empty.
- [ ] **Only overdue:** Create an invoice with issue_date = 90 days ago and no payment; verify it appears in aging's 60+ bucket (red), and as the oldest-open callout.
- [ ] **Bottleneck case:** Add 6 open requirements, 2 unpaid invoices, 1 pending payout — verify Fulfilments row is amber-highlighted with the bottleneck message.
- [ ] **Responsive:** Resize to 1100px — middle/bottom rows stack; resize to 900px — everything single-column.
- [ ] **Type check:** Run `npx tsc --noEmit` → exits 0.
- [ ] **Lint:** Run `npm run lint` → no new errors in dashboard files.
- [ ] **Tests:** Run `npm test` → all calc tests pass.

- [ ] **Step 3: Commit final polish**

If any tweaks were needed in Step 2, commit them. Otherwise:

```bash
git add src/app/\(dashboard\)/page.tsx
git commit -m "feat(dashboard): compose full cockpit grid in page.tsx"
```

---

## Self-Review

**1. Spec coverage**

| Spec section | Task(s) |
|---|---|
| §1 Onboarding banner | Task 10 (+ Task 4 `computeNextStep`) |
| §2 Cash flow chart | Task 9 (+ Task 2 `bucketLedgerByWeek`) |
| §3 KPI tiles | Task 8 (+ Task 3 `computeMtd`, Task 4 `computePendingCash`) |
| §4 Needs attention action queue | Task 11 (+ Task 6 queries build the items) |
| §5 Pipeline pulse | Task 12 (+ Task 5 `buildFunnel`) |
| §6 Invoice aging | Task 13 (+ Task 4 `computeAging`) |
| §7 Pending payouts | Task 14 (+ Task 6 builds `pendingPayoutsTop`) |
| §8 Portfolio variance pill | Task 16 (+ Task 5 `computePortfolioVariance`) |
| §9 Recent activity | Task 15 (+ Task 6 builds `recentActivity`) |
| Visual system evolution | Task 8 (tile style), Task 9 (chart palette); global tokens untouched per spec |
| Responsive behavior | Task 18 manual check + all widgets use `col-span-12 md:* lg:*` pattern |
| Empty state strategy | Every widget task has an empty-state step |
| Loading behavior | Task 17 |
| Architecture / file structure | Task 1 (types), Task 6 (queries), Tasks 2-5 (calc), Tasks 8-16 (widgets) — matches spec |
| Charting library decision | Task 9 hand-rolled SVG per user choice |

**2. Placeholder scan** — No TBDs. Every step has exact code or exact commands.

**3. Type consistency**
- `DashboardData`, `WeekBucket`, `KpiValue`, `PendingCash`, `CollectItem`, `PayItem`, `FulfilItem`, `FunnelStage`, `AgingBuckets`, `ActivityItem`, `VariancePortfolio`, `NextStep` defined in Task 1 and used consistently in subsequent tasks.
- Function names: `bucketLedgerByWeek`, `computeMtd`, `computeAging`, `computePendingCash`, `computeNextStep`, `computePortfolioVariance`, `buildFunnel` — used identically everywhere they're referenced.
- Component prop names match the DTO fields they consume.

---

## Execution Handoff

Plan complete and saved to `docs/superpowers/plans/2026-04-17-dashboard-redesign.md`. Two execution options:

1. **Subagent-Driven (recommended)** — I dispatch a fresh subagent per task, review between tasks, fast iteration.
2. **Inline Execution** — Execute tasks in this session using executing-plans, batch execution with checkpoints.

Which approach?
