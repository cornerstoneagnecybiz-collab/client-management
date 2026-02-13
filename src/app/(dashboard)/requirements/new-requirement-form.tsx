'use client';

import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import * as Select from '@radix-ui/react-select';
import { Command } from 'cmdk';
import { ChevronDown, Check } from 'lucide-react';
import { createRequirement } from './actions';
import { getCatalogVendorIds } from '@/app/(dashboard)/catalog/actions';
import { cn } from '@/lib/utils';

export type ServiceOption = {
  value: string;
  label: string;
  service_name?: string;
  description?: string;
  default_client_rate?: number | null;
  our_rate_min?: number | null;
  delivery?: 'vendor' | 'in_house';
};

interface NewRequirementFormProps {
  projectOptions: { value: string; label: string; engagement_type?: 'one_time' | 'monthly' }[];
  serviceOptions: ServiceOption[];
  vendorOptions: { value: string; label: string }[];
  defaultProjectId?: string;
  onSuccess: () => void;
  onCancel: () => void;
}

export function NewRequirementForm({
  projectOptions,
  serviceOptions,
  vendorOptions,
  defaultProjectId = '',
  onSuccess,
  onCancel,
}: NewRequirementFormProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [projectId, setProjectId] = useState(defaultProjectId);
  const [serviceId, setServiceId] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [clientPrice, setClientPrice] = useState('');
  const [vendorCost, setVendorCost] = useState('');
  const [vendorId, setVendorId] = useState('');
  const [delivery, setDelivery] = useState<'vendor' | 'in_house'>('vendor');
  const [quantity, setQuantity] = useState('');
  const [periodDays, setPeriodDays] = useState('');
  const [unitRate, setUnitRate] = useState('');
  const [vendorUnitRate, setVendorUnitRate] = useState('');
  const [catalogOpen, setCatalogOpen] = useState(false);
  const [linkedVendorIds, setLinkedVendorIds] = useState<string[]>([]);
  const catalogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!catalogOpen) return;
    function handleClickOutside(e: MouseEvent) {
      if (catalogRef.current && !catalogRef.current.contains(e.target as Node)) setCatalogOpen(false);
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [catalogOpen]);

  useEffect(() => {
    setProjectId(defaultProjectId);
  }, [defaultProjectId]);

  // Auto-fill from catalog when service is selected: unit rate, vendor cost, delivery; load vendors linked to this catalog item
  useEffect(() => {
    if (!serviceId) {
      setLinkedVendorIds([]);
      return;
    }
    const service = serviceOptions.find((s) => s.value === serviceId);
    const defaultRate = service?.default_client_rate != null ? String(service.default_client_rate) : '';
    setUnitRate(defaultRate);
    const proj = projectOptions.find((p) => p.value === projectId);
    // For one-time, client price (total) is computed from qty × period × rate; for monthly we pre-fill monthly amount
    if (proj?.engagement_type !== 'one_time') setClientPrice(defaultRate);
    const vendorRate = service?.our_rate_min != null ? String(service.our_rate_min) : '';
    setVendorUnitRate(vendorRate);
    setVendorCost(vendorRate ? '' : (service?.our_rate_min != null ? String(service.our_rate_min) : ''));
    setDelivery(service?.delivery ?? 'vendor');
    if (service?.delivery === 'in_house') setVendorId('');
    getCatalogVendorIds(serviceId).then((r) => setLinkedVendorIds(r.vendor_ids ?? []));
  }, [serviceId, projectId, projectOptions, serviceOptions]);

  const selectedProject = projectOptions.find((p) => p.value === projectId);
  const isOneTime = selectedProject?.engagement_type === 'one_time';

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!projectId || !serviceId) {
      setError('Project and catalog item are required.');
      return;
    }
    const service = serviceOptions.find((s) => s.value === serviceId);
    const finalTitle = isOneTime ? (service?.service_name ?? service?.label?.replace(/\s*\([^)]*\)\s*$/, '') ?? 'Requirement') : title.trim();
    if (!finalTitle) {
      setError('Title is required.');
      return;
    }
    if (isOneTime) {
      const q = quantity.trim() ? parseFloat(quantity) : null;
      const p = periodDays.trim() ? parseInt(periodDays, 10) : null;
      const r = unitRate.trim() ? parseFloat(unitRate) : null;
      const computedCp = q != null && r != null && q > 0 && r >= 0
        ? (p != null && p > 0 ? q * p * r : q * r)
        : null;
      const cp = computedCp ?? (clientPrice.trim() ? parseFloat(clientPrice) : null);
      const hasTm = q != null && q > 0 && (r != null && r >= 0 || (clientPrice.trim() ? parseFloat(clientPrice) : null) != null);
      if (!hasTm && (cp == null || cp < 0)) {
        setError('For one-time: enter Quantity and either Unit rate or Client price (total), or enter Client price.');
        return;
      }
    } else if (!clientPrice.trim() || parseFloat(clientPrice) < 0) {
      setError('Monthly amount is required.');
      return;
    }
    setLoading(true);
    const q = isOneTime && quantity.trim() ? parseFloat(quantity) : null;
    const p = isOneTime && periodDays.trim() ? parseInt(periodDays, 10) : null;
    const r = isOneTime && unitRate.trim() ? parseFloat(unitRate) : null;
    const computedClientPrice =
      q != null && r != null && q > 0 && r >= 0
        ? p != null && p > 0
          ? q * p * r
          : q * r
        : null;
    const vRate = isOneTime && vendorUnitRate.trim() ? parseFloat(vendorUnitRate) : null;
    const computedVendorCost =
      q != null && vRate != null && q > 0 && vRate >= 0
        ? p != null && p > 0
          ? q * p * vRate
          : q * vRate
        : null;
    const result = await createRequirement({
      project_id: projectId,
      service_catalog_id: serviceId,
      title: finalTitle,
      description: isOneTime ? null : (description.trim() || null),
      delivery,
      client_price: isOneTime && computedClientPrice != null ? computedClientPrice : (clientPrice.trim() ? parseFloat(clientPrice) : null),
      expected_vendor_cost: computedVendorCost ?? (vendorCost.trim() ? parseFloat(vendorCost) : null),
      assigned_vendor_id: delivery === 'vendor' ? (vendorId || null) : null,
      quantity: isOneTime && quantity.trim() ? parseFloat(quantity) : null,
      period_days: isOneTime && periodDays.trim() ? parseInt(periodDays, 10) : null,
      unit_rate: isOneTime && unitRate.trim() ? parseFloat(unitRate) : null,
      vendor_unit_rate: isOneTime && vendorUnitRate.trim() ? parseFloat(vendorUnitRate) : null,
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
        <Select.Root value={projectId} onValueChange={setProjectId} required>
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
              {projectOptions.map((opt) => (
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

      <div ref={catalogRef} className="relative">
        <Label className="mb-1.5 block">Catalog item</Label>
        <button
          type="button"
          onClick={() => setCatalogOpen((o) => !o)}
          className={cn(
            'flex h-10 w-full items-center justify-between rounded-xl border border-border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring',
            !serviceId && 'text-muted-foreground'
          )}
          aria-expanded={catalogOpen}
          aria-haspopup="listbox"
        >
          <span className="truncate">
            {serviceId ? serviceOptions.find((s) => s.value === serviceId)?.label ?? 'Select catalog item' : 'Select catalog item'}
          </span>
          <ChevronDown className="h-4 w-4 shrink-0 opacity-50" />
        </button>
        {catalogOpen && (
          <div className="absolute top-full left-0 right-0 z-[100] mt-1 rounded-xl border border-border bg-card shadow-lg overflow-hidden">
            <Command className="rounded-xl" shouldFilter={true}>
              <Command.Input
                placeholder="Search by name or code…"
                className="w-full border-0 border-b border-border bg-transparent px-3 py-2.5 text-sm outline-none placeholder:text-muted-foreground focus:ring-0"
                autoFocus
              />
              <Command.List className="max-h-60 overflow-y-auto p-1">
                <Command.Empty className="py-4 text-center text-sm text-muted-foreground">No catalog item found.</Command.Empty>
                {serviceOptions.map((opt) => (
                  <Command.Item
                    key={opt.value}
                    value={`${opt.label} ${opt.description ?? ''}`}
                    onSelect={() => {
                      setServiceId(opt.value);
                      setCatalogOpen(false);
                    }}
                    className={cn(
                      'flex cursor-pointer flex-col items-start gap-0.5 rounded-lg px-3 py-2 text-sm outline-none data-[selected=true]:bg-muted',
                      opt.value === serviceId && 'bg-muted'
                    )}
                  >
                    <span className="flex w-full items-center gap-2 font-medium">
                      {opt.label}
                      {opt.value === serviceId && <Check className="h-4 w-4 shrink-0 text-primary" />}
                    </span>
                    {opt.description && (
                      <span className="text-xs text-muted-foreground">{opt.description}</span>
                    )}
                  </Command.Item>
                ))}
              </Command.List>
            </Command>
          </div>
        )}
      </div>

      {isOneTime && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div>
              <Label htmlFor="quantity" className="mb-1.5 block">Quantity</Label>
              <Input
                id="quantity"
                type="number"
                step="any"
                min="0"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                placeholder="e.g. headcount or units"
              />
            </div>
            <div>
              <Label htmlFor="period_days" className="mb-1.5 block">Period (days)</Label>
              <Input
                id="period_days"
                type="number"
                min="0"
                value={periodDays}
                onChange={(e) => setPeriodDays(e.target.value)}
                placeholder="Optional"
              />
            </div>
            <div>
              <Label htmlFor="unit_rate" className="mb-1.5 block">Client unit rate</Label>
              <Input
                id="unit_rate"
                type="number"
                step="0.01"
                min="0"
                value={unitRate}
                onChange={(e) => setUnitRate(e.target.value)}
                placeholder="From catalog default"
              />
            </div>
            <div>
              <Label htmlFor="vendor_unit_rate" className="mb-1.5 block">Vendor unit rate</Label>
              <Input
                id="vendor_unit_rate"
                type="number"
                step="0.01"
                min="0"
                value={vendorUnitRate}
                onChange={(e) => setVendorUnitRate(e.target.value)}
                placeholder="From catalog our rate"
              />
            </div>
          </div>
        </div>
      )}

      {!isOneTime && (
        <>
          <div>
            <Label htmlFor="title" className="mb-1.5 block">Title</Label>
            <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Requirement title" required />
          </div>
          <div>
            <Label htmlFor="description" className="mb-1.5 block">Description</Label>
            <textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="flex w-full rounded-xl border border-border bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              placeholder="Optional"
            />
          </div>
        </>
      )}

      {delivery === 'vendor' && (
        <div>
          <Label className="mb-1.5 block">Vendor</Label>
          <Select.Root
            value={vendorId || '__none__'}
            onValueChange={(v) => setVendorId(v === '__none__' ? '' : v)}
          >
            <Select.Trigger
              className="flex h-10 w-full items-center justify-between rounded-xl border border-border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring data-[placeholder]:text-muted-foreground"
            >
              <Select.Value placeholder="Assign vendor (optional)" />
              <Select.Icon />
            </Select.Trigger>
            <Select.Portal>
              <Select.Content
                className="z-[100] overflow-hidden rounded-xl border border-border bg-card shadow-lg"
                position="popper"
                sideOffset={4}
              >
                <Select.Item
                  value="__none__"
                  className="relative flex cursor-default select-none items-center rounded-lg px-3 py-2 pl-8 text-sm outline-none data-[highlighted]:bg-muted"
                >
                  <Select.ItemText>None</Select.ItemText>
                  <Select.ItemIndicator className="absolute left-2">✓</Select.ItemIndicator>
                </Select.Item>
                {linkedVendorIds.length > 0
                  ? [
                      ...vendorOptions.filter((o) => linkedVendorIds.includes(o.value)),
                      ...vendorOptions.filter((o) => !linkedVendorIds.includes(o.value)),
                    ].map((opt) => (
                      <Select.Item
                        key={opt.value}
                        value={opt.value}
                        className="relative flex cursor-default select-none items-center rounded-lg px-3 py-2 pl-8 text-sm outline-none data-[highlighted]:bg-muted"
                      >
                        <Select.ItemText>{opt.label}</Select.ItemText>
                        <Select.ItemIndicator className="absolute left-2">✓</Select.ItemIndicator>
                      </Select.Item>
                    ))
                  : vendorOptions.map((opt) => (
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
          {serviceId && linkedVendorIds.length === 0 && (
            <p className="mt-1 text-xs text-muted-foreground">Link vendors to this catalog item in Catalog for a filtered list.</p>
          )}
          {serviceId && linkedVendorIds.length > 0 && (
            <p className="mt-1 text-xs text-muted-foreground">Vendors linked to this catalog item shown first.</p>
          )}
        </div>
      )}
      {delivery === 'in_house' && (
        <p className="rounded-lg bg-muted/50 px-3 py-2 text-sm text-muted-foreground">In-house (consulting) — no vendor assignment.</p>
      )}

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="client_price" className="mb-1.5 block">
            {isOneTime ? 'Client price (total)' : 'Monthly amount (₹)'}
          </Label>
          {isOneTime && quantity.trim() && unitRate.trim() ? (
            <div className="flex h-10 items-center rounded-xl border border-border bg-muted/30 px-3 text-sm tabular-nums">
              {(() => {
                const q = parseFloat(quantity);
                const p = periodDays.trim() ? parseInt(periodDays, 10) : null;
                const r = parseFloat(unitRate);
                const total = p != null && p > 0 ? q * p * r : q * r;
                return isNaN(total) ? '—' : `₹${total.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
              })()}
            </div>
          ) : (
            <Input
              id="client_price"
              name="client_price"
              type="number"
              step="0.01"
              min="0"
              value={clientPrice}
              onChange={(e) => setClientPrice(e.target.value)}
              placeholder={isOneTime ? 'Or set quantity & client unit rate above' : '—'}
            />
          )}
        </div>
        <div>
          <Label htmlFor="vendor_cost" className="mb-1.5 block">
            Expected vendor cost {isOneTime ? '(total)' : ''}
          </Label>
          {isOneTime && quantity.trim() && vendorUnitRate.trim() ? (
            <div className="flex h-10 items-center rounded-xl border border-border bg-muted/30 px-3 text-sm tabular-nums">
              {(() => {
                const q = parseFloat(quantity);
                const p = periodDays.trim() ? parseInt(periodDays, 10) : null;
                const r = parseFloat(vendorUnitRate);
                const total = p != null && p > 0 ? q * p * r : q * r;
                return isNaN(total) ? '—' : `₹${total.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
              })()}
            </div>
          ) : (
            <Input
              id="vendor_cost"
              name="vendor_cost"
              type="number"
              step="0.01"
              min="0"
              value={vendorCost}
              onChange={(e) => setVendorCost(e.target.value)}
              placeholder={isOneTime ? 'Or set vendor unit rate above' : '—'}
            />
          )}
        </div>
      </div>

      {error && <p className="text-sm text-red-500">{error}</p>}

      <div className="flex gap-3 pt-2">
        <Button type="submit" disabled={loading}>{loading ? 'Creating…' : 'Create requirement'}</Button>
        <Button type="button" variant="outline" onClick={onCancel}>Cancel</Button>
      </div>
    </form>
  );
}
