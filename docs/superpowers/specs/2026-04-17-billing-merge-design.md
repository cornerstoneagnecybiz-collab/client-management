# Billing page — merge Fulfilments and Invoicing into one lifecycle view

**Date:** 2026-04-17
**Status:** Approved (design)

## Problem

Today a requirement's workflow is spread across two pages:

- `/fulfilments` — lists requirements in `pending` or `in_progress`.
- `/invoicing` — lists invoices, with no visibility into which requirements have been fulfilled but not yet billed.

Users have to switch between pages to progress a requirement from "work scheduled" → "work delivered" → "client billed" → "client paid". The boundary between fulfilment and billing is a UX fiction; it's the same operational pipeline.

## Goals

- One page where a requirement can be followed end-to-end: **Pending → In progress → Ready to invoice → Invoiced → Paid** (plus a terminal **Cancelled** stage).
- Create an invoice directly from selected fulfilled requirements.
- Keep the existing invoice management experience (issue, record payment, print, etc.).
- No database migration: stage is derived from existing columns.

## Non-goals

- No changes to Requirements, Settlement, Reports, or the per-project Projects detail page.
- No pagination or virtualization. Volume today doesn't need it; revisit when it does.
- No new invoice statuses or schema changes.
- No recurring-schedule automation for monthly invoices. Monthly retainers still invoice via the existing manual flow; we only reflect their *current-cycle* state in the pipeline view.

## Information architecture

- **New route `/billing`.** Sidebar label: **Billing**.
- `/invoicing` → server redirect to `/billing`.
- `/fulfilments` → server redirect to `/billing`.
- Public print leaf **`/invoicing/invoice/[id]` is preserved**. External customer-facing invoice links must not break; it continues to serve the print layout.
- Sidebar: remove **Fulfilments** and **Invoicing** entries, add one **Billing** entry.

## Lifecycle stage derivation

Stage is server-computed per requirement from existing data. No stored column.

| `requirements.fulfilment_status` | + invoicing state | Stage |
| --- | --- | --- |
| `cancelled` | — | **Cancelled** |
| `pending` | — | **Pending** |
| `in_progress` | — | **In progress** |
| `fulfilled` | see below | **Ready to invoice** / **Invoiced** / **Paid** |

When `fulfilment_status = 'fulfilled'`:

**One-time project** (`projects.engagement_type = 'one_time'`):
- Look up `invoice_requirements` linked to the requirement where the covering invoice is **not** `cancelled`.
- No link → **Ready to invoice**.
- Linked invoice status ∈ `{draft, issued, overdue}` → **Invoiced**.
- Linked invoice status = `paid` → **Paid**.

**Monthly project** (`projects.engagement_type = 'monthly'`):
- Treat the cycle as the **current calendar month** (`YYYY-MM` of `now()` server-side).
- Look up any invoice where `project_id = r.project_id AND type = 'monthly' AND billing_month = <current month> AND status != 'cancelled'`.
- No match → **Ready to invoice**.
- Match, not `paid` → **Invoiced**.
- Match, `paid` → **Paid**.

This deliberately ties monthly retainers' pipeline status to the current cycle only. Last month's paid retainer is **not** considered "Paid" for this month; this month starts at **Ready to invoice** the moment a new month begins.

## Page layout

```
┌─ Billing ───────────────────────────────────── [ + New invoice ] ─┐
│                                                                   │
│  [ N requirements ready to invoice → Create invoice ]   (banner)  │
│  [ ₹X pending collection → Settle now ]                 (banner)  │
│                                                                   │
│  Stage:   [All][Pending][In progress][Ready to invoice]           │
│           [Invoiced][Paid][Cancelled]                             │
│  Project: (dropdown)   Vendor: (dropdown)   Type: [All][OT][M]    │
│                                                                   │
│  ── Pipeline ──────────────────────────────────────────────────   │
│  ☐ Service         Project    Vendor   Price    Stage   Updated   │
│  ☐ Security guard  ACME ops   V1       ₹30k     Ready   2d        │
│  ☐ Packer          ACME ops   V1       ₹18k     Ready   2d        │
│    Web design      FooCo      —        ₹1.2L    In prog 5d        │
│    Retainer — Apr  BarCorp    —        ₹50k     Invoiced 1d       │
│                                                                   │
│  [ Create invoice from selected (2) ]  ← appears when any         │
│                                          Ready-to-invoice row     │
│                                          is checked               │
│                                                                   │
│  ── Invoices ─────────────────────────────────────────────────    │
│  (existing invoices table, unchanged)                             │
│                                                                   │
└───────────────────────────────────────────────────────────────────┘
```

### Filters
- **Stage chips**: client-side filter on the in-memory list (fast, no refetch). Defaults to **All**.
- **Project**, **Vendor**, **Engagement type**: URL search params (`?project=`, `?vendor=`, `?type=`). Shareable; server-side filtered. Matches the existing pattern on Requirements/Invoicing.

