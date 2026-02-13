'use server';

import { createClient } from '@/lib/supabase/server';
import type { ProjectDocumentType } from '@/types/database';

export async function createProjectDocument(
  project_id: string,
  title: string,
  doc_type: ProjectDocumentType
): Promise<{ id?: string; error?: string }> {
  try {
    const supabase = await createClient();
    const content_json = doc_type === 'text' ? { type: 'doc', content: [] } : { rows: [] };
    const { data, error } = await supabase
      .from('project_documents')
      .insert({ project_id, title: title.trim() || 'Untitled', doc_type, content_json })
      .select('id')
      .single();
    if (error) return { error: error.message };
    if (!data?.id) return { error: 'No id returned' };
    return { id: data.id };
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Failed to create document';
    return { error: message };
  }
}

export async function updateProjectDocument(
  id: string,
  updates: { title?: string; content_json?: Record<string, unknown> | null }
): Promise<{ error?: string }> {
  try {
    const supabase = await createClient();
    const payload: Record<string, unknown> = {};
    if (updates.title !== undefined) payload.title = updates.title.trim() || 'Untitled';
    if (updates.content_json !== undefined) payload.content_json = updates.content_json;
    const { error } = await supabase.from('project_documents').update(payload).eq('id', id);
    return { error: error?.message };
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'Failed to update document' };
  }
}

export async function deleteProjectDocument(id: string): Promise<{ error?: string }> {
  try {
    const supabase = await createClient();
    const { error } = await supabase.from('project_documents').delete().eq('id', id);
    return { error: error?.message };
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'Failed to delete document' };
  }
}
