import { createClient } from '@/lib/supabase/server';
import { FulfilmentsView } from './fulfilments-view';
import type { RequirementRow } from '../requirements/page';
import { projectNameFromRelation, relationNameFromRelation } from '@/lib/utils';

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
      vendor_unit_rate,
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
    project_name: projectNameFromRelation(r.projects),
    engagement_type: ((): RequirementRow['engagement_type'] => {
      const proj = r.projects as unknown as { engagement_type?: string } | { engagement_type?: string }[] | null;
      const v = (Array.isArray(proj) ? proj[0]?.engagement_type : proj?.engagement_type) ?? 'one_time';
      return v === 'monthly' ? 'monthly' : 'one_time';
    })(),
    service_catalog_id: r.service_catalog_id,
    service_name: (() => {
      const c = r.service_catalog as unknown as { service_name?: string; service_code?: string } | { service_name?: string; service_code?: string }[] | null;
      const cat = c == null ? null : Array.isArray(c) ? c[0] : c;
      return cat?.service_name ?? '—';
    })(),
    service_code: (() => {
      const c = r.service_catalog as unknown as { service_name?: string; service_code?: string } | { service_name?: string; service_code?: string }[] | null;
      const cat = c == null ? null : Array.isArray(c) ? c[0] : c;
      return cat?.service_code ?? '';
    })(),
    title: r.title,
    description: r.description,
    delivery: (r.delivery as string) || 'vendor',
    assigned_vendor_id: r.assigned_vendor_id,
    vendor_name: (() => { const n = relationNameFromRelation(r.vendors, ''); return n === '' ? null : n; })(),
    client_price: r.client_price,
    expected_vendor_cost: r.expected_vendor_cost,
    quantity: r.quantity != null ? Number(r.quantity) : null,
    period_days: r.period_days != null ? Number(r.period_days) : null,
    unit_rate: r.unit_rate != null ? Number(r.unit_rate) : null,
    vendor_unit_rate: r.vendor_unit_rate != null ? Number(r.vendor_unit_rate) : null,
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
