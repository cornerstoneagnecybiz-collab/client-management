import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { User, Palette, Bell, Shield, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { AppearanceSection } from './appearance-section';
import { SignOutButton } from './sign-out-button';

export default async function SettingsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const displayName = user.user_metadata?.full_name ?? user.user_metadata?.name ?? 'User';

  return (
    <div className="max-w-2xl space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
        <p className="mt-1 text-muted-foreground">App and user settings.</p>
      </div>

      <section className="glass-card rounded-xl border border-border p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <User className="h-5 w-5" />
          </div>
          <div>
            <h2 className="font-semibold">Account</h2>
            <p className="text-sm text-muted-foreground">Your profile and sign-in details.</p>
          </div>
        </div>
        <dl className="grid gap-3 sm:grid-cols-1">
          <div>
            <dt className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Email</dt>
            <dd className="font-medium mt-0.5">{user.email ?? '—'}</dd>
          </div>
          <div>
            <dt className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Display name</dt>
            <dd className="font-medium mt-0.5">{displayName}</dd>
          </div>
        </dl>
        <Button asChild variant="outline" size="sm" className="mt-4">
          <Link href="/profile">
            View profile
            <ChevronRight className="h-4 w-4 ml-1" />
          </Link>
        </Button>
      </section>

      <section className="glass-card rounded-xl border border-border p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Palette className="h-5 w-5" />
          </div>
          <div>
            <h2 className="font-semibold">Appearance</h2>
            <p className="text-sm text-muted-foreground">Theme and layout density.</p>
          </div>
        </div>
        <AppearanceSection />
      </section>

      <section className="glass-card rounded-xl border border-border p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Bell className="h-5 w-5" />
          </div>
          <div>
            <h2 className="font-semibold">Notifications</h2>
            <p className="text-sm text-muted-foreground">In-app notifications and alerts.</p>
          </div>
        </div>
        <Button asChild variant="outline" size="sm">
          <Link href="/notifications">
            Manage notifications
            <ChevronRight className="h-4 w-4 ml-1" />
          </Link>
        </Button>
      </section>

      <section className="glass-card rounded-xl border border-border p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Shield className="h-5 w-5" />
          </div>
          <div>
            <h2 className="font-semibold">Security</h2>
            <p className="text-sm text-muted-foreground">Sign out of your account.</p>
          </div>
        </div>
        <SignOutButton />
      </section>
    </div>
  );
}
