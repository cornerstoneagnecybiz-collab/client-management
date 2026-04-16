'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Modal } from '@/components/ui/modal';
import { Plus } from 'lucide-react';
import type { ProjectStatus } from '@/types';
import { ProjectRow } from './project-row';
import { NewProjectForm } from './new-project-form';
import { useDirtyConfirm } from '@/hooks/use-dirty-confirm';

export interface ProjectListRow {
  id: string;
  name: string;
  status: ProjectStatus;
  engagement_type: 'one_time' | 'monthly';
  start_date: string | null;
  end_date: string | null;
  created_at: string;
  client_name: string | null;
}

interface ProjectsViewProps {
  rows: ProjectListRow[];
  clientOptions: { value: string; label: string }[];
  clientCount: number;
  clientId: string | null;
  filterClientName: string | null;
  engagementFilter: 'one_time' | 'monthly' | null;
  initialCreateOpen?: boolean;
}

export function ProjectsView({
  rows,
  clientOptions,
  clientCount,
  clientId,
  filterClientName,
  engagementFilter,
  initialCreateOpen = false,
}: ProjectsViewProps) {
  const router = useRouter();
  const [createOpen, setCreateOpen] = useState(initialCreateOpen);

  useEffect(() => {
    if (initialCreateOpen) setCreateOpen(true);
  }, [initialCreateOpen]);

  const newProjectDirty = useDirtyConfirm(() => setCreateOpen(false));

  const canCreate = clientOptions.length > 0;

  function openCreate() {
    if (!canCreate) {
      router.push('/clients');
      return;
    }
    setCreateOpen(true);
  }

  return (
    <>
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Projects</h1>
            <p className="text-muted-foreground mt-1">
              {filterClientName ? (
                <>Showing projects for <strong>{filterClientName}</strong>.{' '}
                  <Link href="/projects" className="text-primary hover:underline">Show all</Link>
                </>
              ) : engagementFilter ? (
                <>Showing <strong>{engagementFilter === 'monthly' ? 'monthly retainers' : 'one-time projects'}</strong>.{' '}
                  <Link href="/projects" className="text-primary hover:underline">Show all</Link>
                </>
              ) : (
                'Create and manage client projects. One-time or monthly.'
              )}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm text-muted-foreground">Type:</span>
            <Link
              href={clientId ? `/projects?client=${clientId}` : '/projects'}
              className={`rounded-lg px-3 py-1.5 text-sm font-medium ${!engagementFilter ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-muted/80'}`}
            >
              All
            </Link>
            <Link
              href={clientId ? `/projects?client=${clientId}&type=one_time` : '/projects?type=one_time'}
              className={`rounded-lg px-3 py-1.5 text-sm font-medium ${engagementFilter === 'one_time' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-muted/80'}`}
            >
              One-time
            </Link>
            <Link
              href={clientId ? `/projects?client=${clientId}&type=monthly` : '/projects?type=monthly'}
              className={`rounded-lg px-3 py-1.5 text-sm font-medium ${engagementFilter === 'monthly' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-muted/80'}`}
            >
              Monthly
            </Link>
          </div>
          <Button onClick={openCreate}>
            <Plus className="h-4 w-4" />
            New project
          </Button>
        </div>

        <div className="glass-card overflow-hidden">
          {rows.length === 0 ? (
            <div className="p-12 text-center">
              <p className="text-muted-foreground">
                {clientId ? 'No projects for this client yet.' : 'No projects yet.'}
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                {clientId
                  ? 'Create a project for this client.'
                  : clientCount === 0
                    ? 'Add a client first, then create a project for them.'
                    : 'Create a project and link it to a client.'}
              </p>
              <div className="mt-4 flex justify-center gap-3">
                {clientId ? (
                  <Button onClick={openCreate}>New project for this client</Button>
                ) : clientCount === 0 ? (
                  <Button asChild>
                    <Link href="/clients">Add client</Link>
                  </Button>
                ) : (
                  <Button onClick={openCreate}>New project</Button>
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

      <Modal
        open={createOpen}
        onOpenChange={newProjectDirty.handleOpenChange}
        title="New project"
        description="Link a project to a client. You can add requirements in the next step."
        size="md"
      >
        <NewProjectForm
          clientOptions={clientOptions}
          defaultClientId={clientId ?? ''}
          onDirtyChange={newProjectDirty.setDirty}
          onSuccess={newProjectDirty.closeConfirmed}
          onCancel={() => newProjectDirty.handleOpenChange(false)}
        />
      </Modal>
    </>
  );
}
