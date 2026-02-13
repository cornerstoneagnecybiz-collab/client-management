/**
 * Cornerstone OS — Database types (mirror of Supabase schema).
 * Financial: amounts as number (decimal); prefer calculated values over stored totals.
 */

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

// =============================================================================
// ENUMS / CONSTANTS
// =============================================================================

export type ProjectStatus = 'draft' | 'active' | 'on_hold' | 'completed' | 'cancelled';

/** Project engagement: one_time = fixed-scope; monthly = recurring retainer */
export type EngagementType = 'one_time' | 'monthly';
export type FulfilmentStatus = 'pending' | 'in_progress' | 'fulfilled' | 'cancelled';
export type InvoiceType = 'project' | 'milestone' | 'monthly';
export type InvoiceStatus = 'draft' | 'issued' | 'paid' | 'overdue' | 'cancelled';
export type VendorPayoutStatus = 'pending' | 'paid' | 'cancelled';

export type LedgerEntryType =
  | 'client_invoice'
  | 'client_payment'
  | 'vendor_expected_cost'
  | 'vendor_payment';

/** Catalog: goods & services = vendor-sourced; consulting = in-house */
export type CatalogType = 'goods' | 'services' | 'consulting';

/** Who delivers: vendor (goods/services) or in_house (consulting) */
export type DeliveryType = 'vendor' | 'in_house';

// =============================================================================
// TABLE ROW TYPES
// =============================================================================

export interface Client {
  id: string;
  name: string;
  company: string | null;
  phone: string | null;
  email: string | null;
  gst: string | null;
  created_at: string;
}

export interface Vendor {
  id: string;
  name: string;
  category: string | null;
  phone: string | null;
  email: string | null;
  payment_terms: string | null;
  created_at: string;
}

export interface VendorLocation {
  id: string;
  vendor_id: string;
  city: string;
  address_line1: string | null;
  address_line2: string | null;
  state: string | null;
  postal_code: string | null;
  is_primary: boolean;
  created_at: string;
  updated_at: string;
}

export interface CatalogVendorAvailability {
  id: string;
  service_catalog_id: string;
  vendor_id: string;
  created_at: string;
}

export interface ServiceCatalog {
  id: string;
  service_code: string;
  category: string | null;
  service_name: string;
  service_type: string | null;
  catalog_type: CatalogType;
  delivery: DeliveryType;
  our_rate_min: number | null;
  our_rate_max: number | null;
  commission: number | null;
  default_client_rate: number | null;
  created_at: string;
}

export interface Project {
  id: string;
  client_id: string;
  name: string;
  status: ProjectStatus;
  engagement_type: EngagementType;
  start_date: string | null;
  end_date: string | null;
  created_at: string;
  updated_at: string;
}

export interface Requirement {
  id: string;
  project_id: string;
  service_catalog_id: string;
  title: string;
  description: string | null;
  delivery: DeliveryType;
  assigned_vendor_id: string | null;
  client_price: number | null;
  expected_vendor_cost: number | null;
  quantity: number | null;
  period_days: number | null;
  unit_rate: number | null;
  vendor_unit_rate: number | null;
  fulfilment_status: FulfilmentStatus;
  created_at: string;
  updated_at: string;
}

export interface Invoice {
  id: string;
  project_id: string;
  type: InvoiceType;
  amount: number;
  status: InvoiceStatus;
  issue_date: string | null;
  due_date: string | null;
  billing_month: string | null;
  created_at: string;
  updated_at: string;
}

export interface PaymentReceived {
  id: string;
  invoice_id: string;
  amount: number;
  date: string;
  mode: string | null;
  created_at: string;
}

export interface VendorPayout {
  id: string;
  requirement_id: string;
  vendor_id: string;
  amount: number;
  status: VendorPayoutStatus;
  paid_date: string | null;
  created_at: string;
  updated_at: string;
}

export interface LedgerEntry {
  id: string;
  project_id: string;
  type: LedgerEntryType;
  amount: number;
  reference_id: string | null;
  date: string;
  created_at: string;
}

export interface ProjectNote {
  id: string;
  project_id: string;
  content: string;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export type ProjectDocumentType = 'text' | 'sheet';

export interface ProjectDocument {
  id: string;
  project_id: string;
  title: string;
  doc_type: ProjectDocumentType;
  content_json: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
}

// =============================================================================
// FINANCIAL CALCULATIONS (no stored totals; derive from ledger/transactions)
// =============================================================================

/** Planned profit = client price − expected vendor cost (per requirement or aggregated) */
export function plannedProfit(clientPrice: number | null, expectedVendorCost: number | null): number | null {
  if (clientPrice == null || expectedVendorCost == null) return null;
  return clientPrice - expectedVendorCost;
}

/** Actual profit = client received − vendor paid (from ledger) */
export function actualProfit(clientReceived: number, vendorPaid: number): number {
  return clientReceived - vendorPaid;
}

/** Variance = planned profit − actual profit */
export function variance(planned: number | null, actual: number): number | null {
  if (planned == null) return null;
  return planned - actual;
}
