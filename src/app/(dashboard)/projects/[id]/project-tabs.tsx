'use client';

import { useRouter } from 'next/navigation';
import * as Tabs from '@radix-ui/react-tabs';
import Link from 'next/link';
import type { ProjectStatus } from '@/types';
import { plannedProfit } from '@/types';
import {
  LayoutDashboard,
  ClipboardList,
  Truck,
  FileText,
  BookOpen,
  FolderOpen,
  Activity,
  Plus,
  ChevronRight,
  MessageSquare,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { updateProjectStatus, deleteProject } from '../actions';
import { ProjectInvoicesTab } from './project-invoices-tab';
import { ProjectLedgerTab } from './project-ledger-tab';
import { ProjectActivityTab, type ActivityItem } from './project-activity-tab';
import { ProjectNotesTab } from './project-notes-tab';
import { ProjectDocumentsTab } from './project-documents-tab';
import type { InvoiceRow } from '@/app/(dashboard)/finance/page';
import type { PaymentRow } from '@/app/(dashboard)/finance/invoice-detail-panel';
import type { LedgerEntryRow } from '@/app/(dashboard)/ledger/page';
import type { ProjectNote } from '@/types/database';
import type { ProjectDocument } from '@/types/database';

const STATUS_LABELS: Record<ProjectStatus, string> = {
  draft: 'Draft',
  active: 'Active',
  on_hold: 'On hold',
  completed: 'Completed',
  cancelled: 'Cancelled',
};

const FULFILMENT_LABELS: Record<string, string> = {
  pending: 'Pending',
  in_progress: 'In progress',
  fulfilled: 'Fulfilled',
  cancelled: 'Cancelled',
};

interface ProjectRequirementRow {
  id: string;
  project_id: string;
  project_name: string;
  engagement_type?: 'one_time' | 'monthly';
  service_catalog_id: string;
  service_name: string;
  service_code: string;
  title: string;
  description: string | null;
  delivery: string;
  assigned_vendor_id: string | null;
  vendor_name: string | null;
  client_price: number | null;
  expected_vendor_cost: number | null;
  quantity: number | null;
  period_days: number | null;
  unit_rate: number | null;
  fulfilment_status: string;
  created_at: string;
}

interface ProjectTabsProps {
  projectId: string;
  projectName: string;
  overview: {
    clientName: string;
    engagementType?: 'one_time' | 'monthly';
    status: ProjectStatus;
    startDate: string | null;
    endDate: string | null;
    createdAt: string;
    plannedProfit: number | null;
    actualProfit: number | null;
  };
  projectRequirements: ProjectRequirementRow[];
  projectInvoices: InvoiceRow[];
  projectPaymentsByInvoiceId: Record<string, PaymentRow[]>;
  projectLedgerEntries: LedgerEntryRow[];
  projectActivity: ActivityItem[];
  projectNotes: Pick<ProjectNote, 'id' | 'content' | 'created_at' | 'updated_at'>[];
  projectDocuments: ProjectDocument[];
  projectVendors: { id: string; name: string }[];
}

function formatMoney(n: number): string {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n);
}

