'use server';

import { createClient } from '@/lib/supabase/server';
import { logAudit } from '@/lib/audit';
import type { InvoiceStatus, InvoiceType, VendorPayoutStatus } from '@/types';

/** Set invoice status to overdue where status is issued and due_date is past. Call from finance page load. */
/** Data for invoice print/preview: invoice, project, client, line items (requirement-based or single), payments. */
export async function getInvoicePrintData(invoiceId: string): Promise<{
  invoice?: {
    id: string;
    type: string;
    amount: number;
    status: string;
    issue_date: string | null;
    due_date: string | null;
    billing_month: string | null;
    project_id: string;
    invoice_number?: string;
  };
  project?: { name: string };
  client?: { name: string; company: string | null; phone: string | null; email: string | null };
  lineItems?: { description: string; type: string; qty: number; rate: number; amount: number }[];
  payments?: { amount: number; date: string; mode: string | null }[];
  totalPaid?: number;
  error?: string;
}> {
  const supabase = await createClient();
  const { data: inv, error: invError } = await supabase
    .from('invoices')
    .select('id, project_id, type, amount, status, issue_date, due_date, billing_month')
    .eq('id', invoiceId)
    .single();
  if (invError || !inv) return { error: invError?.message ?? 'Invoice not found' };

  const { data: proj, error: projError } = await supabase
    .from('projects')
    .select('name, client_id, engagement_type')
    .eq('id', inv.project_id)
    .single();
  if (projError || !proj) return { invoice: inv, error: projError?.message };
  const engagementType = (proj as { engagement_type?: string }).engagement_type ?? 'one_time';

  const { data: clientRow } = await supabase.from('clients').select('name, company, phone, email').eq('id', proj.client_id).single();
  const client = clientRow ?? undefined;

  const { data: paymentRows } = await supabase
    .from('payments_received')
    .select('amount, date, mode')
    .eq('invoice_id', invoiceId);
  const payments = (paymentRows ?? []).map((p) => ({ amount: Number(p.amount), date: p.date, mode: p.mode }));
  const totalPaid = payments.reduce((s, p) => s + p.amount, 0);

  let lineItems: { description: string; type: string; qty: number; rate: number; amount: number }[] = [];
  const type = inv.type as string;
  if (type === 'project' || type === 'milestone' || type === 'monthly') {
    const { data: reqRows } = await supabase
      .from('requirements')
      .select('id, title, client_price, quantity, period_days, unit_rate, service_catalog(service_name, catalog_type)')
      .eq('project_id', inv.project_id)
      .eq('fulfilment_status', 'fulfilled');
    if (reqRows && reqRows.length > 0) {
      const isMonthly = type === 'monthly' || engagementType === 'monthly';
      lineItems = reqRows.map((r) => {
        const catalog = r.service_catalog as { service_name: string; catalog_type: string } | null;
        const serviceName = catalog?.service_name ?? 'Item';
        const catalogType = (catalog?.catalog_type ?? 'services') as string;
        const amount = r.client_price != null ? Number(r.client_price) : 0;
        if (isMonthly) {
          return {
            description: `Monthly retainer — ${serviceName}`,
            type: catalogType.charAt(0).toUpperCase() + catalogType.slice(1),
            qty: 1,
            rate: amount,
            amount,
          };
        }
        const qtyNum = r.quantity != null ? Number(r.quantity) : null;
        const periodNum = r.period_days != null ? Number(r.period_days) : null;
        const unitRateNum = r.unit_rate != null ? Number(r.unit_rate) : null;
        const hasTm = qtyNum != null && qtyNum > 0 && (periodNum != null ? periodNum > 0 : true);
        if (hasTm && (periodNum == null || periodNum > 0)) {
          const qty = periodNum != null && periodNum > 0 ? qtyNum * periodNum : qtyNum;
          const rate = unitRateNum != null && unitRateNum >= 0 ? unitRateNum : (qty > 0 ? amount / qty : amount);
          const description =
            periodNum != null && periodNum > 0
              ? `${serviceName} — ${qtyNum} manpower for ${periodNum} days`
              : (r.title && r.title.trim() !== serviceName ? `${serviceName} — ${r.title}` : serviceName);
          return {
            description,
            type: catalogType.charAt(0).toUpperCase() + catalogType.slice(1),
            qty,
            rate,
            amount,
          };
        }
        const rate = amount;
        const qty = 1;
        const description = r.title && r.title.trim() !== serviceName ? `${serviceName} — ${r.title}` : serviceName;
        return {
          description,
          type: catalogType.charAt(0).toUpperCase() + catalogType.slice(1),
          qty,
          rate,
          amount,
        };
      });
    }
  }
  if (lineItems.length === 0) {
    const labels: Record<string, string> = { project: 'Project fee', milestone: 'Milestone payment', monthly: 'Monthly retainer' };
    lineItems = [{ description: labels[type] ?? 'Invoice amount', type: '—', qty: 1, rate: Number(inv.amount), amount: Number(inv.amount) }];
  }

  const invWithCreated = inv as { created_at?: string };
  const year = (inv.issue_date ?? invWithCreated.created_at ?? '').toString().slice(0, 4) || new Date().getFullYear().toString();
  const { data: yearInvoices } = await supabase
    .from('invoices')
    .select('id, created_at, issue_date')
    .order('created_at', { ascending: true });
  const sameYear = (yearInvoices ?? []).filter((r) => {
    const rYear = (r.issue_date ?? r.created_at ?? '').toString().slice(0, 4);
    return rYear === year;
  });
  const idx = sameYear.findIndex((r) => r.id === inv.id);
  const sequence = idx >= 0 ? idx + 1 : sameYear.length + 1;
  const invoiceNumber = `INV-${year}-${String(sequence).padStart(3, '0')}`;

  return {
    invoice: { ...inv, amount: Number(inv.amount), invoice_number: invoiceNumber },
    project: proj,
    client,
    lineItems,
    payments,
    totalPaid,
  };
}

