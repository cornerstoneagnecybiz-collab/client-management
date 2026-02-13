'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import * as Select from '@radix-ui/react-select';
import { updateRequirement, deleteRequirement } from './actions';
import { getCatalogVendorIds } from '@/app/(dashboard)/catalog/actions';
import { getInvoicesForRequirement } from '@/app/(dashboard)/finance/actions';
import type { RequirementRow } from './page';
import type { FulfilmentStatus } from '@/types';
import type { DeliveryType } from '@/types/database';

const STATUS_OPTIONS: { value: FulfilmentStatus; label: string }[] = [
  { value: 'pending', label: 'Pending' },
  { value: 'in_progress', label: 'In progress' },
  { value: 'fulfilled', label: 'Fulfilled' },
  { value: 'cancelled', label: 'Cancelled' },
];

const DELIVERY_OPTIONS: { value: DeliveryType; label: string }[] = [
  { value: 'vendor', label: 'Vendor' },
  { value: 'in_house', label: 'In-house' },
];

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
  const isOneTime = requirement.engagement_type === 'one_time';
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [title, setTitle] = useState(requirement.title);
  const [description, setDescription] = useState(requirement.description ?? '');
  const [delivery, setDelivery] = useState<DeliveryType>((requirement.delivery as DeliveryType) || 'vendor');
  const [clientPrice, setClientPrice] = useState(requirement.client_price?.toString() ?? '');
  const [vendorCost, setVendorCost] = useState(requirement.expected_vendor_cost?.toString() ?? '');
  const [vendorId, setVendorId] = useState(requirement.assigned_vendor_id ?? '');
  const [status, setStatus] = useState<FulfilmentStatus>(requirement.fulfilment_status as FulfilmentStatus);
  const [quantity, setQuantity] = useState(requirement.quantity?.toString() ?? '');
  const [periodDays, setPeriodDays] = useState(requirement.period_days?.toString() ?? '');
  const [unitRate, setUnitRate] = useState(requirement.unit_rate?.toString() ?? '');
  const [vendorUnitRate, setVendorUnitRate] = useState(requirement.vendor_unit_rate?.toString() ?? '');
  const [linkedVendorIds, setLinkedVendorIds] = useState<string[]>([]);
  const [invoicedIn, setInvoicedIn] = useState<{ id: string; invoice_number: string }[]>([]);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (!requirement.service_catalog_id) return;
    getCatalogVendorIds(requirement.service_catalog_id).then((r) => setLinkedVendorIds(r.vendor_ids ?? []));
  }, [requirement.service_catalog_id]);

  useEffect(() => {
    getInvoicesForRequirement(requirement.id).then((r) => setInvoicedIn(r.invoices ?? []));
  }, [requirement.id]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
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
    const result = await updateRequirement(requirement.id, {
      title: title.trim(),
      description: description.trim() || null,
      delivery,
      client_price: isOneTime && computedClientPrice != null ? computedClientPrice : (clientPrice.trim() ? parseFloat(clientPrice) : null),
      expected_vendor_cost: computedVendorCost ?? (vendorCost.trim() ? parseFloat(vendorCost) : null),
      assigned_vendor_id: delivery === 'vendor' ? (vendorId || null) : null,
      fulfilment_status: status,
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

  async function handleDelete() {
    if (!confirm('Delete this requirement? This cannot be undone.')) return;
    setError(null);
    setDeleting(true);
    const result = await deleteRequirement(requirement.id);
    setDeleting(false);
    if (result.error) {
      setError(result.error);
      return;
    }
    onSuccess();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div>
        <Label className="text-muted-foreground text-xs">Catalog item</Label>
        <p className="font-medium">{requirement.service_name}</p>
        <p className="text-muted-foreground text-sm">{requirement.project_name}</p>
        <p className="mt-1 text-xs text-muted-foreground">
          Delivery: <span className="font-medium">{delivery === 'in_house' ? 'In-house' : 'Vendor'}</span>
        </p>
        {invoicedIn.length > 0 && (
          <p className="mt-2 text-xs text-muted-foreground">
            Invoiced in:{' '}
            {invoicedIn.map((inv, i) => (
              <span key={inv.id}>
                {i > 0 && ', '}
                <Link href={`/finance?id=${inv.id}`} className="font-medium text-primary hover:underline">
                  {inv.invoice_number}
                </Link>
              </span>
            ))}
          </p>
        )}
        {status === 'fulfilled' && (
          <p className="mt-2">
            <Button asChild size="sm" variant="outline">
              <Link href={`/finance?project=${requirement.project_id}&new=1`}>Add to invoice</Link>
            </Button>
          </p>
        )}
      </div>

      {isOneTime && (
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
              placeholder="Rate per unit / day"
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
              placeholder="Vendor rate per unit / day"
            />
          </div>
        </div>
      )}

      {!isOneTime && (
        <>
          <div>
            <Label htmlFor="title" className="mb-1.5 block">Title</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />
          </div>
          <div>
            <Label htmlFor="description" className="mb-1.5 block">Description</Label>
            <textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="flex w-full rounded-xl border border-border bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
          </div>
        </>
      )}

      <div>
        <Label className="mb-1.5 block">Delivery</Label>
        <Select.Root value={delivery} onValueChange={(v) => setDelivery(v as DeliveryType)}>
          <Select.Trigger className="flex h-10 w-full items-center justify-between rounded-xl border border-border bg-background px-3 text-sm">
            <Select.Value />
            <Select.Icon />
          </Select.Trigger>
          <Select.Portal>
            <Select.Content className="z-[100] overflow-hidden rounded-xl border border-border bg-card shadow-lg" position="popper" sideOffset={4}>
              {DELIVERY_OPTIONS.map((o) => (
                <Select.Item key={o.value} value={o.value} className="relative flex cursor-default select-none items-center rounded-lg px-3 py-2 pl-8 text-sm outline-none data-[highlighted]:bg-muted">
                  <Select.ItemText>{o.label}</Select.ItemText>
                  <Select.ItemIndicator className="absolute left-2">✓</Select.ItemIndicator>
                </Select.Item>
              ))}
            </Select.Content>
          </Select.Portal>
        </Select.Root>
      </div>

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
              <Select.Value placeholder="Assign vendor" />
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
          {linkedVendorIds.length > 0 && (
            <p className="mt-1 text-xs text-muted-foreground">Vendors linked to this catalog item shown first.</p>
          )}
        </div>
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

      <div>
        <Label className="mb-1.5 block">Fulfilment status</Label>
        <Select.Root value={status} onValueChange={(v) => setStatus(v as FulfilmentStatus)}>
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

      {error && <p className="text-sm text-red-500">{error}</p>}

      <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
        <div className="flex gap-3">
          <Button type="submit" disabled={loading}>{loading ? 'Saving…' : 'Save changes'}</Button>
          <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
        </div>
        <Button type="button" variant="destructive" size="sm" onClick={handleDelete} disabled={deleting}>
          {deleting ? 'Deleting…' : 'Delete requirement'}
        </Button>
      </div>
    </form>
  );
}
