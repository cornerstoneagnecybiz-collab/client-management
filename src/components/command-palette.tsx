'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Command } from 'cmdk';
import * as Dialog from '@radix-ui/react-dialog';
import { Search, FolderKanban, Truck, Users, FileText, ClipboardList, Plus, Package } from 'lucide-react';
import { cn } from '@/lib/utils';

export function CommandPaletteTrigger() {
  const [open, setOpen] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((o) => !o);
      }
    };
    document.addEventListener('keydown', down);
    return () => document.removeEventListener('keydown', down);
  }, []);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={cn(
          'flex h-9 w-full max-w-md items-center gap-2 rounded-xl border border-border bg-muted/50 px-3 text-sm text-muted-foreground transition-colors hover:bg-muted'
        )}
      >
        <Search className="h-4 w-4 shrink-0" />
        <span>Search…</span>
        <kbd className="pointer-events-none ml-auto hidden h-5 select-none items-center gap-1 rounded border border-border px-1.5 font-mono text-[10px] font-medium sm:flex">
          <span className="text-xs">⌘</span>K
        </kbd>
      </button>
      <Command.Dialog
        open={open}
        onOpenChange={setOpen}
        label="Command palette"
        className="fixed left-1/2 top-[15%] z-50 w-full max-w-xl -translate-x-1/2 rounded-2xl border border-border bg-card p-2 shadow-glass"
      >
        <Dialog.Title className="sr-only">Command palette</Dialog.Title>
        <Command.Input
          placeholder="Search projects, vendors, clients, invoices…"
          className="w-full bg-transparent px-3 py-2 text-sm outline-none placeholder:text-muted-foreground"
        />
        <Command.List className="max-h-[300px] overflow-y-auto py-2">
          <Command.Empty className="py-6 text-center text-sm text-muted-foreground">
            No results.
          </Command.Empty>
          <Command.Group heading="Quick actions" className="px-2">
            <Command.Item
              onSelect={() => { router.push('/clients?new=1'); setOpen(false); }}
              className="flex cursor-pointer items-center gap-2 rounded-lg px-3 py-2 text-sm data-[selected=true]:bg-muted"
            >
              <Plus className="h-4 w-4" />
              New client
            </Command.Item>
            <Command.Item
              onSelect={() => { router.push('/vendors?new=1'); setOpen(false); }}
              className="flex cursor-pointer items-center gap-2 rounded-lg px-3 py-2 text-sm data-[selected=true]:bg-muted"
            >
              <Plus className="h-4 w-4" />
              New vendor
            </Command.Item>
            <Command.Item
              onSelect={() => { router.push('/projects/new'); setOpen(false); }}
              className="flex cursor-pointer items-center gap-2 rounded-lg px-3 py-2 text-sm data-[selected=true]:bg-muted"
            >
              <FolderKanban className="h-4 w-4" />
              New project
            </Command.Item>
            <Command.Item
              onSelect={() => { router.push('/requirements'); setOpen(false); }}
              className="flex cursor-pointer items-center gap-2 rounded-lg px-3 py-2 text-sm data-[selected=true]:bg-muted"
            >
              <ClipboardList className="h-4 w-4" />
              Add requirement
            </Command.Item>
            <Command.Item
              onSelect={() => { router.push('/finance'); setOpen(false); }}
              className="flex cursor-pointer items-center gap-2 rounded-lg px-3 py-2 text-sm data-[selected=true]:bg-muted"
            >
              <FileText className="h-4 w-4" />
              Finance (invoices & payouts)
            </Command.Item>
            <Command.Item
              onSelect={() => { router.push('/catalog?new=1'); setOpen(false); }}
              className="flex cursor-pointer items-center gap-2 rounded-lg px-3 py-2 text-sm data-[selected=true]:bg-muted"
            >
              <Package className="h-4 w-4" />
              Add service to catalog
            </Command.Item>
          </Command.Group>
          <Command.Group heading="Go to" className="mt-2 px-2">
            <Command.Item onSelect={() => { router.push('/'); setOpen(false); }} className="flex cursor-pointer items-center gap-2 rounded-lg px-3 py-2 text-sm data-[selected=true]:bg-muted">
              Dashboard
            </Command.Item>
            <Command.Item onSelect={() => { router.push('/clients'); setOpen(false); }} className="flex cursor-pointer items-center gap-2 rounded-lg px-3 py-2 text-sm data-[selected=true]:bg-muted">
              <Users className="h-4 w-4" />
              Clients
            </Command.Item>
            <Command.Item onSelect={() => { router.push('/vendors'); setOpen(false); }} className="flex cursor-pointer items-center gap-2 rounded-lg px-3 py-2 text-sm data-[selected=true]:bg-muted">
              <Truck className="h-4 w-4" />
              Vendors
            </Command.Item>
            <Command.Item onSelect={() => { router.push('/projects'); setOpen(false); }} className="flex cursor-pointer items-center gap-2 rounded-lg px-3 py-2 text-sm data-[selected=true]:bg-muted">
              <FolderKanban className="h-4 w-4" />
              Projects
            </Command.Item>
            <Command.Item onSelect={() => { router.push('/ledger'); setOpen(false); }} className="flex cursor-pointer items-center gap-2 rounded-lg px-3 py-2 text-sm data-[selected=true]:bg-muted">
              Ledger
            </Command.Item>
            <Command.Item onSelect={() => { router.push('/catalog'); setOpen(false); }} className="flex cursor-pointer items-center gap-2 rounded-lg px-3 py-2 text-sm data-[selected=true]:bg-muted">
              <Package className="h-4 w-4" />
              Catalog
            </Command.Item>
            <Command.Item onSelect={() => { router.push('/reports'); setOpen(false); }} className="flex cursor-pointer items-center gap-2 rounded-lg px-3 py-2 text-sm data-[selected=true]:bg-muted">
              Analytics
            </Command.Item>
          </Command.Group>
        </Command.List>
      </Command.Dialog>
    </>
  );
}
