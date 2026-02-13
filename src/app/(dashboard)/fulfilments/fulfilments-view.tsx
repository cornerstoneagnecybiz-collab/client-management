'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { SlidePanel } from '@/components/ui/slide-panel';
import { ChevronRight } from 'lucide-react';
import { plannedProfit } from '@/types';
import type { RequirementRow } from '../requirements/page';
import { RequirementDetailPanel } from '../requirements/requirement-detail-panel';

const STATUS_LABELS: Record<string, string> = {
  pending: 'Pending',
  in_progress: 'In progress',
  fulfilled: 'Fulfilled',
  cancelled: 'Cancelled',
};

function formatMoney(n: number): string {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n);
}

interface FulfilmentsViewProps {
  initialRequirements: RequirementRow[];
  initialOpenId: string | null;
  vendorOptions: { value: string; label: string }[];
}

export function FulfilmentsView({
  initialRequirements,
  initialOpenId,
  vendorOptions,
}: FulfilmentsViewProps) {
  const router = useRouter();
  const [requirements, setRequirements] = useState(initialRequirements);
  const [detailId, setDetailId] = useState<string | null>(initialOpenId ?? null);

  useEffect(() => {
    setRequirements(initialRequirements);
  }, [initialRequirements]);

  useEffect(() => {
    if (initialOpenId) setDetailId(initialOpenId);
  }, [initialOpenId]);

  const selectedRequirement = detailId ? requirements.find((r) => r.id === detailId) : null;

  function refresh() {
    router.refresh();
  }

  function handleUpdateSuccess() {
    setDetailId(null);
    refresh();
  }

  return (
    <>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Fulfilments</h1>
          <p className="mt-1 text-muted-foreground">
            Pending and in-progress requirements to fulfil. Open one to update status or details.
          </p>
        </div>

        <div className="glass-card overflow-hidden">
          {requirements.length === 0 ? (
            <div className="p-12 text-center text-muted-foreground text-sm">
              No pending fulfilments. All requirements are either fulfilled or cancelled.
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
                          <span className="text-muted-foreground text-xs">—</span>
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
