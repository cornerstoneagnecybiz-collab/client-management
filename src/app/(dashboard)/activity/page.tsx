import { createClient } from '@/lib/supabase/server';
import { ActivityView } from './activity-view';
import type { LedgerEntryType } from '@/types';

export interface ActivityEntryRow {
  id: string;
  project_id: string;
  project_name: string;
  type: LedgerEntryType;
  amount: number;
  date: string;
  reference_id: string | null;
  created_at: string;
}

export default async function ActivityPage({
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
    .order('created_at', { ascending: false })
    .limit(200);

  if (projectId) query = query.eq('project_id', projectId);
  if (dateFrom) query = query.gte('date', dateFrom);
  if (dateTo) query = query.lte('date', dateTo);

  const { data: rows, error } = await query;

  if (error) {
    return (
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Activity</h1>
        <p className="mt-2 text-sm text-red-500">Failed to load: {error.message}</p>
      </div>
    );
  }

  const entries: ActivityEntryRow[] = (rows ?? []).map((r) => {
    const project = r.projects as unknown as { name: string } | { name: string }[] | null;
    const name = Array.isArray(project) ? project[0]?.name : project?.name;
    return {
      id: r.id,
      project_id: r.project_id,
      project_name: name ?? '—',
      type: r.type as LedgerEntryType,
      amount: r.amount,
      date: r.date,
      reference_id: r.reference_id,
      created_at: r.created_at,
    };
  });

  const { data: projects } = await supabase.from('projects').select('id, name').order('name');

  return (
    <ActivityView
      initialEntries={entries}
      projectOptions={projects?.map((p) => ({ value: p.id, label: p.name })) ?? []}
      initialProjectId={projectId ?? null}
      initialDateFrom={dateFrom ?? null}
      initialDateTo={dateTo ?? null}
    />
  );
}
