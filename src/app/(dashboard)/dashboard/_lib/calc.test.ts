// src/app/(dashboard)/dashboard/_lib/calc.test.ts
import { describe, it, expect } from 'vitest';
import {
  buildCollectItems,
  buildFulfilItems,
  buildFunnel,
  buildPayItems,
  buildRecentActivity,
  bucketLedgerByWeek,
  computeAging,
  computeMtd,
  computeNextStep,
  computePendingCash,
  computePortfolioVariance,
} from './calc';
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
  // Use `in` so explicit `null` overrides the default (?? would ignore it).
  const issueDate = 'issue_date' in p ? p.issue_date! : '2026-01-01';
  return {
    id: p.id ?? crypto.randomUUID(),
    project_id: 'p1',
    type: 'project',
    amount: p.amount ?? 1000,
    status: p.status ?? 'issued',
    issue_date: issueDate,
    due_date: p.due_date ?? null,
    billing_month: null,
    created_at: p.created_at ?? issueDate ?? '2026-01-01',
    updated_at: p.updated_at ?? issueDate ?? '2026-01-01',
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

  it('boundary: day-30 goes in current, day-31 in stale, day-60 in stale, day-61 in overdue', () => {
    const rows = [
      invoice({ id: 'a30', amount: 100, issue_date: '2026-03-18' }), // 30d
      invoice({ id: 'a31', amount: 100, issue_date: '2026-03-17' }), // 31d
      invoice({ id: 'a60', amount: 100, issue_date: '2026-02-16' }), // 60d
      invoice({ id: 'a61', amount: 100, issue_date: '2026-02-15' }), // 61d
    ];
    const out = computeAging(rows, [], [], today);
    expect(out.current.count).toBe(1);
    expect(out.stale.count).toBe(2);
    expect(out.overdue.count).toBe(1);
  });

  it('skips invoices with null issue_date (dirty data) — not counted or considered for oldest', () => {
    const rows = [
      invoice({ id: 'clean', amount: 1000, issue_date: '2026-03-10' }),
      invoice({ id: 'dirty', amount: 9999, issue_date: null }),
    ];
    const out = computeAging(rows, [], [], today);
    expect(out.total).toBe(1000);
    expect(out.oldestOpen?.invoiceId).toBe('clean');
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
  it('returns 7 stages with counts in sidebar order', () => {
    const out = buildFunnel({
      clients: 3, vendors: 5, projects: 2, requirements: 10,
      openRequirements: 4, unpaidInvoices: 2, pendingPayouts: 1,
    });
    expect(out).toHaveLength(7);
    expect(out.map((s) => s.label)).toEqual([
      'Clients', 'Vendors', 'Projects', 'Requirements', 'Billing', 'Settlement', 'Reports',
    ]);
    expect(out[0].count).toBe(3);
    // Billing sums open requirements + unpaid invoices into a single step.
    expect(out[4].count).toBe(4 + 2);
    expect(out[6].count).toBeNull();
  });

  it('flags the pending stage with the highest count as bottleneck', () => {
    const out = buildFunnel({
      clients: 50, vendors: 30, projects: 20, requirements: 10,
      openRequirements: 6, unpaidInvoices: 3, pendingPayouts: 1,
    });
    const bottleneck = out.find((s) => s.isBottleneck);
    // Billing (6+3=9) beats Settlement (1).
    expect(bottleneck?.label).toBe('Billing');
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

describe('buildCollectItems', () => {
  const today = new Date('2026-04-17T12:00:00Z');
  const names = new Map<string, { clientName: string; projectName: string }>([
    ['i1', { clientName: 'Acme', projectName: 'Website' }],
    ['i2', { clientName: 'Beta', projectName: 'Mobile' }],
  ]);

  it('returns empty array when no outstanding invoices', () => {
    const inv = invoice({ id: 'i1', amount: 500, issue_date: '2026-04-01' });
    const out = buildCollectItems([inv], [payment('i1', 500)], names, today);
    expect(out).toEqual([]);
  });

  it('computes amountDue from invoice amount minus payments', () => {
    const inv = invoice({ id: 'i1', amount: 1000, issue_date: '2026-04-01' });
    const out = buildCollectItems([inv], [payment('i1', 300)], names, today);
    expect(out).toHaveLength(1);
    expect(out[0].amountDue).toBe(700);
    expect(out[0].clientName).toBe('Acme');
    expect(out[0].projectName).toBe('Website');
  });

  it('sets daysOverdue when past due, daysUntilDue when upcoming, both null when no due_date', () => {
    const past = invoice({ id: 'i1', amount: 100, issue_date: '2026-03-01', due_date: '2026-04-10' });
    const future = invoice({ id: 'i2', amount: 100, issue_date: '2026-04-01', due_date: '2026-04-24' });
    const out = buildCollectItems([past, future], [], names, today);
    const pastItem = out.find((x) => x.invoice.id === 'i1')!;
    const futItem = out.find((x) => x.invoice.id === 'i2')!;
    expect(pastItem.daysOverdue).toBe(7);
    expect(pastItem.daysUntilDue).toBeNull();
    expect(futItem.daysOverdue).toBeNull();
    expect(futItem.daysUntilDue).toBe(7);
  });

  it('sorts by daysOverdue desc then amountDue desc', () => {
    const names2 = new Map([['a', { clientName: 'A', projectName: 'A' }], ['b', { clientName: 'B', projectName: 'B' }], ['c', { clientName: 'C', projectName: 'C' }]]);
    const a = invoice({ id: 'a', amount: 100, issue_date: '2026-04-10', due_date: '2026-04-15' }); // 2d overdue
    const b = invoice({ id: 'b', amount: 500, issue_date: '2026-03-10', due_date: '2026-04-01' }); // 16d overdue
    const c = invoice({ id: 'c', amount: 900, issue_date: '2026-04-10', due_date: null }); // no due
    const out = buildCollectItems([a, b, c], [], names2, today);
    expect(out.map((x) => x.invoice.id)).toEqual(['b', 'a', 'c']);
  });
});

describe('buildPayItems', () => {
  function payout(p: Partial<VendorPayout>): VendorPayout {
    return {
      id: p.id ?? crypto.randomUUID(),
      requirement_id: p.requirement_id ?? 'r1',
      vendor_id: p.vendor_id ?? 'v1',
      amount: p.amount ?? 100,
      status: p.status ?? 'pending',
      paid_date: p.paid_date ?? null,
      created_at: p.created_at ?? '2026-04-01',
      updated_at: p.updated_at ?? '2026-04-01',
    };
  }

  it('filters to pending only and sorts by amount desc', () => {
    const p1 = payout({ id: 'a', amount: 100, status: 'pending' });
    const p2 = payout({ id: 'b', amount: 500, status: 'pending' });
    const p3 = payout({ id: 'c', amount: 9000, status: 'paid' });
    const names = new Map([
      ['a', { vendorName: 'A', projectName: 'Proj' }],
      ['b', { vendorName: 'B', projectName: 'Proj' }],
    ]);
    const out = buildPayItems([p1, p2, p3], names);
    expect(out.map((i) => i.payout.id)).toEqual(['b', 'a']);
    expect(out[0].vendorName).toBe('B');
  });
});

describe('buildFulfilItems', () => {
  const today = new Date('2026-04-17T12:00:00Z');

  it('filters to pending/in_progress and sorts by daysOpen desc', () => {
    const old = req({ id: 'old',  fulfilment_status: 'pending' });
    old.created_at = '2026-04-01T00:00:00Z';
    const newer = req({ id: 'new',  fulfilment_status: 'in_progress' });
    newer.created_at = '2026-04-15T00:00:00Z';
    const done = req({ id: 'done', fulfilment_status: 'fulfilled' });
    done.created_at = '2026-01-01T00:00:00Z';
    const names = new Map([
      ['old', { projectName: 'P', vendorName: 'V' }],
      ['new', { projectName: 'P', vendorName: null }],
    ]);
    const out = buildFulfilItems([old, newer, done], names, today);
    expect(out.map((i) => i.requirement.id)).toEqual(['old', 'new']);
    expect(out[0].daysOpen).toBeGreaterThan(out[1].daysOpen);
    expect(out[1].vendorName).toBeNull();
  });
});

describe('buildRecentActivity', () => {
  const projectNames = new Map([['p1', 'Website'], ['p2', 'Mobile']]);

  it('sorts by date desc then created_at desc, and slices to limit', () => {
    const rows: LedgerEntry[] = [
      entry({ id: 'older', project_id: 'p1', type: 'client_payment', amount: 1, date: '2026-04-10', created_at: '2026-04-10T10:00:00Z' }),
      entry({ id: 'newer', project_id: 'p2', type: 'vendor_payment', amount: 2, date: '2026-04-16', created_at: '2026-04-16T12:00:00Z' }),
      entry({ id: 'same-day-later', project_id: 'p1', type: 'client_payment', amount: 3, date: '2026-04-10', created_at: '2026-04-10T15:00:00Z' }),
    ];
    const out = buildRecentActivity(rows, projectNames, 2);
    expect(out.map((i) => i.id)).toEqual(['newer', 'same-day-later']);
    expect(out[0].projectName).toBe('Mobile');
  });

  it('falls back to "—" when project not in map', () => {
    const rows: LedgerEntry[] = [
      entry({ id: 'x', project_id: 'orphan', type: 'client_payment', amount: 1, date: '2026-04-10' }),
    ];
    const out = buildRecentActivity(rows, projectNames, 4);
    expect(out[0].projectName).toBe('—');
  });
});
