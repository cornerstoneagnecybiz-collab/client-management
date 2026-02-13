'use server';

import { createClient } from '@/lib/supabase/server';
import type { ProjectStatus } from '@/types';

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
