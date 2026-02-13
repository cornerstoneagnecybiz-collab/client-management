'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import * as Select from '@radix-ui/react-select';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import { updateVendorAction, createVendorLocation, deleteVendorLocation, deleteVendor } from './actions';
import { getCatalogItemsForVendor, addCatalogVendor, removeCatalogVendor } from '../catalog/actions';
import type { VendorLocationRow } from './page';

export type CatalogOption = { value: string; label: string; catalog_type: string };

export interface VendorRow {
  id: string;
  name: string;
  category: string | null;
  phone: string | null;
  email: string | null;
  payment_terms: string | null;
  created_at: string;
}

interface VendorDetailPanelProps {
  vendor: VendorRow;
  locations: VendorLocationRow[];
  requirementCount: number;
  catalogOptions: CatalogOption[];
  onSuccess: () => void;
  onClose: () => void;
}

type CatalogItemRow = { id: string; service_code: string; service_name: string; catalog_type: string };

export function VendorDetailPanel({ vendor, locations, requirementCount, catalogOptions, onSuccess, onClose }: VendorDetailPanelProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState(vendor.name);
  const [category, setCategory] = useState(vendor.category ?? '');
  const [phone, setPhone] = useState(vendor.phone ?? '');
  const [email, setEmail] = useState(vendor.email ?? '');
  const [paymentTerms, setPaymentTerms] = useState(vendor.payment_terms ?? '');
  const [newCity, setNewCity] = useState('');
  const [newAddress, setNewAddress] = useState('');
  const [addingLocation, setAddingLocation] = useState(false);
  const [catalogItems, setCatalogItems] = useState<CatalogItemRow[]>([]);
  const [addingCatalogId, setAddingCatalogId] = useState<string | null>(null);
  const [removingCatalogId, setRemovingCatalogId] = useState<string | null>(null);
  const [catalogDropdownOpen, setCatalogDropdownOpen] = useState(false);
  const [catalogSearch, setCatalogSearch] = useState('');
  const catalogSearchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    getCatalogItemsForVendor(vendor.id).then((r) => {
      if (!r.error) setCatalogItems(r.items);
    });
  }, [vendor.id]);

  useEffect(() => {
    if (catalogDropdownOpen) {
      setCatalogSearch('');
      setTimeout(() => catalogSearchInputRef.current?.focus(), 0);
    }
  }, [catalogDropdownOpen]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!name.trim()) {
      setError('Name is required.');
      return;
    }
    setLoading(true);
    const result = await updateVendorAction(vendor.id, {
      name: name.trim(),
      category: category.trim() || null,
      phone: phone.trim() || null,
      email: email.trim() || null,
      payment_terms: paymentTerms.trim() || null,
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
        <p className="text-2xl font-semibold">{vendor.name}</p>
        {vendor.category && <p className="text-muted-foreground text-sm">{vendor.category}</p>}
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <Label htmlFor="edit_vendor_name" className="mb-1.5 block">Name</Label>
          <Input id="edit_vendor_name" value={name} onChange={(e) => setName(e.target.value)} required />
        </div>
        <div>
          <Label htmlFor="edit_vendor_category" className="mb-1.5 block">Category</Label>
          <Input id="edit_vendor_category" value={category} onChange={(e) => setCategory(e.target.value)} />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="edit_vendor_phone" className="mb-1.5 block">Phone</Label>
            <Input id="edit_vendor_phone" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} />
          </div>
          <div>
            <Label htmlFor="edit_vendor_email" className="mb-1.5 block">Email</Label>
            <Input id="edit_vendor_email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
        </div>
        <div>
          <Label htmlFor="edit_vendor_payment_terms" className="mb-1.5 block">Payment terms</Label>
          <Input id="edit_vendor_payment_terms" value={paymentTerms} onChange={(e) => setPaymentTerms(e.target.value)} />
        </div>
        {error && <p className="text-sm text-red-500">{error}</p>}
        <div className="flex gap-3">
          <Button type="submit" size="sm" disabled={loading}>{loading ? 'Saving…' : 'Save changes'}</Button>
          <Button type="button" variant="outline" size="sm" onClick={onClose}>Cancel</Button>
        </div>
      </form>

      <div className="border-t border-border pt-4">
        <h3 className="text-sm font-medium mb-2">Locations</h3>
        {locations.length === 0 ? (
          <p className="text-sm text-muted-foreground mb-2">No locations added. Add one below to show this vendor under a city.</p>
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
                  className="text-red-600 hover:text-red-700"
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
          <Input
            placeholder="City"
            value={newCity}
            onChange={(e) => setNewCity(e.target.value)}
            className="max-w-[140px]"
          />
          <Input
            placeholder="Address (optional)"
            value={newAddress}
            onChange={(e) => setNewAddress(e.target.value)}
            className="flex-1"
          />
          <Button
            type="button"
            size="sm"
            disabled={!newCity.trim() || addingLocation}
            onClick={async () => {
              if (!newCity.trim()) return;
              setAddingLocation(true);
              const res = await createVendorLocation({
                vendor_id: vendor.id,
                city: newCity.trim(),
                address_line1: newAddress.trim() || null,
              });
              setAddingLocation(false);
              if (!res.error) {
                setNewCity('');
                setNewAddress('');
                onSuccess();
              }
            }}
          >
            {addingLocation ? 'Adding…' : 'Add location'}
          </Button>
        </div>
      </div>

      <div className="border-t border-border pt-4">
        <h3 className="text-sm font-medium mb-2">Catalog items this vendor can provide</h3>
        <p className="text-xs text-muted-foreground mb-2">Add or remove goods/services/consulting this vendor can supply. Used when assigning requirements.</p>
        {catalogItems.length === 0 ? (
          <p className="text-sm text-muted-foreground mb-2">None added yet. Add one below.</p>
        ) : (
          <ul className="space-y-2 mb-3">
            {catalogItems.map((item) => (
              <li key={item.id} className="flex items-center justify-between gap-2 rounded-lg border border-border bg-muted/20 px-3 py-2 text-sm">
                <span className="font-medium">{item.service_name}</span>
                <span className="text-muted-foreground font-mono text-xs">{item.service_code}</span>
                <span className="rounded bg-muted px-2 py-0.5 text-xs capitalize">{item.catalog_type}</span>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="text-red-600 hover:text-red-700 shrink-0"
                  disabled={removingCatalogId === item.id}
                  onClick={async () => {
                    setRemovingCatalogId(item.id);
                    await removeCatalogVendor(item.id, vendor.id);
                    setRemovingCatalogId(null);
                    const r = await getCatalogItemsForVendor(vendor.id);
                    if (!r.error) setCatalogItems(r.items);
                    onSuccess();
                  }}
                >
                  Remove
                </Button>
              </li>
            ))}
          </ul>
        )}
        <div className="flex gap-2 items-center flex-wrap">
          <DropdownMenu.Root open={catalogDropdownOpen} onOpenChange={(open) => { setCatalogDropdownOpen(open); if (!open) setCatalogSearch(''); }}>
            <DropdownMenu.Trigger asChild>
              <button
                type="button"
                disabled={!!addingCatalogId}
                className="flex h-9 w-full max-w-xs items-center justify-between rounded-lg border border-border bg-background px-3 text-sm"
              >
                <span className="text-muted-foreground">Add catalog item…</span>
                <span aria-hidden className="text-muted-foreground">▼</span>
              </button>
            </DropdownMenu.Trigger>
            <DropdownMenu.Portal>
              <DropdownMenu.Content
                className="z-[100] min-w-[320px] rounded-xl border border-border bg-card p-2 shadow-lg"
                sideOffset={4}
                onCloseAutoFocus={(e) => e.preventDefault()}
              >
                <input
                  ref={catalogSearchInputRef}
                  type="text"
                  placeholder="Search catalog…"
                  value={catalogSearch}
                  onChange={(e) => setCatalogSearch(e.target.value)}
                  onKeyDown={(e) => e.stopPropagation()}
                  className="mb-2 h-9 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none placeholder:text-muted-foreground focus:ring-2 focus:ring-ring"
                />
                <div className="max-h-[280px] overflow-y-auto">
                  {(() => {
                    const available = catalogOptions.filter(
                      (opt) => !catalogItems.some((c) => c.id === opt.value)
                    );
                    const filtered = catalogSearch.trim()
                      ? available.filter((opt) =>
                          opt.label.toLowerCase().includes(catalogSearch.toLowerCase())
                        )
                      : available;
                    if (filtered.length === 0) {
                      return (
                        <div className="py-4 text-center text-sm text-muted-foreground">
                          {catalogSearch.trim() ? 'No matching items.' : 'All items already added.'}
                        </div>
                      );
                    }
                    return filtered.map((opt) => (
                      <DropdownMenu.Item
                        key={opt.value}
                        onSelect={async (e) => {
                          e.preventDefault();
                          setAddingCatalogId(opt.value);
                          await addCatalogVendor(opt.value, vendor.id);
                          setAddingCatalogId(null);
                          const r = await getCatalogItemsForVendor(vendor.id);
                          if (!r.error) setCatalogItems(r.items);
                          onSuccess();
                          setCatalogDropdownOpen(false);
                        }}
                        className="flex cursor-pointer items-center rounded-lg px-3 py-2 text-sm outline-none focus:bg-muted data-[highlighted]:bg-muted"
                      >
                        {opt.label}
                      </DropdownMenu.Item>
                    ));
                  })()}
                </div>
              </DropdownMenu.Content>
            </DropdownMenu.Portal>
          </DropdownMenu.Root>
          {catalogOptions.filter((opt) => !catalogItems.some((c) => c.id === opt.value)).length === 0 && (
            <span className="text-xs text-muted-foreground">All items already added.</span>
          )}
        </div>
      </div>

      <div className="border-t border-border pt-4">
        <p className="text-sm text-muted-foreground mb-2">
          {requirementCount === 0 ? 'Not assigned to any requirements yet.' : `Assigned to ${requirementCount} requirement${requirementCount === 1 ? '' : 's'}.`}
        </p>
        <Button asChild variant="outline" size="sm">
          <Link href="/requirements">View requirements</Link>
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
            setError(null);
            setLoading(true);
            const result = await deleteVendor(vendor.id);
            setLoading(false);
            if (result.error) {
              setError(result.error);
              return;
            }
            onSuccess();
          }}
        >
          Delete vendor
        </Button>
      </div>
    </div>
  );
}
