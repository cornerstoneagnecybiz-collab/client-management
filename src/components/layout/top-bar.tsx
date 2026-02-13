'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Sun, Moon, User, LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useTheme } from '@/components/theme-provider';
import { useDensity } from '@/components/density-provider';
import { SIDEBAR_WIDTH } from './sidebar';
import { CommandPaletteTrigger } from '@/components/command-palette';
import { NotificationsDropdown } from '@/components/notifications-dropdown';

export function TopBar() {
  const router = useRouter();
  const supabase = createClient();
  const { theme, setTheme, resolvedTheme } = useTheme();
  const { density, setDensity } = useDensity();

  async function handleSignOut() {
    await supabase.auth.signOut();
    router.push('/login');
    router.refresh();
  }

  return (
    <header
      className="sticky top-0 z-30 flex h-14 items-center gap-4 border-b border-border bg-background/80 px-6 backdrop-blur-xl"
      style={{ marginLeft: SIDEBAR_WIDTH }}
    >
      <CommandPaletteTrigger />
      <div className="flex flex-1 justify-end items-center gap-2">
        <NotificationsDropdown />
        <Button
          variant="ghost"
          size="icon"
          aria-label="Toggle theme"
          onClick={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')}
        >
          {resolvedTheme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </Button>
        <select
          value={density}
          onChange={(e) => setDensity(e.target.value as 'compact' | 'comfortable' | 'spacious')}
          className="h-8 rounded-lg border border-border bg-transparent px-2 text-xs text-muted-foreground"
          aria-label="Density"
        >
          <option value="compact">Compact</option>
          <option value="comfortable">Comfortable</option>
          <option value="spacious">Spacious</option>
        </select>
        <Button variant="ghost" size="icon" aria-label="Profile" asChild>
          <Link href="/profile">
            <User className="h-4 w-4" />
          </Link>
        </Button>
        <Button variant="ghost" size="icon" aria-label="Sign out" onClick={handleSignOut}>
          <LogOut className="h-4 w-4" />
        </Button>
      </div>
    </header>
  );
}
