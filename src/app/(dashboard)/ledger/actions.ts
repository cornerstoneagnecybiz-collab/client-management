'use server';

import { createClient } from '@/lib/supabase/server';
import type { LedgerEntryType } from '@/types';

export async function createLedgerEntry(input: {
  project_id: string;
  type: LedgerEntryType;
  amount: number;
  date: string;
  reference_id?: string | null;
}): Promise<{ id?: string; error?: string }> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('ledger_entries')
    .insert({
      project_id: input.project_id,
      type: input.type,
      amount: Number(input.amount),
      date: input.date,
      reference_id: input.reference_id || null,
    })
    .select('id')
    .single();

  if (error) return { error: error.message };
  return { id: data.id };
}

export async function updateLedgerEntry(
  id: string,
  updates: {
    type?: LedgerEntryType;
    amount?: number;
    date?: string;
    reference_id?: string | null;
  }
): Promise<{ error?: string }> {
  const supabase = await createClient();
  const payload = { ...updates };
  if (updates.amount !== undefined) (payload as Record<string, unknown>).amount = Number(updates.amount);
  const { error } = await supabase.from('ledger_entries').update(payload).eq('id', id);
  return { error: error?.message };
}

export async function deleteLedgerEntry(id: string): Promise<{ error?: string }> {
  const supabase = await createClient();
  const { error } = await supabase.from('ledger_entries').delete().eq('id', id);
  return { error: error?.message };
}
