'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ModalBody, ModalFooter } from '@/components/ui/modal';
import { FormError } from '@/components/ui/form-shell';
import { useToast } from '@/components/ui/toast';
import * as Select from '@radix-ui/react-select';
import { createRequirement } from './actions';
import type { PricingType } from '@/types/database';
import { cn } from '@/lib/utils';

const PRICING_OPTIONS: { value: PricingType; label: string; hint: string }[] = [
  { value: 'fixed', label: 'Fixed price', hint: 'Enter total client price and vendor cost directly.' },
  { value: 'qty_rate', label: 'Qty × Rate', hint: 'Quantity × unit rate = client price.' },
  { value: 'days_rate', label: 'Days × Daily rate', hint: 'Number of days × daily rate = client price.' },
  { value: 'qty_days_rate', label: 'Qty × Days × Rate', hint: 'People × days × daily rate = client price.' },
  { value: 'custom', label: 'Custom', hint: 'Enter totals manually — no formula applied.' },
];

const COMPUTED_TYPES: PricingType[] = ['qty_rate', 'days_rate', 'qty_days_rate'];

interface NewRequirementFormProps {
  projectOptions: { value: string; label: string; engagement_type?: 'one_time' | 'monthly' }[];
  vendorOptions: { value: string; label: string }[];
  defaultProjectId?: string;
  onSuccess: () => void;
  onCancel: () => void;
  onDirtyChange?: (dirty: boolean) => void;
}

