'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import * as Select from '@radix-ui/react-select';
import { updateService, getCatalogVendorIds, addCatalogVendor, removeCatalogVendor, deleteCatalogItem } from './actions';
import { getSubTypeOptions } from './catalog-types';
import type { CatalogType, DeliveryType } from '@/types/database';

function formatMoney(n: number): string {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n);
}

export interface ServiceRow {
  id: string;
  service_code: string;
  category: string | null;
  service_name: string;
  service_type: string | null;
  catalog_type: CatalogType;
  delivery: DeliveryType;
  our_rate_min: number | null;
  our_rate_max: number | null;
  commission: number | null;
  default_client_rate: number | null;
  created_at: string;
}

const CATALOG_TYPE_OPTIONS: { value: CatalogType; label: string }[] = [
  { value: 'goods', label: 'Goods' },
  { value: 'services', label: 'Services' },
  { value: 'consulting', label: 'Consulting' },
];

const DELIVERY_OPTIONS: { value: DeliveryType; label: string }[] = [
  { value: 'vendor', label: 'Vendor' },
  { value: 'in_house', label: 'In-house' },
];

interface ServiceDetailPanelProps {
  service: ServiceRow;
  vendorOptions: { value: string; label: string }[];
  onSuccess: () => void;
  onClose: () => void;
}

