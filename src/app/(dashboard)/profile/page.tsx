import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { User, Mail, Calendar } from 'lucide-react';

export default async function ProfilePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const createdAt = user.created_at
    ? new Date(user.created_at).toLocaleDateString('en-IN', { dateStyle: 'long' })
    : null;

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Profile</h1>
        <p className="mt-1 text-muted-foreground">Your account details.</p>
      </div>
      <div className="rounded-xl border border-border bg-card p-6 space-y-6">
        <div className="flex items-center gap-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/15 text-primary">
            <User className="h-8 w-8" />
          </div>
          <div>
            <p className="font-medium">
              {user.user_metadata?.full_name ?? user.user_metadata?.name ?? 'User'}
            </p>
            <p className="text-sm text-muted-foreground">{user.email ?? '—'}</p>
          </div>
        </div>
        <dl className="grid gap-4 sm:grid-cols-1">
          <div className="flex items-center gap-3 rounded-lg border border-border/50 bg-muted/30 px-4 py-3">
            <Mail className="h-4 w-4 text-muted-foreground shrink-0" />
            <div>
              <dt className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Email</dt>
              <dd className="font-medium">{user.email ?? '—'}</dd>
            </div>
          </div>
          <div className="flex items-center gap-3 rounded-lg border border-border/50 bg-muted/30 px-4 py-3">
            <User className="h-4 w-4 text-muted-foreground shrink-0" />
            <div>
              <dt className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Display name</dt>
              <dd className="font-medium">
                {user.user_metadata?.full_name ?? user.user_metadata?.name ?? '—'}
              </dd>
            </div>
          </div>
          {createdAt && (
            <div className="flex items-center gap-3 rounded-lg border border-border/50 bg-muted/30 px-4 py-3">
              <Calendar className="h-4 w-4 text-muted-foreground shrink-0" />
              <div>
                <dt className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Member since</dt>
                <dd className="font-medium">{createdAt}</dd>
              </div>
            </div>
          )}
        </dl>
      </div>
    </div>
  );
}
