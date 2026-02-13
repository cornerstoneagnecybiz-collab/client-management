import { createClient } from '@/lib/supabase/server';
import { CatalogView } from './catalog-view';

export default async function CatalogPage({
  searchParams,
}: {
  searchParams: Promise<{ id?: string; new?: string; tab?: string }>;
}) {
  const { id: openId, new: openNew, tab } = await searchParams;
  const supabase = await createClient();

  const { data: rows, error } = await supabase
    .from('service_catalog')
    .select('id, service_code, category, service_name, service_type, catalog_type, delivery, our_rate_min, our_rate_max, commission, default_client_rate, created_at')
    .order('service_code');

  if (error) {
    return (
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Catalog</h1>
        <p className="mt-2 text-sm text-red-500">Failed to load: {error.message}</p>
      </div>
    );
  }

  const services = (rows ?? []).map((r) => ({
    id: r.id,
    service_code: r.service_code,
    category: r.category,
    service_name: r.service_name,
    service_type: r.service_type,
    catalog_type: (r.catalog_type as 'goods' | 'services' | 'consulting') || 'services',
    delivery: (r.delivery as 'vendor' | 'in_house') || 'vendor',
    our_rate_min: r.our_rate_min,
    our_rate_max: r.our_rate_max,
    commission: r.commission,
    default_client_rate: r.default_client_rate,
    created_at: r.created_at,
  }));

  const { data: vendors } = await supabase.from('vendors').select('id, name').order('name');
  const vendorOptions = vendors?.map((v) => ({ value: v.id, label: v.name })) ?? [];

  return (
    <CatalogView
      initialServices={services}
      vendorOptions={vendorOptions}
      initialOpenId={openId ?? null}
      initialCreateOpen={openNew === '1'}
      initialTab={(tab as 'all' | 'goods' | 'services' | 'consulting') || 'all'}
    />
  );
}
