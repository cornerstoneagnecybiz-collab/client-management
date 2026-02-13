'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import * as Select from '@radix-ui/react-select';
import { createLedgerEntry } from './actions';
import type { LedgerEntryType } from '@/types';

const TYPE_OPTIONS: { value: LedgerEntryType; label: string }[] = [
  { value: 'client_invoice', label: 'Client invoice (billed)' },
  { value: 'client_payment', label: 'Client payment (received)' },
  { value: 'vendor_expected_cost', label: 'Vendor expected cost' },
  { value: 'vendor_payment', label: 'Vendor payment (paid)' },
];

interface NewEntryFormProps {
  projectOptions: { value: string; label: string }[];
  defaultProjectId?: string;
  onSuccess: () => void;
  onCancel: () => void;
}

export function NewEntryForm({
  projectOptions,
  defaultProjectId = '',
  onSuccess,
  onCancel,
}: NewEntryFormProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [projectId, setProjectId] = useState(defaultProjectId);
  const [type, setType] = useState<LedgerEntryType>('client_payment');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!projectId) {
      setError('Project is required.');
      return;
    }
    const amt = amount.trim() ? parseFloat(amount) : NaN;
    if (isNaN(amt) || amt <= 0) {
      setError('Amount must be a positive number.');
      return;
    }
    if (!date.trim()) {
      setError('Date is required.');
      return;
    }
    setLoading(true);
    const result = await createLedgerEntry({
      project_id: projectId,
      type,
      amount: amt,
      date: date.trim(),
    });
    setLoading(false);
    if (result.error) {
      setError(result.error);
      return;
    }
    onSuccess();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div>
        <Label className="mb-1.5 block">Project</Label>
        <Select.Root value={projectId || undefined} onValueChange={setProjectId} required disabled={!!defaultProjectId}>
          <Select.Trigger
            className="flex h-10 w-full items-center justify-between rounded-xl border border-border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring data-[placeholder]:text-muted-foreground disabled:opacity-70"
          >
            <Select.Value placeholder="Select project" />
            <Select.Icon />
          </Select.Trigger>
          <Select.Portal>
            <Select.Content
              className="z-[100] max-h-[300px] overflow-y-auto rounded-xl border border-border bg-card shadow-lg"
              position="popper"
              sideOffset={4}
            >
              <Select.Viewport>
                {projectOptions.map((opt) => (
                  <Select.Item
                    key={opt.value}
                    value={opt.value}
                    className="flex cursor-default items-center rounded-lg py-2 pl-3 pr-8 text-sm outline-none focus:bg-muted"
                  >
                    <Select.ItemText>{opt.label}</Select.ItemText>
                  </Select.Item>
                ))}
              </Select.Viewport>
            </Select.Content>
          </Select.Portal>
        </Select.Root>
      </div>

      <div>
        <Label className="mb-1.5 block">Entry type</Label>
        <Select.Root value={type} onValueChange={(v) => setType(v as LedgerEntryType)}>
          <Select.Trigger
            className="flex h-10 w-full items-center justify-between rounded-xl border border-border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          >
            <Select.Value />
            <Select.Icon />
          </Select.Trigger>
          <Select.Portal>
            <Select.Content
              className="z-[100] overflow-hidden rounded-xl border border-border bg-card shadow-lg"
              position="popper"
              sideOffset={4}
            >
              <Select.Viewport>
                {TYPE_OPTIONS.map((opt) => (
                  <Select.Item
                    key={opt.value}
                    value={opt.value}
                    className="flex cursor-default items-center rounded-lg py-2 pl-3 pr-8 text-sm outline-none focus:bg-muted"
                  >
                    <Select.ItemText>{opt.label}</Select.ItemText>
                  </Select.Item>
                ))}
              </Select.Viewport>
            </Select.Content>
          </Select.Portal>
        </Select.Root>
      </div>

      <div>
        <Label htmlFor="ledger_amount" className="mb-1.5 block">Amount (₹)</Label>
        <Input
          id="ledger_amount"
          type="number"
          min="0.01"
          step="0.01"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          required
          placeholder="0"
        />
      </div>

      <div>
        <Label htmlFor="ledger_date" className="mb-1.5 block">Date</Label>
        <Input id="ledger_date" type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
      </div>

      {error && <p className="text-sm text-red-500">{error}</p>}

      <div className="flex gap-3 pt-2">
        <Button type="submit" disabled={loading}>
          {loading ? 'Adding…' : 'Add entry'}
        </Button>
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
