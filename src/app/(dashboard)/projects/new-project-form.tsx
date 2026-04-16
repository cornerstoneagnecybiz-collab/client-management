'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ModalBody, ModalFooter } from '@/components/ui/modal';
import { Field, FieldGrid, FormError, FormSection } from '@/components/ui/form-shell';
import { useToast } from '@/components/ui/toast';
import * as Select from '@radix-ui/react-select';
import type { ProjectStatus, EngagementType } from '@/types';
import { createProject } from './actions';
import { Calendar, Repeat } from 'lucide-react';
import { cn } from '@/lib/utils';

const STATUS_OPTIONS: { value: ProjectStatus; label: string }[] = [
  { value: 'draft', label: 'Draft' },
  { value: 'active', label: 'Active' },
  { value: 'on_hold', label: 'On hold' },
  { value: 'completed', label: 'Completed' },
  { value: 'cancelled', label: 'Cancelled' },
];

const ENGAGEMENT_OPTIONS: { value: EngagementType; label: string; description: string; icon: typeof Calendar }[] = [
  { value: 'one_time', label: 'One-time', description: 'Fixed scope and timeline.', icon: Calendar },
  { value: 'monthly', label: 'Monthly retainer', description: 'Recurring monthly billing.', icon: Repeat },
];

const SELECT_TRIGGER_CLASS =
  'flex h-10 w-full items-center justify-between rounded-xl border border-border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring data-[placeholder]:text-muted-foreground';
const SELECT_CONTENT_CLASS =
  'z-[100] max-h-[300px] overflow-hidden rounded-xl border border-border bg-card shadow-lg';

interface NewProjectFormProps {
  clientOptions: { value: string; label: string }[];
  defaultClientId?: string;
  onSuccess?: () => void;
  onCancel: () => void;
  onDirtyChange?: (dirty: boolean) => void;
}

