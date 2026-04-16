'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ModalBody, ModalFooter } from '@/components/ui/modal';
import { Field, FieldGrid, FormError, FormSection } from '@/components/ui/form-shell';
import { useToast } from '@/components/ui/toast';
import * as Select from '@radix-ui/react-select';
import { createInvoice, getSuggestedInvoiceAmount } from './actions';
import type { InvoiceType } from '@/types';
import { cn } from '@/lib/utils';

const TYPE_OPTIONS: { value: InvoiceType; label: string }[] = [
  { value: 'project', label: 'Project' },
  { value: 'milestone', label: 'Milestone' },
  { value: 'monthly', label: 'Monthly' },
];

const SELECT_TRIGGER_BASE =
  'flex h-10 w-full items-center justify-between rounded-xl border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring data-[placeholder]:text-muted-foreground';
const SELECT_CONTENT_CLASS =
  'z-[100] overflow-hidden rounded-xl border border-border bg-card shadow-lg';

interface NewInvoiceFormProps {
  projectOptions: { value: string; label: string; engagement_type?: 'one_time' | 'monthly' }[];
  defaultProjectId?: string;
  onSuccess: () => void;
  onCancel: () => void;
  onDirtyChange?: (dirty: boolean) => void;
}

export function NewInvoiceForm({
  projectOptions,
  defaultProjectId = '',
  onSuccess,
  onCancel,
  onDirtyChange,
}: NewInvoiceFormProps) {
  const toast = useToast();
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [projectId, setProjectId] = useState(defaultProjectId);
  const [type, setType] = useState<InvoiceType>('project');
  const [amount, setAmount] = useState('');
  const [issueDate, setIssueDate] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [billingMonth, setBillingMonth] = useState('');

  useEffect(() => {
    if (!projectId) return;
    const project = projectOptions.find((p) => p.value === projectId);
    if (project?.engagement_type === 'monthly') setType('monthly');
    else if (project?.engagement_type === 'one_time') setType('project');
  }, [projectId, projectOptions]);

  useEffect(() => {
    if (!projectId) return;
    getSuggestedInvoiceAmount(projectId).then(({ amount }) => {
      if (amount > 0) setAmount(String(amount));
    });
  }, [projectId]);

  const isDirty =
    (!defaultProjectId && projectId.length > 0) ||
    type !== 'project' ||
    amount.trim().length > 0 ||
    issueDate.length > 0 ||
    dueDate.length > 0 ||
    billingMonth.length > 0;

  useEffect(() => {
    onDirtyChange?.(isDirty);
  }, [isDirty, onDirtyChange]);

  async function handleSuggestAmount() {
    if (!projectId) return;
    const { amount } = await getSuggestedInvoiceAmount(projectId);
    setAmount(String(amount));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const errs: Record<string, string> = {};
    if (!projectId) errs.projectId = 'Project is required.';
    const amt = amount.trim() ? parseFloat(amount) : NaN;
    if (isNaN(amt) || amt < 0) errs.amount = 'Enter a valid non-negative amount.';
    setErrors(errs);
    if (Object.keys(errs).length > 0) return;
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
      setErrors({ _form: result.error });
      toast.error('Could not create invoice', result.error);
      return;
    }
    toast.success('Invoice created');
    onSuccess();
  }

  const project = projectId ? projectOptions.find((p) => p.value === projectId) : null;
  const typeMismatch =
    project &&
    ((type === 'monthly' && project.engagement_type === 'one_time') ||
      (type !== 'monthly' && project.engagement_type === 'monthly'));

  return (
    <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
      <ModalBody>
        <FormSection>
          <Field label="Project" required error={errors.projectId}>
            <Select.Root
              value={projectId || undefined}
              onValueChange={(v) => {
                setProjectId(v);
                setErrors((p) => { const n = { ...p }; delete n.projectId; return n; });
              }}
              required
            >
              <Select.Trigger
                className={cn(SELECT_TRIGGER_BASE, errors.projectId ? 'border-destructive' : 'border-border')}
              >
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
                        className="flex cursor-default items-center rounded-lg py-2 pl-3 pr-8 text-sm outline-none focus:bg-muted data-[disabled]:pointer-events-none data-[disabled]:opacity-50"
                      >
                        <Select.ItemText>{opt.label}</Select.ItemText>
                      </Select.Item>
                    ))}
                  </Select.Viewport>
                </Select.Content>
              </Select.Portal>
            </Select.Root>
          </Field>

          <Field label="Type" required>
            <Select.Root value={type} onValueChange={(v) => setType(v as InvoiceType)}>
              <Select.Trigger className={cn(SELECT_TRIGGER_BASE, 'border-border')}>
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
                        className="flex cursor-default items-center rounded-lg py-2 pl-3 pr-8 text-sm outline-none focus:bg-muted data-[disabled]:pointer-events-none data-[disabled]:opacity-50"
                      >
                        <Select.ItemText>{opt.label}</Select.ItemText>
                      </Select.Item>
                    ))}
                  </Select.Viewport>
                </Select.Content>
              </Select.Portal>
            </Select.Root>
          </Field>

          {typeMismatch && (
            <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-200">
              This project is {project!.engagement_type === 'monthly' ? 'monthly' : 'one-time'}. Prefer invoice type &quot;
              {project!.engagement_type === 'monthly' ? 'Monthly' : 'Project'}&quot; for consistency.
            </p>
          )}

          {type === 'monthly' && (
            <Field
              label="Billing month"
              htmlFor="billing_month"
              help="Prevents duplicate invoices for the same month."
            >
              <Input
                id="billing_month"
                type="month"
                value={billingMonth}
                onChange={(e) => setBillingMonth(e.target.value)}
              />
            </Field>
          )}

          <Field label="Amount (₹)" htmlFor="amount" required error={errors.amount}>
            <div className="flex items-center gap-2">
              <Input
                id="amount"
                type="number"
                min={0}
                step="0.01"
                value={amount}
                onChange={(e) => {
                  setAmount(e.target.value);
                  setErrors((p) => { const n = { ...p }; delete n.amount; return n; });
                }}
                className={cn(errors.amount && 'border-destructive')}
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleSuggestAmount}
                disabled={!projectId}
              >
                Suggest
              </Button>
            </div>
          </Field>

          <FieldGrid>
            <Field label="Issue date" htmlFor="issue_date">
              <Input id="issue_date" type="date" value={issueDate} onChange={(e) => setIssueDate(e.target.value)} />
            </Field>
            <Field label="Due date" htmlFor="due_date">
              <Input id="due_date" type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
            </Field>
          </FieldGrid>

          <FormError message={errors._form} />
        </FormSection>
      </ModalBody>
      <ModalFooter>
        <Button type="button" variant="outline" onClick={onCancel} disabled={loading}>
          Cancel
        </Button>
        <Button type="submit" disabled={loading}>
          {loading ? 'Creating…' : 'Create invoice'}
        </Button>
      </ModalFooter>
    </form>
  );
}
