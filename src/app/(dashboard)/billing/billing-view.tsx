'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { SlidePanel } from '@/components/ui/slide-panel';
import { ChevronRight, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { plannedProfit } from '@/types';
import type { InvoiceStatus, InvoiceType } from '@/types';
import type { RequirementRow } from '../requirements/page';
import { RequirementDetailPanel } from '../requirements/requirement-detail-panel';
import { NewInvoiceForm } from '../invoicing/new-invoice-form';
import { InvoiceDetailPanel, type InvoiceRow, type PaymentRow } from '../invoicing/invoice-detail-panel';
import { useDirtyConfirm } from '@/hooks/use-dirty-confirm';

export type LifecycleStage =
  | 'pending'
  | 'in_progress'
  | 'ready_to_invoice'
  | 'invoiced'
  | 'paid'
  | 'cancelled';

export interface PipelineRow {
  id: string;
  project_id: string;
  project_name: string;
  engagement_type: 'one_time' | 'monthly';
  service_name: string;
  service_category: string | null;
  pricing_type: string;
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
  vendor_unit_rate: number | null;
  fulfilment_status: string;
  created_at: string;
  stage: LifecycleStage;
  covering_invoice_id: string | null;
}

const STAGE_LABELS: Record<LifecycleStage, string> = {
  pending: 'Pending',
  in_progress: 'In progress',
  ready_to_invoice: 'Ready to invoice',
  invoiced: 'Invoiced',
  paid: 'Paid',
  cancelled: 'Cancelled',
};

const STAGE_BADGE: Record<LifecycleStage, string> = {
  pending: 'bg-muted text-muted-foreground',
  in_progress: 'bg-blue-500/10 text-blue-600 dark:text-blue-300',
  ready_to_invoice: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300',
  invoiced: 'bg-amber-500/10 text-amber-700 dark:text-amber-300',
  paid: 'bg-green-500/15 text-green-700 dark:text-green-300',
  cancelled: 'bg-muted text-muted-foreground/70 line-through',
};

const STAGE_ORDER: LifecycleStage[] = [
  'pending',
  'in_progress',
  'ready_to_invoice',
  'invoiced',
  'paid',
  'cancelled',
];

const STAGE_FILTERS: (LifecycleStage | 'all')[] = [
  'all',
  'pending',
  'in_progress',
  'ready_to_invoice',
  'invoiced',
  'paid',
  'cancelled',
];

const TYPE_LABELS: Record<InvoiceType, string> = {
  project: 'Project',
  milestone: 'Milestone',
  monthly: 'Monthly',
};

const INVOICE_STATUS_LABELS: Record<InvoiceStatus, string> = {
  draft: 'Draft',
  issued: 'Issued',
  paid: 'Paid',
  overdue: 'Overdue',
  cancelled: 'Cancelled',
};

function formatMoney(n: number): string {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n);
}

interface BillingViewProps {
  initialPipeline: PipelineRow[];
  initialInvoices: InvoiceRow[];
  paymentsByInvoiceId: Record<string, PaymentRow[]>;
  projectOptions: { value: string; label: string; engagement_type: 'one_time' | 'monthly' }[];
  vendorOptions: { value: string; label: string }[];
  initialOpenInvoiceId: string | null;
  initialCreateOpen: boolean;
  projectFilter: string | null;
  projectFilterLabel: string | null;
  vendorFilter: string | null;
  vendorFilterLabel: string | null;
  engagementFilter: string | null;
  invoiceTypeFilter: string | null;
  showCancelled: boolean;
  currentBillingMonth: string;
}

function billingQuery(params: {
  project?: string | null;
  vendor?: string | null;
  type?: string | null;
  invoiceType?: string | null;
  showCancelled?: boolean;
}) {
  const p = new URLSearchParams();
  if (params.project) p.set('project', params.project);
  if (params.vendor) p.set('vendor', params.vendor);
  if (params.type) p.set('type', params.type);
  if (params.invoiceType) p.set('invoiceType', params.invoiceType);
  if (params.showCancelled) p.set('showCancelled', '1');
  const q = p.toString();
  return q ? `/billing?${q}` : '/billing';
}

