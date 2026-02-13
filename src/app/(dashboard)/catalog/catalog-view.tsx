'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { SlidePanel } from '@/components/ui/slide-panel';
import { Plus, ChevronRight, Layers, Package, Wrench, MessageSquare } from 'lucide-react';
import { NewServiceForm } from './new-service-form';
import { BulkAddServicesForm } from './bulk-add-services-form';
import { ServiceDetailPanel, type ServiceRow } from './service-detail-panel';
import type { CatalogType } from '@/types/database';

function formatMoney(n: number): string {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n);
}

const TABS: { value: 'all' | CatalogType; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { value: 'all', label: 'All', icon: Layers },
  { value: 'goods', label: 'Goods', icon: Package },
  { value: 'services', label: 'Services', icon: Wrench },
  { value: 'consulting', label: 'Consulting', icon: MessageSquare },
];

interface CatalogViewProps {
  initialServices: ServiceRow[];
  vendorOptions: { value: string; label: string }[];
  initialOpenId?: string | null;
  initialCreateOpen?: boolean;
  initialTab?: 'all' | CatalogType;
}

export function CatalogView({
  initialServices,
  vendorOptions,
  initialOpenId,
  initialCreateOpen = false,
  initialTab = 'all',
}: CatalogViewProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [services, setServices] = useState(initialServices);
  const [createOpen, setCreateOpen] = useState(initialCreateOpen);
  const [bulkOpen, setBulkOpen] = useState(false);
  const [detailId, setDetailId] = useState<string | null>(initialOpenId ?? null);
  const [tab, setTab] = useState<'all' | CatalogType>(initialTab);

  useEffect(() => {
    setServices(initialServices);
  }, [initialServices]);

  useEffect(() => {
    setTab(initialTab);
  }, [initialTab]);

  useEffect(() => {
    if (initialOpenId) setDetailId(initialOpenId);
  }, [initialOpenId]);

  useEffect(() => {
    if (initialCreateOpen) setCreateOpen(true);
  }, [initialCreateOpen]);

  const filteredServices = useMemo(() => {
    if (tab === 'all') return services;
    return services.filter((s) => s.catalog_type === tab);
  }, [services, tab]);

  function handleTabChange(value: 'all' | CatalogType) {
    setTab(value);
    const params = new URLSearchParams(searchParams.toString());
    if (value === 'all') params.delete('tab');
    else params.set('tab', value);
    router.replace(`/catalog?${params.toString()}`, { scroll: false });
  }

  const selectedService = detailId ? services.find((s) => s.id === detailId) : null;

  function refresh() {
    router.refresh();
  }

  return (
    <>
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Catalog</h1>
            <p className="mt-1 text-muted-foreground">Goods, services (vendor-sourced), and consulting (in-house). Used when adding requirements.</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setBulkOpen(true)}>
              <Layers className="h-4 w-4" />
              Bulk add
            </Button>
            <Button onClick={() => setCreateOpen(true)}>
              <Plus className="h-4 w-4" />
              Add item
            </Button>
          </div>
        </div>

        <div className="flex gap-1 rounded-xl border border-border bg-muted/30 p-1 w-fit">
          {TABS.map(({ value, label, icon: Icon }) => (
            <button
              key={value}
              type="button"
              onClick={() => handleTabChange(value)}
              className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                tab === value ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Icon className="h-4 w-4" />
              {label}
            </button>
          ))}
        </div>

        <div className="glass-card overflow-hidden">
          {filteredServices.length === 0 ? (
            <div className="p-12 text-center">
              <p className="text-muted-foreground">
                {tab === 'all' ? 'No items in catalog.' : `No ${tab} in catalog.`}
              </p>
              <p className="mt-1 text-sm text-muted-foreground">Add items to use them in requirements.</p>
              <Button className="mt-4" onClick={() => setCreateOpen(true)}>
                <Plus className="h-4 w-4" />
                Add item
              </Button>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="content-cell text-left font-medium px-4">Code</th>
                  <th className="content-cell text-left font-medium px-4">Name</th>
                  <th className="content-cell text-left font-medium px-4">Type</th>
                  <th className="content-cell text-left font-medium px-4">Delivery</th>
                  <th className="content-cell text-left font-medium px-4">Category</th>
                  <th className="content-cell text-right font-medium px-4">Our rate</th>
                  <th className="content-cell text-right font-medium px-4">Default client rate</th>
                  <th className="content-cell w-10 px-2" aria-hidden><span className="sr-only">Open</span></th>
                </tr>
              </thead>
              <tbody>
                {filteredServices.map((row, index) => (
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
                    <td className="content-cell px-4 font-mono text-muted-foreground">{row.service_code}</td>
                    <td className="content-cell px-4 font-medium">{row.service_name}</td>
                    <td className="content-cell px-4">
                      <span className="rounded bg-muted px-2 py-0.5 text-xs capitalize">{row.catalog_type}</span>
                    </td>
                    <td className="content-cell px-4 text-muted-foreground">{row.delivery === 'in_house' ? 'In-house' : 'Vendor'}</td>
                    <td className="content-cell px-4 text-muted-foreground">{row.category ?? '—'}</td>
                    <td className="content-cell px-4 text-right tabular-nums text-muted-foreground">
                      {row.our_rate_min != null || row.our_rate_max != null
                        ? [row.our_rate_min, row.our_rate_max].filter((x) => x != null).map((x) => formatMoney(x!)).join(' – ')
                        : '—'}
                    </td>
                    <td className="content-cell px-4 text-right tabular-nums">
                      {row.default_client_rate != null ? formatMoney(row.default_client_rate) : '—'}
                    </td>
                    <td className="content-cell px-2 text-muted-foreground">
                      <ChevronRight className="h-4 w-4 shrink-0" aria-hidden />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      <SlidePanel open={createOpen} onOpenChange={setCreateOpen} title="Add item">
        <NewServiceForm onSuccess={() => { setCreateOpen(false); refresh(); }} onCancel={() => setCreateOpen(false)} />
      </SlidePanel>

      <SlidePanel open={bulkOpen} onOpenChange={setBulkOpen} title="Bulk add (goods, services or consulting)" className="max-w-4xl">
        <BulkAddServicesForm onSuccess={() => refresh()} onCancel={() => setBulkOpen(false)} />
      </SlidePanel>

      <SlidePanel open={!!selectedService} onOpenChange={(open) => !open && setDetailId(null)} title={selectedService?.service_name ?? 'Catalog item'}>
        {selectedService && (
          <ServiceDetailPanel
            service={selectedService}
            vendorOptions={vendorOptions}
            onSuccess={() => { setDetailId(null); refresh(); }}
            onClose={() => setDetailId(null)}
          />
        )}
      </SlidePanel>
    </>
  );
}
