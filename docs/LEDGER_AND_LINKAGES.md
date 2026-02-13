# Ledger and linkage rules

When source records are created, updated, or reverted, related data (ledger, junction tables) must stay in sync. This doc lists the linkages and where they are enforced.

---

## 1. Invoice ↔ Ledger + invoice_requirements

| Event | What we do | Where |
|-------|------------|--------|
| **Invoice issued** (status → issued) | Insert `ledger_entries` (type `client_invoice`, reference_id = invoice.id). Populate `invoice_requirements` for that invoice. | `finance/actions.ts` → `updateInvoice` |
| **Invoice voided** (status → cancelled) | Delete `ledger_entries` where type `client_invoice` and reference_id = invoice.id. Delete `invoice_requirements` where invoice_id = id. | `finance/actions.ts` → `updateInvoice` |

So "Client invoices / Billed to clients" and "Suggest from fulfilled" stay correct after void.

---

## 2. Payment received ↔ Ledger + invoice status

| Event | What we do | Where |
|-------|------------|--------|
| **Payment recorded** | Insert `ledger_entries` (type `client_payment`, reference_id = payment.id). If total payments ≥ invoice amount, set invoice status to paid. | `finance/actions.ts` → `recordPaymentReceived` |
| **Payment removed** | Delete `ledger_entries` where type `client_payment` and reference_id = payment.id. Delete row from `payments_received`. If total payments < invoice amount, set invoice status back to issued. | `finance/actions.ts` → `deletePaymentReceived` |

UI: Invoice detail panel has "Remove" per payment.

---

## 3. Vendor payout ↔ Ledger

| Event | What we do | Where |
|-------|------------|--------|
| **Payout marked paid** (create with paid_date or update status → paid) | Insert `ledger_entries` (type `vendor_payment`, reference_id = payout id). | `finance/actions.ts` → `createVendorPayout`, `updateVendorPayout` |
| **Payout reverted** (status → pending or cancelled from paid) | Delete `ledger_entries` where type `vendor_payment` and reference_id = payout id. | `finance/actions.ts` → `updateVendorPayout` |

---

## 4. Requirement ↔ invoice_requirements

| Event | What we do | Where |
|-------|------------|--------|
| **Requirement delete** | Blocked if requirement is in `invoice_requirements` or has `vendor_payouts`. | `requirements/actions.ts` → `deleteRequirement` |

No ledger entries are keyed by requirement id; vendor_payout ledger uses payout id.

---

## 5. Other

- **Manual ledger entries** (Ledger page): Can be created/updated/deleted; no reverse linkage to invoices/payments/payouts.
- **Project delete**: Ledger rows have project_id with ON DELETE CASCADE, so they are removed by the DB when a project is deleted.

When adding new flows that create or change ledger rows or junction tables, update the reverse path (void/delete/revert) in the same place and keep this doc in sync.
