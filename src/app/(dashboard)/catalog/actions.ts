'use server';

import { createClient } from '@/lib/supabase/server';
import type { CatalogType, DeliveryType } from '@/types/database';

/** Prefix per catalog type for auto-generated codes: GDS-001, SVC-001, CON-001 */
const CODE_PREFIX: Record<CatalogType, string> = {
  goods: 'GDS',
  services: 'SVC',
  consulting: 'CON',
};

/** Regex to detect our auto-generated codes: PREFIX-nnn (e.g. GDS-001, SVC-042) */
const CODE_PATTERN = /^([A-Z]{3})-(\d+)$/i;

/**
 * Get the next N codes for a catalog type. Uses existing codes matching PREFIX-nnn to find max, then returns next N.
 */
export async function getNextCatalogCodes(
  catalogType: CatalogType,
  count: number
): Promise<{ codes: string[]; error?: string }> {
  if (count < 1) return { codes: [] };
  const supabase = await createClient();
  const prefix = CODE_PREFIX[catalogType];
  const { data, error } = await supabase
    .from('service_catalog')
    .select('service_code')
    .like('service_code', `${prefix}-%`);
  if (error) return { codes: [], error: error.message };
  const existing = (data ?? []).map((r) => r.service_code);
  const numbers = existing
    .map((c) => {
      const m = c.match(CODE_PATTERN);
      return m && m[1].toUpperCase() === prefix ? parseInt(m[2], 10) : NaN;
    })
    .filter((n) => !Number.isNaN(n));
  const max = numbers.length > 0 ? Math.max(...numbers) : 0;
  const codes = Array.from({ length: count }, (_, i) =>
    `${prefix}-${String(max + i + 1).padStart(3, '0')}`
  );
  return { codes };
}

export async function createService(input: {
  service_code?: string | null;
  category?: string | null;
  service_name: string;
  service_type?: string | null;
  catalog_type?: CatalogType;
  delivery?: DeliveryType;
  our_rate_min?: number | null;
  our_rate_max?: number | null;
  commission?: number | null;
  default_client_rate?: number | null;
}): Promise<{ id?: string; error?: string }> {
  const supabase = await createClient();
  const catalogType = input.catalog_type ?? 'services';
  const delivery = input.delivery ?? (catalogType === 'consulting' ? 'in_house' : 'vendor');
  let code = input.service_code?.trim();
  if (!code) {
    const next = await getNextCatalogCodes(catalogType, 1);
    if (next.error || !next.codes[0]) return { error: next.error ?? 'Could not generate code' };
    code = next.codes[0];
  }
  const { data, error } = await supabase
    .from('service_catalog')
    .insert({
      service_code: code,
      category: input.category?.trim() || null,
      service_name: input.service_name.trim(),
      service_type: input.service_type?.trim() || null,
      catalog_type: catalogType,
      delivery,
      our_rate_min: input.our_rate_min ?? null,
      our_rate_max: input.our_rate_max ?? null,
      commission: input.commission ?? null,
      default_client_rate: input.default_client_rate ?? null,
    })
    .select('id')
    .single();

  if (error) return { error: error.message };
  return { id: data.id };
}

export type ServiceInput = {
  service_code?: string | null;
  category?: string | null;
  service_name: string;
  service_type?: string | null;
  catalog_type?: CatalogType;
  delivery?: DeliveryType;
  our_rate_min?: number | null;
  our_rate_max?: number | null;
  commission?: number | null;
  default_client_rate?: number | null;
};

export async function createServicesBulk(
  inputs: ServiceInput[]
): Promise<{ created: number; errors: { row: number; message: string }[] }> {
  const supabase = await createClient();
  const errors: { row: number; message: string }[] = [];
  const valid = inputs
    .map((input, i) => ({ input, index: i }))
    .filter(({ input }) => (input.service_name?.trim() ?? '').length > 0);
  if (valid.length === 0) {
    return { created: 0, errors: [{ row: 1, message: 'At least one row with a name is required' }] };
  }
  const catalogType = valid[0].input.catalog_type ?? 'services';
  const { codes, error: codeError } = await getNextCatalogCodes(catalogType, valid.length);
  if (codeError || codes.length < valid.length) {
    return {
      created: 0,
      errors: [{ row: 1, message: codeError ?? 'Could not generate codes' }],
    };
  }
  let created = 0;
  for (let j = 0; j < valid.length; j++) {
    const { input, index } = valid[j];
    const i = index + 1;
    const name = input.service_name?.trim();
    if (!name) continue;
    const code = input.service_code?.trim() || codes[j];
    const delivery = input.delivery ?? (catalogType === 'consulting' ? 'in_house' : 'vendor');
    const { error } = await supabase.from('service_catalog').insert({
      service_code: code,
      category: input.category?.trim() || null,
      service_name: name,
      service_type: input.service_type?.trim() || null,
      catalog_type: catalogType,
      delivery,
      our_rate_min: input.our_rate_min ?? null,
      our_rate_max: input.our_rate_max ?? null,
      commission: input.commission ?? null,
      default_client_rate: input.default_client_rate ?? null,
    });
    if (error) {
      errors.push({ row: i, message: error.message });
    } else {
      created++;
    }
  }
  return { created, errors };
}

