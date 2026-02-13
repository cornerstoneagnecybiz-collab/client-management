import Link from 'next/link';
import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { Button } from '@/components/ui/button';
import { ClientTabs } from './client-tabs';
import { ArrowLeft } from 'lucide-react';
import type { InvoiceRow, PaymentRow } from '@/app/(dashboard)/finance/page';
import type { ActivityEntryRow } from '@/app/(dashboard)/activity/page';
import type { LedgerEntryType } from '@/types';

export default async function ClientDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: client, error } = await supabase
    .from('clients')
    .select('id, name, company, phone, email, gst, created_at')
    .eq('id', id)
    .single();

  if (error || !client) notFound();

  const { data: projectRows } = await supabase
    .from('projects')
    .select('id, name, status, engagement_type, start_date, end_date, created_at')
    .eq('client_id', id)
    .order('name');

  const projects = (projectRows ?? []).map((p) => ({
    id: p.id,
    name: p.name,
    status: p.status,
    engagement_type: (p.engagement_type as 'one_time' | 'monthly') ?? 'one_time',
    start_date: p.start_date,
    end_date: p.end_date,
    created_at: p.created_at,
  }));

  const projectIds = projects.map((p) => p.id);
  let clientInvoices: InvoiceRow[] = [];
  let paymentsByInvoiceId: Record<string, PaymentRow[]> = {};
  let clientActivity: ActivityEntryRow[] = [];

  if (projectIds.length > 0) {
    const { data: invRows } = await supabase
      .from('invoices')
      .select('id, project_id, type, amount, status, issue_date, due_date, billing_month, created_at, projects(name)')
      .in('project_id', projectIds)
      .order('created_at', { ascending: false });

    clientInvoices = (invRows ?? []).map((r) => ({
      id: r.id,
      project_id: r.project_id,
      project_name: (r.projects as { name: string } | null)?.name ?? '—',
      type: r.type as InvoiceRow['type'],
      amount: r.amount,
      status: r.status as InvoiceRow['status'],
      issue_date: r.issue_date,
      due_date: r.due_date,
      billing_month: r.billing_month ?? null,
      created_at: r.created_at,
    }));

    if (clientInvoices.length > 0) {
      const { data: paymentRows } = await supabase
        .from('payments_received')
        .select('id, invoice_id, amount, date, mode')
        .in('invoice_id', clientInvoices.map((i) => i.id));
      for (const p of paymentRows ?? []) {
        const row = { id: p.id, invoice_id: p.invoice_id, amount: p.amount, date: p.date, mode: p.mode };
        if (!paymentsByInvoiceId[p.invoice_id]) paymentsByInvoiceId[p.invoice_id] = [];
        paymentsByInvoiceId[p.invoice_id].push(row);
      }
    }

    const { data: ledgerRows } = await supabase
      .from('ledger_entries')
      .select('id, project_id, type, amount, date, reference_id, created_at, projects(name)')
      .in('project_id', projectIds)
      .order('date', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(100);

    clientActivity = (ledgerRows ?? []).map((r) => ({
      id: r.id,
      project_id: r.project_id,
      project_name: (r.projects as { name: string } | null)?.name ?? '—',
      type: r.type as LedgerEntryType,
      amount: r.amount,
      date: r.date,
      reference_id: r.reference_id,
      created_at: r.created_at,
    }));
  }

  const clientRow = {
    id: client.id,
    name: client.name,
    company: client.company,
    phone: client.phone,
    email: client.email,
    gst: client.gst,
    created_at: client.created_at,
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/clients" aria-label="Back to clients">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div className="min-w-0 flex-1">
          <h1 className="text-2xl font-semibold tracking-tight truncate">{client.name}</h1>
          {client.company && (
            <p className="text-muted-foreground text-sm mt-0.5">{client.company}</p>
          )}
        </div>
      </div>

      <ClientTabs
        client={clientRow}
        projects={projects}
        invoices={clientInvoices}
        paymentsByInvoiceId={paymentsByInvoiceId}
        activityEntries={clientActivity}
      />
    </div>
  );
}
