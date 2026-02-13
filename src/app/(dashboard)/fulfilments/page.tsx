import { createClient } from '@/lib/supabase/server';
import { FulfilmentsView } from './fulfilments-view';
import type { RequirementRow } from '../requirements/page';

export default async function FulfilmentsPage({
  searchParams,
}: {
  searchParams: Promise<{ id?: string }>;
}) {
  const { id: openId } = await searchParams;
  const supabase = await createClient();

  const { data: rows, error } = await supabase
    .from('requirements')
    .select(`
      id,
      project_id,
      service_catalog_id,
      title,
      description,
      delivery,
      assigned_vendor_id,
      client_price,
      expected_vendor_cost,
      quantity,
      period_days,
      unit_rate,
      fulfilment_status,
      created_at,
      projects(name, engagement_type),
      service_catalog(service_name, service_code),
      vendors(name)
    `)
    .in('fulfilment_status', ['pending', 'in_progress'])
    .order('created_at', { ascending: false });

  if (error) {
    return (
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Fulfilments</h1>
        <p className="mt-2 text-sm text-red-500">Failed to load: {error.message}</p>
      </div>
    );
  }

  const requirements: RequirementRow[] = (rows ?? []).map((r) => ({
    id: r.id,
    project_id: r.project_id,
    project_name: (r.projects as { name: string } | null)?.name ?? '—',
    engagement_type: (r.projects as { engagement_type?: string } | null)?.engagement_type ?? 'one_time',
    service_catalog_id: r.service_catalog_id,
    service_name: (r.service_catalog as { service_name: string; service_code: string } | null)?.service_name ?? '—',
    service_code: (r.service_catalog as { service_name: string; service_code: string } | null)?.service_code ?? '',
    title: r.title,
    description: r.description,
    delivery: (r.delivery as string) || 'vendor',
    assigned_vendor_id: r.assigned_vendor_id,
    vendor_name: (r.vendors as { name: string } | null)?.name ?? null,
    client_price: r.client_price,
    expected_vendor_cost: r.expected_vendor_cost,
    quantity: r.quantity != null ? Number(r.quantity) : null,
    period_days: r.period_days != null ? Number(r.period_days) : null,
    unit_rate: r.unit_rate != null ? Number(r.unit_rate) : null,
    fulfilment_status: r.fulfilment_status,
    created_at: r.created_at,
  }));

  const { data: vendors } = await supabase.from('vendors').select('id, name').order('name');

  return (
    <FulfilmentsView
      initialRequirements={requirements}
      initialOpenId={openId ?? null}
      vendorOptions={vendors?.map((v) => ({ value: v.id, label: v.name })) ?? []}
    />
  );
}
