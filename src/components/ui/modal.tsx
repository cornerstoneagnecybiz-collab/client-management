'use client';

import * as React from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

type ModalSize = 'sm' | 'md' | 'lg';

const SIZE_CLASS: Record<ModalSize, string> = {
  sm: 'max-w-md',
  md: 'max-w-lg',
  lg: 'max-w-2xl',
};

interface ModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  size?: ModalSize;
  children: React.ReactNode;
  className?: string;
}

/**
 * Centered modal dialog for short, focused forms.
 * Use for: <= 6 fields, single concern, no nested tabs/sections.
 * For longer flows (line items, multi-section editing), use `SlidePanel`.
 */
export function Modal({
  open,
  onOpenChange,
  title,
  description,
  size = 'sm',
  children,
  className,
}: ModalProps) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay
          className={cn(
            'fixed inset-0 z-50 bg-black/60 backdrop-blur-sm transition-opacity duration-150',
            'data-[state=closed]:opacity-0 data-[state=open]:opacity-100'
          )}
        />
        <div className="fixed inset-0 z-50 grid place-items-center overflow-y-auto p-4 sm:p-6">
          <Dialog.Content
            className={cn(
              'relative w-full rounded-2xl border border-border bg-card shadow-2xl',
              'transition-[opacity,transform] duration-150 ease-out',
              'data-[state=closed]:opacity-0 data-[state=open]:opacity-100',
              'data-[state=closed]:scale-[0.97] data-[state=open]:scale-100',
              'flex max-h-[calc(100vh-2rem)] flex-col',
              SIZE_CLASS[size],
              className
            )}
          >
            <div className="flex items-start justify-between gap-4 border-b border-border px-6 py-4">
              <div className="min-w-0">
                <Dialog.Title className="text-base font-semibold leading-tight">
                  {title}
                </Dialog.Title>
                {description && (
                  <Dialog.Description className="mt-1 text-sm text-muted-foreground">
                    {description}
                  </Dialog.Description>
                )}
                {!description && (
                  <Dialog.Description className="sr-only">{title}</Dialog.Description>
                )}
              </div>
              <Dialog.Close
                className="-mr-2 -mt-1 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                aria-label="Close"
              >
                <X className="h-4 w-4" />
              </Dialog.Close>
            </div>
            {children}
          </Dialog.Content>
        </div>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

/**
 * Scrollable body region inside a Modal or SlidePanel.
 * Pair with `ModalFooter` for sticky actions.
 */
export function ModalBody({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('flex-1 overflow-y-auto px-6 py-5', className)}>{children}</div>
  );
}

/**
 * Sticky footer with action buttons. Right-aligned by default.
 */
export function ModalFooter({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'flex flex-wrap items-center justify-end gap-2 border-t border-border bg-card/95 px-6 py-3 backdrop-blur',
        className
      )}
    >
      {children}
    </div>
  );
}
