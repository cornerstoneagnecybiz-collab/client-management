import type { InvoiceStatus, InvoiceType, VendorPayoutStatus } from '@/types';

/**
 * Invoice row shape used by the Billing page and shared read-only views (project detail,
 * client detail, settlement). The detail panel defines a slimmer equivalent of InvoiceRow;
 * callers should import from here when they need the full denormalized shape with
 * project_name.
 */
export type InvoiceRow = {
  id: string;
  project_id: string;
  project_name: string;
  type: InvoiceType;
  amount: number;
  status: InvoiceStatus;
  issue_date: string | null;
  due_date: string | null;
  billing_month: string | null;
  created_at: string;
};

/**
 * Payment row shape with invoice_id kept for callers (settlement, client detail) that group
 * payments by invoice across multiple invoices.
 */
export type PaymentRow = {
  id: string;
  invoice_id: string;
  amount: number;
  date: string;
  mode: string | null;
};

export type VendorPayoutRow = {
  id: string;
  requirement_id: string;
  vendor_id: string;
  amount: number;
  status: VendorPayoutStatus;
  paid_date: string | null;
  service_name: string;
  project_name: string;
  vendor_name: string;
};
