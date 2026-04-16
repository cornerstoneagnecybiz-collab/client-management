import { createClient } from '@/lib/supabase/server';
import type { ProjectStatus } from '@/types';
import { relationNameFromRelation } from '@/lib/utils';
import { ProjectsView } from './projects-view';

export default async function ProjectsPage({
  searchParams,
}: {
  searchParams: Promise<{ client?: string; type?: string; create?: string }>;
}) {
  const { client: clientId, type: engagementFilter, create } = await searchParams;
  const supabase = await createClient();

  let query = supabase
    .from('projects')
    .select('id, name, status, engagement_type, start_date, end_date, created_at, clients(id, name)')
    .order('created_at', { ascending: false });
  if (clientId) query = query.eq('client_id', clientId);
  if (engagementFilter === 'one_time' || engagementFilter === 'monthly') query = query.eq('engagement_type', engagementFilter);
  const { data: projects, error } = await query;

  if (error) {
    return (
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Projects</h1>
        <p className="mt-2 text-sm text-red-500">Failed to load projects: {error.message}</p>
      </div>
    );
  }

  const rows = (projects ?? []).map((p) => ({
    id: p.id,
    name: p.name,
    status: p.status as ProjectStatus,
    engagement_type: (p.engagement_type as 'one_time' | 'monthly') ?? 'one_time',
    start_date: p.start_date,
    end_date: p.end_date,
    created_at: p.created_at,
    client_name: relationNameFromRelation(p.clients),
  }));

  const { data: clients } = await supabase.from('clients').select('id, name').order('name');
  const clientOptions = (clients ?? []).map((c) => ({ value: c.id, label: c.name }));

  let filterClientName: string | null = null;
  if (clientId) {
    const { data: c } = await supabase.from('clients').select('name').eq('id', clientId).single();
    filterClientName = c?.name ?? null;
  }

  return (
    <ProjectsView
      rows={rows}
      clientOptions={clientOptions}
      clientCount={clientOptions.length}
      clientId={clientId ?? null}
      filterClientName={filterClientName}
      engagementFilter={
        engagementFilter === 'one_time' || engagementFilter === 'monthly' ? engagementFilter : null
      }
      initialCreateOpen={create === '1'}
    />
  );
}
