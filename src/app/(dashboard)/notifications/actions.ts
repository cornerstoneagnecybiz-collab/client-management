'use server';

import { createClient } from '@/lib/supabase/server';

export type NotificationRow = {
  id: string;
  user_id: string;
  title: string;
  body: string | null;
  type: string | null;
  link_href: string | null;
  link_label: string | null;
  read_at: string | null;
  created_at: string;
};

export async function getNotifications(): Promise<{
  items: NotificationRow[];
  error?: string;
}> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { items: [] };

  const { data, error } = await supabase
    .from('notifications')
    .select('id, user_id, title, body, type, link_href, link_label, read_at, created_at')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(50);

  if (error) return { items: [], error: error.message };
  return {
    items: (data ?? []).map((r) => ({
      id: r.id,
      user_id: r.user_id,
      title: r.title,
      body: r.body ?? null,
      type: r.type ?? null,
      link_href: r.link_href ?? null,
      link_label: r.link_label ?? null,
      read_at: r.read_at ?? null,
      created_at: r.created_at,
    })),
  };
}

export async function markNotificationRead(id: string): Promise<{ error?: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Unauthorized' };

  const { error } = await supabase
    .from('notifications')
    .update({ read_at: new Date().toISOString() })
    .eq('id', id)
    .eq('user_id', user.id);

  return { error: error?.message };
}

export async function markAllNotificationsRead(): Promise<{ error?: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Unauthorized' };

  const { error } = await supabase
    .from('notifications')
    .update({ read_at: new Date().toISOString() })
    .eq('user_id', user.id)
    .is('read_at', null);

  return { error: error?.message };
}

/** Create a notification for a user. Call from server code (e.g. syncOverdueInvoices). */
export async function createNotification(params: {
  user_id: string;
  title: string;
  body?: string | null;
  type?: string | null;
  link_href?: string | null;
  link_label?: string | null;
}): Promise<{ id?: string; error?: string }> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('notifications')
    .insert({
      user_id: params.user_id,
      title: params.title,
      body: params.body ?? null,
      type: params.type ?? null,
      link_href: params.link_href ?? null,
      link_label: params.link_label ?? null,
    })
    .select('id')
    .single();

  if (error) return { error: error.message };
  return { id: data.id };
}