/** Invoices that include this requirement (for display on requirement detail). */
export async function getInvoicesForRequirement(requirement_id: string): Promise<{
  invoices: { id: string; invoice_number: string }[];
  error?: string;
}> {
  const supabase = await createClient();
  const { data: links, error: linkError } = await supabase
    .from('invoice_requirements')
    .select('invoice_id')
    .eq('requirement_id', requirement_id);
  if (linkError) return { invoices: [], error: linkError.message };
  const invoiceIds = (links ?? []).map((r) => r.invoice_id).filter(Boolean);
  if (invoiceIds.length === 0) return { invoices: [] };

  const { data: allInvoices, error: invError } = await supabase
    .from('invoices')
    .select('id, issue_date, created_at')
    .order('created_at', { ascending: true });
  if (invError) return { invoices: [], error: invError.message };

  const byYear = new Map<string, { id: string }[]>();
  for (const inv of allInvoices ?? []) {
    const y = (inv.issue_date ?? inv.created_at ?? '').toString().slice(0, 4) || new Date().getFullYear().toString();
    if (!byYear.has(y)) byYear.set(y, []);
    byYear.get(y)!.push({ id: inv.id });
  }
  const result: { id: string; invoice_number: string }[] = [];
  for (const id of invoiceIds) {
    const inv = (allInvoices ?? []).find((i) => i.id === id);
    const y = inv ? (inv.issue_date ?? inv.created_at ?? '').toString().slice(0, 4) || new Date().getFullYear().toString() : new Date().getFullYear().toString();
    const sameYear = byYear.get(y) ?? [];
    const idx = sameYear.findIndex((r) => r.id === id);
    const seq = idx >= 0 ? idx + 1 : sameYear.length + 1;
    result.push({ id, invoice_number: `INV-${y}-${String(seq).padStart(3, '0')}` });
  }
  return { invoices: result };
}

export async function syncOverdueInvoices(): Promise<{ updated?: number; error?: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const today = new Date().toISOString().slice(0, 10);
  const { data, error } = await supabase
    .from('invoices')
    .update({ status: 'overdue' })
    .eq('status', 'issued')
    .not('due_date', 'is', null)
    .lt('due_date', today)
    .select('id');
  if (error) return { error: error.message };
  const updated = data?.length ?? 0;
  if (updated > 0 && user?.id) {
    const { createNotification } = await import('../notifications/actions');
    for (const row of data ?? []) {
      await createNotification({
        user_id: user.id,
        title: 'Invoice overdue',
        body: 'An invoice has passed its due date.',
        type: 'invoice_overdue',
        link_href: `/finance/invoice/${row.id}/print`,
        link_label: 'View invoice',
      });
    }
  }
  return { updated };
}