export async function updateService(
  id: string,
  updates: {
    service_code?: string;
    category?: string | null;
    service_name?: string;
    service_type?: string | null;
    catalog_type?: CatalogType;
    delivery?: DeliveryType;
    our_rate_min?: number | null;
    our_rate_max?: number | null;
    commission?: number | null;
    default_client_rate?: number | null;
  }
): Promise<{ error?: string }> {
  const supabase = await createClient();
  const catalogType = updates.catalog_type;
  const delivery = updates.delivery ?? (catalogType === 'consulting' ? 'in_house' : undefined);
  const payload: Record<string, unknown> = {
    category: updates.category?.trim() || null,
    service_name: updates.service_name?.trim(),
    service_type: updates.service_type?.trim() || null,
  };
  if (updates.service_code !== undefined) payload.service_code = updates.service_code.trim();
  if (catalogType !== undefined) payload.catalog_type = catalogType;
  if (delivery !== undefined) payload.delivery = delivery;
  const { error } = await supabase.from('service_catalog').update(payload).eq('id', id);
  return { error: error?.message };
}

export async function getCatalogVendorIds(service_catalog_id: string): Promise<{ vendor_ids: string[]; error?: string }> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('catalog_vendor_availability')
    .select('vendor_id')
    .eq('service_catalog_id', service_catalog_id);
  if (error) return { vendor_ids: [], error: error.message };
  return { vendor_ids: (data ?? []).map((r) => r.vendor_id) };
}

export async function addCatalogVendor(service_catalog_id: string, vendor_id: string): Promise<{ error?: string }> {
  const supabase = await createClient();
  const { error } = await supabase.from('catalog_vendor_availability').insert({ service_catalog_id, vendor_id });
  return { error: error?.message };
}

export async function removeCatalogVendor(service_catalog_id: string, vendor_id: string): Promise<{ error?: string }> {
  const supabase = await createClient();
  const { error } = await supabase
    .from('catalog_vendor_availability')
    .delete()
    .eq('service_catalog_id', service_catalog_id)
    .eq('vendor_id', vendor_id);
  return { error: error?.message };
}

/** Catalog items that a vendor can provide (for vendor management page). */
export async function getCatalogItemsForVendor(vendor_id: string): Promise<{
  items: { id: string; service_code: string; service_name: string; catalog_type: string }[];
  error?: string;
}> {
  const supabase = await createClient();
  const { data: links, error: linkError } = await supabase
    .from('catalog_vendor_availability')
    .select('service_catalog_id')
    .eq('vendor_id', vendor_id);
  if (linkError) return { items: [], error: linkError.message };
  const ids = (links ?? []).map((r) => r.service_catalog_id).filter(Boolean);
  if (ids.length === 0) return { items: [] };
  const { data: catalog, error: catError } = await supabase
    .from('service_catalog')
    .select('id, service_code, service_name, catalog_type')
    .in('id', ids)
    .order('service_code');
  if (catError) return { items: [], error: catError.message };
  return {
    items: (catalog ?? []).map((r) => ({
      id: r.id,
      service_code: r.service_code,
      service_name: r.service_name,
      catalog_type: (r.catalog_type as string) ?? 'services',
    })),
  };
}

/** Delete catalog item only if no requirements reference it. */
export async function deleteCatalogItem(id: string): Promise<{ error?: string }> {
  const supabase = await createClient();
  const { count } = await supabase
    .from('requirements')
    .select('*', { count: 'exact', head: true })
    .eq('service_catalog_id', id);
  if (count && count > 0) {
    return { error: 'Cannot delete catalog item while requirements use it. Remove or change those requirements first.' };
  }
  const { error } = await supabase.from('service_catalog').delete().eq('id', id);
  return { error: error?.message };
}
