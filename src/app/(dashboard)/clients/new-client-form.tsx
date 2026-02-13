'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { createClientAction } from './actions';

interface NewClientFormProps {
  onSuccess: () => void;
  onCancel: () => void;
}

export function NewClientForm({ onSuccess, onCancel }: NewClientFormProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [company, setCompany] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [gst, setGst] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const trimmed = name.trim();
    if (!trimmed) {
      setError('Name is required.');
      return;
    }
    setLoading(true);
    const result = await createClientAction({
      name: trimmed,
      company: company.trim() || null,
      phone: phone.trim() || null,
      email: email.trim() || null,
      gst: gst.trim() || null,
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
      <div>
        <Label htmlFor="client_name" className="mb-1.5 block">Name</Label>
        <Input id="client_name" value={name} onChange={(e) => setName(e.target.value)} required placeholder="Client or contact name" />
      </div>
      <div>
        <Label htmlFor="client_company" className="mb-1.5 block">Company</Label>
        <Input id="client_company" value={company} onChange={(e) => setCompany(e.target.value)} placeholder="Company name" />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="client_phone" className="mb-1.5 block">Phone</Label>
          <Input id="client_phone" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="—" />
        </div>
        <div>
          <Label htmlFor="client_email" className="mb-1.5 block">Email</Label>
          <Input id="client_email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="—" />
        </div>
      </div>
      <div>
        <Label htmlFor="client_gst" className="mb-1.5 block">GST</Label>
        <Input id="client_gst" value={gst} onChange={(e) => setGst(e.target.value)} placeholder="GST number" />
      </div>
      {error && <p className="text-sm text-red-500">{error}</p>}
      <div className="flex gap-3 pt-2">
        <Button type="submit" disabled={loading}>{loading ? 'Adding…' : 'Add client'}</Button>
        <Button type="button" variant="outline" onClick={onCancel}>Cancel</Button>
      </div>
    </form>
  );
}
