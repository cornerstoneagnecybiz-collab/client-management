import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { Button } from '@/components/ui/button';
import type { ProjectStatus } from '@/types';
import { Plus } from 'lucide-react';
import { ProjectRow } from './project-row';
import { relationNameFromRelation } from '@/lib/utils';

export default async function ProjectsPage({
  searchParams,
}: {
  searchParams: Promise<{ client?: string; type?: string }>;
}) {
  const { client: clientId, type: engagementFilter } = await searchParams;
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

  let clientCount: number | null = null;
  let filterClientName: string | null = null;
  if (rows.length === 0) {
    const res = await supabase.from('clients').select('*', { count: 'exact', head: true });
    clientCount = res.count;
  }
  if (clientId) {
    const { data: c } = await supabase.from('clients').select('name').eq('id', clientId).single();
    filterClientName = c?.name ?? null;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Projects</h1>
          <p className="text-muted-foreground mt-1">
            {filterClientName ? (
              <>Showing projects for <strong>{filterClientName}</strong>. <Link href="/projects" className="text-primary hover:underline">Show all</Link></>
            ) : engagementFilter ? (
              <>Showing <strong>{engagementFilter === 'monthly' ? 'monthly retainers' : 'one-time projects'}</strong>. <Link href="/projects" className="text-primary hover:underline">Show all</Link></>
            ) : (
              'Create and manage client projects. One-time or monthly.'
            )}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm text-muted-foreground">Type:</span>
          <Link href={clientId ? `/projects?client=${clientId}` : '/projects'} className={`rounded-lg px-3 py-1.5 text-sm font-medium ${!engagementFilter ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-muted/80'}`}>
            All
          </Link>
          <Link href={clientId ? `/projects?client=${clientId}&type=one_time` : '/projects?type=one_time'} className={`rounded-lg px-3 py-1.5 text-sm font-medium ${engagementFilter === 'one_time' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-muted/80'}`}>
            One-time
          </Link>
          <Link href={clientId ? `/projects?client=${clientId}&type=monthly` : '/projects?type=monthly'} className={`rounded-lg px-3 py-1.5 text-sm font-medium ${engagementFilter === 'monthly' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-muted/80'}`}>
            Monthly
          </Link>
        </div>
        <Button asChild>
          <Link href={clientId ? `/projects/new?client=${clientId}` : '/projects/new'}>
            <Plus className="h-4 w-4" />
            New project
          </Link>
        </Button>
      </div>

      <div className="glass-card overflow-hidden">
        {rows.length === 0 ? (
          <div className="p-12 text-center">
            <p className="text-muted-foreground">
              {clientId ? `No projects for this client yet.` : 'No projects yet.'}
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              {clientId
                ? 'Create a project for this client.'
                : (clientCount ?? 0) === 0
                  ? 'Add a client first, then create a project for them.'
                  : 'Create a project and link it to a client.'}
            </p>
            <div className="mt-4 flex justify-center gap-3">
              {clientId ? (
                <Button asChild>
                  <Link href={`/projects/new?client=${clientId}`}>New project for this client</Link>
                </Button>
              ) : (clientCount ?? 0) === 0 ? (
                <Button asChild>
                  <Link href="/clients">Add client</Link>
                </Button>
              ) : (
                <Button asChild>
                  <Link href="/projects/new">New project</Link>
                </Button>
              )}
            </div>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="content-cell text-left font-medium px-4">Project</th>
                <th className="content-cell text-left font-medium px-4">Client</th>
                <th className="content-cell text-left font-medium px-4">Type</th>
                <th className="content-cell text-left font-medium px-4">Status</th>
                <th className="content-cell text-left font-medium px-4">Start</th>
                <th className="content-cell text-left font-medium px-4">Expected end</th>
                <th className="content-cell w-10 px-2" aria-hidden>
                  <span className="sr-only">Open</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, index) => (
                <ProjectRow key={row.id} row={row} index={index} />
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
