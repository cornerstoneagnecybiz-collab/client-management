'use client';

import { useState } from 'react';
import * as Tabs from '@radix-ui/react-tabs';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  User,
  FolderKanban,
  FileText,
  Activity,
  ChevronRight,
  ArrowDownLeft,
  ArrowUpRight,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { updateClient } from '../actions';
import type { InvoiceRow, PaymentRow } from '@/app/(dashboard)/finance/page';
import type { ActivityEntryRow } from '@/app/(dashboard)/activity/page';
import type { InvoiceStatus, InvoiceType } from '@/types';

const STATUS_LABELS: Record<InvoiceStatus, string> = {
  draft: 'Draft',
  issued: 'Issued',
  paid: 'Paid',
  overdue: 'Overdue',
  cancelled: 'Cancelled',
};

const TYPE_LABELS: Record<InvoiceType, string> = {
  project: 'Project',
  milestone: 'Milestone',
  monthly: 'Monthly',
};

const PROJECT_STATUS_LABELS: Record<string, string> = {
  draft: 'Draft',
  active: 'Active',
  on_hold: 'On hold',
  completed: 'Completed',
  cancelled: 'Cancelled',
};

const ACTIVITY_TYPE_LABELS: Record<string, string> = {
  client_invoice: 'Invoice issued',
  client_payment: 'Payment received',
  vendor_expected_cost: 'Vendor expected',
  vendor_payment: 'Vendor paid',
};

const ACTIVITY_VARIANTS: Record<string, { bg: string; text: string; icon: React.ElementType }> = {
  client_invoice: { bg: 'bg-blue-500/10', text: 'text-blue-700 dark:text-blue-300', icon: FileText },
  client_payment: { bg: 'bg-emerald-500/10', text: 'text-emerald-700 dark:text-emerald-300', icon: ArrowDownLeft },
  vendor_expected_cost: { bg: 'bg-amber-500/10', text: 'text-amber-700 dark:text-amber-300', icon: FileText },
  vendor_payment: { bg: 'bg-rose-500/10', text: 'text-rose-700 dark:text-rose-300', icon: ArrowUpRight },
};

function formatMoney(n: number): string {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n);
}

