'use server';

import { createClient } from '@/lib/supabase/server';
import { logAudit } from '@/lib/audit';
import type { FulfilmentStatus } from '@/types';
import type { DeliveryType } from '@/types/database';

export async function createRequirement(input: {
  project_id: string;
  service_catalog_id: string;
  title: string;
  description?: string | null;
  delivery?: DeliveryType;
  client_price?: number | null;
  expected_vendor_cost?: number | null;
  assigned_vendor_id?: string | null;
  quantity?: number | null;
  period_days?: number | null;
  unit_rate?: number | null;
  vendor_unit_rate?: number | null;
}): Promise<{ id?: string; error?: string }> {
  const supabase = await createClient();
  const delivery = input.delivery ?? 'vendor';
  const assigned_vendor_id = delivery === 'in_house' ? null : (input.assigned_vendor_id || null);
  let client_price = input.client_price ?? null;
  if (
    input.quantity != null &&
    input.unit_rate != null &&
    input.quantity > 0 &&
    Number(input.unit_rate) >= 0
  ) {
    const q = Number(input.quantity);
    const r = Number(input.unit_rate);
    client_price =
      input.period_days != null && input.period_days > 0
        ? q * Number(input.period_days) * r
        : q * r;
  }
  let expected_vendor_cost = input.expected_vendor_cost ?? null;
  if (
    input.quantity != null &&
    input.vendor_unit_rate != null &&
    input.quantity > 0 &&
    Number(input.vendor_unit_rate) >= 0
  ) {
    const q = Number(input.quantity);
    const r = Number(input.vendor_unit_rate);
    expected_vendor_cost =
      input.period_days != null && input.period_days > 0
        ? q * Number(input.period_days) * r
        : q * r;
  }
  const { data, error } = await supabase
    .from('requirements')
    .insert({
      project_id: input.project_id,
      service_catalog_id: input.service_catalog_id,
      title: input.title.trim(),
      description: input.description?.trim() || null,
      delivery,
      client_price,
      expected_vendor_cost,
      assigned_vendor_id,
      quantity: input.quantity ?? null,
      period_days: input.period_days ?? null,
      unit_rate: input.unit_rate ?? null,
      vendor_unit_rate: input.vendor_unit_rate ?? null,
    })
    .select('id')
    .single();

  if (error) return { error: error.message };
  return { id: data.id };
}

export async function updateRequirement(
  id: string,
  updates: {
    title?: string;
    description?: string | null;
    delivery?: DeliveryType;
    client_price?: number | null;
    expected_vendor_cost?: number | null;
    assigned_vendor_id?: string | null;
    fulfilment_status?: FulfilmentStatus;
    quantity?: number | null;
    period_days?: number | null;
    unit_rate?: number | null;
    vendor_unit_rate?: number | null;
  }
): Promise<{ error?: string }> {
  const supabase = await createClient();
  const payload = { ...updates } as Record<string, unknown>;
  if (updates.delivery === 'in_house') payload.assigned_vendor_id = null;
  const q = updates.quantity;
  const p = updates.period_days;
  const r = updates.unit_rate;
  if (q != null && r != null && q > 0 && Number(r) >= 0) {
    payload.client_price =
      p != null && p > 0 ? q * p * Number(r) : q * Number(r);
  }
  const vRate = updates.vendor_unit_rate;
  if (q != null && vRate != null && q > 0 && Number(vRate) >= 0) {
    payload.expected_vendor_cost =
      p != null && p > 0 ? q * p * Number(vRate) : q * Number(vRate);
  }
  const { data: before } = await supabase.from('requirements').select('fulfilment_status').eq('id', id).single();
  const { error } = await supabase.from('requirements').update(payload).eq('id', id);
  if (error) return { error: error?.message };
  if (updates.fulfilment_status === 'fulfilled' && before?.fulfilment_status !== 'fulfilled') {
    await logAudit('requirement_fulfilled', 'requirement', id);
  }
  return {};
}

/** Delete a requirement. Fails if it is linked to an invoice or has vendor payouts. */
export async function deleteRequirement(id: string): Promise<{ error?: string }> {
  const supabase = await createClient();
  const { data: onInvoice } = await supabase.from('invoice_requirements').select('invoice_id').eq('requirement_id', id).limit(1);
  if (onInvoice?.length) return { error: 'Cannot delete: this requirement is linked to an invoice.' };
  const { data: payouts } = await supabase.from('vendor_payouts').select('id').eq('requirement_id', id).limit(1);
  if (payouts?.length) return { error: 'Cannot delete: this requirement has vendor payouts.' };
  const { error } = await supabase.from('requirements').delete().eq('id', id);
  return { error: error?.message };
}
