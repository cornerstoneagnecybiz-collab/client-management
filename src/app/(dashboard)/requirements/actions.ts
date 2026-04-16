'use server';

import { createClient } from '@/lib/supabase/server';
import { logAudit } from '@/lib/audit';
import type { FulfilmentStatus } from '@/types';
import type { DeliveryType, PricingType } from '@/types/database';

function computePrices(
  pt: PricingType,
  q: number | null,
  p: number | null,
  r: number | null,
  vr: number | null,
  fallbackCp: number | null,
  fallbackVc: number | null,
): { client_price: number | null; expected_vendor_cost: number | null } {
  switch (pt) {
    case 'qty_rate':
      return {
        client_price: q != null && r != null && q > 0 && r >= 0 ? q * r : fallbackCp,
        expected_vendor_cost: q != null && vr != null && q > 0 && vr >= 0 ? q * vr : fallbackVc,
      };
    case 'days_rate':
      return {
        client_price: p != null && r != null && p > 0 && r >= 0 ? p * r : fallbackCp,
        expected_vendor_cost: p != null && vr != null && p > 0 && vr >= 0 ? p * vr : fallbackVc,
      };
    case 'qty_days_rate':
      return {
        client_price: q != null && p != null && r != null && q > 0 && p > 0 && r >= 0 ? q * p * r : fallbackCp,
        expected_vendor_cost: q != null && p != null && vr != null && q > 0 && p > 0 && vr >= 0 ? q * p * vr : fallbackVc,
      };
    default:
      return { client_price: fallbackCp, expected_vendor_cost: fallbackVc };
  }
}

export async function createRequirement(input: {
  project_id: string;
  service_name: string;
  service_category?: string | null;
  pricing_type?: PricingType;
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
  const pricingType = input.pricing_type ?? 'fixed';
  const { client_price, expected_vendor_cost } = computePrices(
    pricingType,
    input.quantity ?? null,
    input.period_days ?? null,
    input.unit_rate ?? null,
    input.vendor_unit_rate ?? null,
    input.client_price ?? null,
    input.expected_vendor_cost ?? null,
  );

  const { data, error } = await supabase
    .from('requirements')
    .insert({
      project_id: input.project_id,
      service_name: input.service_name.trim(),
      service_category: input.service_category?.trim() || null,
      pricing_type: pricingType,
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

  if (expected_vendor_cost != null && expected_vendor_cost > 0) {
    const today = new Date().toISOString().slice(0, 10);
    await supabase.from('ledger_entries').insert({
      project_id: input.project_id,
      type: 'vendor_expected_cost',
      amount: expected_vendor_cost,
      date: today,
      reference_id: data.id,
    });
  }

  return { id: data.id };
}

export async function updateRequirement(
  id: string,
  updates: {
    service_name?: string;
    service_category?: string | null;
    pricing_type?: PricingType;
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
  const { data: before } = await supabase
    .from('requirements')
    .select('fulfilment_status, project_id, expected_vendor_cost, pricing_type')
    .eq('id', id)
    .single();

  const payload = { ...updates } as Record<string, unknown>;
  if (updates.delivery === 'in_house') payload.assigned_vendor_id = null;

  const pricingType = (updates.pricing_type ?? before?.pricing_type ?? 'fixed') as PricingType;
  const expectsCostFields =
    'expected_vendor_cost' in updates ||
    'client_price' in updates ||
    'quantity' in updates ||
    'period_days' in updates ||
    'unit_rate' in updates ||
    'vendor_unit_rate' in updates ||
    'pricing_type' in updates;

  if (expectsCostFields) {
    const computed = computePrices(
      pricingType,
      updates.quantity ?? null,
      updates.period_days ?? null,
      updates.unit_rate ?? null,
      updates.vendor_unit_rate ?? null,
      updates.client_price ?? null,
      updates.expected_vendor_cost ?? null,
    );
    payload.client_price = computed.client_price;
    payload.expected_vendor_cost = computed.expected_vendor_cost;
  }

  const { error } = await supabase.from('requirements').update(payload).eq('id', id);
  if (error) return { error: error?.message };

  if (updates.fulfilment_status === 'fulfilled' && before?.fulfilment_status !== 'fulfilled') {
    await logAudit('requirement_fulfilled', 'requirement', id);
  }

  if (expectsCostFields && before?.project_id) {
    await supabase.from('ledger_entries').delete().eq('type', 'vendor_expected_cost').eq('reference_id', id);
    const newCost = (payload.expected_vendor_cost as number | null | undefined) ?? null;
    if (newCost != null && newCost > 0) {
      const today = new Date().toISOString().slice(0, 10);
      await supabase.from('ledger_entries').insert({
        project_id: before.project_id,
        type: 'vendor_expected_cost',
        amount: newCost,
        date: today,
        reference_id: id,
      });
    }
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
  await supabase.from('ledger_entries').delete().eq('type', 'vendor_expected_cost').eq('reference_id', id);
  const { error } = await supabase.from('requirements').delete().eq('id', id);
  return { error: error?.message };
}
