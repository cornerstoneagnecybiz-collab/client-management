'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { SlidePanel } from '@/components/ui/slide-panel';
import { Plus, ChevronRight } from 'lucide-react';
import { plannedProfit } from '@/types';
import type { FulfilmentStatus } from '@/types';
import type { RequirementRow } from './page';
import { createRequirement, updateRequirement } from './actions';
import { RequirementDetailPanel } from './requirement-detail-panel';
import { NewRequirementForm, type ServiceOption } from './new-requirement-form';

const STATUS_LABELS: Record<string, string> = {
  pending: 'Pending',
  in_progress: 'In progress',
  fulfilled: 'Fulfilled',
  cancelled: 'Cancelled',
};

function requirementsQuery(project?: string | null, type?: string | null) {
  const p = new URLSearchParams();
  if (project) p.set('project', project);
  if (type) p.set('type', type);
  const q = p.toString();
  return q ? `/requirements?${q}` : '/requirements';
}

interface RequirementsViewProps {
  initialRequirements: RequirementRow[];
  initialOpenId?: string | null;
  initialProjectId?: string | null;
  initialCreateOpen?: boolean;
  projectOptions: { value: string; label: string }[];
  serviceOptions: ServiceOption[];
  vendorOptions: { value: string; label: string }[];
  title: string;
  description: string;
  engagementFilter?: string | null;
}

export function RequirementsView({
  initialRequirements,
  initialOpenId,
  initialProjectId,
  initialCreateOpen,
  projectOptions,
  serviceOptions,
  vendorOptions,
  title,
  description,
  engagementFilter,
}: RequirementsViewProps) {
  const router = useRouter();
  const [requirements, setRequirements] = useState(initialRequirements);
  const [createOpen, setCreateOpen] = useState(!!initialCreateOpen);
  const [detailId, setDetailId] = useState<string | null>(initialOpenId ?? null);

  useEffect(() => {
    setRequirements(initialRequirements);
  }, [initialRequirements]);

  useEffect(() => {
    if (initialOpenId) setDetailId(initialOpenId);
  }, [initialOpenId]);

  useEffect(() => {
    if (initialCreateOpen) setCreateOpen(true);
  }, [initialCreateOpen]);

  const selectedRequirement = detailId ? requirements.find((r) => r.id === detailId) : null;

  function refresh() {
    router.refresh();
  }

  async function handleCreateSuccess() {
    setCreateOpen(false);
    refresh();
  }

  async function handleUpdateSuccess() {
    setDetailId(null);
    refresh();
  }

  return (
    <>
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
            <p className="text-muted-foreground mt-1">{description}</p>
          </div>
          <Button onClick={() => setCreateOpen(true)}>
            <Plus className="h-4 w-4" />
            New requirement
          </Button>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm text-muted-foreground">Project type:</span>
          <Link href={requirementsQuery(initialProjectId, null)} className={`rounded-lg px-3 py-1.5 text-sm font-medium ${!engagementFilter ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-muted/80'}`}>
            All
          </Link>
          <Link href={requirementsQuery(initialProjectId, 'one_time')} className={`rounded-lg px-3 py-1.5 text-sm font-medium ${engagementFilter === 'one_time' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-muted/80'}`}>
            One-time
          </Link>
          <Link href={requirementsQuery(initialProjectId, 'monthly')} className={`rounded-lg px-3 py-1.5 text-sm font-medium ${engagementFilter === 'monthly' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-muted/80'}`}>
            Monthly
          </Link>
        </div>

        <div className="glass-card overflow-hidden">
          {requirements.length === 0 ? (
            <div className="p-12 text-center text-muted-foreground text-sm">
              No requirements yet. Create one from a project or here.
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="content-cell text-left font-medium px-4">Catalog item</th>
                  <th className="content-cell text-left font-medium px-4">Project</th>
                  <th className="content-cell text-left font-medium px-4">Vendor</th>
                  <th className="content-cell text-right font-medium px-4">Client price</th>
                  <th className="content-cell text-right font-medium px-4">Vendor cost</th>
                  <th className="content-cell text-right font-medium px-4">Planned profit</th>
                  <th className="content-cell text-left font-medium px-4">Status</th>
                  <th className="content-cell w-10 px-2" aria-hidden />
                </tr>
              </thead>
              <tbody>
                {requirements.map((row, index) => {
                  const profit = plannedProfit(row.client_price, row.expected_vendor_cost);
                  const hasVendor = !!row.vendor_name;
                  const titleDifferent = row.title.trim() !== '' && row.title !== row.service_name;
                  return (
                    <tr
                      key={row.id}
                      role="button"
                      tabIndex={0}
                      className={`border-b border-border/50 hover:bg-muted/30 transition-colors cursor-pointer ${index % 2 === 1 ? 'bg-muted/10' : ''}`}
                      onClick={() => setDetailId(row.id)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          setDetailId(row.id);
                        }
                      }}
                    >
                      <td className="content-cell px-4">
                        <span className="font-medium">{row.service_name}</span>
                        {titleDifferent && (
                          <span className="text-muted-foreground block text-xs truncate max-w-[200px]" title={row.title}>
                            {row.title}
                          </span>
                        )}
                        {row.engagement_type === 'one_time' && (row.quantity != null || row.period_days != null) && (
                          <span className="text-muted-foreground block text-xs">
                            {[row.quantity != null && row.quantity > 0 ? `Qty ${row.quantity}` : null, row.period_days != null && row.period_days > 0 ? `${row.period_days} days` : null].filter(Boolean).join(' × ')}
                          </span>
                        )}
                      </td>
                      <td className="content-cell px-4 text-muted-foreground">{row.project_name}</td>
                      <td className="content-cell px-4">
                        {row.delivery === 'in_house' ? (
                          <span className="text-muted-foreground text-xs">In-house</span>
                        ) : hasVendor ? (
                          <span className="text-muted-foreground">{row.vendor_name}</span>
                        ) : (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setDetailId(row.id);
                            }}
                            className="text-primary text-sm font-medium hover:underline focus:outline-none focus:underline"
                          >
                            Assign vendor
                          </button>
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
                      <span className="inline-flex items-center rounded-lg px-2 py-0.5 text-xs font-medium bg-muted text-muted-foreground">
                        {STATUS_LABELS[row.fulfilment_status] ?? row.fulfilment_status}
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
        </div>
      </div>

      <SlidePanel open={createOpen} onOpenChange={setCreateOpen} title="New requirement">
        <NewRequirementForm
          projectOptions={projectOptions}
          serviceOptions={serviceOptions}
          vendorOptions={vendorOptions}
          defaultProjectId={initialProjectId ?? undefined}
          onSuccess={handleCreateSuccess}
          onCancel={() => setCreateOpen(false)}
        />
      </SlidePanel>

      <SlidePanel
        open={!!selectedRequirement}
        onOpenChange={(open) => !open && setDetailId(null)}
        title={selectedRequirement ? selectedRequirement.title : 'Requirement'}
      >
        {selectedRequirement && (
          <RequirementDetailPanel
            requirement={selectedRequirement}
            vendorOptions={vendorOptions}
            onSuccess={handleUpdateSuccess}
            onClose={() => setDetailId(null)}
          />
        )}
      </SlidePanel>
    </>
  );
}

function formatMoney(n: number): string {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n);
}
