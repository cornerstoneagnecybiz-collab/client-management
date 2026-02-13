'use client';

import { useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'error' | 'success'; text: string } | null>(null);
  const router = useRouter();
  const supabase = createClient();

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMessage(null);
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        setMessage({ type: 'error', text: error.message });
        return;
      }
      router.push('/');
      router.refresh();
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      const isNetwork = msg === 'Failed to fetch' || msg.includes('NetworkError');
      setMessage({
        type: 'error',
        text: isNetwork
          ? 'Cannot reach Supabase. Check NEXT_PUBLIC_SUPABASE_URL in .env.local and that the project is reachable.'
          : msg,
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="w-full max-w-sm space-y-8">
      <div className="text-center">
        <h1 className="text-2xl font-semibold tracking-tight">Cornerstone OS</h1>
        <p className="mt-1 text-sm text-muted-foreground">Operations + Finance + Vendor Management</p>
      </div>
      <form onSubmit={handleLogin} className="glass-card p-6 space-y-4">
        <div>
          <label htmlFor="email" className="block text-sm font-medium mb-1">
            Email
          </label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="w-full h-10 rounded-xl border border-border bg-background px-3 text-sm"
            placeholder="you@company.com"
          />
        </div>
        <div>
          <label htmlFor="password" className="block text-sm font-medium mb-1">
            Password
          </label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="w-full h-10 rounded-xl border border-border bg-background px-3 text-sm"
          />
        </div>
        {message && (
          <p className={message.type === 'error' ? 'text-red-500 text-sm' : 'text-green-500 text-sm'}>
            {message.text}
          </p>
        )}
        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? 'Signing in…' : 'Sign in'}
        </Button>
      </form>
      <p className="text-center text-xs text-muted-foreground">
        Internal use only. Contact admin for access.
      </p>
    </div>
  );
}
