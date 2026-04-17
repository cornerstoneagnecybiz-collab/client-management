'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import * as Select from '@radix-ui/react-select';
import { updateRequirement, deleteRequirement } from './actions';
import { getInvoicesForRequirement } from '@/app/(dashboard)/invoicing/actions';
import type { RequirementRow } from './page';
import type { FulfilmentStatus } from '@/types';
import type { DeliveryType, PricingType } from '@/types/database';
import { cn } from '@/lib/utils';

const STATUS_OPTIONS: { value: FulfilmentStatus; label: string }[] = [
  { value: 'pending', label: 'Pending' },
  { value: 'in_progress', label: 'In progress' },
  { value: 'fulfilled', label: 'Fulfilled' },
  { value: 'cancelled', label: 'Cancelled' },
];

const PRICING_LABELS: Record<PricingType, string> = {
  fixed: 'Fixed price',
  qty_rate: 'Qty × Rate',
  days_rate: 'Days × Daily rate',
  qty_days_rate: 'Qty × Days × Rate',
  custom: 'Custom',
};

const COMPUTED_TYPES: PricingType[] = ['qty_rate', 'days_rate', 'qty_days_rate'];

interface RequirementDetailPanelProps {
  requirement: RequirementRow;
  vendorOptions: { value: string; label: string }[];
  onSuccess: () => void;
  onClose: () => void;
}

