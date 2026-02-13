'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import * as Select from '@radix-ui/react-select';
import { createService } from './actions';
import { getSubTypeOptions } from './catalog-types';
import type { CatalogType, DeliveryType } from '@/types/database';

const CATALOG_TYPE_OPTIONS: { value: CatalogType; label: string }[] = [
  { value: 'goods', label: 'Goods' },
  { value: 'services', label: 'Services' },
  { value: 'consulting', label: 'Consulting' },
];

const DELIVERY_OPTIONS: { value: DeliveryType; label: string }[] = [
  { value: 'vendor', label: 'Vendor' },
  { value: 'in_house', label: 'In-house' },
];

interface NewServiceFormProps {
  onSuccess: () => void;
  onCancel: () => void;
}

export function NewServiceForm({ onSuccess, onCancel }: NewServiceFormProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [serviceName, setServiceName] = useState('');
  const [category, setCategory] = useState('');
  const [serviceType, setServiceType] = useState('');
  const [serviceTypeOther, setServiceTypeOther] = useState('');
  const [catalogType, setCatalogType] = useState<CatalogType>('services');
  const [delivery, setDelivery] = useState<DeliveryType>('vendor');
  const [ourRateMin, setOurRateMin] = useState('');
  const [ourRateMax, setOurRateMax] = useState('');
  const [commission, setCommission] = useState('');
  const [defaultClientRate, setDefaultClientRate] = useState('');

  useEffect(() => {
    if (catalogType === 'consulting') setDelivery('in_house');
    setServiceType('');
    setServiceTypeOther('');
  }, [catalogType]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!serviceName.trim()) {
      setError('Name is required.');
      return;
    }
    setLoading(true);
    const subType = serviceType === 'other' ? serviceTypeOther.trim() || null : (serviceType.trim() || null);
    const result = await createService({
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
    <form onSubmit={handleSubmit} className="space-y-5">
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
          {catalogType === 'consulting' && <p className="mt-1 text-xs text-muted-foreground">Consulting is in-house.</p>}
        </div>
      </div>
      <div>
        <Label htmlFor="new_name" className="mb-1.5 block">Name</Label>
        <Input id="new_name" value={serviceName} onChange={(e) => setServiceName(e.target.value)} required placeholder="Item name" />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="new_category" className="mb-1.5 block">Category</Label>
          <Input id="new_category" value={category} onChange={(e) => setCategory(e.target.value)} placeholder="e.g. Consulting" />
        </div>
        <div>
          <Label className="mb-1.5 block">Sub-type</Label>
          <Select.Root value={serviceType || undefined} onValueChange={setServiceType}>
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
          <Label htmlFor="new_our_min" className="mb-1.5 block">Our rate min (₹)</Label>
          <Input id="new_our_min" type="number" min={0} step="0.01" value={ourRateMin} onChange={(e) => setOurRateMin(e.target.value)} />
        </div>
        <div>
          <Label htmlFor="new_our_max" className="mb-1.5 block">Our rate max (₹)</Label>
          <Input id="new_our_max" type="number" min={0} step="0.01" value={ourRateMax} onChange={(e) => setOurRateMax(e.target.value)} />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="new_commission" className="mb-1.5 block">Commission</Label>
          <Input id="new_commission" type="number" min={0} max={1} step="0.01" value={commission} onChange={(e) => setCommission(e.target.value)} placeholder="0–1" />
        </div>
        <div>
          <Label htmlFor="new_client_rate" className="mb-1.5 block">Default client rate (₹)</Label>
          <Input id="new_client_rate" type="number" min={0} step="0.01" value={defaultClientRate} onChange={(e) => setDefaultClientRate(e.target.value)} />
        </div>
      </div>
      {error && <p className="text-sm text-red-500">{error}</p>}
      <div className="flex gap-3 pt-2">
        <Button type="submit" disabled={loading}>{loading ? 'Adding…' : 'Add item'}</Button>
        <Button type="button" variant="outline" onClick={onCancel}>Cancel</Button>
      </div>
    </form>
  );
}
