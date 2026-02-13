'use server';

import { createClient } from '@/lib/supabase/server';

export async function createVendorAction(input: {
  name: string;
  category?: string | null;
  phone?: string | null;
  email?: string | null;
  payment_terms?: string | null;
  /** Optional primary location; created after vendor if provided */
  primary_location?: {
    city: string;
    address_line1?: string | null;
    address_line2?: string | null;
    state?: string | null;
    postal_code?: string | null;
  } | null;
}): Promise<{ id?: string; error?: string }> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('vendors')
    .insert({
      name: input.name.trim(),
      category: input.category?.trim() || null,
      phone: input.phone?.trim() || null,
      email: input.email?.trim() || null,
      payment_terms: input.payment_terms?.trim() || null,
    })
    .select('id')
    .single();

  if (error) return { error: error.message };
  const vendorId = data.id;

  const loc = input.primary_location;
  if (loc?.city?.trim()) {
    const { error: locError } = await supabase.from('vendor_locations').insert({
      vendor_id: vendorId,
      city: loc.city.trim(),
      address_line1: loc.address_line1?.trim() || null,
      address_line2: loc.address_line2?.trim() || null,
      state: loc.state?.trim() || null,
      postal_code: loc.postal_code?.trim() || null,
      is_primary: true,
    });
    if (locError) return { error: locError.message };
  }

  return { id: vendorId };
}

export async function updateVendorAction(
  id: string,
  updates: {
    name?: string;
    category?: string | null;
    phone?: string | null;
    email?: string | null;
    payment_terms?: string | null;
  }
): Promise<{ error?: string }> {
  const supabase = await createClient();
  const payload = {
    ...updates,
    name: updates.name?.trim(),
    category: updates.category?.trim() || null,
    phone: updates.phone?.trim() || null,
    email: updates.email?.trim() || null,
    payment_terms: updates.payment_terms?.trim() || null,
  };
  const { error } = await supabase.from('vendors').update(payload).eq('id', id);
  return { error: error?.message };
}

// Vendor locations (multiple per vendor, group by city)
export async function createVendorLocation(input: {
  vendor_id: string;
  city: string;
  address_line1?: string | null;
  address_line2?: string | null;
  state?: string | null;
  postal_code?: string | null;
  is_primary?: boolean;
}): Promise<{ id?: string; error?: string }> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('vendor_locations')
    .insert({
      vendor_id: input.vendor_id,
      city: input.city.trim(),
      address_line1: input.address_line1?.trim() || null,
      address_line2: input.address_line2?.trim() || null,
      state: input.state?.trim() || null,
      postal_code: input.postal_code?.trim() || null,
      is_primary: input.is_primary ?? false,
    })
    .select('id')
    .single();
  if (error) return { error: error.message };
  return { id: data.id };
}

export async function updateVendorLocation(
  id: string,
  updates: {
    city?: string;
    address_line1?: string | null;
    address_line2?: string | null;
    state?: string | null;
    postal_code?: string | null;
    is_primary?: boolean;
  }
): Promise<{ error?: string }> {
  const supabase = await createClient();
  const payload = {
    ...updates,
    city: updates.city?.trim(),
    address_line1: updates.address_line1?.trim() || null,
    address_line2: updates.address_line2?.trim() || null,
    state: updates.state?.trim() || null,
    postal_code: updates.postal_code?.trim() || null,
  };
  const { error } = await supabase.from('vendor_locations').update(payload).eq('id', id);
  return { error: error?.message };
}

export async function deleteVendorLocation(id: string): Promise<{ error?: string }> {
  const supabase = await createClient();
  const { error } = await supabase.from('vendor_locations').delete().eq('id', id);
  return { error: error?.message };
}

/** Delete vendor only if they have no vendor payouts. (Requirements can keep vendor unassigned.) */
export async function deleteVendor(id: string): Promise<{ error?: string }> {
  const supabase = await createClient();
  const { count } = await supabase
    .from('vendor_payouts')
    .select('*', { count: 'exact', head: true })
    .eq('vendor_id', id);
  if (count && count > 0) {
    return { error: 'Cannot delete vendor while they have payouts recorded. Resolve payouts first.' };
  }
  const { error } = await supabase.from('vendors').delete().eq('id', id);
  return { error: error?.message };
}