export function BillingView({
  initialPipeline,
  initialInvoices,
  paymentsByInvoiceId,
  projectOptions,
  vendorOptions,
  initialOpenInvoiceId,
  initialCreateOpen,
  projectFilter,
  projectFilterLabel,
  vendorFilter,
  vendorFilterLabel,
  engagementFilter,
  invoiceTypeFilter,
  showCancelled,
  currentBillingMonth,
}: BillingViewProps) {
  const router = useRouter();
  const [pipeline, setPipeline] = useState(initialPipeline);
  const [invoices, setInvoices] = useState(initialInvoices);
  const [stageFilter, setStageFilter] = useState<LifecycleStage | 'all'>('all');
  const [requirementDetailId, setRequirementDetailId] = useState<string | null>(null);
  const [invoiceDetailId, setInvoiceDetailId] = useState<string | null>(initialOpenInvoiceId);
  const [createOpen, setCreateOpen] = useState(initialCreateOpen);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkFromSelection, setBulkFromSelection] = useState<{
    projectId: string;
    requirementIds: string[];
    amount: number;
    type: InvoiceType;
    billingMonth: string | null;
  } | null>(null);

  useEffect(() => {
    setPipeline(initialPipeline);
  }, [initialPipeline]);
  useEffect(() => {
    setInvoices(initialInvoices);
  }, [initialInvoices]);
  useEffect(() => {
    if (initialOpenInvoiceId) setInvoiceDetailId(initialOpenInvoiceId);
  }, [initialOpenInvoiceId]);
  useEffect(() => {
    if (initialCreateOpen) setCreateOpen(true);
  }, [initialCreateOpen]);

  const visiblePipeline = useMemo(() => {
    const rows = stageFilter === 'all' ? pipeline : pipeline.filter((r) => r.stage === stageFilter);
    return rows.slice().sort((a, b) => {
      const sa = STAGE_ORDER.indexOf(a.stage);
      const sb = STAGE_ORDER.indexOf(b.stage);
      if (sa !== sb) return sa - sb;
      return (a.created_at < b.created_at ? 1 : -1);
    });
  }, [pipeline, stageFilter]);

  const stageCounts = useMemo(() => {
    const counts: Record<LifecycleStage, number> = {
      pending: 0,
      in_progress: 0,
      ready_to_invoice: 0,
      invoiced: 0,
      paid: 0,
      cancelled: 0,
    };
    for (const r of pipeline) counts[r.stage]++;
    return counts;
  }, [pipeline]);

  const selectionProjectId = useMemo(() => {
    if (selectedIds.size === 0) return null;
    const firstId = selectedIds.values().next().value as string;
    return pipeline.find((r) => r.id === firstId)?.project_id ?? null;
  }, [selectedIds, pipeline]);

  const selectedRequirement = requirementDetailId ? pipeline.find((r) => r.id === requirementDetailId) ?? null : null;
  const selectedInvoice = invoiceDetailId ? invoices.find((i) => i.id === invoiceDetailId) ?? null : null;
  const selectedInvoicePayments = selectedInvoice ? paymentsByInvoiceId[selectedInvoice.id] ?? [] : [];

  const newInvoiceDirty = useDirtyConfirm(() => {
    setCreateOpen(false);
    setBulkFromSelection(null);
  });

  function refresh() {
    router.refresh();
  }

  function toggleRowSelection(row: PipelineRow) {
    if (row.stage !== 'ready_to_invoice') return;
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(row.id)) {
        next.delete(row.id);
      } else {
        // Scope selection to a single project.
        if (selectionProjectId && selectionProjectId !== row.project_id) return prev;
        next.add(row.id);
      }
      return next;
    });
  }

  function handleRowClick(row: PipelineRow) {
    if (row.stage === 'invoiced' || row.stage === 'paid') {
      if (row.covering_invoice_id) setInvoiceDetailId(row.covering_invoice_id);
      else setRequirementDetailId(row.id);
      return;
    }
    setRequirementDetailId(row.id);
  }

  function handleBulkInvoice() {
    if (selectedIds.size === 0 || !selectionProjectId) return;
    const selectedRows = pipeline.filter((r) => selectedIds.has(r.id));
    const project = projectOptions.find((p) => p.value === selectionProjectId);
    const isMonthly = project?.engagement_type === 'monthly';
    const totalAmount = selectedRows.reduce((sum, r) => sum + (r.client_price ?? 0), 0);
    setBulkFromSelection({
      projectId: selectionProjectId,
      requirementIds: Array.from(selectedIds),
      amount: totalAmount,
      type: isMonthly ? 'monthly' : 'project',
      billingMonth: isMonthly ? currentBillingMonth : null,
    });
    setCreateOpen(true);
  }

  const hasActiveFilter = !!(projectFilter || vendorFilter || engagementFilter || invoiceTypeFilter);

  return (
    <>
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Billing</h1>
            <p className="mt-1 text-muted-foreground">
              {projectFilterLabel
                ? `Pipeline and invoices for ${projectFilterLabel}`
                : vendorFilterLabel
                  ? `Pipeline and invoices involving ${vendorFilterLabel}`
                  : 'Track requirements from fulfilment through billing and payment.'}
            </p>
          </div>
          <Button onClick={() => { setBulkFromSelection(null); setCreateOpen(true); }}>
            <Plus className="h-4 w-4" />
            New invoice
          </Button>
        </div>

        {/* Filters row: scope (server-side) */}
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <span className="text-muted-foreground">Engagement:</span>
          <Link href={billingQuery({ project: projectFilter, vendor: vendorFilter, invoiceType: invoiceTypeFilter, showCancelled })}
            className={chipCls(!engagementFilter)}>All</Link>
          <Link href={billingQuery({ project: projectFilter, vendor: vendorFilter, type: 'one_time', invoiceType: invoiceTypeFilter, showCancelled })}
            className={chipCls(engagementFilter === 'one_time')}>One-time</Link>
          <Link href={billingQuery({ project: projectFilter, vendor: vendorFilter, type: 'monthly', invoiceType: invoiceTypeFilter, showCancelled })}
            className={chipCls(engagementFilter === 'monthly')}>Monthly</Link>
          {(projectFilter || vendorFilter || engagementFilter) && (
            <Link href={billingQuery({ invoiceType: invoiceTypeFilter, showCancelled })}
              className="ml-2 text-xs text-muted-foreground underline underline-offset-2 hover:text-foreground">
              Clear pipeline filters
            </Link>
          )}
        </div>

        {/* Pipeline section */}
        <section className="glass-card overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-4 py-3">
            <h2 className="font-medium">Pipeline</h2>
            <div className="flex flex-wrap items-center gap-1.5">
              {STAGE_FILTERS.map((s) => {
                const active = stageFilter === s;
                const count = s === 'all' ? pipeline.length : stageCounts[s as LifecycleStage];
                const label = s === 'all' ? 'All' : STAGE_LABELS[s as LifecycleStage];
                return (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setStageFilter(s)}
                    className={cn(
                      'rounded-lg px-2.5 py-1 text-xs font-medium transition-colors',
                      active ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-muted/80',
                    )}
                  >
                    {label}
                    <span className={cn('ml-1.5 tabular-nums', active ? 'opacity-90' : 'opacity-60')}>{count}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {selectedIds.size > 0 && (
            <div className="flex items-center justify-between gap-3 border-b border-primary/20 bg-primary/5 px-4 py-2 text-sm">
              <span>
                {selectedIds.size} selected
                {selectionProjectId && projectOptions.find((p) => p.value === selectionProjectId) && (
                  <span className="text-muted-foreground"> · {projectOptions.find((p) => p.value === selectionProjectId)!.label}</span>
                )}
              </span>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={() => setSelectedIds(new Set())}>Clear</Button>
                <Button size="sm" onClick={handleBulkInvoice}>
                  Create invoice from selected ({selectedIds.size})
                </Button>
              </div>
            </div>
          )}

          {visiblePipeline.length === 0 ? (
            <div className="p-12 text-center text-sm text-muted-foreground">
              {pipeline.length === 0
                ? 'No requirements yet. Create one from a project.'
                : 'No requirements match the current stage filter.'}
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="content-cell w-10 px-2">
                    <span className="sr-only">Select</span>
                  </th>
                  <th className="content-cell text-left font-medium px-4">Service</th>
                  <th className="content-cell text-left font-medium px-4">Project</th>
                  <th className="content-cell text-left font-medium px-4">Vendor</th>
                  <th className="content-cell text-right font-medium px-4">Client price</th>
                  <th className="content-cell text-right font-medium px-4">Vendor cost</th>
                  <th className="content-cell text-right font-medium px-4">Planned profit</th>
                  <th className="content-cell text-left font-medium px-4">Stage</th>
                  <th className="content-cell w-10 px-2" aria-hidden />
                </tr>
              </thead>
              <tbody>
                {visiblePipeline.map((row, index) => {
                  const profit = plannedProfit(row.client_price, row.expected_vendor_cost);
                  const canSelect = row.stage === 'ready_to_invoice';
                  const selected = selectedIds.has(row.id);
                  const differentProjectBlocks =
                    canSelect && selectionProjectId != null && selectionProjectId !== row.project_id && !selected;
                  const titleDifferent = row.title.trim() !== '' && row.title !== row.service_name;
                  return (
                    <tr
                      key={row.id}
                      className={cn(
                        'border-b border-border/50 transition-colors',
                        index % 2 === 1 ? 'bg-muted/10' : '',
                        differentProjectBlocks ? 'opacity-50' : 'hover:bg-muted/30 cursor-pointer',
                      )}
                      onClick={(e) => {
                        if ((e.target as HTMLElement).closest('input[type="checkbox"]')) return;
                        if (differentProjectBlocks) return;
                        handleRowClick(row);
                      }}
                      role="button"
                      tabIndex={differentProjectBlocks ? -1 : 0}
                      onKeyDown={(e) => {
                        if (differentProjectBlocks) return;
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          handleRowClick(row);
                        }
                      }}
                    >
                      <td className="content-cell px-2">
                        {canSelect ? (
                          <input
                            type="checkbox"
                            checked={selected}
                            disabled={differentProjectBlocks}
                            onChange={(e) => {
                              e.stopPropagation();
                              toggleRowSelection(row);
                            }}
                            onClick={(e) => e.stopPropagation()}
                            aria-label={differentProjectBlocks ? 'Select rows from one project at a time' : `Select ${row.service_name}`}
                            title={differentProjectBlocks ? 'Select rows from one project at a time.' : undefined}
                            className="h-4 w-4 cursor-pointer accent-primary"
                          />
                        ) : null}
                      </td>
                      <td className="content-cell px-4">
                        <span className="font-medium">{row.service_name}</span>
                        {titleDifferent && (
                          <span className="block text-xs text-muted-foreground truncate max-w-[220px]" title={row.title}>
                            {row.title}
                          </span>
                        )}
                        {row.engagement_type === 'one_time' && (row.quantity != null || row.period_days != null) && (
                          <span className="block text-xs text-muted-foreground">
                            {[
                              row.quantity != null && row.quantity > 0 ? `Qty ${row.quantity}` : null,
                              row.period_days != null && row.period_days > 0 ? `${row.period_days} days` : null,
                            ]
                              .filter(Boolean)
                              .join(' × ')}
                          </span>
                        )}
                      </td>
                      <td className="content-cell px-4 text-muted-foreground">{row.project_name}</td>
                      <td className="content-cell px-4">
                        {row.delivery === 'in_house' ? (
                          <span className="text-xs text-muted-foreground">In-house</span>
                        ) : row.vendor_name ? (
                          <span className="text-muted-foreground">{row.vendor_name}</span>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
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
                        <span className={cn('inline-flex items-center rounded-lg px-2 py-0.5 text-xs font-medium', STAGE_BADGE[row.stage])}>
                          {STAGE_LABELS[row.stage]}
                        </span>
                      </td>
                      <td className="content-cell px-2 text-muted-foreground">
                        <ChevronRight className="h-4 w-4 shrink-0" aria-hidden />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </section>

        {/* Invoices section */}
        <section className="glass-card overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-4 py-3">
            <h2 className="font-medium">Invoices</h2>
            <div className="flex flex-wrap items-center gap-2 text-sm">
              <span className="text-muted-foreground">Type:</span>
              <Link href={billingQuery({ project: projectFilter, vendor: vendorFilter, type: engagementFilter, showCancelled })}
                className={chipCls(!invoiceTypeFilter)}>All</Link>
              <Link href={billingQuery({ project: projectFilter, vendor: vendorFilter, type: engagementFilter, invoiceType: 'monthly', showCancelled })}
                className={chipCls(invoiceTypeFilter === 'monthly')}>Monthly</Link>
              <Link href={billingQuery({ project: projectFilter, vendor: vendorFilter, type: engagementFilter, invoiceType: 'project', showCancelled })}
                className={chipCls(invoiceTypeFilter === 'project')}>Project &amp; milestone</Link>
              <span className="ml-2 border-l border-border pl-2 text-muted-foreground">Cancelled:</span>
              <Link href={billingQuery({ project: projectFilter, vendor: vendorFilter, type: engagementFilter, invoiceType: invoiceTypeFilter, showCancelled: !showCancelled })}
                className={chipCls(showCancelled)}>
                {showCancelled ? 'Hide cancelled' : 'Show cancelled'}
              </Link>
            </div>
          </div>
          {invoices.length === 0 ? (
            <div className="p-12 text-center text-sm text-muted-foreground">
              No invoices yet. Create one for a project.
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="content-cell text-left font-medium px-4">Project</th>
                  <th className="content-cell text-left font-medium px-4">Type</th>
                  <th className="content-cell text-right font-medium px-4">Amount</th>
                  <th className="content-cell text-left font-medium px-4">Status</th>
                  <th className="content-cell text-left font-medium px-4">Due date</th>
                  <th className="content-cell w-10 px-2" aria-hidden />
                </tr>
              </thead>
              <tbody>
                {invoices.map((row, index) => (
                  <tr
                    key={row.id}
                    role="button"
                    tabIndex={0}
                    className={cn(
                      'border-b border-border/50 hover:bg-muted/30 transition-colors cursor-pointer',
                      index % 2 === 1 ? 'bg-muted/10' : '',
                    )}
                    onClick={() => setInvoiceDetailId(row.id)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        setInvoiceDetailId(row.id);
                      }
                    }}
                  >
                    <td className="content-cell px-4 font-medium">{row.project_name}</td>
                    <td className="content-cell px-4 text-muted-foreground">{TYPE_LABELS[row.type]}</td>
                    <td className="content-cell px-4 text-right tabular-nums">{formatMoney(row.amount)}</td>
                    <td className="content-cell px-4">
                      <span className="inline-flex items-center rounded-lg px-2 py-0.5 text-xs font-medium bg-muted text-muted-foreground">
                        {INVOICE_STATUS_LABELS[row.status]}
                      </span>
                    </td>
                    <td className="content-cell px-4 text-muted-foreground">
                      {row.due_date ? new Date(row.due_date).toLocaleDateString('en-US') : '—'}
                    </td>
                    <td className="content-cell px-2 text-muted-foreground">
                      <ChevronRight className="h-4 w-4 shrink-0" aria-hidden />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>
      </div>

      <SlidePanel
        open={!!selectedRequirement}
        onOpenChange={(open) => !open && setRequirementDetailId(null)}
        title={selectedRequirement ? selectedRequirement.title || selectedRequirement.service_name : 'Requirement'}
      >
        {selectedRequirement && (
          <RequirementDetailPanel
            requirement={selectedRequirement as unknown as RequirementRow}
            vendorOptions={vendorOptions}
            onSuccess={() => { setRequirementDetailId(null); refresh(); }}
            onClose={() => setRequirementDetailId(null)}
          />
        )}
      </SlidePanel>

      <SlidePanel
        open={!!selectedInvoice}
        onOpenChange={(open) => !open && setInvoiceDetailId(null)}
        title={selectedInvoice ? `${TYPE_LABELS[selectedInvoice.type]} invoice` : 'Invoice'}
      >
        {selectedInvoice && (
          <InvoiceDetailPanel
            invoice={selectedInvoice}
            payments={selectedInvoicePayments}
            onSuccess={() => { setInvoiceDetailId(null); refresh(); }}
            onClose={() => setInvoiceDetailId(null)}
          />
        )}
      </SlidePanel>

      <SlidePanel
        open={createOpen}
        onOpenChange={newInvoiceDirty.handleOpenChange}
        title={bulkFromSelection ? 'Invoice from selected' : 'New invoice'}
        description={bulkFromSelection
          ? `${bulkFromSelection.requirementIds.length} requirement${bulkFromSelection.requirementIds.length !== 1 ? 's' : ''} attached.`
          : 'Bill a client for a project or milestone.'}
        variant="form"
      >
        <NewInvoiceForm
          projectOptions={projectOptions}
          defaultProjectId={bulkFromSelection?.projectId ?? projectFilter ?? ''}
          onDirtyChange={newInvoiceDirty.setDirty}
          onSuccess={() => {
            newInvoiceDirty.closeConfirmed();
            setBulkFromSelection(null);
            setSelectedIds(new Set());
            refresh();
          }}
          onCancel={() => newInvoiceDirty.handleOpenChange(false)}
          preselectedRequirementIds={bulkFromSelection?.requirementIds}
          preselectedAmount={bulkFromSelection?.amount}
          preselectedType={bulkFromSelection?.type}
          preselectedBillingMonth={bulkFromSelection?.billingMonth ?? undefined}
        />
      </SlidePanel>
    </>
  );
}

function chipCls(active: boolean): string {
  return cn(
    'rounded-lg px-3 py-1.5 text-sm font-medium transition-colors',
    active ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-muted/80',
  );
}
