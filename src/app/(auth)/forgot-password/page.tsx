'use client';

import Link from 'next/link';
import { FormEvent, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'error' | 'success'; text: string } | null>(null);
  const supabase = createClient();

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    try {
      const redirectTo = `${window.location.origin}/reset-password`;
      const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo });

      if (error) {
        setMessage({ type: 'error', text: error.message });
        return;
      }

      setMessage({
        type: 'success',
        text: 'If this email exists, we sent a password reset link. Check your inbox.',
      });
    } catch (err) {
      const text = err instanceof Error ? err.message : String(err);
      setMessage({ type: 'error', text });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="w-full max-w-sm space-y-8">
      <div className="text-center">
        <h1 className="text-2xl font-semibold tracking-tight">Reset your password</h1>
        <p className="mt-1 text-sm text-muted-foreground">Enter your email to receive a secure reset link.</p>
      </div>

      <form onSubmit={handleSubmit} className="glass-card p-6 space-y-4">
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

        {message && (
          <p className={message.type === 'error' ? 'text-red-500 text-sm' : 'text-green-500 text-sm'}>
            {message.text}
          </p>
        )}

        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? 'Sending link…' : 'Send reset link'}
        </Button>
      </form>

      <p className="text-center text-xs text-muted-foreground">
        Remembered your password?{' '}
        <Link href="/login" className="underline-offset-2 hover:underline">
          Back to sign in
        </Link>
      </p>
    </div>
  );
}
