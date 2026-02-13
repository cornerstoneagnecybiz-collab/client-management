'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import * as Select from '@radix-ui/react-select';
import { createInvoice, getSuggestedInvoiceAmount } from './actions';
import type { InvoiceType } from '@/types';

const TYPE_OPTIONS: { value: InvoiceType; label: string }[] = [
  { value: 'project', label: 'Project' },
  { value: 'milestone', label: 'Milestone' },
  { value: 'monthly', label: 'Monthly' },
];

interface NewInvoiceFormProps {
  projectOptions: { value: string; label: string; engagement_type?: 'one_time' | 'monthly' }[];
  defaultProjectId?: string;
  onSuccess: () => void;
  onCancel: () => void;
}

export function NewInvoiceForm({
  projectOptions,
  defaultProjectId = '',
  onSuccess,
  onCancel,
}: NewInvoiceFormProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [projectId, setProjectId] = useState(defaultProjectId);
  const [type, setType] = useState<InvoiceType>('project');
  const [amount, setAmount] = useState('');
  const [issueDate, setIssueDate] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [billingMonth, setBillingMonth] = useState('');

  // Default invoice type from project engagement: monthly project → Monthly; one-time → Project
  useEffect(() => {
    if (!projectId) return;
    const project = projectOptions.find((p) => p.value === projectId);
    if (project?.engagement_type === 'monthly') setType('monthly');
    else if (project?.engagement_type === 'one_time') setType('project');
  }, [projectId, projectOptions]);

  // Suggest amount from fulfilled requirements when project is selected
  useEffect(() => {
    if (!projectId) return;
    getSuggestedInvoiceAmount(projectId).then(({ amount }) => {
      if (amount > 0) setAmount(String(amount));
    });
  }, [projectId]);

  async function handleSuggestAmount() {
    if (!projectId) return;
    const { amount } = await getSuggestedInvoiceAmount(projectId);
    setAmount(String(amount));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!projectId) {
      setError('Project is required.');
      return;
    }
    const amt = amount.trim() ? parseFloat(amount) : NaN;
    if (isNaN(amt) || amt < 0) {
      setError('Amount must be a non-negative number.');
      return;
    }
    setLoading(true);
    const result = await createInvoice({
      project_id: projectId,
      type,
      amount: amt,
      issue_date: issueDate.trim() || null,
      due_date: dueDate.trim() || null,
      billing_month: type === 'monthly' && billingMonth ? `${billingMonth}-01` : null,
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
        <Select.Root value={projectId || undefined} onValueChange={setProjectId} required>
          <Select.Trigger
            className="flex h-10 w-full items-center justify-between rounded-xl border border-border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring data-[placeholder]:text-muted-foreground"
          >
            <Select.Value placeholder="Select project" />
            <Select.Icon />
          </Select.Trigger>
          <Select.Portal>
            <Select.Content
              className="z-[100] overflow-hidden rounded-xl border border-border bg-card shadow-lg"
              position="popper"
              sideOffset={4}
            >
              <Select.Viewport>
                {projectOptions.map((opt) => (
                  <Select.Item
                    key={opt.value}
                    value={opt.value}
                    className="flex cursor-default items-center rounded-lg py-2 pl-3 pr-8 text-sm outline-none focus:bg-muted data-[disabled]:pointer-events-none data-[disabled]:opacity-50"
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
        <Label className="mb-1.5 block">Type</Label>
        <Select.Root value={type} onValueChange={(v) => setType(v as InvoiceType)}>
          <Select.Trigger
            className="flex h-10 w-full items-center justify-between rounded-xl border border-border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring data-[placeholder]:text-muted-foreground"
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
                    className="flex cursor-default items-center rounded-lg py-2 pl-3 pr-8 text-sm outline-none focus:bg-muted data-[disabled]:pointer-events-none data-[disabled]:opacity-50"
                  >
                    <Select.ItemText>{opt.label}</Select.ItemText>
                  </Select.Item>
                ))}
              </Select.Viewport>
            </Select.Content>
          </Select.Portal>
        </Select.Root>
      </div>

      {projectId && (() => {
        const project = projectOptions.find((p) => p.value === projectId);
        const mismatch =
          project &&
          ((type === 'monthly' && project.engagement_type === 'one_time') ||
            (type !== 'monthly' && project.engagement_type === 'monthly'));
        return mismatch ? (
          <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-200">
            This project is {project!.engagement_type === 'monthly' ? 'monthly' : 'one-time'}. Prefer invoice type &quot;{project!.engagement_type === 'monthly' ? 'Monthly' : 'Project'}&quot; for consistency.
          </p>
        ) : null;
      })()}

      {type === 'monthly' && (
        <div>
          <Label htmlFor="billing_month" className="mb-1.5 block">Billing month</Label>
          <Input
            id="billing_month"
            type="month"
            value={billingMonth}
            onChange={(e) => setBillingMonth(e.target.value)}
            className="w-full"
          />
          <p className="mt-1 text-xs text-muted-foreground">Prevents duplicate invoices for the same month.</p>
        </div>
      )}

      <div>
        <div className="mb-1.5 flex items-center justify-between gap-2">
          <Label htmlFor="amount">Amount (₹)</Label>
          <Button type="button" variant="ghost" size="sm" onClick={handleSuggestAmount} disabled={!projectId}>
            Suggest from fulfilled
          </Button>
        </div>
        <Input
          id="amount"
          type="number"
          min={0}
          step="0.01"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          required
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="issue_date" className="mb-1.5 block">Issue date</Label>
          <Input id="issue_date" type="date" value={issueDate} onChange={(e) => setIssueDate(e.target.value)} />
        </div>
        <div>
          <Label htmlFor="due_date" className="mb-1.5 block">Due date</Label>
          <Input id="due_date" type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
        </div>
      </div>

      {error && <p className="text-sm text-red-500">{error}</p>}

      <div className="flex gap-3 pt-2">
        <Button type="submit" disabled={loading}>
          {loading ? 'Creating…' : 'Create invoice'}
        </Button>
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
