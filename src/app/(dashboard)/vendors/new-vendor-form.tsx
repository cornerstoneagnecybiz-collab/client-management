'use client';

import { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import * as Select from '@radix-ui/react-select';
import { Plus, ChevronDown, MapPin } from 'lucide-react';
import { createVendorAction } from './actions';

interface NewVendorFormProps {
  existingCategories: string[];
  onSuccess: () => void;
  onCancel: () => void;
}

export function NewVendorForm({ existingCategories, onSuccess, onCancel }: NewVendorFormProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [name, setName] = useState('');
  const [category, setCategory] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [paymentTerms, setPaymentTerms] = useState('');

  const [categoriesList, setCategoriesList] = useState<string[]>(() => [...existingCategories].sort());
  const [showAddCategory, setShowAddCategory] = useState(false);
  const [newCategoryValue, setNewCategoryValue] = useState('');

  const [addLocation, setAddLocation] = useState(false);
  const [locCity, setLocCity] = useState('');
  const [locAddress1, setLocAddress1] = useState('');
  const [locAddress2, setLocAddress2] = useState('');
  const [locState, setLocState] = useState('');
  const [locPostalCode, setLocPostalCode] = useState('');

  const categoryOptions = useMemo(() => categoriesList.filter(Boolean), [categoriesList]);

  function handleAddCategory() {
    const v = newCategoryValue.trim();
    if (!v) return;
    if (!categoriesList.includes(v)) {
      setCategoriesList((prev) => [...prev, v].sort());
    }
    setCategory(v);
    setNewCategoryValue('');
    setShowAddCategory(false);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!name.trim()) {
      setError('Name is required.');
      return;
    }
    setLoading(true);
    const result = await createVendorAction({
      name: name.trim(),
      category: category.trim() || null,
      phone: phone.trim() || null,
      email: email.trim() || null,
      payment_terms: paymentTerms.trim() || null,
      primary_location:
        addLocation && locCity.trim()
          ? {
              city: locCity.trim(),
              address_line1: locAddress1.trim() || null,
              address_line2: locAddress2.trim() || null,
              state: locState.trim() || null,
              postal_code: locPostalCode.trim() || null,
            }
          : null,
    });
    setLoading(false);
    if (result.error) {
      setError(result.error);
      return;
    }
    onSuccess();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Basic information */}
      <div className="space-y-4">
        <h3 className="text-sm font-semibold text-foreground">Basic information</h3>
        <div>
          <Label htmlFor="vendor_name" className="mb-1.5 block">
            Name <span className="text-destructive">*</span>
          </Label>
          <Input
            id="vendor_name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            placeholder="Vendor or company name"
          />
        </div>

        <div>
          <Label className="mb-1.5 block">Category</Label>
          <div className="flex flex-col gap-2">
            <Select.Root value={category || undefined} onValueChange={(v) => setCategory(v ?? '')}>
              <Select.Trigger
                id="vendor_category"
                className="flex h-9 w-full items-center justify-between rounded-lg border border-border bg-background px-3 text-sm"
              >
                <Select.Value placeholder="Select category (optional)" />
                <Select.Icon>
                  <ChevronDown className="h-4 w-4 opacity-50" />
                </Select.Icon>
              </Select.Trigger>
              <Select.Portal>
                <Select.Content
                  className="z-[100] max-h-[var(--radix-select-content-available-height)] rounded-xl border border-border bg-card shadow-lg"
                  position="popper"
                  sideOffset={4}
                >
                  {categoryOptions.length === 0 ? (
                    <div className="px-3 py-2 text-sm text-muted-foreground">No categories yet. Add one below.</div>
                  ) : (
                    categoryOptions.map((c) => (
                      <Select.Item
                        key={c}
                        value={c}
                        className="flex cursor-default items-center rounded-lg py-2 pl-3 pr-8 text-sm outline-none focus:bg-muted data-[highlighted]:bg-muted"
                      >
                        <Select.ItemText>{c}</Select.ItemText>
                      </Select.Item>
                    ))
                  )}
                </Select.Content>
              </Select.Portal>
            </Select.Root>
            {!showAddCategory ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="w-fit gap-1.5"
                onClick={() => setShowAddCategory(true)}
              >
                <Plus className="h-3.5 w-3.5" />
                Add category
              </Button>
            ) : (
              <div className="flex gap-2">
                <Input
                  placeholder="New category name"
                  value={newCategoryValue}
                  onChange={(e) => setNewCategoryValue(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddCategory())}
                  className="flex-1"
                  autoFocus
                />
                <Button type="button" size="sm" onClick={handleAddCategory} disabled={!newCategoryValue.trim()}>
                  Add
                </Button>
                <Button type="button" variant="ghost" size="sm" onClick={() => setShowAddCategory(false)}>
                  Cancel
                </Button>
              </div>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor="vendor_phone" className="mb-1.5 block">
              Phone
            </Label>
            <Input
              id="vendor_phone"
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="Primary contact number"
            />
          </div>
          <div>
            <Label htmlFor="vendor_email" className="mb-1.5 block">
              Email
            </Label>
            <Input
              id="vendor_email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Primary contact email"
            />
          </div>
        </div>

        <div>
          <Label htmlFor="vendor_payment_terms" className="mb-1.5 block">
            Payment terms
          </Label>
          <Input
            id="vendor_payment_terms"
            value={paymentTerms}
            onChange={(e) => setPaymentTerms(e.target.value)}
            placeholder="e.g. Net 30, 50% advance"
          />
        </div>
      </div>

      {/* Primary location (optional) */}
      <div className="space-y-4 border-t border-border pt-4">
        <div className="flex items-center gap-2">
          <MapPin className="h-4 w-4 text-muted-foreground" />
          <h3 className="text-sm font-semibold text-foreground">Primary location (optional)</h3>
        </div>
        <p className="text-xs text-muted-foreground">
          Add a location to show this vendor under a city. You can add more locations after saving.
        </p>
        <Button
          type="button"
          variant={addLocation ? 'secondary' : 'outline'}
          size="sm"
          onClick={() => setAddLocation((a) => !a)}
        >
          {addLocation ? 'Remove location' : 'Add primary location'}
        </Button>
        {addLocation && (
          <div className="grid gap-4 rounded-lg border border-border bg-muted/20 p-4">
            <div>
              <Label htmlFor="loc_city" className="mb-1.5 block">
                City <span className="text-muted-foreground">(required for location)</span>
              </Label>
              <Input
                id="loc_city"
                value={locCity}
                onChange={(e) => setLocCity(e.target.value)}
                placeholder="e.g. Mumbai"
              />
            </div>
            <div>
              <Label htmlFor="loc_address1" className="mb-1.5 block">
                Address line 1
              </Label>
              <Input
                id="loc_address1"
                value={locAddress1}
                onChange={(e) => setLocAddress1(e.target.value)}
                placeholder="Street, building"
              />
            </div>
            <div>
              <Label htmlFor="loc_address2" className="mb-1.5 block">
                Address line 2
              </Label>
              <Input
                id="loc_address2"
                value={locAddress2}
                onChange={(e) => setLocAddress2(e.target.value)}
                placeholder="Landmark, suite (optional)"
              />
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <Label htmlFor="loc_state" className="mb-1.5 block">
                  State
                </Label>
                <Input
                  id="loc_state"
                  value={locState}
                  onChange={(e) => setLocState(e.target.value)}
                  placeholder="State / region"
                />
              </div>
              <div>
                <Label htmlFor="loc_postal" className="mb-1.5 block">
                  Postal code
                </Label>
                <Input
                  id="loc_postal"
                  value={locPostalCode}
                  onChange={(e) => setLocPostalCode(e.target.value)}
                  placeholder="PIN / ZIP"
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}
      <div className="flex gap-3 border-t border-border pt-4">
        <Button type="submit" disabled={loading}>
          {loading ? 'Adding…' : 'Add vendor'}
        </Button>
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
