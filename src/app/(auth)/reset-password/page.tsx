'use client';

import Link from 'next/link';
import { FormEvent, Suspense, useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<ResetPasswordFallback />}>
      <ResetPasswordContent />
    </Suspense>
  );
}

function ResetPasswordFallback() {
  return (
    <div className="w-full max-w-sm space-y-8">
      <div className="text-center">
        <h1 className="text-2xl font-semibold tracking-tight">Set new password</h1>
        <p className="mt-1 text-sm text-muted-foreground">Preparing secure recovery session…</p>
      </div>
      <div className="glass-card p-6 space-y-4">
        <div className="h-10 rounded-xl border border-border bg-background/60" />
        <div className="h-10 rounded-xl border border-border bg-background/60" />
      </div>
    </div>
  );
}

function ResetPasswordContent() {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [ready, setReady] = useState(false);
  const [message, setMessage] = useState<{ type: 'error' | 'success'; text: string } | null>(null);
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createClient();

  const tokenHash = searchParams.get('token_hash');
  const otpType = searchParams.get('type');
  const code = searchParams.get('code');

  const hasRecoveryQuery = useMemo(
    () => Boolean(tokenHash && (otpType === 'recovery' || otpType === 'email')),
    [otpType, tokenHash]
  );

  useEffect(() => {
    let active = true;

    async function initializeSession() {
      try {
        if (code) {
          const { error } = await supabase.auth.exchangeCodeForSession(code);
          if (error && active) {
            setMessage({ type: 'error', text: 'This reset link is invalid or has expired.' });
            return;
          }
        } else if (hasRecoveryQuery && tokenHash && otpType) {
          const { error } = await supabase.auth.verifyOtp({
            type: otpType as 'recovery' | 'email',
            token_hash: tokenHash,
          });
          if (error && active) {
            setMessage({ type: 'error', text: 'This reset link is invalid or has expired.' });
            return;
          }
        }

        const { data } = await supabase.auth.getSession();
        if (!active) return;

        if (!data.session) {
          setMessage({
            type: 'error',
            text: 'No valid recovery session found. Open the latest reset link from your email.',
          });
        }
      } catch {
        if (!active) return;
        setMessage({
          type: 'error',
          text: 'Could not verify the reset link right now. Please try opening it again from your email.',
        });
      } finally {
        if (active) setReady(true);
      }
    }

    initializeSession();
    return () => {
      active = false;
    };
  }, [code, hasRecoveryQuery, otpType, supabase.auth, tokenHash]);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setMessage(null);

    if (password.length < 8) {
      setMessage({ type: 'error', text: 'Password must be at least 8 characters.' });
      return;
    }

    if (password !== confirmPassword) {
      setMessage({ type: 'error', text: 'Passwords do not match.' });
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) {
        setMessage({ type: 'error', text: error.message });
        return;
      }

      setMessage({ type: 'success', text: 'Password updated. Redirecting to sign in…' });
      await supabase.auth.signOut();
      setTimeout(() => {
        router.push('/login');
      }, 900);
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
        <h1 className="text-2xl font-semibold tracking-tight">Set new password</h1>
        <p className="mt-1 text-sm text-muted-foreground">Choose a new password for your account.</p>
      </div>

      <form onSubmit={handleSubmit} className="glass-card p-6 space-y-4">
        <div>
          <label htmlFor="password" className="block text-sm font-medium mb-1">
            New password
          </label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={8}
            className="w-full h-10 rounded-xl border border-border bg-background px-3 text-sm"
          />
        </div>

        <div>
          <label htmlFor="confirm-password" className="block text-sm font-medium mb-1">
            Confirm password
          </label>
          <input
            id="confirm-password"
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
            minLength={8}
            className="w-full h-10 rounded-xl border border-border bg-background px-3 text-sm"
          />
        </div>

        {message && (
          <p className={message.type === 'error' ? 'text-red-500 text-sm' : 'text-green-500 text-sm'}>
            {message.text}
          </p>
        )}

        <Button type="submit" className="w-full" disabled={loading || !ready}>
          {loading ? 'Updating…' : 'Update password'}
        </Button>
      </form>

      <p className="text-center text-xs text-muted-foreground">
        <Link href="/login" className="underline-offset-2 hover:underline">
          Back to sign in
        </Link>
      </p>
    </div>
  );
}
