import { createClient } from '@/lib/supabase/server';
import { ClientsView } from './clients-view';

export default async function ClientsPage({
  searchParams,
}: {
  searchParams: Promise<{ id?: string; new?: string }>;
}) {
  const { id: openId, new: openNew } = await searchParams;
  const supabase = await createClient();

  const { data: rows, error } = await supabase
    .from('clients')
    .select('id, name, company, phone, email, gst, created_at')
    .order('name');

  if (error) {
    return (
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Clients</h1>
        <p className="mt-2 text-sm text-red-500">Failed to load: {error.message}</p>
      </div>
    );
  }

  const clients = (rows ?? []).map((r) => ({
    id: r.id,
    name: r.name,
    company: r.company,
    phone: r.phone,
    email: r.email,
    gst: r.gst,
    created_at: r.created_at,
  }));

  const { data: projectCounts } = await supabase.from('projects').select('client_id');
  const projectCountByClientId: Record<string, number> = {};
  for (const p of projectCounts ?? []) {
    projectCountByClientId[p.client_id] = (projectCountByClientId[p.client_id] ?? 0) + 1;
  }

  return (
    <ClientsView
      initialClients={clients}
      projectCountByClientId={projectCountByClientId}
      initialOpenId={openId ?? null}
      initialCreateOpen={openNew === '1'}
    />
  );
}
