'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ModalBody, ModalFooter } from '@/components/ui/modal';
import { Field, FieldGrid, FormError, FormSection } from '@/components/ui/form-shell';
import { useToast } from '@/components/ui/toast';
import { createClientAction } from './actions';
import { cn } from '@/lib/utils';

interface NewClientFormProps {
  onSuccess: () => void;
  onCancel: () => void;
  onDirtyChange?: (dirty: boolean) => void;
}

function isValidEmail(v: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
}

export function NewClientForm({ onSuccess, onCancel, onDirtyChange }: NewClientFormProps) {
  const toast = useToast();
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [name, setName] = useState('');
  const [company, setCompany] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [gst, setGst] = useState('');

  const isDirty =
    name.trim().length > 0 ||
    company.trim().length > 0 ||
    phone.trim().length > 0 ||
    email.trim().length > 0 ||
    gst.trim().length > 0;

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
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;
    setLoading(true);
    const result = await createClientAction({
      name: name.trim(),
      company: company.trim() || null,
      phone: phone.trim() || null,
      email: email.trim() || null,
      gst: gst.trim() || null,
    });
    setLoading(false);
    if (result.error) {
      setErrors({ _form: result.error });
      toast.error('Could not add client', result.error);
      return;
    }
    toast.success('Client added', name.trim());
    onSuccess();
  }

  return (
    <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
      <ModalBody>
        <FormSection>
          <Field label="Name" htmlFor="client_name" required error={errors.name}>
            <Input
              id="client_name"
              value={name}
              onChange={(e) => { setName(e.target.value); clearError('name'); }}
              placeholder="Client or contact name"
              className={cn(errors.name && 'border-destructive')}
              autoFocus
            />
          </Field>
          <Field label="Company" htmlFor="client_company">
            <Input
              id="client_company"
              value={company}
              onChange={(e) => setCompany(e.target.value)}
              placeholder="Company name"
            />
          </Field>
          <FieldGrid>
            <Field label="Phone" htmlFor="client_phone">
              <Input
                id="client_phone"
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="—"
              />
            </Field>
            <Field label="Email" htmlFor="client_email" error={errors.email}>
              <Input
                id="client_email"
                type="email"
                value={email}
                onChange={(e) => { setEmail(e.target.value); clearError('email'); }}
                placeholder="—"
                className={cn(errors.email && 'border-destructive')}
              />
            </Field>
          </FieldGrid>
          <Field label="GST" htmlFor="client_gst" help="Optional — used on invoices.">
            <Input
              id="client_gst"
              value={gst}
              onChange={(e) => setGst(e.target.value)}
              placeholder="GST number"
            />
          </Field>
          <FormError message={errors._form} />
        </FormSection>
      </ModalBody>
      <ModalFooter>
        <Button type="button" variant="outline" onClick={onCancel} disabled={loading}>
          Cancel
        </Button>
        <Button type="submit" disabled={loading}>
          {loading ? 'Adding…' : 'Add client'}
        </Button>
      </ModalFooter>
    </form>
  );
}
