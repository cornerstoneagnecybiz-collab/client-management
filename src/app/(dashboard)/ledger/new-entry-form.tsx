'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ModalBody, ModalFooter } from '@/components/ui/modal';
import { Field, FormError, FormSection } from '@/components/ui/form-shell';
import { useToast } from '@/components/ui/toast';
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
  onDirtyChange?: (dirty: boolean) => void;
}

const SELECT_TRIGGER_CLASS =
  'flex h-10 w-full items-center justify-between rounded-xl border border-border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring data-[placeholder]:text-muted-foreground disabled:opacity-70';
const SELECT_CONTENT_CLASS =
  'z-[100] max-h-[300px] overflow-y-auto rounded-xl border border-border bg-card shadow-lg';

export function NewEntryForm({
  projectOptions,
  defaultProjectId = '',
  onSuccess,
  onCancel,
  onDirtyChange,
}: NewEntryFormProps) {
  const toast = useToast();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [projectId, setProjectId] = useState(defaultProjectId);
  const [type, setType] = useState<LedgerEntryType>('client_payment');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));

  const isDirty =
    (!defaultProjectId && projectId.length > 0) ||
    type !== 'client_payment' ||
    amount.trim().length > 0;

  useEffect(() => {
    onDirtyChange?.(isDirty);
  }, [isDirty, onDirtyChange]);

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
      toast.error('Could not add entry', result.error);
      return;
    }
    toast.success('Entry added');
    onSuccess();
  }

  return (
    <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
      <ModalBody>
        <FormSection>
          <Field label="Project" required>
            <Select.Root
              value={projectId || undefined}
              onValueChange={setProjectId}
              required
              disabled={!!defaultProjectId}
            >
              <Select.Trigger className={SELECT_TRIGGER_CLASS}>
                <Select.Value placeholder="Select project" />
                <Select.Icon />
              </Select.Trigger>
              <Select.Portal>
                <Select.Content className={SELECT_CONTENT_CLASS} position="popper" sideOffset={4}>
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
          </Field>

          <Field label="Entry type" required>
            <Select.Root value={type} onValueChange={(v) => setType(v as LedgerEntryType)}>
              <Select.Trigger className={SELECT_TRIGGER_CLASS}>
                <Select.Value />
                <Select.Icon />
              </Select.Trigger>
              <Select.Portal>
                <Select.Content className={SELECT_CONTENT_CLASS} position="popper" sideOffset={4}>
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
          </Field>

          <Field label="Amount (₹)" htmlFor="ledger_amount" required>
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
          </Field>

          <Field label="Date" htmlFor="ledger_date" required>
            <Input
              id="ledger_date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              required
            />
          </Field>

          <FormError message={error} />
        </FormSection>
      </ModalBody>
      <ModalFooter>
        <Button type="button" variant="outline" onClick={onCancel} disabled={loading}>
          Cancel
        </Button>
        <Button type="submit" disabled={loading}>
          {loading ? 'Adding…' : 'Add entry'}
        </Button>
      </ModalFooter>
    </form>
  );
}
