import type { CatalogType } from '@/types/database';

/** Sub-type options per catalog type for dropdowns. "Other" allows custom value. */
export const SUBTYPE_OPTIONS: Record<CatalogType, { value: string; label: string }[]> = {
  consulting: [
    { value: 'workshop', label: 'Workshop' },
    { value: 'hourly', label: 'Hourly' },
    { value: 'retainer', label: 'Retainer' },
    { value: 'advisory', label: 'Advisory' },
    { value: 'assessment', label: 'Assessment' },
    { value: 'other', label: 'Other' },
  ],
  goods: [
    { value: 'physical', label: 'Physical' },
    { value: 'digital', label: 'Digital' },
    { value: 'license', label: 'License' },
    { value: 'subscription', label: 'Subscription' },
    { value: 'other', label: 'Other' },
  ],
  services: [
    { value: 'managed', label: 'Managed' },
    { value: 'one_off', label: 'One-off' },
    { value: 'recurring', label: 'Recurring' },
    { value: 'implementation', label: 'Implementation' },
    { value: 'support', label: 'Support' },
    { value: 'other', label: 'Other' },
  ],
};

export function getSubTypeOptions(catalogType: CatalogType): { value: string; label: string }[] {
  return SUBTYPE_OPTIONS[catalogType] ?? SUBTYPE_OPTIONS.services;
}
