import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { NotificationsList } from './notifications-list';
import { getNotifications } from './actions';

export default async function NotificationsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { items, error } = await getNotifications();

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Notifications</h1>
        <p className="mt-1 text-muted-foreground">Your recent activity and alerts.</p>
      </div>
      {error ? (
        <p className="text-sm text-destructive">{error}</p>
      ) : (
        <NotificationsList initialItems={items} />
      )}
    </div>
  );
}
