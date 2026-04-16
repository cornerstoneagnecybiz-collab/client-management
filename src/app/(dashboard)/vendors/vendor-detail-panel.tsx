'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { updateVendorAction, createVendorLocation, deleteVendorLocation, deleteVendor } from './actions';
import { CategoryTagInput } from './category-tag-input';
import type { VendorLocationRow } from './page';
import { cn } from '@/lib/utils';

export interface VendorRow {
  id: string;
  name: string;
  categories: string[];
  phone: string | null;
  email: string | null;
  payment_terms: string | null;
  created_at: string;
}

interface VendorDetailPanelProps {
  vendor: VendorRow;
  locations: VendorLocationRow[];
  requirementCount: number;
  existingCategories: string[];
  onSuccess: () => void;
  onClose: () => void;
}

function isValidEmail(v: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
}

export function VendorDetailPanel({ vendor, locations, requirementCount, existingCategories, onSuccess, onClose }: VendorDetailPanelProps) {
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [name, setName] = useState(vendor.name);
  const [categories, setCategories] = useState<string[]>(vendor.categories);
  const [phone, setPhone] = useState(vendor.phone ?? '');
  const [email, setEmail] = useState(vendor.email ?? '');
  const [paymentTerms, setPaymentTerms] = useState(vendor.payment_terms ?? '');
  const [newCity, setNewCity] = useState('');
  const [newAddress, setNewAddress] = useState('');
  const [addingLocation, setAddingLocation] = useState(false);

  function clearError(field: string) {
    if (errors[field]) setErrors((prev) => { const n = { ...prev }; delete n[field]; return n; });
  }

  function validate(): boolean {
    const errs: Record<string, string> = {};
    if (!name.trim()) errs.name = 'Name is required.';
    if (email.trim() && !isValidEmail(email.trim())) errs.email = 'Enter a valid email address.';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;
    setLoading(true);
    const result = await updateVendorAction(vendor.id, {
      name: name.trim(),
      categories,
      phone: phone.trim() || null,
      email: email.trim() || null,
      payment_terms: paymentTerms.trim() || null,
    });
    setLoading(false);
    if (result.error) { setErrors({ _form: result.error }); return; }
    onSuccess();
  }

  return (
    <div className="space-y-6">
      <div>
        <p className="text-2xl font-semibold">{vendor.name}</p>
        {vendor.categories.length > 0 && (
          <div className="mt-1 flex flex-wrap gap-1">
            {vendor.categories.map((c) => (
              <span key={c} className="inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">{c}</span>
            ))}
          </div>
        )}
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <Label htmlFor="edit_vendor_name" className="mb-1.5 block">
            Name <span className="text-destructive">*</span>
          </Label>
          <Input
            id="edit_vendor_name"
            value={name}
            onChange={(e) => { setName(e.target.value); clearError('name'); }}
            className={cn(errors.name && 'border-destructive')}
          />
          {errors.name && <p className="mt-1 text-xs text-destructive">{errors.name}</p>}
        </div>

        <div>
          <Label className="mb-1.5 block">Categories</Label>
          <CategoryTagInput
            value={categories}
            onChange={setCategories}
            suggestions={existingCategories}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="edit_vendor_phone" className="mb-1.5 block">Phone</Label>
            <Input id="edit_vendor_phone" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} />
          </div>
          <div>
            <Label htmlFor="edit_vendor_email" className="mb-1.5 block">Email</Label>
            <Input
              id="edit_vendor_email"
              type="email"
              value={email}
              onChange={(e) => { setEmail(e.target.value); clearError('email'); }}
              className={cn(errors.email && 'border-destructive')}
            />
            {errors.email && <p className="mt-1 text-xs text-destructive">{errors.email}</p>}
          </div>
        </div>

        <div>
          <Label htmlFor="edit_vendor_payment_terms" className="mb-1.5 block">Payment terms</Label>
          <Input id="edit_vendor_payment_terms" value={paymentTerms} onChange={(e) => setPaymentTerms(e.target.value)} />
        </div>

        {errors._form && <p className="text-sm text-destructive">{errors._form}</p>}
        <div className="flex gap-3">
          <Button type="submit" size="sm" disabled={loading}>{loading ? 'Saving…' : 'Save changes'}</Button>
          <Button type="button" variant="outline" size="sm" onClick={onClose}>Cancel</Button>
        </div>
      </form>

      <div className="border-t border-border pt-4">
        <h3 className="text-sm font-medium mb-2">Locations</h3>
        {locations.length === 0 ? (
          <p className="text-sm text-muted-foreground mb-2">No locations added.</p>
        ) : (
          <ul className="space-y-2 mb-3">
            {locations.map((loc) => (
              <li key={loc.id} className="flex items-start justify-between gap-2 rounded-lg border border-border bg-muted/20 px-3 py-2 text-sm">
                <div>
                  <span className="font-medium">{loc.city}</span>
                  {loc.address_line1 && <span className="block text-muted-foreground">{loc.address_line1}</span>}
                  {loc.state && <span className="text-muted-foreground">{loc.state}</span>}
                  {loc.postal_code && <span className="text-muted-foreground"> {loc.postal_code}</span>}
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="text-destructive hover:text-destructive"
                  disabled={loading}
                  onClick={async () => {
                    const err = await deleteVendorLocation(loc.id);
                    if (!err?.error) onSuccess();
                  }}
                >
                  Remove
                </Button>
              </li>
            ))}
          </ul>
        )}
        <div className="flex gap-2">
          <Input placeholder="City" value={newCity} onChange={(e) => setNewCity(e.target.value)} className="max-w-[140px]" />
          <Input placeholder="Address (optional)" value={newAddress} onChange={(e) => setNewAddress(e.target.value)} className="flex-1" />
          <Button
            type="button"
            size="sm"
            disabled={!newCity.trim() || addingLocation}
            onClick={async () => {
              if (!newCity.trim()) return;
              setAddingLocation(true);
              const res = await createVendorLocation({ vendor_id: vendor.id, city: newCity.trim(), address_line1: newAddress.trim() || null });
              setAddingLocation(false);
              if (!res.error) { setNewCity(''); setNewAddress(''); onSuccess(); }
            }}
          >
            {addingLocation ? 'Adding…' : 'Add location'}
          </Button>
        </div>
      </div>

      <div className="border-t border-border pt-4">
        <p className="text-sm text-muted-foreground mb-2">
          {requirementCount === 0 ? 'Not assigned to any requirements yet.' : `Assigned to ${requirementCount} requirement${requirementCount === 1 ? '' : 's'}.`}
        </p>
        <Button asChild variant="outline" size="sm">
          <Link href={`/requirements?vendor=${vendor.id}`}>View requirements</Link>
        </Button>
      </div>

      <div className="border-t border-border pt-4">
        <Button
          type="button"
          variant="destructive"
          size="sm"
          disabled={loading}
          onClick={async () => {
            if (!confirm('Delete this vendor? They must have no payouts recorded. This cannot be undone.')) return;
            setLoading(true);
            const result = await deleteVendor(vendor.id);
            setLoading(false);
            if (result.error) { setErrors({ _form: result.error }); return; }
            onSuccess();
          }}
        >
          Delete vendor
        </Button>
      </div>
    </div>
  );
}
