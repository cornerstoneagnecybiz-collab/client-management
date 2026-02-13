'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import * as Select from '@radix-ui/react-select';
import { createVendorPayout } from './actions';

export type RequirementOption = { value: string; label: string; expected_vendor_cost?: number | null };

interface NewPayoutFormProps {
  requirementOptions: RequirementOption[];
  vendorOptions: { value: string; label: string }[];
  onSuccess: () => void;
  onCancel: () => void;
}

export function NewPayoutForm({
  requirementOptions,
  vendorOptions,
  onSuccess,
  onCancel,
}: NewPayoutFormProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [requirementId, setRequirementId] = useState('');
  const [vendorId, setVendorId] = useState('');
  const [amount, setAmount] = useState('');
  const [paidDate, setPaidDate] = useState('');

  // Pre-fill amount from requirement's expected_vendor_cost when requirement is selected
  useEffect(() => {
    if (!requirementId) return;
    const req = requirementOptions.find((r) => r.value === requirementId);
    if (req?.expected_vendor_cost != null) setAmount(String(req.expected_vendor_cost));
  }, [requirementId, requirementOptions]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!requirementId || !vendorId) {
      setError('Requirement and vendor are required.');
      return;
    }
    const amt = amount.trim() ? parseFloat(amount) : NaN;
    if (isNaN(amt) || amt < 0) {
      setError('Amount must be a non-negative number.');
      return;
    }
    setLoading(true);
    const result = await createVendorPayout({
      requirement_id: requirementId,
      vendor_id: vendorId,
      amount: amt,
      paid_date: paidDate.trim() || null,
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
        <Label className="mb-1.5 block">Requirement</Label>
        <Select.Root value={requirementId || undefined} onValueChange={setRequirementId} required>
          <Select.Trigger
            className="flex h-10 w-full items-center justify-between rounded-xl border border-border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring data-[placeholder]:text-muted-foreground"
          >
            <Select.Value placeholder="Select requirement" />
            <Select.Icon />
          </Select.Trigger>
          <Select.Portal>
            <Select.Content
              className="z-[100] max-h-[300px] overflow-y-auto overflow-hidden rounded-xl border border-border bg-card shadow-lg"
              position="popper"
              sideOffset={4}
            >
              <Select.Viewport>
                {requirementOptions.map((opt) => (
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
        <Label className="mb-1.5 block">Vendor</Label>
        <Select.Root value={vendorId || undefined} onValueChange={setVendorId} required>
          <Select.Trigger
            className="flex h-10 w-full items-center justify-between rounded-xl border border-border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring data-[placeholder]:text-muted-foreground"
          >
            <Select.Value placeholder="Select vendor" />
            <Select.Icon />
          </Select.Trigger>
          <Select.Portal>
            <Select.Content
              className="z-[100] overflow-hidden rounded-xl border border-border bg-card shadow-lg"
              position="popper"
              sideOffset={4}
            >
              <Select.Viewport>
                {vendorOptions.map((opt) => (
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
        <Label htmlFor="payout_amount" className="mb-1.5 block">Amount (₹)</Label>
        <Input
          id="payout_amount"
          type="number"
          min={0}
          step="0.01"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          required
        />
      </div>

      <div>
        <Label htmlFor="payout_paid_date" className="mb-1.5 block">Paid date (optional)</Label>
        <Input
          id="payout_paid_date"
          type="date"
          value={paidDate}
          onChange={(e) => setPaidDate(e.target.value)}
        />
        <p className="mt-1 text-xs text-muted-foreground">If set, payout is marked as paid.</p>
      </div>

      {error && <p className="text-sm text-red-500">{error}</p>}

      <div className="flex gap-3 pt-2">
        <Button type="submit" disabled={loading}>
          {loading ? 'Creating…' : 'Record payout'}
        </Button>
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