export function NewRequirementForm({
  projectOptions,
  vendorOptions,
  defaultProjectId = '',
  onSuccess,
  onCancel,
  onDirtyChange,
}: NewRequirementFormProps) {
  const toast = useToast();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  function clearFieldError(field: string) {
    if (fieldErrors[field]) setFieldErrors((prev) => { const n = { ...prev }; delete n[field]; return n; });
  }

  const [projectId, setProjectId] = useState(defaultProjectId);

  // Step 1 — What is this?
  const [serviceName, setServiceName] = useState('');
  const [serviceCategory, setServiceCategory] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');

  // Step 2 — Pricing
  const [pricingType, setPricingType] = useState<PricingType>('fixed');
  const [quantity, setQuantity] = useState('');
  const [periodDays, setPeriodDays] = useState('');
  const [unitRate, setUnitRate] = useState('');
  const [vendorUnitRate, setVendorUnitRate] = useState('');
  const [clientPrice, setClientPrice] = useState('');
  const [vendorCost, setVendorCost] = useState('');

  // Step 3 — Delivery
  const [delivery, setDelivery] = useState<'vendor' | 'in_house'>('vendor');
  const [vendorId, setVendorId] = useState('');

  useEffect(() => {
    setProjectId(defaultProjectId);
  }, [defaultProjectId]);

  const isDirty =
    (!defaultProjectId && projectId.length > 0) ||
    serviceName.trim().length > 0 ||
    serviceCategory.trim().length > 0 ||
    title.trim().length > 0 ||
    description.trim().length > 0 ||
    pricingType !== 'fixed' ||
    quantity.length > 0 ||
    periodDays.length > 0 ||
    unitRate.length > 0 ||
    vendorUnitRate.length > 0 ||
    clientPrice.length > 0 ||
    vendorCost.length > 0 ||
    delivery !== 'vendor' ||
    vendorId.length > 0;

  useEffect(() => {
    onDirtyChange?.(isDirty);
  }, [isDirty, onDirtyChange]);

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

  function validateStep(s: number): boolean {
    const errs: Record<string, string> = {};
    if (s === 1) {
      if (!projectId) errs.projectId = 'Please select a project.';
      if (!serviceName.trim()) errs.serviceName = 'Service name is required.';
    }
    if (s === 2) {
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
    }
    setFieldErrors(errs);
    if (Object.keys(errs).length > 0) {
      setError(null);
      return false;
    }
    return true;
  }

  function handleNext() {
    if (!validateStep(step)) return;
    setError(null);
    setStep((s) => s + 1);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validateStep(3)) return;
    setError(null);
    setLoading(true);

    const isComputed = COMPUTED_TYPES.includes(pricingType);
    const result = await createRequirement({
      project_id: projectId,
      service_name: serviceName.trim(),
      service_category: serviceCategory.trim() || null,
      pricing_type: pricingType,
      title: title.trim() || serviceName.trim(),
      description: description.trim() || null,
      delivery,
      client_price: isComputed ? null : (clientPrice.trim() ? parseFloat(clientPrice) : null),
      expected_vendor_cost: isComputed ? null : (vendorCost.trim() ? parseFloat(vendorCost) : null),
      assigned_vendor_id: delivery === 'vendor' ? (vendorId || null) : null,
      quantity: ['qty_rate', 'qty_days_rate'].includes(pricingType) ? (quantity.trim() ? parseFloat(quantity) : null) : null,
      period_days: ['days_rate', 'qty_days_rate'].includes(pricingType) ? (periodDays.trim() ? parseInt(periodDays, 10) : null) : null,
      unit_rate: isComputed ? (unitRate.trim() ? parseFloat(unitRate) : null) : null,
      vendor_unit_rate: isComputed ? (vendorUnitRate.trim() ? parseFloat(vendorUnitRate) : null) : null,
    });

    setLoading(false);
    if (result.error) {
      setError(result.error);
      toast.error('Could not create requirement', result.error);
      return;
    }
    toast.success('Requirement created', serviceName.trim());
    onSuccess();
  }

  const fmt = (n: number) => `₹${n.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;

  return (
    <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
      <ModalBody className="space-y-6">
      {/* Project selector */}
      <div>
        <Label className="mb-1.5 block">
          Project <span className="text-destructive">*</span>
        </Label>
        <Select.Root value={projectId} onValueChange={(v) => { setProjectId(v); clearFieldError('projectId'); }}>
          <Select.Trigger className={cn('flex h-10 w-full items-center justify-between rounded-xl border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring data-[placeholder]:text-muted-foreground', fieldErrors.projectId ? 'border-destructive' : 'border-border')}>
            <Select.Value placeholder="Select project" />
            <Select.Icon />
          </Select.Trigger>
          <Select.Portal>
            <Select.Content className="z-[100] overflow-hidden rounded-xl border border-border bg-card shadow-lg" position="popper" sideOffset={4}>
              {projectOptions.map((opt) => (
                <Select.Item key={opt.value} value={opt.value} className="relative flex cursor-default select-none items-center rounded-lg px-3 py-2 pl-8 text-sm outline-none data-[highlighted]:bg-muted">
                  <Select.ItemText>{opt.label}</Select.ItemText>
                  <Select.ItemIndicator className="absolute left-2">✓</Select.ItemIndicator>
                </Select.Item>
              ))}
            </Select.Content>
          </Select.Portal>
        </Select.Root>
        {fieldErrors.projectId && <p className="mt-1 text-xs text-destructive">{fieldErrors.projectId}</p>}
      </div>

      {/* Step indicator */}
      <div className="flex items-center gap-1">
        {(['What is it?', 'Pricing', 'Delivery'] as const).map((label, i) => {
          const s = i + 1;
          return (
            <div key={s} className="flex items-center gap-1">
              <div className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold ${step === s ? 'bg-primary text-primary-foreground' : step > s ? 'bg-primary/20 text-primary' : 'bg-muted text-muted-foreground'}`}>
                {step > s ? '✓' : s}
              </div>
              <span className={`text-xs ${step === s ? 'font-medium' : 'text-muted-foreground'}`}>{label}</span>
              {s < 3 && <div className="mx-1 h-px w-6 bg-border" />}
            </div>
          );
        })}
      </div>

      {/* Step 1 — What is this? */}
      {step === 1 && (
        <div className="space-y-4">
          <div>
            <Label htmlFor="service_name" className="mb-1.5 block">
              Service name <span className="text-destructive">*</span>
            </Label>
            <Input
              id="service_name"
              value={serviceName}
              onChange={(e) => { setServiceName(e.target.value); clearFieldError('serviceName'); }}
              placeholder="e.g. Security Guard, Web Design, Catering"
              autoFocus
              className={cn(fieldErrors.serviceName && 'border-destructive')}
            />
            {fieldErrors.serviceName && <p className="mt-1 text-xs text-destructive">{fieldErrors.serviceName}</p>}
          </div>
          <div>
            <Label htmlFor="service_category" className="mb-1.5 block">
              Category <span className="text-muted-foreground text-xs">(optional)</span>
            </Label>
            <Input
              id="service_category"
              value={serviceCategory}
              onChange={(e) => setServiceCategory(e.target.value)}
              placeholder="e.g. Security, Design, Logistics"
            />
          </div>
          <div>
            <Label htmlFor="title" className="mb-1.5 block">
              Variant / title <span className="text-muted-foreground text-xs">(optional)</span>
            </Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Specific label, e.g. Night shift guard"
            />
          </div>
          <div>
            <Label htmlFor="description" className="mb-1.5 block">
              Description <span className="text-muted-foreground text-xs">(optional)</span>
            </Label>
            <textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="flex w-full rounded-xl border border-border bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              placeholder="Additional details…"
            />
          </div>
        </div>
      )}

      {/* Step 2 — Pricing */}
      {step === 2 && (
        <div className="space-y-5">
          <div>
            <Label className="mb-2 block">How is this priced?</Label>
            <div className="grid gap-2">
              {PRICING_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setPricingType(opt.value)}
                  className={`flex items-start gap-3 rounded-xl border px-4 py-3 text-left transition-colors ${
                    pricingType === opt.value ? 'border-primary bg-primary/5' : 'border-border hover:bg-muted/50'
                  }`}
                >
                  <div className={`mt-0.5 h-4 w-4 shrink-0 rounded-full border-2 transition-colors ${pricingType === opt.value ? 'border-primary bg-primary' : 'border-muted-foreground'}`} />
                  <div>
                    <p className="text-sm font-medium">{opt.label}</p>
                    <p className="text-xs text-muted-foreground">{opt.hint}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {(pricingType === 'fixed' || pricingType === 'custom') && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="client_price" className="mb-1.5 block">Client price (₹) <span className="text-destructive">*</span></Label>
                <Input id="client_price" type="number" step="0.01" min="0" value={clientPrice} onChange={(e) => { setClientPrice(e.target.value); clearFieldError('clientPrice'); }} placeholder="Total amount" className={cn(fieldErrors.clientPrice && 'border-destructive')} />
                {fieldErrors.clientPrice && <p className="mt-1 text-xs text-destructive">{fieldErrors.clientPrice}</p>}
              </div>
              <div>
                <Label htmlFor="vendor_cost" className="mb-1.5 block">Vendor cost (₹)</Label>
                <Input id="vendor_cost" type="number" step="0.01" min="0" value={vendorCost} onChange={(e) => setVendorCost(e.target.value)} placeholder="Expected cost" />
              </div>
            </div>
          )}

          {pricingType === 'qty_rate' && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="quantity" className="mb-1.5 block">Quantity <span className="text-destructive">*</span></Label>
                  <Input id="quantity" type="number" step="any" min="0" value={quantity} onChange={(e) => { setQuantity(e.target.value); clearFieldError('quantity'); }} placeholder="e.g. 5" className={cn(fieldErrors.quantity && 'border-destructive')} />
                  {fieldErrors.quantity && <p className="mt-1 text-xs text-destructive">{fieldErrors.quantity}</p>}
                </div>
                <div>
                  <Label htmlFor="unit_rate" className="mb-1.5 block">Client rate (₹ / unit) <span className="text-destructive">*</span></Label>
                  <Input id="unit_rate" type="number" step="0.01" min="0" value={unitRate} onChange={(e) => { setUnitRate(e.target.value); clearFieldError('unitRate'); }} placeholder="Rate per unit" className={cn(fieldErrors.unitRate && 'border-destructive')} />
                  {fieldErrors.unitRate && <p className="mt-1 text-xs text-destructive">{fieldErrors.unitRate}</p>}
                </div>
              </div>
              <div>
                <Label htmlFor="vendor_unit_rate" className="mb-1.5 block">Vendor rate (₹ / unit)</Label>
                <Input id="vendor_unit_rate" type="number" step="0.01" min="0" value={vendorUnitRate} onChange={(e) => setVendorUnitRate(e.target.value)} placeholder="Vendor rate per unit" />
              </div>
              {computedClientPrice != null && (
                <div className="rounded-lg bg-muted/50 px-3 py-2 text-sm">
                  <span className="text-muted-foreground">Client price: </span>
                  <span className="font-semibold tabular-nums">{fmt(computedClientPrice)}</span>
                  {computedVendorCost != null && (
                    <> · <span className="text-muted-foreground">Vendor cost: </span><span className="font-semibold tabular-nums">{fmt(computedVendorCost)}</span></>
                  )}
                </div>
              )}
            </div>
          )}

          {pricingType === 'days_rate' && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="period_days" className="mb-1.5 block">Days <span className="text-destructive">*</span></Label>
                  <Input id="period_days" type="number" min="1" value={periodDays} onChange={(e) => { setPeriodDays(e.target.value); clearFieldError('periodDays'); }} placeholder="Number of days" className={cn(fieldErrors.periodDays && 'border-destructive')} />
                  {fieldErrors.periodDays && <p className="mt-1 text-xs text-destructive">{fieldErrors.periodDays}</p>}
                </div>
                <div>
                  <Label htmlFor="unit_rate" className="mb-1.5 block">Client rate (₹ / day) <span className="text-destructive">*</span></Label>
                  <Input id="unit_rate" type="number" step="0.01" min="0" value={unitRate} onChange={(e) => { setUnitRate(e.target.value); clearFieldError('unitRate'); }} placeholder="Daily rate" className={cn(fieldErrors.unitRate && 'border-destructive')} />
                  {fieldErrors.unitRate && <p className="mt-1 text-xs text-destructive">{fieldErrors.unitRate}</p>}
                </div>
              </div>
              <div>
                <Label htmlFor="vendor_unit_rate" className="mb-1.5 block">Vendor rate (₹ / day)</Label>
                <Input id="vendor_unit_rate" type="number" step="0.01" min="0" value={vendorUnitRate} onChange={(e) => setVendorUnitRate(e.target.value)} placeholder="Vendor daily rate" />
              </div>
              {computedClientPrice != null && (
                <div className="rounded-lg bg-muted/50 px-3 py-2 text-sm">
                  <span className="text-muted-foreground">Client price: </span>
                  <span className="font-semibold tabular-nums">{fmt(computedClientPrice)}</span>
                  {computedVendorCost != null && (
                    <> · <span className="text-muted-foreground">Vendor cost: </span><span className="font-semibold tabular-nums">{fmt(computedVendorCost)}</span></>
                  )}
                </div>
              )}
            </div>
          )}

          {pricingType === 'qty_days_rate' && (
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <Label htmlFor="quantity" className="mb-1.5 block">Qty <span className="text-destructive">*</span></Label>
                  <Input id="quantity" type="number" step="any" min="0" value={quantity} onChange={(e) => { setQuantity(e.target.value); clearFieldError('quantity'); }} placeholder="e.g. 3 people" className={cn(fieldErrors.quantity && 'border-destructive')} />
                  {fieldErrors.quantity && <p className="mt-1 text-xs text-destructive">{fieldErrors.quantity}</p>}
                </div>
                <div>
                  <Label htmlFor="period_days" className="mb-1.5 block">Days <span className="text-destructive">*</span></Label>
                  <Input id="period_days" type="number" min="1" value={periodDays} onChange={(e) => { setPeriodDays(e.target.value); clearFieldError('periodDays'); }} placeholder="e.g. 10" className={cn(fieldErrors.periodDays && 'border-destructive')} />
                  {fieldErrors.periodDays && <p className="mt-1 text-xs text-destructive">{fieldErrors.periodDays}</p>}
                </div>
                <div>
                  <Label htmlFor="unit_rate" className="mb-1.5 block">Rate/day <span className="text-destructive">*</span></Label>
                  <Input id="unit_rate" type="number" step="0.01" min="0" value={unitRate} onChange={(e) => { setUnitRate(e.target.value); clearFieldError('unitRate'); }} placeholder="₹ per day" className={cn(fieldErrors.unitRate && 'border-destructive')} />
                  {fieldErrors.unitRate && <p className="mt-1 text-xs text-destructive">{fieldErrors.unitRate}</p>}
                </div>
              </div>
              <div>
                <Label htmlFor="vendor_unit_rate" className="mb-1.5 block">Vendor rate (₹ / day)</Label>
                <Input id="vendor_unit_rate" type="number" step="0.01" min="0" value={vendorUnitRate} onChange={(e) => setVendorUnitRate(e.target.value)} placeholder="Vendor daily rate" />
              </div>
              {computedClientPrice != null && (
                <div className="rounded-lg bg-muted/50 px-3 py-2 text-sm">
                  <span className="text-muted-foreground">Client price: </span>
                  <span className="font-semibold tabular-nums">{fmt(computedClientPrice)}</span>
                  {computedVendorCost != null && (
                    <> · <span className="text-muted-foreground">Vendor cost: </span><span className="font-semibold tabular-nums">{fmt(computedVendorCost)}</span></>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Step 3 — Who delivers it? */}
      {step === 3 && (
        <div className="space-y-4">
          <div>
            <Label className="mb-2 block">Delivery</Label>
            <div className="flex gap-3">
              {(['vendor', 'in_house'] as const).map((d) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => { setDelivery(d); if (d === 'in_house') setVendorId(''); }}
                  className={`flex-1 rounded-xl border px-4 py-3 text-sm font-medium transition-colors ${
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
              <Label className="mb-1.5 block">
                Assign vendor <span className="text-muted-foreground text-xs">(optional)</span>
              </Label>
              <Select.Root value={vendorId || '__none__'} onValueChange={(v) => setVendorId(v === '__none__' ? '' : v)}>
                <Select.Trigger className="flex h-10 w-full items-center justify-between rounded-xl border border-border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring data-[placeholder]:text-muted-foreground">
                  <Select.Value placeholder="Select vendor" />
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

          {delivery === 'in_house' && (
            <p className="rounded-lg bg-muted/50 px-3 py-2 text-sm text-muted-foreground">
              In-house delivery — no vendor assignment needed.
            </p>
          )}
        </div>
      )}

      <FormError message={error} />
      </ModalBody>
      <ModalFooter className="justify-between">
        <Button type="button" variant="ghost" onClick={onCancel} disabled={loading}>
          Cancel
        </Button>
        <div className="flex items-center gap-2">
          {step > 1 && (
            <Button
              type="button"
              variant="outline"
              onClick={() => { setError(null); setStep((s) => s - 1); }}
              disabled={loading}
            >
              Back
            </Button>
          )}
          {step < 3 ? (
            <Button type="button" onClick={handleNext}>Next</Button>
          ) : (
            <Button type="submit" disabled={loading}>
              {loading ? 'Creating...' : 'Create requirement'}
            </Button>
          )}
        </div>
      </ModalFooter>
    </form>
  );
}
