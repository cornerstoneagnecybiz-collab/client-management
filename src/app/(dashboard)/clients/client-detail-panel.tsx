'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { updateClient, deleteClient } from './actions';

export interface ClientRow {
  id: string;
  name: string;
  company: string | null;
  phone: string | null;
  email: string | null;
  gst: string | null;
  created_at: string;
}

interface ClientDetailPanelProps {
  client: ClientRow;
  projectCount: number;
  onSuccess: () => void;
  onClose: () => void;
}

export function ClientDetailPanel({ client, projectCount, onSuccess, onClose }: ClientDetailPanelProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState(client.name);
  const [company, setCompany] = useState(client.company ?? '');
  const [phone, setPhone] = useState(client.phone ?? '');
  const [email, setEmail] = useState(client.email ?? '');
  const [gst, setGst] = useState(client.gst ?? '');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!name.trim()) {
      setError('Name is required.');
      return;
    }
    setLoading(true);
    const result = await updateClient(client.id, {
      name: name.trim(),
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
    <div className="space-y-6">
      <div>
        <p className="text-2xl font-semibold">{client.name}</p>
        {client.company && <p className="text-muted-foreground text-sm">{client.company}</p>}
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <Label htmlFor="edit_name" className="mb-1.5 block">Name</Label>
          <Input id="edit_name" value={name} onChange={(e) => setName(e.target.value)} required />
        </div>
        <div>
          <Label htmlFor="edit_company" className="mb-1.5 block">Company</Label>
          <Input id="edit_company" value={company} onChange={(e) => setCompany(e.target.value)} />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="edit_phone" className="mb-1.5 block">Phone</Label>
            <Input id="edit_phone" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} />
          </div>
          <div>
            <Label htmlFor="edit_email" className="mb-1.5 block">Email</Label>
            <Input id="edit_email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
        </div>
        <div>
          <Label htmlFor="edit_gst" className="mb-1.5 block">GST</Label>
          <Input id="edit_gst" value={gst} onChange={(e) => setGst(e.target.value)} />
        </div>
        {error && <p className="text-sm text-red-500">{error}</p>}
        <div className="flex gap-3">
          <Button type="submit" size="sm" disabled={loading}>{loading ? 'Saving…' : 'Save changes'}</Button>
          <Button type="button" variant="outline" size="sm" onClick={onClose}>Cancel</Button>
        </div>
      </form>

      <div className="border-t border-border pt-4 space-y-2">
        <div className="flex flex-wrap gap-2">
          <Button asChild variant="outline" size="sm">
            <Link href={`/clients/${client.id}`}>View full profile</Link>
          </Button>
          <Button asChild size="sm">
            <Link href={`/projects/new?client=${client.id}`}>New project for this client</Link>
          </Button>
          {projectCount > 0 && (
            <Button asChild variant="outline" size="sm">
              <Link href={`/projects?client=${client.id}`}>View projects</Link>
            </Button>
          )}
        </div>
        <p className="text-sm text-muted-foreground pt-1">
          {projectCount === 0 ? 'No projects yet for this client.' : `${projectCount} project${projectCount === 1 ? '' : 's'} for this client.`}
        </p>
      </div>

      {projectCount === 0 && (
        <div className="border-t border-border pt-4">
          <Button
            type="button"
            variant="destructive"
            size="sm"
            disabled={loading}
            onClick={async () => {
              if (!confirm('Delete this client? This cannot be undone.')) return;
              setError(null);
              setLoading(true);
              const result = await deleteClient(client.id);
              setLoading(false);
              if (result.error) {
                setError(result.error);
                return;
              }
              onSuccess();
            }}
          >
            Delete client
          </Button>
        </div>
      )}
    </div>
  );
}
