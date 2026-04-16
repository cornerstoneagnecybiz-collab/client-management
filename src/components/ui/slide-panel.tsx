'use client';

import * as React from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { cn } from '@/lib/utils';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface SlidePanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
  /**
   * - `default` (legacy): wraps children in a padded, scrollable body.
   * - `form`: renders children directly so they can use `<ModalBody>`/`<ModalFooter>`
   *   to get a sticky footer with scrollable content above it.
   */
  variant?: 'default' | 'form';
}

export function SlidePanel({
  open,
  onOpenChange,
  title,
  description,
  children,
  className,
  variant = 'default',
}: SlidePanelProps) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/50 transition-opacity data-[state=closed]:opacity-0 data-[state=open]:opacity-100" />
        <Dialog.Content
          className={cn(
            'fixed right-0 top-0 z-50 h-full w-full max-w-lg border-l border-border bg-card shadow-glass transition-transform duration-200 ease-out',
            'data-[state=closed]:translate-x-full data-[state=open]:translate-x-0',
            className
          )}
          aria-describedby={undefined}
        >
          <div className="flex h-full flex-col">
            <div className="flex items-start justify-between gap-4 border-b border-border px-4 py-3">
              <div className="min-w-0">
                <Dialog.Title className="text-base font-semibold leading-tight">
                  {title}
                </Dialog.Title>
                {description && (
                  <Dialog.Description className="mt-0.5 text-xs text-muted-foreground">
                    {description}
                  </Dialog.Description>
                )}
              </div>
              <Dialog.Close asChild>
                <Button variant="ghost" size="icon" aria-label="Close panel" className="-mr-1 h-8 w-8">
                  <X className="h-4 w-4" />
                </Button>
              </Dialog.Close>
            </div>
            {variant === 'form' ? (
              children
            ) : (
              <div className="flex-1 overflow-y-auto p-4">{children}</div>
            )}
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
