'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { SlidePanel } from '@/components/ui/slide-panel';
import { Plus, ChevronRight, MapPin } from 'lucide-react';
import { NewVendorForm } from './new-vendor-form';
import { VendorDetailPanel, type VendorRow, type CatalogOption } from './vendor-detail-panel';
import type { VendorsGroupedByCity } from './page';
import type { VendorLocationRow } from './page';

interface VendorsViewProps {
  initialVendors: VendorRow[];
  initialGroupedByCity: VendorsGroupedByCity;
  initialLocations: VendorLocationRow[];
  requirementCountByVendorId: Record<string, number>;
  catalogOptions: CatalogOption[];
  existingCategories: string[];
  initialOpenId?: string | null;
  initialCreateOpen?: boolean;
}

export function VendorsView({
  initialVendors,
  initialGroupedByCity,
  initialLocations,
  requirementCountByVendorId,
  catalogOptions,
  existingCategories,
  initialOpenId,
  initialCreateOpen = false,
}: VendorsViewProps) {
  const router = useRouter();
  const [vendors, setVendors] = useState(initialVendors);
  const [groupedByCity, setGroupedByCity] = useState(initialGroupedByCity);
  const [locations, setLocations] = useState(initialLocations);
  const [createOpen, setCreateOpen] = useState(initialCreateOpen);
  const [detailId, setDetailId] = useState<string | null>(initialOpenId ?? null);

  useEffect(() => {
    setVendors(initialVendors);
    setGroupedByCity(initialGroupedByCity);
    setLocations(initialLocations);
  }, [initialVendors, initialGroupedByCity, initialLocations]);

  useEffect(() => {
    if (initialOpenId) setDetailId(initialOpenId);
  }, [initialOpenId]);

  useEffect(() => {
    if (initialCreateOpen) setCreateOpen(true);
  }, [initialCreateOpen]);

  const selectedVendor = detailId ? vendors.find((v) => v.id === detailId) : null;
  const selectedRequirementCount = selectedVendor ? (requirementCountByVendorId[selectedVendor.id] ?? 0) : 0;
  const selectedVendorLocations = selectedVendor ? locations.filter((l) => l.vendor_id === selectedVendor.id) : [];

  function refresh() {
    router.refresh();
  }

  return (
    <>
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Vendors</h1>
            <p className="mt-1 text-muted-foreground">Grouped by city. Add locations in vendor details.</p>
          </div>
          <Button onClick={() => setCreateOpen(true)}>
            <Plus className="h-4 w-4" />
            New vendor
          </Button>
        </div>

        <div className="space-y-6">
          {vendors.length === 0 ? (
            <div className="glass-card p-12 text-center">
              <p className="text-muted-foreground">No vendors yet.</p>
              <p className="mt-1 text-sm text-muted-foreground">Add vendors to assign them to requirements.</p>
              <Button className="mt-4" onClick={() => setCreateOpen(true)}>
                <Plus className="h-4 w-4" />
                Add vendor
              </Button>
            </div>
          ) : (
            groupedByCity.map(({ city, vendors: cityVendors }) => (
              <div key={city} className="glass-card overflow-hidden">
                <div className="flex items-center gap-2 border-b border-border bg-muted/30 px-4 py-2">
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                  <h2 className="text-sm font-semibold">{city}</h2>
                </div>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="content-cell text-left font-medium px-4">Name</th>
                      <th className="content-cell text-left font-medium px-4">Category</th>
                      <th className="content-cell text-left font-medium px-4">Contact</th>
                      <th className="content-cell text-left font-medium px-4">Payment terms</th>
                      <th className="content-cell w-10 px-2" aria-hidden><span className="sr-only">Open</span></th>
                    </tr>
                  </thead>
                  <tbody>
                    {cityVendors.map((row, index) => (
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
                        <td className="content-cell px-4 font-medium">{row.name}</td>
                        <td className="content-cell px-4 text-muted-foreground">{row.category ?? '—'}</td>
                        <td className="content-cell px-4 text-muted-foreground">
                          {[row.phone, row.email].filter(Boolean).join(' · ') || '—'}
                        </td>
                        <td className="content-cell px-4 text-muted-foreground">{row.payment_terms ?? '—'}</td>
                        <td className="content-cell px-2 text-muted-foreground">
                          <ChevronRight className="h-4 w-4 shrink-0" aria-hidden />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ))
          )}
        </div>
      </div>

      <SlidePanel open={createOpen} onOpenChange={setCreateOpen} title="New vendor">
        <NewVendorForm
          existingCategories={existingCategories}
          onSuccess={() => { setCreateOpen(false); refresh(); }}
          onCancel={() => setCreateOpen(false)}
        />
      </SlidePanel>

      <SlidePanel open={!!selectedVendor} onOpenChange={(open) => !open && setDetailId(null)} title={selectedVendor?.name ?? 'Vendor'}>
        {selectedVendor && (
          <VendorDetailPanel
            vendor={selectedVendor}
            locations={selectedVendorLocations}
            requirementCount={selectedRequirementCount}
            catalogOptions={catalogOptions}
            onSuccess={() => { refresh(); }}
            onClose={() => setDetailId(null)}
          />
        )}
      </SlidePanel>
    </>
  );
}
