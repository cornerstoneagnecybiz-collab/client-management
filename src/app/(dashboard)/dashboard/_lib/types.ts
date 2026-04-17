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
  /**
   * % change vs same day-of-month previous month. Null when the prior period
   * is zero (percentage change is undefined) — treated as "no comparable baseline".
   */
  deltaPct: number | null;
  /** Daily cumulative MTD values, one per day-of-month through today. */
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
  /** 0–30 days since issue (inclusive). */
  current: { amount: number; count: number };
  /** 31–60 days since issue (inclusive). */
  stale: { amount: number; count: number };
  /** 61+ days since issue. */
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
  funnel: FunnelStage[]; // 7 stages in sidebar order
  aging: AgingBuckets;
  pendingPayoutsTop: PayItem[]; // top 3 (subset of `pay`)
  /** Total INR across ALL pending payouts (not just the top 3 shown). */
  pendingPayTotal: number;
  recentActivity: ActivityItem[]; // last 4
  variance: VariancePortfolio;
}
