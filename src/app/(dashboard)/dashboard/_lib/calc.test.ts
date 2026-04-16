// src/app/(dashboard)/dashboard/_lib/calc.test.ts
import { describe, it, expect } from 'vitest';
import { bucketLedgerByWeek, buildFunnel, computeAging, computeMtd, computeNextStep, computePendingCash, computePortfolioVariance } from './calc';
import type { Invoice, LedgerEntry, PaymentReceived, Project, Requirement, VendorPayout } from '@/types/database';

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

function proj(p: Partial<Project>): Project {
  return {
    id: p.id ?? crypto.randomUUID(),
    client_id: 'c1',
    name: p.name ?? 'P',
    status: p.status ?? 'active',
    engagement_type: 'one_time',
    start_date: null,
    end_date: null,
    created_at: '2026-01-01',
    updated_at: '2026-01-01',
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
    quantity: null,
    period_days: null,
    unit_rate: null,
    vendor_unit_rate: null,
    fulfilment_status: p.fulfilment_status ?? 'pending',
    created_at: '2026-01-01',
    updated_at: '2026-01-01',
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
      req({ project_id: 'p1', client_price: 10000, expected_vendor_cost: 6000 }),
    ];
    const ledger: LedgerEntry[] = [
      entry({ project_id: 'p1', type: 'client_payment', amount: 9000, date: '2026-01-01' }),
      entry({ project_id: 'p1', type: 'vendor_payment', amount: 6000, date: '2026-01-01' }),
    ];
    const out = computePortfolioVariance(projects, requirements, ledger);
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
      'Clients', 'Vendors', 'Projects', 'Requirements', 'Fulfilments', 'Invoicing', 'Settlement', 'Reports',
    ]);
    expect(out[0].count).toBe(3);
    expect(out[4].count).toBe(4);
    expect(out[7].count).toBeNull();
  });

  it('flags the pending stage with the highest count as bottleneck', () => {
    const out = buildFunnel({
      clients: 50, vendors: 30, projects: 20, requirements: 10,
      openRequirements: 6, unpaidInvoices: 3, pendingPayouts: 1,
    });
    const bottleneck = out.find((s) => s.isBottleneck);
    expect(bottleneck?.label).toBe('Fulfilments');
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
