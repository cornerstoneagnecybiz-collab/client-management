import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { ClientTabs } from './client-tabs';
import { Breadcrumbs } from '@/components/breadcrumbs';
import type { InvoiceRow } from '@/app/(dashboard)/invoicing/page';
import type { ActivityEntryRow } from '@/app/(dashboard)/activity/page';
import type { LedgerEntryType } from '@/types';
import { projectNameFromRelation } from '@/lib/utils';

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
      project_name: projectNameFromRelation(r.projects),
      type: r.type as InvoiceRow['type'],
      amount: r.amount,
      status: r.status as InvoiceRow['status'],
      issue_date: r.issue_date,
      due_date: r.due_date,
      billing_month: r.billing_month ?? null,
      created_at: r.created_at,
    }));

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
      project_name: projectNameFromRelation(r.projects),
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
      <div className="space-y-1">
        <Breadcrumbs items={[{ label: 'Clients', href: '/clients' }, { label: client.name }]} />
        <h1 className="text-2xl font-semibold tracking-tight truncate">{client.name}</h1>
        {client.company && (
          <p className="text-muted-foreground text-sm">{client.company}</p>
        )}
      </div>

      <ClientTabs
        client={clientRow}
        projects={projects}
        invoices={clientInvoices}
        activityEntries={clientActivity}
      />
    </div>
  );
}
