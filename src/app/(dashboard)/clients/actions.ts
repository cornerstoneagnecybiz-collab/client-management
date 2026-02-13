'use server';

import { createClient } from '@/lib/supabase/server';

export async function createClientAction(input: {
  name: string;
  company?: string | null;
  phone?: string | null;
  email?: string | null;
  gst?: string | null;
}): Promise<{ id?: string; error?: string }> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('clients')
    .insert({
      name: input.name.trim(),
      company: input.company?.trim() || null,
      phone: input.phone?.trim() || null,
      email: input.email?.trim() || null,
      gst: input.gst?.trim() || null,
    })
    .select('id')
    .single();

  if (error) return { error: error.message };
  return { id: data.id };
}

export async function updateClient(
  id: string,
  updates: {
    name?: string;
    company?: string | null;
    phone?: string | null;
    email?: string | null;
    gst?: string | null;
  }
): Promise<{ error?: string }> {
  const supabase = await createClient();
  const payload = {
    ...updates,
    name: updates.name?.trim(),
    company: updates.company?.trim() || null,
    phone: updates.phone?.trim() || null,
    email: updates.email?.trim() || null,
    gst: updates.gst?.trim() || null,
  };
  const { error } = await supabase.from('clients').update(payload).eq('id', id);
  return { error: error?.message };
}

/** Delete client only if they have no projects. */
export async function deleteClient(id: string): Promise<{ error?: string }> {
  const supabase = await createClient();
  const { count } = await supabase
    .from('projects')
    .select('*', { count: 'exact', head: true })
    .eq('client_id', id);
  if (count && count > 0) {
    return { error: 'Cannot delete client while they have projects. Remove or reassign projects first.' };
  }
  const { error } = await supabase.from('clients').delete().eq('id', id);
  return { error: error?.message };
}
