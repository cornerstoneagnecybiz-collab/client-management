'use server';

import { createClient } from '@/lib/supabase/server';

export async function createProjectNote(project_id: string, content: string): Promise<{ id?: string; error?: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data, error } = await supabase
    .from('project_notes')
    .insert({
      project_id,
      content: content.trim() || '',
      created_by: user?.id ?? null,
    })
    .select('id')
    .single();
  if (error) return { error: error.message };
  return { id: data.id };
}

export async function updateProjectNote(id: string, content: string): Promise<{ error?: string }> {
  const supabase = await createClient();
  const { error } = await supabase
    .from('project_notes')
    .update({ content: content.trim() || '' })
    .eq('id', id);
  return { error: error?.message };
}

export async function deleteProjectNote(id: string): Promise<{ error?: string }> {
  const supabase = await createClient();
  const { error } = await supabase.from('project_notes').delete().eq('id', id);
  return { error: error?.message };
}
