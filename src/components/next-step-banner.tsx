import Link from 'next/link';
import { ArrowRight } from 'lucide-react';

interface NextStepBannerProps {
  message: string;
  ctaLabel: string;
  href: string;
}

export function NextStepBanner({ message, ctaLabel, href }: NextStepBannerProps) {
  return (
    <Link
      href={href}
      className="flex items-center justify-between rounded-xl border border-primary/20 bg-primary/5 px-4 py-3 text-sm font-medium text-primary transition-colors hover:bg-primary/10"
    >
      <span>{message}</span>
      <span className="flex items-center gap-1">
        {ctaLabel}
        <ArrowRight className="h-4 w-4" />
      </span>
    </Link>
  );
}
