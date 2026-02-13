import { Suspense } from 'react';
import { createClient } from '@/lib/supabase/server';
import { LedgerView } from './ledger-view';
import type { LedgerEntryType } from '@/types';
import { projectNameFromRelation } from '@/lib/utils';

export interface LedgerEntryRow {
  id: string;
  project_id: string;
  project_name: string;
  type: LedgerEntryType;
  amount: number;
  date: string;
  reference_id: string | null;
  created_at: string;
}

export default async function LedgerPage({
  searchParams,
}: {
  searchParams: Promise<{ project?: string; dateFrom?: string; dateTo?: string }>;
}) {
  const { project: projectId, dateFrom, dateTo } = await searchParams;
  const supabase = await createClient();

  let query = supabase
    .from('ledger_entries')
    .select('id, project_id, type, amount, date, reference_id, created_at, projects(name)')
    .order('date', { ascending: false })
    .order('created_at', { ascending: false });

  if (projectId) query = query.eq('project_id', projectId);
  if (dateFrom) query = query.gte('date', dateFrom);
  if (dateTo) query = query.lte('date', dateTo);

  const { data: rows, error } = await query;

  if (error) {
    return (
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Ledger</h1>
        <p className="mt-2 text-sm text-red-500">Failed to load: {error.message}</p>
      </div>
    );
  }

  const entries: LedgerEntryRow[] = (rows ?? []).map((r) => ({
    id: r.id,
    project_id: r.project_id,
    project_name: projectNameFromRelation(r.projects),
    type: r.type as LedgerEntryType,
    amount: r.amount,
    date: r.date,
    reference_id: r.reference_id,
    created_at: r.created_at,
  }));

  const { data: projects } = await supabase.from('projects').select('id, name').order('name');

  return (
    <Suspense fallback={<div className="space-y-6"><div className="h-9 w-64 rounded bg-muted animate-pulse" /><div className="h-32 rounded-xl bg-muted animate-pulse" /></div>}>
      <LedgerView
        initialEntries={entries}
        projectOptions={projects?.map((p) => ({ value: p.id, label: p.name })) ?? []}
        initialProjectId={projectId ?? null}
        initialDateFrom={dateFrom ?? null}
        initialDateTo={dateTo ?? null}
      />
    </Suspense>
  );
}