function formatDate(d: string): string {
  return new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

export interface ClientRow {
  id: string;
  name: string;
  company: string | null;
  phone: string | null;
  email: string | null;
  gst: string | null;
  created_at: string;
}

interface ProjectRow {
  id: string;
  name: string;
  status: string;
  engagement_type: 'one_time' | 'monthly';
  start_date: string | null;
  end_date: string | null;
  created_at: string;
}

interface ClientTabsProps {
  client: ClientRow;
  projects: ProjectRow[];
  invoices: InvoiceRow[];
  paymentsByInvoiceId: Record<string, PaymentRow[]>;
  activityEntries: ActivityEntryRow[];
}

export function ClientTabs({
  client,
  projects,
  invoices,
  paymentsByInvoiceId,
  activityEntries,
}: ClientTabsProps) {
  const router = useRouter();

  return (
    <Tabs.Root defaultValue="profile" className="space-y-4">
      <Tabs.List className="flex gap-1 rounded-xl border border-border bg-muted/20 p-1">
        <Tabs.Trigger
          value="profile"
          className="flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium data-[state=active]:bg-background data-[state=active]:shadow data-[state=active]:text-foreground"
        >
          <User className="h-4 w-4" />
          Profile
        </Tabs.Trigger>
        <Tabs.Trigger
          value="projects"
          className="flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium data-[state=active]:bg-background data-[state=active]:shadow data-[state=active]:text-foreground"
        >
          <FolderKanban className="h-4 w-4" />
          Projects ({projects.length})
        </Tabs.Trigger>
        <Tabs.Trigger
          value="invoices"
          className="flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium data-[state=active]:bg-background data-[state=active]:shadow data-[state=active]:text-foreground"
        >
          <FileText className="h-4 w-4" />
          Invoices ({invoices.length})
        </Tabs.Trigger>
        <Tabs.Trigger
          value="activity"
          className="flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium data-[state=active]:bg-background data-[state=active]:shadow data-[state=active]:text-foreground"
        >
          <Activity className="h-4 w-4" />
          Activity
        </Tabs.Trigger>
      </Tabs.List>

      <Tabs.Content value="profile" className="outline-none">
        <ClientProfileTab client={client} onSuccess={() => router.refresh()} />
      </Tabs.Content>

      <Tabs.Content value="projects" className="outline-none">
        <div className="glass-card overflow-hidden">
          {projects.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground text-sm">
              No projects for this client yet.
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="content-cell text-left font-medium px-4">Project</th>
                  <th className="content-cell text-left font-medium px-4">Status</th>
                  <th className="content-cell text-left font-medium px-4">Type</th>
                  <th className="content-cell w-10 px-2" aria-hidden><span className="sr-only">Open</span></th>
                </tr>
              </thead>
              <tbody>
                {projects.map((p) => (
                  <tr key={p.id} className="border-b border-border/50 hover:bg-muted/30">
                    <td className="content-cell px-4 font-medium">{p.name}</td>
                    <td className="content-cell px-4 text-muted-foreground">{PROJECT_STATUS_LABELS[p.status] ?? p.status}</td>
                    <td className="content-cell px-4 text-muted-foreground">{p.engagement_type === 'monthly' ? 'Monthly' : 'One-time'}</td>
                    <td className="content-cell px-2">
                      <Button variant="ghost" size="icon" asChild>
                        <Link href={`/projects/${p.id}`} aria-label={`Open ${p.name}`}>
                          <ChevronRight className="h-4 w-4" />
                        </Link>
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          <div className="border-t border-border px-4 py-3">
            <Button asChild size="sm">
              <Link href={`/projects/new?client=${client.id}`}>New project for this client</Link>
            </Button>
          </div>
        </div>
      </Tabs.Content>

      <Tabs.Content value="invoices" className="outline-none">
        <div className="glass-card overflow-hidden">
          {invoices.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground text-sm">
              No invoices for this client yet.
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="content-cell text-left font-medium px-4">Project</th>
                  <th className="content-cell text-left font-medium px-4">Type</th>
                  <th className="content-cell text-right font-medium px-4">Amount</th>
                  <th className="content-cell text-left font-medium px-4">Status</th>
                  <th className="content-cell w-10 px-2" aria-hidden><span className="sr-only">Open</span></th>
                </tr>
              </thead>
              <tbody>
                {invoices.map((inv) => (
                  <tr key={inv.id} className="border-b border-border/50 hover:bg-muted/30">
                    <td className="content-cell px-4 text-muted-foreground">{inv.project_name}</td>
                    <td className="content-cell px-4">{TYPE_LABELS[inv.type]}</td>
                    <td className="content-cell px-4 text-right tabular-nums">{formatMoney(inv.amount)}</td>
                    <td className="content-cell px-4">{STATUS_LABELS[inv.status]}</td>
                    <td className="content-cell px-2">
                      <Button variant="ghost" size="icon" asChild>
                        <Link href={`/finance?id=${inv.id}`} aria-label={`Open invoice`}>
                          <ChevronRight className="h-4 w-4" />
                        </Link>
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          <div className="border-t border-border px-4 py-3">
            <Button asChild size="sm" variant="outline">
              <Link href="/finance">Open Finance</Link>
            </Button>
          </div>
        </div>
      </Tabs.Content>

      <Tabs.Content value="activity" className="outline-none">
        <div className="space-y-6">
          {activityEntries.length === 0 ? (
            <div className="rounded-xl border border-border bg-card p-12 text-center text-muted-foreground text-sm">
              No activity for this client yet.
            </div>
          ) : (
            (() => {
              const byDate = new Map<string, ActivityEntryRow[]>();
              for (const e of activityEntries) {
                const key = e.date;
                if (!byDate.has(key)) byDate.set(key, []);
                byDate.get(key)!.push(e);
              }
              const sortedDates = Array.from(byDate.keys()).sort((a, b) => b.localeCompare(a));
              return sortedDates.map((date) => (
                <div key={date}>
                  <h2 className="mb-3 text-sm font-medium text-muted-foreground">{formatDate(date)}</h2>
                  <ul className="space-y-2">
                    {byDate.get(date)!.map((e) => {
                      const variant = ACTIVITY_VARIANTS[e.type] ?? { bg: 'bg-muted', text: 'text-muted-foreground', icon: FileText };
                      const Icon = variant.icon;
                      const href =
                        (e.type === 'client_invoice' || e.type === 'client_payment') && e.reference_id
                          ? `/finance?id=${e.reference_id}`
                          : e.type === 'vendor_payment' ? '/finance' : null;
                      return (
                        <li key={e.id}>
                          <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-border bg-card px-4 py-3">
                            <div className="flex items-center gap-3">
                              <span className={`flex h-9 w-9 items-center justify-center rounded-lg ${variant.bg} ${variant.text}`}>
                                <Icon className="h-4 w-4" />
                              </span>
                              <div>
                                <p className="font-medium">{ACTIVITY_TYPE_LABELS[e.type] ?? e.type}</p>
                                <p className="text-sm text-muted-foreground">{e.project_name}</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-4">
                              <span className="tabular-nums font-medium">{formatMoney(e.amount)}</span>
                              {href && (
                                <Link href={href} className="text-sm text-primary hover:underline">
                                  View
                                </Link>
                              )}
                            </div>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              ));
            })()
          )}
          <div className="border-t border-border pt-4">
            <Button asChild size="sm" variant="outline">
              <Link href="/activity">View all activity</Link>
            </Button>
          </div>
        </div>
      </Tabs.Content>
    </Tabs.Root>
  );
}

function ClientProfileTab({ client, onSuccess }: { client: ClientRow; onSuccess: () => void }) {
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
    <div className="glass-card p-6">
      <form onSubmit={handleSubmit} className="space-y-4 max-w-md">
        <div>
          <Label htmlFor="client_name">Name</Label>
          <Input id="client_name" value={name} onChange={(e) => setName(e.target.value)} required className="mt-1.5" />
        </div>
        <div>
          <Label htmlFor="client_company">Company</Label>
          <Input id="client_company" value={company} onChange={(e) => setCompany(e.target.value)} className="mt-1.5" />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="client_phone">Phone</Label>
            <Input id="client_phone" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} className="mt-1.5" />
          </div>
          <div>
            <Label htmlFor="client_email">Email</Label>
            <Input id="client_email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="mt-1.5" />
          </div>
        </div>
        <div>
          <Label htmlFor="client_gst">GST</Label>
          <Input id="client_gst" value={gst} onChange={(e) => setGst(e.target.value)} className="mt-1.5" />
        </div>
        {error && <p className="text-sm text-red-500">{error}</p>}
        <Button type="submit" size="sm" disabled={loading}>{loading ? 'Saving…' : 'Save changes'}</Button>
      </form>
    </div>
  );
}