/** Sum of client_price for fulfilled requirements not yet on any issued/paid one-time invoice. For monthly projects we always suggest full sum (same retainer every month); for one-time we exclude requirements already on project/milestone invoices. */
export async function getSuggestedInvoiceAmount(project_id: string): Promise<{ amount: number; error?: string }> {
  const supabase = await createClient();
  const { data: fulfilled, error: reqError } = await supabase
    .from('requirements')
    .select('id, client_price')
    .eq('project_id', project_id)
    .eq('fulfilment_status', 'fulfilled');
  if (reqError) return { amount: 0, error: reqError.message };
  if (!fulfilled?.length) return { amount: 0 };

  const { data: projectInvoices } = await supabase
    .from('invoices')
    .select('id, type')
    .eq('project_id', project_id)
    .in('status', ['issued', 'paid']);
  const oneTimeInvoiceIds = (projectInvoices ?? [])
    .filter((i) => (i.type as string) === 'project' || (i.type as string) === 'milestone')
    .map((i) => i.id);
  if (oneTimeInvoiceIds.length === 0) {
    const amount = fulfilled.reduce((sum, r) => sum + (r.client_price ?? 0), 0);
    return { amount };
  }

  const { data: invoicedRows } = await supabase
    .from('invoice_requirements')
    .select('requirement_id')
    .in('invoice_id', oneTimeInvoiceIds);
  const invoicedIds = new Set((invoicedRows ?? []).map((r) => r.requirement_id));
  const amount = fulfilled
    .filter((r) => !invoicedIds.has(r.id))
    .reduce((sum, r) => sum + (r.client_price ?? 0), 0);
  return { amount };
}

export async function createInvoice(input: {
  project_id: string;
  type: InvoiceType;
  amount: number;
  issue_date?: string | null;
  due_date?: string | null;
  billing_month?: string | null;
}): Promise<{ id?: string; error?: string }> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('invoices')
    .insert({
      project_id: input.project_id,
      type: input.type,
      amount: Number(input.amount),
      issue_date: input.issue_date || null,
      due_date: input.due_date || null,
      billing_month: input.billing_month || null,
      status: 'draft',
    })
    .select('id')
    .single();

  if (error) return { error: error.message };
  return { id: data.id };
}

export async function updateInvoice(
  id: string,
  updates: {
    type?: InvoiceType;
    amount?: number;
    status?: InvoiceStatus;
    issue_date?: string | null;
    due_date?: string | null;
    billing_month?: string | null;
  }
): Promise<{ error?: string }> {
  const supabase = await createClient();
  const { data: existing } = await supabase.from('invoices').select('status, project_id, amount, issue_date').eq('id', id).single();
  const payload: Record<string, unknown> = { ...updates };
  if (updates.amount !== undefined) payload.amount = Number(updates.amount);
  const { error } = await supabase.from('invoices').update(payload).eq('id', id);
  if (error) return { error: error?.message };

  // When voiding an invoice: remove ledger "billed" entry and clear invoice_requirements so suggest-from-fulfilled is correct
  if (updates.status === 'cancelled' && existing?.status !== 'cancelled') {
    await supabase
      .from('ledger_entries')
      .delete()
      .eq('type', 'client_invoice')
      .eq('reference_id', id);
    await supabase.from('invoice_requirements').delete().eq('invoice_id', id);
  }

  if (updates.status === 'issued' && existing?.status !== 'issued') {
    const amount = updates.amount !== undefined ? Number(updates.amount) : existing.amount;
    const date = updates.issue_date || existing.issue_date || new Date().toISOString().slice(0, 10);
    await supabase.from('ledger_entries').insert({
      project_id: existing.project_id,
      type: 'client_invoice',
      amount,
      date,
      reference_id: id,
    });
    // Snapshot fulfilled requirements for this project so "Suggest from fulfilled" excludes them
    await supabase.from('invoice_requirements').delete().eq('invoice_id', id);
    const { data: fulfilled } = await supabase
      .from('requirements')
      .select('id')
      .eq('project_id', existing.project_id)
      .eq('fulfilment_status', 'fulfilled');
    if (fulfilled?.length) {
      await supabase.from('invoice_requirements').insert(
        fulfilled.map((r) => ({ invoice_id: id, requirement_id: r.id }))
      );
    }
    await logAudit('invoice_issued', 'invoice', id, { project_id: existing.project_id, amount });
  }
  return {};
}

export async function recordPaymentReceived(input: {
  invoice_id: string;
  amount: number;
  date: string;
  mode?: string | null;
}): Promise<{ id?: string; error?: string }> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('payments_received')
    .insert({
      invoice_id: input.invoice_id,
      amount: Number(input.amount),
      date: input.date,
      mode: input.mode?.trim() || null,
    })
    .select('id')
    .single();

  if (error) return { error: error.message };

  const { data: inv } = await supabase.from('invoices').select('project_id, amount').eq('id', input.invoice_id).single();
  if (inv?.project_id) {
    await supabase.from('ledger_entries').insert({
      project_id: inv.project_id,
      type: 'client_payment',
      amount: Number(input.amount),
      date: input.date,
      reference_id: data.id,
    });
  }

  // Auto-update invoice status to paid when total payments >= invoice amount
  const { data: allPayments } = await supabase
    .from('payments_received')
    .select('amount')
    .eq('invoice_id', input.invoice_id);
  const totalPaid = (allPayments ?? []).reduce((s, p) => s + Number(p.amount), 0);
  const invoiceAmount = inv?.amount != null ? Number(inv.amount) : 0;
  if (invoiceAmount > 0 && totalPaid >= invoiceAmount) {
    await supabase.from('invoices').update({ status: 'paid' }).eq('id', input.invoice_id);
  }

  await logAudit('payment_received', 'payment_received', data.id, {
    invoice_id: input.invoice_id,
    amount: input.amount,
    date: input.date,
  });
  return { id: data.id };
}

