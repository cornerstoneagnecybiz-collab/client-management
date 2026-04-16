'use client';

import * as React from 'react';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

/**
 * Groups related fields under a small caps heading with optional description.
 * Use sparingly — only when a form has 2+ logical sections.
 */
export function FormSection({
  title,
  description,
  children,
  className,
}: {
  title?: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={cn('space-y-4', className)}>
      {(title || description) && (
        <div className="space-y-1">
          {title && (
            <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {title}
            </h3>
          )}
          {description && (
            <p className="text-xs text-muted-foreground">{description}</p>
          )}
        </div>
      )}
      <div className="space-y-4">{children}</div>
    </section>
  );
}

interface FieldProps {
  label: string;
  htmlFor?: string;
  required?: boolean;
  help?: string;
  error?: string | null;
  children: React.ReactNode;
  className?: string;
}

/**
 * Unified field wrapper: label + control + optional help text + error.
 * Prefer this over ad-hoc `<Label> + <Input>` pairs for consistent spacing.
 */
export function Field({
  label,
  htmlFor,
  required,
  help,
  error,
  children,
  className,
}: FieldProps) {
  return (
    <div className={cn('space-y-1.5', className)}>
      <Label htmlFor={htmlFor} className="text-xs font-medium text-foreground">
        {label}
        {required && <span className="ml-0.5 text-destructive">*</span>}
      </Label>
      {children}
      {error ? (
        <p className="text-xs text-destructive">{error}</p>
      ) : help ? (
        <p className="text-xs text-muted-foreground">{help}</p>
      ) : null}
    </div>
  );
}

/**
 * Two-column grid for side-by-side fields on >=sm breakpoints.
 */
export function FieldGrid({
  children,
  className,
  cols = 2,
}: {
  children: React.ReactNode;
  className?: string;
  cols?: 2 | 3;
}) {
  return (
    <div
      className={cn(
        'grid gap-4 sm:grid-cols-2',
        cols === 3 && 'sm:grid-cols-3',
        className
      )}
    >
      {children}
    </div>
  );
}

/**
 * Full-width, non-field error banner at the top/bottom of a form.
 */
export function FormError({ message }: { message?: string | null }) {
  if (!message) return null;
  return (
    <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">
      {message}
    </div>
  );
}