export function RequirementDetailPanel({
  requirement,
  vendorOptions,
  onSuccess,
  onClose,
}: RequirementDetailPanelProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [deleting, setDeleting] = useState(false);

  function clearFieldError(field: string) {
    if (fieldErrors[field]) setFieldErrors((prev) => { const n = { ...prev }; delete n[field]; return n; });
  }
  const [invoicedIn, setInvoicedIn] = useState<{ id: string; invoice_number: string }[]>([]);

  const [serviceName, setServiceName] = useState(requirement.service_name);
  const [serviceCategory, setServiceCategory] = useState(requirement.service_category ?? '');
  const [pricingType, setPricingType] = useState<PricingType>((requirement.pricing_type as PricingType) ?? 'fixed');
  const [title, setTitle] = useState(requirement.title);
  const [description, setDescription] = useState(requirement.description ?? '');
  const [delivery, setDelivery] = useState<DeliveryType>((requirement.delivery as DeliveryType) || 'vendor');
  const [vendorId, setVendorId] = useState(requirement.assigned_vendor_id ?? '');
  const [status, setStatus] = useState<FulfilmentStatus>(requirement.fulfilment_status as FulfilmentStatus);

  const [quantity, setQuantity] = useState(requirement.quantity?.toString() ?? '');
  const [periodDays, setPeriodDays] = useState(requirement.period_days?.toString() ?? '');
  const [unitRate, setUnitRate] = useState(requirement.unit_rate?.toString() ?? '');
  const [vendorUnitRate, setVendorUnitRate] = useState(requirement.vendor_unit_rate?.toString() ?? '');
  const [clientPrice, setClientPrice] = useState(requirement.client_price?.toString() ?? '');
  const [vendorCost, setVendorCost] = useState(requirement.expected_vendor_cost?.toString() ?? '');

  useEffect(() => {
    getInvoicesForRequirement(requirement.id).then((r) => setInvoicedIn(r.invoices ?? []));
  }, [requirement.id]);

  const computedClientPrice = (() => {
    const q = parseFloat(quantity);
    const p = parseInt(periodDays, 10);
    const r = parseFloat(unitRate);
    if (pricingType === 'qty_rate' && q > 0 && r >= 0 && !isNaN(q) && !isNaN(r)) return q * r;
    if (pricingType === 'days_rate' && p > 0 && r >= 0 && !isNaN(p) && !isNaN(r)) return p * r;
    if (pricingType === 'qty_days_rate' && q > 0 && p > 0 && r >= 0 && !isNaN(q) && !isNaN(p) && !isNaN(r)) return q * p * r;
    return null;
  })();

  const computedVendorCost = (() => {
    const q = parseFloat(quantity);
    const p = parseInt(periodDays, 10);
    const vr = parseFloat(vendorUnitRate);
    if (pricingType === 'qty_rate' && q > 0 && vr >= 0 && !isNaN(q) && !isNaN(vr)) return q * vr;
    if (pricingType === 'days_rate' && p > 0 && vr >= 0 && !isNaN(p) && !isNaN(vr)) return p * vr;
    if (pricingType === 'qty_days_rate' && q > 0 && p > 0 && vr >= 0 && !isNaN(q) && !isNaN(p) && !isNaN(vr)) return q * p * vr;
    return null;
  })();

  const fmt = (n: number) => `₹${n.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
  const isComputed = COMPUTED_TYPES.includes(pricingType);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const errs: Record<string, string> = {};
    if (!serviceName.trim()) errs.serviceName = 'Service name is required.';
    if (pricingType === 'fixed' || pricingType === 'custom') {
      if (!clientPrice.trim() || isNaN(parseFloat(clientPrice))) errs.clientPrice = 'Client price is required.';
    } else if (pricingType === 'qty_rate') {
      if (!quantity.trim()) errs.quantity = 'Quantity is required.';
      if (!unitRate.trim()) errs.unitRate = 'Unit rate is required.';
    } else if (pricingType === 'days_rate') {
      if (!periodDays.trim()) errs.periodDays = 'Number of days is required.';
      if (!unitRate.trim()) errs.unitRate = 'Daily rate is required.';
    } else if (pricingType === 'qty_days_rate') {
      if (!quantity.trim()) errs.quantity = 'Quantity is required.';
      if (!periodDays.trim()) errs.periodDays = 'Days is required.';
      if (!unitRate.trim()) errs.unitRate = 'Rate is required.';
    }
    setFieldErrors(errs);
    if (Object.keys(errs).length > 0) return;
    setError(null);
    setLoading(true);

    const result = await updateRequirement(requirement.id, {
      service_name: serviceName.trim(),
      service_category: serviceCategory.trim() || null,
      pricing_type: pricingType,
      title: title.trim(),
      description: description.trim() || null,
      delivery,
      client_price: isComputed ? null : (clientPrice.trim() ? parseFloat(clientPrice) : null),
      expected_vendor_cost: isComputed ? null : (vendorCost.trim() ? parseFloat(vendorCost) : null),
      assigned_vendor_id: delivery === 'vendor' ? (vendorId || null) : null,
      fulfilment_status: status,
      quantity: ['qty_rate', 'qty_days_rate'].includes(pricingType) ? (quantity.trim() ? parseFloat(quantity) : null) : null,
      period_days: ['days_rate', 'qty_days_rate'].includes(pricingType) ? (periodDays.trim() ? parseInt(periodDays, 10) : null) : null,
      unit_rate: isComputed ? (unitRate.trim() ? parseFloat(unitRate) : null) : null,
      vendor_unit_rate: isComputed ? (vendorUnitRate.trim() ? parseFloat(vendorUnitRate) : null) : null,
    });

    setLoading(false);
    if (result.error) { setError(result.error); return; }
    onSuccess();
  }

  async function handleDelete() {
    if (!confirm('Delete this requirement? This cannot be undone.')) return;
    setError(null);
    setDeleting(true);
    const result = await deleteRequirement(requirement.id);
    setDeleting(false);
    if (result.error) { setError(result.error); return; }
    onSuccess();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* Header info */}
      <div>
        <p className="text-muted-foreground text-sm">{requirement.project_name}</p>
        {invoicedIn.length > 0 && (
          <p className="mt-1.5 text-xs text-muted-foreground">
            Invoiced in:{' '}
            {invoicedIn.map((inv, i) => (
              <span key={inv.id}>
                {i > 0 && ', '}
                <Link href={`/billing?id=${inv.id}`} className="font-medium text-primary hover:underline">
                  {inv.invoice_number}
                </Link>
              </span>
            ))}
          </p>
        )}
        {status === 'fulfilled' && (
          <p className="mt-2">
            <Button asChild size="sm" variant="outline">
              <Link href={`/billing?project=${requirement.project_id}&new=1`}>Add to invoice</Link>
            </Button>
          </p>
        )}
      </div>

      {/* Service info */}
      <div className="space-y-4">
        <div>
          <Label htmlFor="service_name" className="mb-1.5 block">Service name <span className="text-destructive">*</span></Label>
          <Input
            id="service_name"
            value={serviceName}
            onChange={(e) => { setServiceName(e.target.value); clearFieldError('serviceName'); }}
            className={cn(fieldErrors.serviceName && 'border-destructive')}
          />
          {fieldErrors.serviceName && <p className="mt-1 text-xs text-destructive">{fieldErrors.serviceName}</p>}
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="service_category" className="mb-1.5 block">Category</Label>
            <Input
              id="service_category"
              value={serviceCategory}
              onChange={(e) => setServiceCategory(e.target.value)}
              placeholder="e.g. Security, Design"
            />
          </div>
          <div>
            <Label htmlFor="title" className="mb-1.5 block">Variant / title</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Optional variant label"
            />
          </div>
        </div>
        <div>
          <Label htmlFor="description" className="mb-1.5 block">Description</Label>
          <textarea
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={2}
            className="flex w-full rounded-xl border border-border bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            placeholder="Optional"
          />
        </div>
      </div>

      {/* Pricing */}
      <div className="space-y-4 rounded-xl border border-border p-4">
        <div className="flex items-center justify-between">
          <Label className="font-medium">Pricing</Label>
          <span className="text-xs text-muted-foreground">{PRICING_LABELS[pricingType]}</span>
        </div>

        <div>
          <Label className="mb-1.5 block text-xs text-muted-foreground">Pricing type</Label>
          <Select.Root value={pricingType} onValueChange={(v) => setPricingType(v as PricingType)}>
            <Select.Trigger className="flex h-9 w-full items-center justify-between rounded-lg border border-border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring">
              <Select.Value />
              <Select.Icon />
            </Select.Trigger>
            <Select.Portal>
              <Select.Content className="z-[100] overflow-hidden rounded-xl border border-border bg-card shadow-lg" position="popper" sideOffset={4}>
                {(Object.entries(PRICING_LABELS) as [PricingType, string][]).map(([val, label]) => (
                  <Select.Item key={val} value={val} className="relative flex cursor-default select-none items-center rounded-lg px-3 py-2 pl-8 text-sm outline-none data-[highlighted]:bg-muted">
                    <Select.ItemText>{label}</Select.ItemText>
                    <Select.ItemIndicator className="absolute left-2">✓</Select.ItemIndicator>
                  </Select.Item>
                ))}
              </Select.Content>
            </Select.Portal>
          </Select.Root>
        </div>

        {(pricingType === 'fixed' || pricingType === 'custom') && (
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="client_price" className="mb-1.5 block text-xs">Client price (₹) <span className="text-destructive">*</span></Label>
              <Input id="client_price" type="number" step="0.01" min="0" value={clientPrice} onChange={(e) => { setClientPrice(e.target.value); clearFieldError('clientPrice'); }} placeholder="Total" className={cn(fieldErrors.clientPrice && 'border-destructive')} />
              {fieldErrors.clientPrice && <p className="mt-1 text-xs text-destructive">{fieldErrors.clientPrice}</p>}
            </div>
            <div>
              <Label htmlFor="vendor_cost" className="mb-1.5 block text-xs">Vendor cost (₹)</Label>
              <Input id="vendor_cost" type="number" step="0.01" min="0" value={vendorCost} onChange={(e) => setVendorCost(e.target.value)} placeholder="Expected" />
            </div>
          </div>
        )}

        {pricingType === 'qty_rate' && (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="quantity" className="mb-1.5 block text-xs">Quantity <span className="text-destructive">*</span></Label>
                <Input id="quantity" type="number" step="any" min="0" value={quantity} onChange={(e) => { setQuantity(e.target.value); clearFieldError('quantity'); }} className={cn(fieldErrors.quantity && 'border-destructive')} />
                {fieldErrors.quantity && <p className="mt-1 text-xs text-destructive">{fieldErrors.quantity}</p>}
              </div>
              <div>
                <Label htmlFor="unit_rate" className="mb-1.5 block text-xs">Client rate (₹/unit) <span className="text-destructive">*</span></Label>
                <Input id="unit_rate" type="number" step="0.01" min="0" value={unitRate} onChange={(e) => { setUnitRate(e.target.value); clearFieldError('unitRate'); }} className={cn(fieldErrors.unitRate && 'border-destructive')} />
                {fieldErrors.unitRate && <p className="mt-1 text-xs text-destructive">{fieldErrors.unitRate}</p>}
              </div>
            </div>
            <div>
              <Label htmlFor="vendor_unit_rate" className="mb-1.5 block text-xs">Vendor rate (₹/unit)</Label>
              <Input id="vendor_unit_rate" type="number" step="0.01" min="0" value={vendorUnitRate} onChange={(e) => setVendorUnitRate(e.target.value)} />
            </div>
            {computedClientPrice != null && (
              <div className="rounded-lg bg-muted/50 px-3 py-2 text-xs">
                Client: <span className="font-semibold tabular-nums">{fmt(computedClientPrice)}</span>
                {computedVendorCost != null && (<> · Vendor: <span className="font-semibold tabular-nums">{fmt(computedVendorCost)}</span></>)}
              </div>
            )}
          </div>
        )}

        {pricingType === 'days_rate' && (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="period_days" className="mb-1.5 block text-xs">Days <span className="text-destructive">*</span></Label>
                <Input id="period_days" type="number" min="1" value={periodDays} onChange={(e) => { setPeriodDays(e.target.value); clearFieldError('periodDays'); }} className={cn(fieldErrors.periodDays && 'border-destructive')} />
                {fieldErrors.periodDays && <p className="mt-1 text-xs text-destructive">{fieldErrors.periodDays}</p>}
              </div>
              <div>
                <Label htmlFor="unit_rate" className="mb-1.5 block text-xs">Client rate (₹/day) <span className="text-destructive">*</span></Label>
                <Input id="unit_rate" type="number" step="0.01" min="0" value={unitRate} onChange={(e) => { setUnitRate(e.target.value); clearFieldError('unitRate'); }} className={cn(fieldErrors.unitRate && 'border-destructive')} />
                {fieldErrors.unitRate && <p className="mt-1 text-xs text-destructive">{fieldErrors.unitRate}</p>}
              </div>
            </div>
            <div>
              <Label htmlFor="vendor_unit_rate" className="mb-1.5 block text-xs">Vendor rate (₹/day)</Label>
              <Input id="vendor_unit_rate" type="number" step="0.01" min="0" value={vendorUnitRate} onChange={(e) => setVendorUnitRate(e.target.value)} />
            </div>
            {computedClientPrice != null && (
              <div className="rounded-lg bg-muted/50 px-3 py-2 text-xs">
                Client: <span className="font-semibold tabular-nums">{fmt(computedClientPrice)}</span>
                {computedVendorCost != null && (<> · Vendor: <span className="font-semibold tabular-nums">{fmt(computedVendorCost)}</span></>)}
              </div>
            )}
          </div>
        )}

        {pricingType === 'qty_days_rate' && (
          <div className="space-y-3">
            <div className="grid grid-cols-3 gap-2">
              <div>
                <Label htmlFor="quantity" className="mb-1.5 block text-xs">Qty <span className="text-destructive">*</span></Label>
                <Input id="quantity" type="number" step="any" min="0" value={quantity} onChange={(e) => { setQuantity(e.target.value); clearFieldError('quantity'); }} className={cn(fieldErrors.quantity && 'border-destructive')} />
                {fieldErrors.quantity && <p className="mt-1 text-xs text-destructive">{fieldErrors.quantity}</p>}
              </div>
              <div>
                <Label htmlFor="period_days" className="mb-1.5 block text-xs">Days <span className="text-destructive">*</span></Label>
                <Input id="period_days" type="number" min="1" value={periodDays} onChange={(e) => { setPeriodDays(e.target.value); clearFieldError('periodDays'); }} className={cn(fieldErrors.periodDays && 'border-destructive')} />
                {fieldErrors.periodDays && <p className="mt-1 text-xs text-destructive">{fieldErrors.periodDays}</p>}
              </div>
              <div>
                <Label htmlFor="unit_rate" className="mb-1.5 block text-xs">Rate/day <span className="text-destructive">*</span></Label>
                <Input id="unit_rate" type="number" step="0.01" min="0" value={unitRate} onChange={(e) => { setUnitRate(e.target.value); clearFieldError('unitRate'); }} className={cn(fieldErrors.unitRate && 'border-destructive')} />
                {fieldErrors.unitRate && <p className="mt-1 text-xs text-destructive">{fieldErrors.unitRate}</p>}
              </div>
            </div>
            <div>
              <Label htmlFor="vendor_unit_rate" className="mb-1.5 block text-xs">Vendor rate (₹/day)</Label>
              <Input id="vendor_unit_rate" type="number" step="0.01" min="0" value={vendorUnitRate} onChange={(e) => setVendorUnitRate(e.target.value)} />
            </div>
            {computedClientPrice != null && (
              <div className="rounded-lg bg-muted/50 px-3 py-2 text-xs">
                Client: <span className="font-semibold tabular-nums">{fmt(computedClientPrice)}</span>
                {computedVendorCost != null && (<> · Vendor: <span className="font-semibold tabular-nums">{fmt(computedVendorCost)}</span></>)}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Delivery */}
      <div>
        <Label className="mb-1.5 block">Delivery</Label>
        <div className="flex gap-3">
          {(['vendor', 'in_house'] as const).map((d) => (
            <button
              key={d}
              type="button"
              onClick={() => { setDelivery(d); if (d === 'in_house') setVendorId(''); }}
              className={`flex-1 rounded-xl border px-4 py-2.5 text-sm font-medium transition-colors ${
                delivery === d ? 'border-primary bg-primary/5 text-primary' : 'border-border hover:bg-muted/50'
              }`}
            >
              {d === 'vendor' ? 'Vendor' : 'In-house'}
            </button>
          ))}
        </div>
      </div>

      {delivery === 'vendor' && (
        <div>
          <Label className="mb-1.5 block">Vendor</Label>
          <Select.Root value={vendorId || '__none__'} onValueChange={(v) => setVendorId(v === '__none__' ? '' : v)}>
            <Select.Trigger className="flex h-10 w-full items-center justify-between rounded-xl border border-border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring data-[placeholder]:text-muted-foreground">
              <Select.Value placeholder="Assign vendor" />
              <Select.Icon />
            </Select.Trigger>
            <Select.Portal>
              <Select.Content className="z-[100] overflow-hidden rounded-xl border border-border bg-card shadow-lg" position="popper" sideOffset={4}>
                <Select.Item value="__none__" className="relative flex cursor-default select-none items-center rounded-lg px-3 py-2 pl-8 text-sm outline-none data-[highlighted]:bg-muted">
                  <Select.ItemText>None</Select.ItemText>
                  <Select.ItemIndicator className="absolute left-2">✓</Select.ItemIndicator>
                </Select.Item>
                {vendorOptions.map((opt) => (
                  <Select.Item key={opt.value} value={opt.value} className="relative flex cursor-default select-none items-center rounded-lg px-3 py-2 pl-8 text-sm outline-none data-[highlighted]:bg-muted">
                    <Select.ItemText>{opt.label}</Select.ItemText>
                    <Select.ItemIndicator className="absolute left-2">✓</Select.ItemIndicator>
                  </Select.Item>
                ))}
              </Select.Content>
            </Select.Portal>
          </Select.Root>
        </div>
      )}

      {/* Status */}
      <div>
        <Label className="mb-1.5 block">Fulfilment status</Label>
        <Select.Root value={status} onValueChange={(v) => setStatus(v as FulfilmentStatus)}>
          <Select.Trigger className="flex h-10 w-full items-center justify-between rounded-xl border border-border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring">
            <Select.Value />
            <Select.Icon />
          </Select.Trigger>
          <Select.Portal>
            <Select.Content className="z-[100] overflow-hidden rounded-xl border border-border bg-card shadow-lg" position="popper" sideOffset={4}>
              {STATUS_OPTIONS.map((opt) => (
                <Select.Item key={opt.value} value={opt.value} className="relative flex cursor-default select-none items-center rounded-lg px-3 py-2 pl-8 text-sm outline-none data-[highlighted]:bg-muted">
                  <Select.ItemText>{opt.label}</Select.ItemText>
                  <Select.ItemIndicator className="absolute left-2">✓</Select.ItemIndicator>
                </Select.Item>
              ))}
            </Select.Content>
          </Select.Portal>
        </Select.Root>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
        <div className="flex gap-3">
          <Button type="submit" disabled={loading}>{loading ? 'Saving…' : 'Save changes'}</Button>
          <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
        </div>
        <Button type="button" variant="destructive" size="sm" onClick={handleDelete} disabled={deleting}>
          {deleting ? 'Deleting…' : 'Delete'}
        </Button>
      </div>
    </form>
  );
}