export function NewProjectForm({
  clientOptions,
  defaultClientId = '',
  onSuccess,
  onCancel,
  onDirtyChange,
}: NewProjectFormProps) {
  const router = useRouter();
  const toast = useToast();
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [clientId, setClientId] = useState<string>(defaultClientId);
  const [name, setName] = useState('');
  const [engagementType, setEngagementType] = useState<EngagementType>('one_time');
  const [status, setStatus] = useState<ProjectStatus>('draft');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  useEffect(() => {
    if (defaultClientId && clientOptions.some((c) => c.value === defaultClientId)) {
      setClientId(defaultClientId);
    }
  }, [defaultClientId, clientOptions]);

  const isDirty =
    (!defaultClientId && clientId.length > 0) ||
    name.trim().length > 0 ||
    engagementType !== 'one_time' ||
    status !== 'draft' ||
    startDate.length > 0 ||
    endDate.length > 0;

  useEffect(() => {
    onDirtyChange?.(isDirty);
  }, [isDirty, onDirtyChange]);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const errs: Record<string, string> = {};
    if (!name.trim()) errs.name = 'Project name is required.';
    if (!clientId) errs.clientId = 'Please select a client.';
    setErrors(errs);
    if (Object.keys(errs).length > 0) return;
    setLoading(true);
    const result = await createProject({
      client_id: clientId,
      name: name.trim(),
      status,
      engagement_type: engagementType,
      start_date: startDate || null,
      end_date: endDate || null,
    });
    setLoading(false);
    if (result.error) {
      setErrors({ _form: result.error });
      toast.error('Could not create project', result.error);
      return;
    }
    toast.success('Project created', name.trim());
    onSuccess?.();
    router.push(`/projects/${result.id}?addRequirement=1`);
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
      <ModalBody className="space-y-6">
        <FormSection>
          <Field label="Client" htmlFor="client_id" required error={errors.clientId}>
            <Select.Root
              value={clientId}
              onValueChange={(v) => {
                setClientId(v);
                setErrors((p) => { const n = { ...p }; delete n.clientId; return n; });
              }}
              required
            >
              <Select.Trigger
                id="client_id"
                className={cn(SELECT_TRIGGER_CLASS, errors.clientId && 'border-destructive')}
              >
                <Select.Value placeholder="Select client" />
                <Select.Icon />
              </Select.Trigger>
              <Select.Portal>
                <Select.Content className={SELECT_CONTENT_CLASS} position="popper" sideOffset={4}>
                  <Select.Viewport>
                    {clientOptions.map((opt) => (
                      <Select.Item
                        key={opt.value}
                        value={opt.value}
                        className="relative flex cursor-default select-none items-center rounded-lg px-3 py-2 pl-8 text-sm outline-none data-[highlighted]:bg-muted"
                      >
                        <Select.ItemText>{opt.label}</Select.ItemText>
                        <Select.ItemIndicator className="absolute left-2">✓</Select.ItemIndicator>
                      </Select.Item>
                    ))}
                  </Select.Viewport>
                </Select.Content>
              </Select.Portal>
            </Select.Root>
          </Field>

          <Field label="Project name" htmlFor="project_name" required error={errors.name}>
            <Input
              id="project_name"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                setErrors((p) => { const n = { ...p }; delete n.name; return n; });
              }}
              placeholder="e.g. Website redesign Q1"
              className={cn(errors.name && 'border-destructive')}
              autoFocus
            />
          </Field>
        </FormSection>

        <FormSection title="Engagement">
          <div className="grid gap-3 sm:grid-cols-2">
            {ENGAGEMENT_OPTIONS.map((opt) => {
              const Icon = opt.icon;
              const active = engagementType === opt.value;
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setEngagementType(opt.value)}
                  className={cn(
                    'group flex flex-col items-start gap-1.5 rounded-xl border p-3 text-left transition-colors focus:outline-none focus:ring-2 focus:ring-ring',
                    active
                      ? 'border-primary bg-primary/10'
                      : 'border-border bg-background hover:border-muted-foreground/40'
                  )}
                  aria-pressed={active}
                >
                  <span className="flex items-center gap-2 text-sm font-medium">
                    <Icon className={cn('h-4 w-4', active ? 'text-primary' : 'text-muted-foreground')} />
                    {opt.label}
                  </span>
                  <span className="text-xs text-muted-foreground">{opt.description}</span>
                </button>
              );
            })}
          </div>

          <Field label="Status" htmlFor="project_status">
            <Select.Root value={status} onValueChange={(v) => setStatus(v as ProjectStatus)}>
              <Select.Trigger id="project_status" className={SELECT_TRIGGER_CLASS}>
                <Select.Value />
                <Select.Icon />
              </Select.Trigger>
              <Select.Portal>
                <Select.Content className={SELECT_CONTENT_CLASS} position="popper" sideOffset={4}>
                  <Select.Viewport>
                    {STATUS_OPTIONS.map((opt) => (
                      <Select.Item
                        key={opt.value}
                        value={opt.value}
                        className="relative flex cursor-default select-none items-center rounded-lg px-3 py-2 pl-8 text-sm outline-none data-[highlighted]:bg-muted"
                      >
                        <Select.ItemText>{opt.label}</Select.ItemText>
                        <Select.ItemIndicator className="absolute left-2">✓</Select.ItemIndicator>
                      </Select.Item>
                    ))}
                  </Select.Viewport>
                </Select.Content>
              </Select.Portal>
            </Select.Root>
          </Field>

          <FieldGrid>
            <Field label="Start date" htmlFor="start_date">
              <Input id="start_date" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
            </Field>
            <Field label="Expected end date" htmlFor="end_date">
              <Input id="end_date" type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
            </Field>
          </FieldGrid>
        </FormSection>

        <FormError message={errors._form} />
      </ModalBody>
      <ModalFooter>
        <Button type="button" variant="outline" onClick={onCancel} disabled={loading}>
          Cancel
        </Button>
        <Button type="submit" disabled={loading}>
          {loading ? 'Creating…' : 'Create project'}
        </Button>
      </ModalFooter>
    </form>
  );
}
