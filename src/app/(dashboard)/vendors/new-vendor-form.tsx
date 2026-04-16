'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ModalBody, ModalFooter } from '@/components/ui/modal';
import { Field, FieldGrid, FormError, FormSection } from '@/components/ui/form-shell';
import { useToast } from '@/components/ui/toast';
import { MapPin } from 'lucide-react';
import { createVendorAction } from './actions';
import { CategoryTagInput } from './category-tag-input';
import { cn } from '@/lib/utils';

interface NewVendorFormProps {
  existingCategories: string[];
  onSuccess: () => void;
  onCancel: () => void;
  onDirtyChange?: (dirty: boolean) => void;
}

function isValidEmail(v: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
}

export function NewVendorForm({
  existingCategories,
  onSuccess,
  onCancel,
  onDirtyChange,
}: NewVendorFormProps) {
  const toast = useToast();
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [name, setName] = useState('');
  const [categories, setCategories] = useState<string[]>([]);
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [paymentTerms, setPaymentTerms] = useState('');

  const [addLocation, setAddLocation] = useState(false);
  const [locCity, setLocCity] = useState('');
  const [locAddress1, setLocAddress1] = useState('');
  const [locAddress2, setLocAddress2] = useState('');
  const [locState, setLocState] = useState('');
  const [locPostalCode, setLocPostalCode] = useState('');

  const isDirty =
    name.trim().length > 0 ||
    categories.length > 0 ||
    phone.trim().length > 0 ||
    email.trim().length > 0 ||
    paymentTerms.trim().length > 0 ||
    addLocation;

  useEffect(() => {
    onDirtyChange?.(isDirty);
  }, [isDirty, onDirtyChange]);

  function clearError(field: string) {
    if (errors[field]) setErrors((prev) => { const n = { ...prev }; delete n[field]; return n; });
  }

  function validate(): boolean {
    const errs: Record<string, string> = {};
    if (!name.trim()) errs.name = 'Name is required.';
    if (email.trim() && !isValidEmail(email.trim())) errs.email = 'Enter a valid email address.';
    if (addLocation && !locCity.trim()) errs.locCity = 'City is required when adding a location.';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;
    setLoading(true);
    const result = await createVendorAction({
      name: name.trim(),
      categories,
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
      setErrors({ _form: result.error });
      toast.error('Could not add vendor', result.error);
      return;
    }
    toast.success('Vendor added', name.trim());
    onSuccess();
  }

  return (
    <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
      <ModalBody className="space-y-6">
        <FormSection title="Basic information">
          <Field label="Name" htmlFor="vendor_name" required error={errors.name}>
            <Input
              id="vendor_name"
              value={name}
              onChange={(e) => { setName(e.target.value); clearError('name'); }}
              placeholder="Vendor or company name"
              className={cn(errors.name && 'border-destructive')}
              autoFocus
            />
          </Field>
          <Field label="Categories" help="Used to group and search vendors.">
            <CategoryTagInput
              value={categories}
              onChange={setCategories}
              suggestions={existingCategories}
            />
          </Field>
          <FieldGrid>
            <Field label="Phone" htmlFor="vendor_phone">
              <Input
                id="vendor_phone"
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="Primary contact number"
              />
            </Field>
            <Field label="Email" htmlFor="vendor_email" error={errors.email}>
              <Input
                id="vendor_email"
                type="email"
                value={email}
                onChange={(e) => { setEmail(e.target.value); clearError('email'); }}
                placeholder="Primary contact email"
                className={cn(errors.email && 'border-destructive')}
              />
            </Field>
          </FieldGrid>
          <Field label="Payment terms" htmlFor="vendor_payment_terms">
            <Input
              id="vendor_payment_terms"
              value={paymentTerms}
              onChange={(e) => setPaymentTerms(e.target.value)}
              placeholder="e.g. Net 30, 50% advance"
            />
          </Field>
        </FormSection>

        <FormSection
          title="Primary location"
          description="Add a location to show this vendor under a city. You can add more later."
        >
          {!addLocation ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => { setAddLocation(true); clearError('locCity'); }}
            >
              <MapPin className="h-4 w-4" />
              Add primary location
            </Button>
          ) : (
            <div className="space-y-4 rounded-xl border border-border bg-muted/20 p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs font-medium text-foreground">
                  <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
                  Location details
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => { setAddLocation(false); clearError('locCity'); }}
                >
                  Remove
                </Button>
              </div>
              <Field label="City" htmlFor="loc_city" required error={errors.locCity}>
                <Input
                  id="loc_city"
                  value={locCity}
                  onChange={(e) => { setLocCity(e.target.value); clearError('locCity'); }}
                  placeholder="e.g. Mumbai"
                  className={cn(errors.locCity && 'border-destructive')}
                />
              </Field>
              <Field label="Address line 1" htmlFor="loc_address1">
                <Input
                  id="loc_address1"
                  value={locAddress1}
                  onChange={(e) => setLocAddress1(e.target.value)}
                  placeholder="Street, building"
                />
              </Field>
              <Field label="Address line 2" htmlFor="loc_address2">
                <Input
                  id="loc_address2"
                  value={locAddress2}
                  onChange={(e) => setLocAddress2(e.target.value)}
                  placeholder="Landmark, suite (optional)"
                />
              </Field>
              <FieldGrid>
                <Field label="State" htmlFor="loc_state">
                  <Input
                    id="loc_state"
                    value={locState}
                    onChange={(e) => setLocState(e.target.value)}
                    placeholder="State / region"
                  />
                </Field>
                <Field label="Postal code" htmlFor="loc_postal">
                  <Input
                    id="loc_postal"
                    value={locPostalCode}
                    onChange={(e) => setLocPostalCode(e.target.value)}
                    placeholder="PIN / ZIP"
                  />
                </Field>
              </FieldGrid>
            </div>
          )}
        </FormSection>

        <FormError message={errors._form} />
      </ModalBody>
      <ModalFooter>
        <Button type="button" variant="outline" onClick={onCancel} disabled={loading}>
          Cancel
        </Button>
        <Button type="submit" disabled={loading}>
          {loading ? 'Adding…' : 'Add vendor'}
        </Button>
      </ModalFooter>
    </form>
  );
}
