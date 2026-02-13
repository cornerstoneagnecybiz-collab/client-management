import { createClient } from '@/lib/supabase/server';
import { actualProfit } from '@/types';
import { AnalyticsView } from './analytics-view';

export default async function ReportsPage() {
  const supabase = await createClient();

  const [
    { data: projects },
    { data: requirements },
    { data: ledgerRows },
    { data: ledgerForTime },
    { data: invoices },
  ] = await Promise.all([
    supabase.from('projects').select('id, status, created_at'),
    supabase.from('requirements').select('id, fulfilment_status, client_price, expected_vendor_cost, created_at'),
    supabase.from('ledger_entries').select('type, amount, project_id'),
    supabase.from('ledger_entries').select('type, amount, date').order('date', { ascending: true }),
    supabase.from('invoices').select('id, status, amount, created_at'),
  ]);

  const projectCountByStatus: Record<string, number> = {};
  for (const p of projects ?? []) {
    const s = p.status as string;
    projectCountByStatus[s] = (projectCountByStatus[s] ?? 0) + 1;
  }

  const reqCountByStatus: Record<string, number> = {};
  let plannedProfitTotal = 0;
  for (const r of requirements ?? []) {
    const s = r.fulfilment_status as string;
    reqCountByStatus[s] = (reqCountByStatus[s] ?? 0) + 1;
    if (r.client_price != null && r.expected_vendor_cost != null) {
      plannedProfitTotal += r.client_price - r.expected_vendor_cost;
    }
  }

  let clientInvoices = 0;
  let clientPayments = 0;
  let vendorExpected = 0;
  let vendorPaid = 0;
  for (const e of ledgerRows ?? []) {
    switch (e.type) {
      case 'client_invoice':
        clientInvoices += e.amount;
        break;
      case 'client_payment':
        clientPayments += e.amount;
        break;
      case 'vendor_expected_cost':
        vendorExpected += e.amount;
        break;
      case 'vendor_payment':
        vendorPaid += e.amount;
        break;
    }
  }
  const actualProfitTotal = actualProfit(clientPayments, vendorPaid);

  const invoiceCountByStatus: Record<string, number> = {};
  const invoiceAmountByStatus: Record<string, number> = {};
  for (const inv of invoices ?? []) {
    const s = inv.status as string;
    invoiceCountByStatus[s] = (invoiceCountByStatus[s] ?? 0) + 1;
    invoiceAmountByStatus[s] = (invoiceAmountByStatus[s] ?? 0) + (inv.amount ?? 0);
  }

  const statusLabels: Record<string, string> = {
    draft: 'Draft',
    active: 'Active',
    on_hold: 'On hold',
    completed: 'Completed',
    cancelled: 'Cancelled',
    pending: 'Pending',
    in_progress: 'In progress',
    fulfilled: 'Fulfilled',
    issued: 'Issued',
    paid: 'Paid',
    overdue: 'Overdue',
  };

  const monthMap = new Map<string, { client_invoice: number; client_payment: number; vendor_payment: number }>();
  for (const e of ledgerForTime ?? []) {
    const month = (e.date as string).slice(0, 7);
    if (!monthMap.has(month)) monthMap.set(month, { client_invoice: 0, client_payment: 0, vendor_payment: 0 });
    const row = monthMap.get(month)!;
    const amt = Number(e.amount);
    if (e.type === 'client_invoice') row.client_invoice += amt;
    else if (e.type === 'client_payment') row.client_payment += amt;
    else if (e.type === 'vendor_payment') row.vendor_payment += amt;
  }
  const cashFlowByMonth = Array.from(monthMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, row]) => ({ month, ...row }));

  const data = {
    projectCountByStatus,
    reqCountByStatus,
    invoiceCountByStatus,
    invoiceAmountByStatus,
    clientInvoices,
    clientPayments,
    vendorExpected,
    vendorPaid,
    actualProfitTotal,
    plannedProfitTotal,
    totalProjects: projects?.length ?? 0,
    totalRequirements: requirements?.length ?? 0,
    statusLabels,
    cashFlowByMonth,
  };

  return <AnalyticsView data={data} />;
}
