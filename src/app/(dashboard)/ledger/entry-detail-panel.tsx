'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import * as Select from '@radix-ui/react-select';
import { updateLedgerEntry, deleteLedgerEntry } from './actions';
import type { LedgerEntryType } from '@/types';

const TYPE_OPTIONS: { value: LedgerEntryType; label: string }[] = [
  { value: 'client_invoice', label: 'Client invoice (billed)' },
  { value: 'client_payment', label: 'Client payment (received)' },
  { value: 'vendor_expected_cost', label: 'Vendor expected cost' },
  { value: 'vendor_payment', label: 'Vendor payment (paid)' },
];

function formatMoney(n: number): string {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n);
}

export interface LedgerEntryRow {
  id: string;
  project_id: string;
  project_name: string;
  type: LedgerEntryType;
  amount: number;
  date: string;
  reference_id: string | null;
  created_at: string;
}

interface EntryDetailPanelProps {
  entry: LedgerEntryRow;
  onSuccess: () => void;
  onClose: () => void;
}

export function EntryDetailPanel({ entry, onSuccess, onClose }: EntryDetailPanelProps) {
  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [type, setType] = useState<LedgerEntryType>(entry.type);
  const [amount, setAmount] = useState(entry.amount.toString());
  const [date, setDate] = useState(entry.date);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const amt = amount.trim() ? parseFloat(amount) : 0;
    if (amt <= 0) {
      setError('Amount must be positive.');
      return;
    }
    setLoading(true);
    const result = await updateLedgerEntry(entry.id, { type, amount: amt, date });
    setLoading(false);
    if (result.error) {
      setError(result.error);
      return;
    }
    onSuccess();
  }

  async function handleDelete() {
    if (!confirm('Delete this ledger entry? This cannot be undone.')) return;
    setError(null);
    setDeleting(true);
    const result = await deleteLedgerEntry(entry.id);
    setDeleting(false);
    if (result.error) {
      setError(result.error);
      return;
    }
    onSuccess();
  }

  return (
    <div className="space-y-6">
      <div>
        <p className="text-muted-foreground text-sm">{entry.project_name}</p>
        <p className="font-medium">{TYPE_OPTIONS.find((o) => o.value === entry.type)?.label ?? entry.type}</p>
        <p className="text-lg tabular-nums">{formatMoney(entry.amount)}</p>
        <p className="text-xs text-muted-foreground">{new Date(entry.date).toLocaleDateString('en-US')}</p>
      </div>

      <form onSubmit={handleSave} className="space-y-4">
        <h3 className="text-sm font-medium text-muted-foreground">Edit entry</h3>
        <div>
          <Label className="mb-1.5 block">Type</Label>
          <Select.Root value={type} onValueChange={(v) => setType(v as LedgerEntryType)}>
            <Select.Trigger className="flex h-10 w-full items-center justify-between rounded-xl border border-border bg-background px-3 text-sm">
              <Select.Value />
              <Select.Icon />
            </Select.Trigger>
            <Select.Portal>
              <Select.Content className="z-[100] overflow-hidden rounded-xl border border-border bg-card shadow-lg" position="popper" sideOffset={4}>
                <Select.Viewport>
                  {TYPE_OPTIONS.map((opt) => (
                    <Select.Item key={opt.value} value={opt.value} className="flex cursor-default items-center rounded-lg py-2 pl-3 pr-8 text-sm outline-none focus:bg-muted">
                      <Select.ItemText>{opt.label}</Select.ItemText>
                    </Select.Item>
                  ))}
                </Select.Viewport>
              </Select.Content>
            </Select.Portal>
          </Select.Root>
        </div>
        <div>
          <Label htmlFor="edit_amount" className="mb-1.5 block">Amount (₹)</Label>
          <Input id="edit_amount" type="number" min="0.01" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} />
        </div>
        <div>
          <Label htmlFor="edit_date" className="mb-1.5 block">Date</Label>
          <Input id="edit_date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </div>
        {error && <p className="text-sm text-red-500">{error}</p>}
        <div className="flex gap-3">
          <Button type="submit" size="sm" disabled={loading}>{loading ? 'Saving…' : 'Save changes'}</Button>
          <Button type="button" variant="outline" size="sm" onClick={onClose}>Cancel</Button>
        </div>
      </form>

      <div className="border-t border-border pt-4">
        <Button type="button" variant="destructive" size="sm" onClick={handleDelete} disabled={deleting}>
          {deleting ? 'Deleting…' : 'Delete entry'}
        </Button>
      </div>
    </div>
  );
}
