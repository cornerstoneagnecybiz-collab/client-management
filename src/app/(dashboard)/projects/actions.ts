'use server';

import { createClient } from '@/lib/supabase/server';
import type { ProjectStatus, EngagementType } from '@/types';

interface CreateProjectInput {
  client_id: string;
  name: string;
  status: ProjectStatus;
  engagement_type: EngagementType;
  start_date: string | null;
  end_date: string | null;
}

/** Create a new project and return its id. */
export async function createProject(input: CreateProjectInput): Promise<{ id?: string; error?: string }> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('projects')
    .insert({
      client_id: input.client_id,
      name: input.name.trim(),
      status: input.status,
      engagement_type: input.engagement_type,
      start_date: input.start_date || null,
      end_date: input.end_date || null,
    })
    .select('id')
    .single();

  if (error) return { error: error.message };
  return { id: data.id };
}

/** Set project status (e.g. to 'cancelled' to archive). */
export async function updateProjectStatus(
  id: string,
  status: ProjectStatus
): Promise<{ error?: string }> {
  const supabase = await createClient();
  const { error } = await supabase.from('projects').update({ status }).eq('id', id);
  return { error: error?.message };
}

/** Delete project only if it has no invoices. Requirements are cascade-deleted. */
export async function deleteProject(id: string): Promise<{ error?: string }> {
  const supabase = await createClient();
  const { count } = await supabase
    .from('invoices')
    .select('*', { count: 'exact', head: true })
    .eq('project_id', id);
  if (count && count > 0) {
    return { error: 'Cannot delete project that has invoices. Cancel the project instead.' };
  }
  const { error } = await supabase.from('projects').delete().eq('id', id);
  return { error: error?.message };
}