/** Remove a payment and its ledger entry so "Payments received" totals stay correct. */
export async function deletePaymentReceived(paymentId: string): Promise<{ error?: string }> {
  const supabase = await createClient();
  const { data: payment } = await supabase.from('payments_received').select('invoice_id').eq('id', paymentId).single();
  if (!payment) return { error: 'Payment not found' };

  await supabase
    .from('ledger_entries')
    .delete()
    .eq('type', 'client_payment')
    .eq('reference_id', paymentId);

  const { error } = await supabase.from('payments_received').delete().eq('id', paymentId);
  if (error) return { error: error.message };

  const { data: allPayments } = await supabase.from('payments_received').select('amount').eq('invoice_id', payment.invoice_id);
  const totalPaid = (allPayments ?? []).reduce((s, p) => s + Number(p.amount), 0);
  const { data: inv } = await supabase.from('invoices').select('amount').eq('id', payment.invoice_id).single();
  const invoiceAmount = inv?.amount != null ? Number(inv.amount) : 0;
  if (invoiceAmount > 0 && totalPaid < invoiceAmount) {
    await supabase.from('invoices').update({ status: 'issued' }).eq('id', payment.invoice_id);
  }
  return {};
}

export async function createVendorPayout(input: {
  requirement_id: string;
  vendor_id: string;
  amount: number;
  paid_date?: string | null;
}): Promise<{ id?: string; error?: string }> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('vendor_payouts')
    .insert({
      requirement_id: input.requirement_id,
      vendor_id: input.vendor_id,
      amount: Number(input.amount),
      paid_date: input.paid_date || null,
      status: input.paid_date ? 'paid' : 'pending',
    })
    .select('id')
    .single();

  if (error) return { error: error.message };

  if (input.paid_date) {
    const { data: req } = await supabase.from('requirements').select('project_id').eq('id', input.requirement_id).single();
    if (req?.project_id) {
      await supabase.from('ledger_entries').insert({
        project_id: req.project_id,
        type: 'vendor_payment',
        amount: Number(input.amount),
        date: input.paid_date,
        reference_id: data.id,
      });
    }
    await logAudit('vendor_payout_paid', 'vendor_payout', data.id, {
      requirement_id: input.requirement_id,
      amount: input.amount,
      paid_date: input.paid_date,
    });
  }
  return { id: data.id };
}

export async function updateVendorPayout(
  id: string,
  updates: { status?: VendorPayoutStatus; paid_date?: string | null }
): Promise<{ error?: string }> {
  const supabase = await createClient();
  const { data: existing } = await supabase.from('vendor_payouts').select('status, paid_date, requirement_id').eq('id', id).single();
  const { error } = await supabase.from('vendor_payouts').update(updates).eq('id', id);
  if (error) return { error: error?.message };

  const newStatus = updates.status ?? existing?.status;
  const newPaidDate = updates.paid_date !== undefined ? updates.paid_date : existing?.paid_date;
  if (newStatus === 'paid' && newPaidDate && existing?.status !== 'paid') {
    const { data: req } = await supabase.from('requirements').select('project_id').eq('id', existing.requirement_id).single();
    if (req?.project_id) {
      const { data: payout } = await supabase.from('vendor_payouts').select('amount').eq('id', id).single();
      if (payout) {
        await supabase.from('ledger_entries').insert({
          project_id: req.project_id,
          type: 'vendor_payment',
          amount: payout.amount,
          date: newPaidDate,
          reference_id: id,
        });
      }
    }
    await logAudit('vendor_payout_paid', 'vendor_payout', id, {
      requirement_id: existing.requirement_id,
      paid_date: newPaidDate,
    });
  }
  // When payout is reverted from paid to pending/cancelled, remove the ledger entry we created
  if (newStatus !== 'paid' && existing?.status === 'paid') {
    await supabase
      .from('ledger_entries')
      .delete()
      .eq('type', 'vendor_payment')
      .eq('reference_id', id);
  }
  return {};
}