export function ServiceDetailPanel({ service, vendorOptions, onSuccess, onClose }: ServiceDetailPanelProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [serviceName, setServiceName] = useState(service.service_name);
  const [category, setCategory] = useState(service.category ?? '');
  const opts = getSubTypeOptions(service.catalog_type);
  const initialType = service.service_type && opts.some((o) => o.value === service.service_type) ? service.service_type : (service.service_type ? 'other' : '');
  const [serviceType, setServiceType] = useState(initialType);
  const [serviceTypeOther, setServiceTypeOther] = useState(service.service_type && !opts.some((o) => o.value === service.service_type) ? (service.service_type ?? '') : '');
  const [catalogType, setCatalogType] = useState<CatalogType>(service.catalog_type);
  const [delivery, setDelivery] = useState<DeliveryType>(service.delivery);
  const [ourRateMin, setOurRateMin] = useState(service.our_rate_min?.toString() ?? '');
  const [ourRateMax, setOurRateMax] = useState(service.our_rate_max?.toString() ?? '');
  const [commission, setCommission] = useState(service.commission?.toString() ?? '');
  const [defaultClientRate, setDefaultClientRate] = useState(service.default_client_rate?.toString() ?? '');
  const [availableVendorIds, setAvailableVendorIds] = useState<string[]>([]);
  const [vendorToggling, setVendorToggling] = useState<string | null>(null);

  useEffect(() => {
    if (service.catalog_type === 'goods' || service.catalog_type === 'services') {
      getCatalogVendorIds(service.id).then((r) => {
        if (!r.error) setAvailableVendorIds(r.vendor_ids);
      });
    }
  }, [service.id, service.catalog_type]);

  useEffect(() => {
    if (catalogType === 'consulting') setDelivery('in_house');
    const opts = getSubTypeOptions(catalogType);
    const currentInOpts = opts.some((o) => o.value === serviceType);
    if (!currentInOpts && serviceType !== 'other') {
      setServiceType('');
      setServiceTypeOther('');
    }
  }, [catalogType]);

  const isOtherType = serviceType === 'other';

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!serviceName.trim()) {
      setError('Name is required.');
      return;
    }
    setLoading(true);
    const subType = serviceType === 'other' ? serviceTypeOther.trim() || null : (serviceType.trim() || null);
    const result = await updateService(service.id, {
      service_name: serviceName.trim(),
      category: category.trim() || null,
      service_type: subType,
      catalog_type: catalogType,
      delivery: catalogType === 'consulting' ? 'in_house' : delivery,
      our_rate_min: ourRateMin ? parseFloat(ourRateMin) : null,
      our_rate_max: ourRateMax ? parseFloat(ourRateMax) : null,
      commission: commission ? parseFloat(commission) : null,
      default_client_rate: defaultClientRate ? parseFloat(defaultClientRate) : null,
    });
    setLoading(false);
    if (result.error) {
      setError(result.error);
      return;
    }
    onSuccess();
  }

  return (
    <div className="space-y-6">
      <div>
        <p className="text-muted-foreground text-sm">{service.service_code}</p>
        <p className="text-xl font-semibold">{service.service_name}</p>
        <div className="mt-1 flex gap-2 text-xs">
          <span className="rounded bg-muted px-2 py-0.5">{CATALOG_TYPE_OPTIONS.find((o) => o.value === service.catalog_type)?.label ?? service.catalog_type}</span>
          <span className="rounded bg-muted px-2 py-0.5">{service.delivery === 'in_house' ? 'In-house' : 'Vendor'}</span>
          {service.category && <span className="text-muted-foreground">{service.category}</span>}
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label className="mb-1.5 block">Catalog type</Label>
            <Select.Root value={catalogType} onValueChange={(v) => setCatalogType(v as CatalogType)}>
              <Select.Trigger className="flex h-10 w-full items-center justify-between rounded-xl border border-border bg-background px-3 text-sm">
                <Select.Value />
                <Select.Icon />
              </Select.Trigger>
              <Select.Portal>
                <Select.Content className="z-[100] rounded-xl border border-border bg-card shadow-lg" position="popper" sideOffset={4}>
                  {CATALOG_TYPE_OPTIONS.map((o) => (
                    <Select.Item key={o.value} value={o.value} className="flex cursor-default items-center rounded-lg px-3 py-2 pl-8 text-sm outline-none data-[highlighted]:bg-muted">
                      <Select.ItemText>{o.label}</Select.ItemText>
                      <Select.ItemIndicator className="absolute left-2">✓</Select.ItemIndicator>
                    </Select.Item>
                  ))}
                </Select.Content>
              </Select.Portal>
            </Select.Root>
          </div>
          <div>
            <Label className="mb-1.5 block">Delivery</Label>
            <Select.Root value={delivery} onValueChange={(v) => setDelivery(v as DeliveryType)} disabled={catalogType === 'consulting'}>
              <Select.Trigger className="flex h-10 w-full items-center justify-between rounded-xl border border-border bg-background px-3 text-sm disabled:opacity-60">
                <Select.Value />
                <Select.Icon />
              </Select.Trigger>
              <Select.Portal>
                <Select.Content className="z-[100] rounded-xl border border-border bg-card shadow-lg" position="popper" sideOffset={4}>
                  {DELIVERY_OPTIONS.map((o) => (
                    <Select.Item key={o.value} value={o.value} className="flex cursor-default items-center rounded-lg px-3 py-2 pl-8 text-sm outline-none data-[highlighted]:bg-muted">
                      <Select.ItemText>{o.label}</Select.ItemText>
                      <Select.ItemIndicator className="absolute left-2">✓</Select.ItemIndicator>
                    </Select.Item>
                  ))}
                </Select.Content>
              </Select.Portal>
            </Select.Root>
            {catalogType === 'consulting' && <p className="mt-1 text-xs text-muted-foreground">Consulting is always in-house.</p>}
          </div>
        </div>
        <div>
          <Label htmlFor="edit_name" className="mb-1.5 block">Name</Label>
          <Input id="edit_name" value={serviceName} onChange={(e) => setServiceName(e.target.value)} required />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="edit_category" className="mb-1.5 block">Category</Label>
            <Input id="edit_category" value={category} onChange={(e) => setCategory(e.target.value)} placeholder="e.g. Consulting" />
          </div>
          <div>
            <Label className="mb-1.5 block">Sub-type</Label>
            <Select.Root value={isOtherType ? 'other' : (serviceType || undefined)} onValueChange={setServiceType}>
              <Select.Trigger className="flex h-10 w-full items-center justify-between rounded-xl border border-border bg-background px-3 text-sm">
                <Select.Value placeholder="Select sub-type" />
                <Select.Icon />
              </Select.Trigger>
              <Select.Portal>
                <Select.Content className="z-[100] rounded-xl border border-border bg-card shadow-lg" position="popper" sideOffset={4}>
                  {getSubTypeOptions(catalogType).map((o) => (
                    <Select.Item key={o.value} value={o.value} className="flex cursor-default items-center rounded-lg px-3 py-2 pl-8 text-sm outline-none data-[highlighted]:bg-muted">
                      <Select.ItemText>{o.label}</Select.ItemText>
                      <Select.ItemIndicator className="absolute left-2">✓</Select.ItemIndicator>
                    </Select.Item>
                  ))}
                </Select.Content>
              </Select.Portal>
            </Select.Root>
            {serviceType === 'other' && (
              <Input
                className="mt-2"
                value={serviceTypeOther}
                onChange={(e) => setServiceTypeOther(e.target.value)}
                placeholder="Custom sub-type"
              />
            )}
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="edit_our_min" className="mb-1.5 block">Our rate min (₹)</Label>
            <Input id="edit_our_min" type="number" min={0} step="0.01" value={ourRateMin} onChange={(e) => setOurRateMin(e.target.value)} />
          </div>
          <div>
            <Label htmlFor="edit_our_max" className="mb-1.5 block">Our rate max (₹)</Label>
            <Input id="edit_our_max" type="number" min={0} step="0.01" value={ourRateMax} onChange={(e) => setOurRateMax(e.target.value)} />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="edit_commission" className="mb-1.5 block">Commission</Label>
            <Input id="edit_commission" type="number" min={0} max={1} step="0.01" value={commission} onChange={(e) => setCommission(e.target.value)} placeholder="0–1" />
          </div>
          <div>
            <Label htmlFor="edit_client_rate" className="mb-1.5 block">Default client rate (₹)</Label>
            <Input id="edit_client_rate" type="number" min={0} step="0.01" value={defaultClientRate} onChange={(e) => setDefaultClientRate(e.target.value)} />
          </div>
        </div>
        {error && <p className="text-sm text-red-500">{error}</p>}
        <div className="flex gap-3">
          <Button type="submit" size="sm" disabled={loading}>{loading ? 'Saving…' : 'Save changes'}</Button>
          <Button type="button" variant="outline" size="sm" onClick={onClose}>Close</Button>
        </div>
      </form>

      {(catalogType === 'goods' || catalogType === 'services') && (
        <div className="border-t border-border pt-4">
          <h3 className="text-sm font-medium mb-2">Vendors who can provide this</h3>
          <p className="text-xs text-muted-foreground mb-2">Same item can be provided by multiple vendors.</p>
          <div className="flex flex-wrap gap-2">
            {vendorOptions.map((opt) => {
              const isLinked = availableVendorIds.includes(opt.value);
              const busy = vendorToggling === opt.value;
              return (
                <label
                  key={opt.value}
                  className={`inline-flex items-center gap-2 rounded-lg border px-3 py-1.5 text-sm cursor-pointer transition-colors ${
                    isLinked ? 'border-primary bg-primary/10' : 'border-border bg-muted/20 hover:bg-muted/40'
                  } ${busy ? 'opacity-60' : ''}`}
                >
                  <input
                    type="checkbox"
                    checked={isLinked}
                    disabled={busy}
                    onChange={async () => {
                      setVendorToggling(opt.value);
                      if (isLinked) {
                        await removeCatalogVendor(service.id, opt.value);
                      } else {
                        await addCatalogVendor(service.id, opt.value);
                      }
                      const res = await getCatalogVendorIds(service.id);
                      if (!res.error) setAvailableVendorIds(res.vendor_ids);
                      setVendorToggling(null);
                    }}
                    className="rounded border-border"
                  />
                  {opt.label}
                </label>
              );
            })}
          </div>
          {vendorOptions.length === 0 && <p className="text-sm text-muted-foreground">No vendors in the system. Add vendors first.</p>}
        </div>
      )}

      <div className="border-t border-border pt-4">
        <Button
          type="button"
          variant="destructive"
          size="sm"
          disabled={loading}
          onClick={async () => {
            if (!confirm('Delete this catalog item? It must not be used by any requirement. This cannot be undone.')) return;
            setError(null);
            setLoading(true);
            const result = await deleteCatalogItem(service.id);
            setLoading(false);
            if (result.error) {
              setError(result.error);
              return;
            }
            onSuccess();
          }}
        >
          Delete catalog item
        </Button>
      </div>
    </div>
  );
}
