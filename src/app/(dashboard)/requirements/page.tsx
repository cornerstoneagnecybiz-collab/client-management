import { createClient } from '@/lib/supabase/server';
import { RequirementsView } from './requirements-view';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { Plus } from 'lucide-react';
import { projectNameFromRelation, relationNameFromRelation } from '@/lib/utils';

export type RequirementRow = {
  id: string;
  project_id: string;
  project_name: string;
  engagement_type?: 'one_time' | 'monthly';
  service_catalog_id: string;
  service_name: string;
  service_code: string;
  title: string;
  description: string | null;
  delivery: string;
  assigned_vendor_id: string | null;
  vendor_name: string | null;
  client_price: number | null;
  expected_vendor_cost: number | null;
  quantity: number | null;
  period_days: number | null;
  unit_rate: number | null;
  vendor_unit_rate: number | null;
  fulfilment_status: string;
  created_at: string;
};

export default async function RequirementsPage({
  searchParams,
}: {
  searchParams: Promise<{ id?: string; project?: string; new?: string; type?: string }>;
}) {
  const { id: openId, project: projectFilter, new: newParam, type: engagementFilter } = await searchParams;
  const supabase = await createClient();
  let projectIdsForType: string[] | null = null;
  if (engagementFilter === 'one_time' || engagementFilter === 'monthly') {
    const { data: projRows } = await supabase.from('projects').select('id').eq('engagement_type', engagementFilter);
    projectIdsForType = projRows?.map((p) => p.id) ?? [];
  }
  let query = supabase
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
    .order('created_at', { ascending: false });
  if (projectFilter) {
    query = query.eq('project_id', projectFilter);
  }
  if (projectIdsForType !== null) {
    if (projectIdsForType.length === 0) query = query.eq('project_id', '00000000-0000-0000-0000-000000000000');
    else query = query.in('project_id', projectIdsForType);
  }
  const { data: rows, error } = await query;

  if (error) {
    return (
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Requirements</h1>
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

  const { data: projects } = await supabase.from('projects').select('id, name, engagement_type').order('name');
  const { data: services } = await supabase
    .from('service_catalog')
    .select('id, service_name, service_code, category, service_type, catalog_type, default_client_rate, our_rate_min, delivery')
    .order('service_name');
  const { data: vendors } = await supabase.from('vendors').select('id, name').order('name');

  const serviceOptionsWithRates =
    services?.map((s) => {
      const parts = [s.category, s.service_type, s.catalog_type].filter(Boolean);
      const description = parts.length > 0 ? parts.join(' · ') : null;
      return {
        value: s.id,
        label: `${s.service_name} (${s.service_code})`,
        service_name: s.service_name,
        description: description ?? undefined,
        default_client_rate: s.default_client_rate ?? null,
        our_rate_min: s.our_rate_min ?? null,
        delivery: (s.delivery as 'vendor' | 'in_house') ?? 'vendor',
      };
    }) ?? [];

  const engagementFilterLabel =
    engagementFilter === 'monthly' ? 'Monthly retainers' : engagementFilter === 'one_time' ? 'One-time projects' : null;

  return (
    <RequirementsView
      initialRequirements={requirements}
      initialOpenId={openId ?? null}
      initialProjectId={projectFilter ?? null}
      initialCreateOpen={newParam === '1'}
      projectOptions={projects?.map((p) => ({ value: p.id, label: p.name, engagement_type: (p.engagement_type as 'one_time' | 'monthly') ?? 'one_time' })) ?? []}
      serviceOptions={serviceOptionsWithRates}
      vendorOptions={vendors?.map((v) => ({ value: v.id, label: v.name })) ?? []}
      title="Requirements"
      description={engagementFilterLabel ?? 'Catalog items, vendor assignment, and pricing.'}
      engagementFilter={engagementFilter ?? null}
    />
  );
}
