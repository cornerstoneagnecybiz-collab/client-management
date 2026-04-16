// src/app/(dashboard)/dashboard/onboarding-banner.tsx
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import type { NextStep } from './_lib/types';

export function OnboardingBanner({ step }: { step: NextStep }) {
  return (
    <Link
      href={step.href}
      className="flex items-center gap-3 rounded-xl border border-primary/30 bg-gradient-to-r from-primary/15 to-primary/5 px-4 py-2.5 text-sm transition-colors hover:from-primary/20 hover:to-primary/10"
    >
      <ArrowRight className="h-4 w-4 shrink-0 text-primary" />
      <span>
        Next step: <span className="font-semibold text-primary">{step.label}</span>{' '}
        <span className="text-muted-foreground">— {step.description}</span>
      </span>
    </Link>
  );
}
