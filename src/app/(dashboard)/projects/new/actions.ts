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
