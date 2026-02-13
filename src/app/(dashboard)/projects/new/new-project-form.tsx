'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import * as Select from '@radix-ui/react-select';
import type { ProjectStatus, EngagementType } from '@/types';
import { createProject } from './actions';
import { Calendar, Repeat } from 'lucide-react';

const STATUS_OPTIONS: { value: ProjectStatus; label: string }[] = [
  { value: 'draft', label: 'Draft' },
  { value: 'active', label: 'Active' },
  { value: 'on_hold', label: 'On hold' },
  { value: 'completed', label: 'Completed' },
  { value: 'cancelled', label: 'Cancelled' },
];

const ENGAGEMENT_OPTIONS: { value: EngagementType; label: string; description: string }[] = [
  { value: 'one_time', label: 'One-time project', description: 'Fixed scope, deliverables, and timeline. Invoice by project or milestone.' },
  { value: 'monthly', label: 'Monthly retainer', description: 'Recurring work. Bill monthly; add requirements as you go.' },
];

interface NewProjectFormProps {
  clientOptions: { value: string; label: string }[];
  defaultClientId?: string;
}

export function NewProjectForm({ clientOptions, defaultClientId = '' }: NewProjectFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [clientId, setClientId] = useState<string>(defaultClientId);
  const [engagementType, setEngagementType] = useState<EngagementType>('one_time');
  const [status, setStatus] = useState<ProjectStatus>('draft');

  useEffect(() => {
    if (defaultClientId && clientOptions.some((c) => c.value === defaultClientId)) setClientId(defaultClientId);
  }, [defaultClientId, clientOptions]);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const form = e.currentTarget;
    const formData = new FormData(form);
    const name = (formData.get('name') as string)?.trim();
    if (!name) {
      setError('Project name is required.');
      return;
    }
    if (!clientId) {
      setError('Please select a client.');
      return;
    }
    setLoading(true);
    const result = await createProject({
      client_id: clientId,
      name,
      status,
      engagement_type: engagementType,
      start_date: (formData.get('start_date') as string) || null,
      end_date: (formData.get('end_date') as string) || null,
    });
    setLoading(false);
    if (result.error) {
      setError(result.error);
      return;
    }
    router.push(`/projects/${result.id}?addRequirement=1`);
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div>
        <Label htmlFor="client_id" className="mb-1.5 block">
          Client
        </Label>
        <Select.Root value={clientId} onValueChange={setClientId} required>
          <Select.Trigger
            id="client_id"
            className="flex h-10 w-full items-center justify-between rounded-xl border border-border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring data-[placeholder]:text-muted-foreground"
          >
            <Select.Value placeholder="Select client" />
            <Select.Icon />
          </Select.Trigger>
          <Select.Portal>
            <Select.Content
              className="overflow-hidden rounded-xl border border-border bg-card shadow-lg"
              position="popper"
              sideOffset={4}
            >
              {clientOptions.map((opt) => (
                <Select.Item
                  key={opt.value}
                  value={opt.value}
                  className="relative flex cursor-default select-none items-center rounded-lg px-3 py-2 pl-8 text-sm outline-none data-[highlighted]:bg-muted"
                >
                  <Select.ItemText>{opt.label}</Select.ItemText>
                  <Select.ItemIndicator className="absolute left-2">
                    ✓
                  </Select.ItemIndicator>
                </Select.Item>
              ))}
            </Select.Content>
          </Select.Portal>
        </Select.Root>
      </div>

      <div>
        <Label htmlFor="name" className="mb-1.5 block">
          Project name
        </Label>
        <Input id="name" name="name" placeholder="e.g. Website redesign Q1 or Monthly retainer — Acme" required />
      </div>

      <div>
        <Label className="mb-2 block">Engagement type</Label>
        <div className="grid gap-3 sm:grid-cols-2">
          {ENGAGEMENT_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => setEngagementType(opt.value)}
              className={`flex flex-col items-start rounded-xl border-2 p-4 text-left transition-colors ${
                engagementType === opt.value
                  ? 'border-primary bg-primary/10'
                  : 'border-border bg-card hover:border-muted-foreground/30'
              }`}
            >
              <span className="flex items-center gap-2 font-medium">
                {opt.value === 'monthly' ? <Repeat className="h-4 w-4" /> : <Calendar className="h-4 w-4" />}
                {opt.label}
              </span>
              <span className="mt-1 text-xs text-muted-foreground">{opt.description}</span>
            </button>
          ))}
        </div>
      </div>

      <div>
        <Label htmlFor="status" className="mb-1.5 block">
          Status
        </Label>
        <Select.Root value={status} onValueChange={(v) => setStatus(v as ProjectStatus)}>
          <Select.Trigger
            id="status"
            className="flex h-10 w-full items-center justify-between rounded-xl border border-border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          >
            <Select.Value />
            <Select.Icon />
          </Select.Trigger>
          <Select.Portal>
            <Select.Content
              className="overflow-hidden rounded-xl border border-border bg-card shadow-lg"
              position="popper"
              sideOffset={4}
            >
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
            </Select.Content>
          </Select.Portal>
        </Select.Root>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="start_date" className="mb-1.5 block">
            Start date
          </Label>
          <Input id="start_date" name="start_date" type="date" />
        </div>
        <div>
          <Label htmlFor="end_date" className="mb-1.5 block">
            Expected end date
          </Label>
          <Input id="end_date" name="end_date" type="date" />
        </div>
      </div>

      {error && <p className="text-sm text-red-500">{error}</p>}

      <div className="flex gap-3 pt-2">
        <Button type="submit" disabled={loading}>
          {loading ? 'Creating…' : 'Create project'}
        </Button>
        <Button type="button" variant="outline" onClick={() => router.back()}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
