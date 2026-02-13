'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { SlidePanel } from '@/components/ui/slide-panel';
import { Plus, ChevronRight } from 'lucide-react';
import { NewClientForm } from './new-client-form';
import { ClientDetailPanel, type ClientRow } from './client-detail-panel';

interface ClientsViewProps {
  initialClients: ClientRow[];
  projectCountByClientId: Record<string, number>;
  initialOpenId?: string | null;
  initialCreateOpen?: boolean;
}

export function ClientsView({
  initialClients,
  projectCountByClientId,
  initialOpenId,
  initialCreateOpen = false,
}: ClientsViewProps) {
  const router = useRouter();
  const [clients, setClients] = useState(initialClients);
  const [createOpen, setCreateOpen] = useState(initialCreateOpen);
  const [detailId, setDetailId] = useState<string | null>(initialOpenId ?? null);

  useEffect(() => {
    setClients(initialClients);
  }, [initialClients]);

  useEffect(() => {
    if (initialOpenId) setDetailId(initialOpenId);
  }, [initialOpenId]);

  useEffect(() => {
    if (initialCreateOpen) setCreateOpen(true);
  }, [initialCreateOpen]);

  const selectedClient = detailId ? clients.find((c) => c.id === detailId) : null;
  const selectedProjectCount = selectedClient ? (projectCountByClientId[selectedClient.id] ?? 0) : 0;

  function refresh() {
    router.refresh();
  }

  return (
    <>
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Clients</h1>
            <p className="mt-1 text-muted-foreground">Add clients first, then create projects for them.</p>
          </div>
          <Button onClick={() => setCreateOpen(true)}>
            <Plus className="h-4 w-4" />
            New client
          </Button>
        </div>

        <div className="glass-card overflow-hidden">
          {clients.length === 0 ? (
            <div className="p-12 text-center">
              <p className="text-muted-foreground">No clients yet.</p>
              <p className="mt-1 text-sm text-muted-foreground">Add your first client to start creating projects.</p>
              <Button className="mt-4" onClick={() => setCreateOpen(true)}>
                <Plus className="h-4 w-4" />
                Add client
              </Button>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="content-cell text-left font-medium px-4">Name</th>
                  <th className="content-cell text-left font-medium px-4">Company</th>
                  <th className="content-cell text-left font-medium px-4">Contact</th>
                  <th className="content-cell text-left font-medium px-4">Projects</th>
                  <th className="content-cell w-10 px-2" aria-hidden><span className="sr-only">Open</span></th>
                </tr>
              </thead>
              <tbody>
                {clients.map((row, index) => (
                  <tr
                    key={row.id}
                    role="button"
                    tabIndex={0}
                    className={`border-b border-border/50 hover:bg-muted/30 transition-colors cursor-pointer ${index % 2 === 1 ? 'bg-muted/10' : ''}`}
                    onClick={() => setDetailId(row.id)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        setDetailId(row.id);
                      }
                    }}
                  >
                    <td className="content-cell px-4 font-medium">{row.name}</td>
                    <td className="content-cell px-4 text-muted-foreground">{row.company ?? '—'}</td>
                    <td className="content-cell px-4 text-muted-foreground">
                      {[row.phone, row.email].filter(Boolean).join(' · ') || '—'}
                    </td>
                    <td className="content-cell px-4 text-muted-foreground">
                      {projectCountByClientId[row.id] ?? 0}
                    </td>
                    <td className="content-cell px-2 text-muted-foreground">
                      <ChevronRight className="h-4 w-4 shrink-0" aria-hidden />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      <SlidePanel open={createOpen} onOpenChange={setCreateOpen} title="New client">
        <NewClientForm onSuccess={() => { setCreateOpen(false); refresh(); }} onCancel={() => setCreateOpen(false)} />
      </SlidePanel>

      <SlidePanel open={!!selectedClient} onOpenChange={(open) => !open && setDetailId(null)} title={selectedClient?.name ?? 'Client'}>
        {selectedClient && (
          <ClientDetailPanel
            client={selectedClient}
            projectCount={selectedProjectCount}
            onSuccess={() => { setDetailId(null); refresh(); }}
            onClose={() => setDetailId(null)}
          />
        )}
      </SlidePanel>
    </>
  );
}