### Row click (stage-aware)
- **Pending / In progress / Ready to invoice / Cancelled** → open `RequirementDetailPanel`.
- **Invoiced / Paid** → open `InvoiceDetailPanel` for the covering invoice. For monthly retainers, this is the current-cycle monthly invoice for the project.

### Bulk-invoice from selected
- Checkboxes render **only on Ready-to-invoice rows**. Other rows have no checkbox.
- Selection is scoped to a **single project**. The first checked row fixes the project; other projects' rows are disabled with a tooltip: *"Select rows from one project at a time."*
- A **"Create invoice from selected (N)"** button appears while ≥1 row is selected. It opens the existing `NewInvoiceForm` slide-panel with:
  - `project_id` = shared project id.
  - `type` = `monthly` if project is monthly (with `billing_month = current month`), else `project`.
  - `amount` = sum of `client_price` of the selected requirements.
  - `preselectedRequirementIds` = list of selected requirement ids.
- The existing `createInvoice` action grows an optional `requirement_ids?: string[]` parameter. When provided, it snapshots exactly those ids into `invoice_requirements` instead of the current "all fulfilled uninvoiced for project" default. When absent, behavior is unchanged.

## Component structure

```
src/app/(dashboard)/billing/
  page.tsx                  (server) fetch, derive stage, fetch invoices + payments
  billing-view.tsx          (client) owns filters state, slide panels, bulk-invoice flow
  lifecycle-table.tsx       (client) renders the pipeline rows + checkboxes
  invoices-section.tsx      (client) wraps the existing invoices table
  actions.ts                moved from invoicing/actions.ts
  invoice-detail-panel.tsx  moved
  new-invoice-form.tsx      moved; accepts preselectedRequirementIds
  new-payout-form.tsx       moved
  invoice-print-layout.tsx  moved
  invoice/                  moved (print detail route is also re-exposed from here)

src/app/(dashboard)/invoicing/page.tsx    → single redirect('/billing')
src/app/(dashboard)/fulfilments/page.tsx  → single redirect('/billing')
src/app/(dashboard)/fulfilments/fulfilments-view.tsx  → deleted
```

`RequirementDetailPanel` stays in `src/app/(dashboard)/requirements/` and is imported by both Requirements and Billing (it already is).

### Public print leaf strategy
The existing `/invoicing/invoice/[id]` route is a public, customer-facing print page. Rather than break external URLs:
- Keep the print page at `/invoicing/invoice/[id]`. It does not live inside the dashboard group.
- If it is currently inside `(dashboard)/invoicing/invoice/`, extract it to `src/app/invoicing/invoice/[id]/page.tsx` (outside the dashboard group). Dashboard redirects only affect `/invoicing` and `/fulfilments` at the root; the print leaf continues to work.

## Data flow

1. `billing/page.tsx` (Server Component):
   - Read filters from `searchParams` (`project`, `vendor`, `type`).
   - Query `requirements` with `projects(name, engagement_type)` and `vendors(name)` relations (same shape as today).
   - Query `invoice_requirements` for any of the returned requirement ids (so we can derive invoiced state for one-time rows).
   - Query `invoices` for:
     - Invoice ids referenced in the `invoice_requirements` result (for one-time stage derivation), and
     - All `type = 'monthly' AND billing_month = <current month>` invoices whose `project_id` is in the result set (for monthly stage derivation),
     - Minus `status = 'cancelled'` in both cases.
   - Derive `stage` per requirement using the table above.
   - Query invoices + payments for the Invoices section (same as current invoicing page).
   - Render `<BillingView …/>`.
2. `BillingView` receives the enriched pipeline rows plus the invoices snapshot; owns all client state (stage filter chips, selected row ids, open slide panels).

## Error and empty states

- Empty pipeline: "No requirements yet. Create one from a project."
- Empty invoices section: same as today's empty state.
- Stage query error: surface inline error heading on the page (same pattern as today's `Failed to load` block).
- Bulk invoice with mixed projects: the button is simply not shown (disabled state on rows from other projects prevents reaching this).

## Risks and trade-offs

- **Query cost.** Three-way composition (requirements × invoice_requirements × invoices) per page load. On current volume this is fine. If slow later, add a Postgres view or materialize `requirement_stage`.
- **Monthly cycle boundary.** We use the calendar month for "current cycle". If the real business cycle ever differs (e.g. last Monday of month), the current-cycle view would need a calibration — but the existing `billing_month` column already uses `YYYY-MM`, so we stay consistent.
- **Paid rows in the pipeline.** Arguably redundant with the Invoices section below. We include them per the design choice (*show everything*), with the Stage chip filter letting users hide them in one click.

## Rollout

Single deployable change. No migration, no feature flag — the pipeline stage is fully derived and the sidebar swap takes effect immediately. Old `/fulfilments` and `/invoicing` URLs redirect, so deep links continue to resolve.
