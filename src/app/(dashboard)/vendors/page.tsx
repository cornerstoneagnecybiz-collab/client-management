import { createClient } from '@/lib/supabase/server';
import { VendorsView } from './vendors-view';

export type VendorRow = {
  id: string;
  name: string;
  categories: string[];
  phone: string | null;
  email: string | null;
  payment_terms: string | null;
  created_at: string;
};

export type VendorLocationRow = {
  id: string;
  vendor_id: string;
  city: string;
  address_line1: string | null;
  address_line2: string | null;
  state: string | null;
  postal_code: string | null;
  is_primary: boolean;
};

export type VendorsGroupedByCity = { city: string; vendors: VendorRow[] }[];

export default async function VendorsPage({
  searchParams,
}: {
  searchParams: Promise<{ id?: string; new?: string }>;
}) {
  const { id: openId, new: openNew } = await searchParams;
  const supabase = await createClient();

  const { data: rows, error } = await supabase
    .from('vendors')
    .select('id, name, categories, phone, email, payment_terms, created_at')
    .order('name');

  if (error) {
    return (
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Vendors</h1>
        <p className="mt-2 text-sm text-red-500">Failed to load: {error.message}</p>
      </div>
    );
  }

  const vendors: VendorRow[] = (rows ?? []).map((r) => ({
    id: r.id,
    name: r.name,
    categories: (r.categories as string[] | null) ?? [],
    phone: r.phone,
    email: r.email,
    payment_terms: r.payment_terms,
    created_at: r.created_at,
  }));

  const vendorById = Object.fromEntries(vendors.map((v) => [v.id, v]));

  let locations: VendorLocationRow[] = [];
  try {
    const { data: locRows } = await supabase
      .from('vendor_locations')
      .select('id, vendor_id, city, address_line1, address_line2, state, postal_code, is_primary')
      .order('city');
    locations = (locRows ?? []).map((r) => ({
      id: r.id,
      vendor_id: r.vendor_id,
      city: r.city,
      address_line1: r.address_line1,
      address_line2: r.address_line2,
      state: r.state,
      postal_code: r.postal_code,
      is_primary: r.is_primary ?? false,
    }));
  } catch {
    // Table may not exist before migration
  }

  const vendorIdsByCity = new Map<string, Set<string>>();
  for (const loc of locations) {
    if (!vendorIdsByCity.has(loc.city)) vendorIdsByCity.set(loc.city, new Set());
    vendorIdsByCity.get(loc.city)!.add(loc.vendor_id);
  }
  const citiesSorted = Array.from(vendorIdsByCity.keys()).sort((a, b) => a.localeCompare(b));
  const groupedByCity: VendorsGroupedByCity = citiesSorted.map((city) => ({
    city,
    vendors: Array.from(vendorIdsByCity.get(city) ?? [])
      .map((vid) => vendorById[vid])
      .filter(Boolean),
  }));
  const vendorIdsWithLocation = new Set(locations.map((l) => l.vendor_id));
  const vendorsWithoutLocation = vendors.filter((v) => !vendorIdsWithLocation.has(v.id));
  if (vendorsWithoutLocation.length > 0) {
    groupedByCity.push({ city: 'No location set', vendors: vendorsWithoutLocation });
  }

  const { data: reqAssignments } = await supabase.from('requirements').select('assigned_vendor_id').not('assigned_vendor_id', 'is', null);
  const requirementCountByVendorId: Record<string, number> = {};
  for (const r of reqAssignments ?? []) {
    const vid = r.assigned_vendor_id as string;
    requirementCountByVendorId[vid] = (requirementCountByVendorId[vid] ?? 0) + 1;
  }

  const existingCategories = [...new Set(vendors.flatMap((v) => v.categories))].sort();

  return (
    <VendorsView
      initialVendors={vendors}
      initialGroupedByCity={groupedByCity}
      initialLocations={locations}
      requirementCountByVendorId={requirementCountByVendorId}
      existingCategories={existingCategories}
      initialOpenId={openId ?? null}
      initialCreateOpen={openNew === '1'}
    />
  );
}