export function ProjectTabs({
  projectId,
  projectName,
  overview,
  projectRequirements,
  projectInvoices,
  projectPaymentsByInvoiceId,
  projectLedgerEntries,
  projectActivity,
  projectNotes,
  projectDocuments,
  projectVendors,
}: ProjectTabsProps) {
  const router = useRouter();
  const canDeleteProject = projectInvoices.length === 0;

  return (
    <Tabs.Root defaultValue="overview" className="space-y-4">
      <Tabs.List className="flex gap-1 rounded-xl border border-border bg-muted/30 p-1 w-fit">
        {[
          { value: 'overview', label: 'Overview', icon: LayoutDashboard },
          { value: 'requirements', label: 'Requirements', icon: ClipboardList },
          { value: 'vendors', label: 'Vendors', icon: Truck },
          { value: 'invoices', label: 'Invoices', icon: FileText },
          { value: 'ledger', label: 'Ledger', icon: BookOpen },
          { value: 'notes', label: 'Notes', icon: MessageSquare },
          { value: 'documents', label: 'Documents', icon: FolderOpen },
          { value: 'activity', label: 'Activity', icon: Activity },
        ].map(({ value, label, icon: Icon }) => (
          <Tabs.Trigger
            key={value}
            value={value}
            className="flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium text-muted-foreground data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm transition-colors"
          >
            <Icon className="h-4 w-4" />
            {label}
          </Tabs.Trigger>
        ))}
      </Tabs.List>

      <Tabs.Content value="overview" className="outline-none">
        <div className="glass-card p-6 space-y-6">
          <section>
            <h2 className="text-sm font-medium text-muted-foreground mb-2">Summary</h2>
            <dl className="grid gap-3 sm:grid-cols-2">
              <div>
                <dt className="text-xs text-muted-foreground">Client</dt>
                <dd className="font-medium">{overview.clientName}</dd>
              </div>
              {overview.engagementType && (
                <div>
                  <dt className="text-xs text-muted-foreground">Engagement</dt>
                  <dd className="font-medium">{overview.engagementType === 'monthly' ? 'Monthly retainer' : 'One-time project'}</dd>
                </div>
              )}
              <div>
                <dt className="text-xs text-muted-foreground">Status</dt>
                <dd>
                  <span className="inline-flex items-center rounded-lg px-2 py-0.5 text-xs font-medium bg-muted">
                    {STATUS_LABELS[overview.status]}
                  </span>
                </dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">Start date</dt>
                <dd className="font-medium">
                  {overview.startDate ? new Date(overview.startDate).toLocaleDateString('en-US') : '—'}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">Expected end date</dt>
                <dd className="font-medium">
                  {overview.endDate ? new Date(overview.endDate).toLocaleDateString('en-US') : '—'}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">Created</dt>
                <dd className="font-medium">
                  {new Date(overview.createdAt).toLocaleDateString('en-US')}
                </dd>
              </div>
            </dl>
          </section>
          <section>
            <h2 className="text-sm font-medium text-muted-foreground mb-2">Financial summary</h2>
            <dl className="grid gap-3 sm:grid-cols-3">
              <div>
                <dt className="text-xs text-muted-foreground">Planned profit</dt>
                <dd className="font-medium tabular-nums">
                  {overview.plannedProfit != null ? formatMoney(overview.plannedProfit) : '—'}
                </dd>
                <dd className="text-xs text-muted-foreground">From requirements (client price − vendor cost)</dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">Actual profit</dt>
                <dd className="font-medium tabular-nums">
                  {overview.actualProfit != null ? formatMoney(overview.actualProfit) : '—'}
                </dd>
                <dd className="text-xs text-muted-foreground">From ledger (received − paid)</dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">Variance</dt>
                <dd className={`font-medium tabular-nums ${overview.plannedProfit != null && overview.actualProfit != null ? (overview.plannedProfit - overview.actualProfit >= 0 ? 'text-muted-foreground' : 'text-rose-600 dark:text-rose-400') : ''}`}>
                  {overview.plannedProfit != null && overview.actualProfit != null
                    ? formatMoney(overview.plannedProfit - overview.actualProfit)
                    : '—'}
                </dd>
                <dd className="text-xs text-muted-foreground">Planned − actual</dd>
              </div>
            </dl>
          </section>
          {projectRequirements.length === 0 && (
            <section className="rounded-lg border border-dashed border-border bg-muted/10 p-4 text-center">
              <p className="text-sm text-muted-foreground mb-2">No requirements yet.</p>
              <Button asChild size="sm" variant="outline">
                <Link href={`/requirements?project=${projectId}&new=1`}>Add first requirement</Link>
              </Button>
            </section>
          )}
          <section className="border-t border-border pt-4 flex flex-wrap gap-2">
            {overview.status !== 'cancelled' && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={async () => {
                  if (!confirm('Cancel this project? Status will be set to Cancelled. You can still view it.')) return;
                  const result = await updateProjectStatus(projectId, 'cancelled');
                  if (!result.error) router.refresh();
                }}
              >
                Cancel project
              </Button>
            )}
            {canDeleteProject && (
              <Button
                type="button"
                variant="destructive"
                size="sm"
                onClick={async () => {
                  if (!confirm('Permanently delete this project? Requirements will be removed. This cannot be undone.')) return;
                  const result = await deleteProject(projectId);
                  if (result.error) {
                    alert(result.error);
                    return;
                  }
                  router.push('/projects');
                }}
              >
                Delete project
              </Button>
            )}
          </section>
        </div>
      </Tabs.Content>

      <Tabs.Content value="requirements" className="outline-none">
        <div className="glass-card overflow-hidden">
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <h2 className="font-medium">Requirements</h2>
            <Button asChild size="sm">
              <Link href={`/requirements?project=${projectId}&new=1`}>
                <Plus className="h-4 w-4" />
                Add requirement
              </Link>
            </Button>
          </div>
          {projectRequirements.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground text-sm">
              No requirements yet. <Link href={`/requirements?project=${projectId}&new=1`} className="text-primary hover:underline">Add one</Link>.
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="content-cell text-left font-medium px-4">Service</th>
                  <th className="content-cell text-left font-medium px-4">Vendor</th>
                  <th className="content-cell text-right font-medium px-4">Client price</th>
                  <th className="content-cell text-right font-medium px-4">Vendor cost</th>
                  <th className="content-cell text-right font-medium px-4">Planned profit</th>
                  <th className="content-cell text-left font-medium px-4">Status</th>
                </tr>
              </thead>
              <tbody>
                {projectRequirements.map((row) => {
                  const profit = plannedProfit(row.client_price, row.expected_vendor_cost);
                  return (
                    <tr key={row.id} className="border-b border-border/50 hover:bg-muted/30">
                      <td className="content-cell px-4">
                        <Link href={`/requirements?id=${row.id}`} className="font-medium text-primary hover:underline">
                          {row.service_name}
                        </Link>
                        {row.title !== row.service_name && (
                          <span className="text-muted-foreground block text-xs">{row.title}</span>
                        )}
                        {row.engagement_type === 'one_time' && (row.quantity != null || row.period_days != null) && (
                          <span className="text-muted-foreground block text-xs">
                            {[row.quantity != null && row.quantity > 0 ? `Qty ${row.quantity}` : null, row.period_days != null && row.period_days > 0 ? `${row.period_days} days` : null].filter(Boolean).join(' × ')}
                          </span>
                        )}
                      </td>
                      <td className="content-cell px-4 text-muted-foreground">
                        {row.delivery === 'in_house' ? 'In-house' : (row.vendor_name ?? '—')}
                      </td>
                      <td className="content-cell px-4 text-right tabular-nums">
                        {row.client_price != null ? formatMoney(row.client_price) : '—'}
                      </td>
                      <td className="content-cell px-4 text-right tabular-nums">
                        {row.expected_vendor_cost != null ? formatMoney(row.expected_vendor_cost) : '—'}
                      </td>
                      <td className="content-cell px-4 text-right tabular-nums">
                        {profit != null ? formatMoney(profit) : '—'}
                      </td>
                      <td className="content-cell px-4">
                        <span className="inline-flex items-center rounded-lg px-2 py-0.5 text-xs font-medium bg-muted text-muted-foreground">
                          {FULFILMENT_LABELS[row.fulfilment_status] ?? row.fulfilment_status}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </Tabs.Content>

      <Tabs.Content value="invoices" className="outline-none">
        <ProjectInvoicesTab
          projectId={projectId}
          projectName={projectName}
          invoices={projectInvoices}
          paymentsByInvoiceId={projectPaymentsByInvoiceId}
        />
      </Tabs.Content>

      <Tabs.Content value="ledger" className="outline-none">
        <ProjectLedgerTab
          projectId={projectId}
          projectName={projectName}
          entries={projectLedgerEntries}
        />
      </Tabs.Content>

      <Tabs.Content value="vendors" className="outline-none">
        <div className="glass-card p-12 text-center">
          <Truck className="mx-auto h-12 w-12 text-muted-foreground/50" />
          <p className="mt-3 text-sm font-medium text-foreground">Vendors on this project</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Vendors assigned to requirements in this project will appear here.
          </p>
          <Link
            href={`/requirements?project=${projectId}&new=1`}
            className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
          >
            Add requirement <ChevronRight className="h-4 w-4" />
          </Link>
        </div>
      </Tabs.Content>

      <Tabs.Content value="notes" className="outline-none">
        <ProjectNotesTab
          projectId={projectId}
          notes={projectNotes}
          requirements={projectRequirements.map((r) => ({ id: r.id, service_name: r.service_name, title: r.title }))}
          vendors={projectVendors}
        />
      </Tabs.Content>

      <Tabs.Content value="documents" className="outline-none">
        <ProjectDocumentsTab
          projectId={projectId}
          documents={projectDocuments}
        />
      </Tabs.Content>

      <Tabs.Content value="activity" className="outline-none">
        <ProjectActivityTab activity={projectActivity} projectName={projectName} />
      </Tabs.Content>
    </Tabs.Root>
  );
}
