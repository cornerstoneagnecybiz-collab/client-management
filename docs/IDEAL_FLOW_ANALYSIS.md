# Ideal flow: how far we are and what’s missing

You want the journey to move **from one thing to another in “auto mode”** instead of having to open each step and make the move there. This doc describes the **current flow**, the **ideal flow**, and the **gap** so you can prioritise changes.

---

## 1. Current flow (manual, step-by-step)

Today the user has to **explicitly open each step** and act there:

| Step | Where user goes | What they do |
|------|------------------|--------------|
| 1. Fulfil requirement | **Fulfilments** or **Requirements** | Open requirement → set status to Fulfilled |
| 2. Add to invoice | **Finance** | New invoice or open invoice → add lines (suggest from fulfilled) |
| 3. Issue invoice | **Finance** (same panel) | Change status to Issued |
| 4. Record payment | **Finance** or **Ledger** | Open invoice → Record payment, or Ledger → New entry |
| 5. Pay vendor | **Finance** (Vendor payouts) | New payout or mark existing as paid |

So the **journey is fragmented**: Fulfilments → Finance (invoice) → Finance (payment) → Finance (payout). Each transition is a **manual navigation** and opening the right record.

---

## 2. Ideal flow (“auto mode”)

In “auto mode”, the **next logical action** is obvious and doable **from where you are**, with minimal navigation:

- **From a requirement (just fulfilled):**  
  One action like **“Add to invoice”** that opens the invoice flow (or creates/opens an invoice) with that requirement (or project) pre-selected.

- **From an issued invoice:**  
  **“Record payment”** is already in the invoice panel; optionally a clear **“Pay vendor”** for related payouts when the client has paid.

- **From a list of “pending next steps”:**  
  A single place (e.g. **Pipeline** or **Fulfilments** expanded) that shows:
  - Requirements to fulfil
  - Invoices to issue
  - Invoices to collect payment for
  - Payouts to pay  
  and lets you **do the next action in place** (e.g. “Fulfil”, “Issue”, “Record payment”, “Mark paid”) without jumping to another page.

So the ideal is: **contextual “next step” actions** and/or **one place that drives the whole journey** with minimal navigation.

---

## 3. How far we are from the ideal

| Aspect | Current | Ideal | Gap |
|--------|--------|------|-----|
| **After fulfilling a requirement** | User must go to Finance and find/create invoice, then add lines | “Add to invoice” (or “Create invoice”) from requirement with requirement/project pre-selected | **No direct “Add to invoice” from requirement/fulfilment** |
| **After issuing an invoice** | User can record payment in same panel | Same; already good | **Small:** optional “Collect payment” CTA on dashboard or list |
| **Paying vendor** | User goes to Finance → Vendor payouts | From requirement or from “Pending payouts” list, one click to “Mark paid” or open payout | **No “Pay vendor” from requirement or from a unified “next steps” list** |
| **Single “journey” view** | Fulfilments (pending requirements only); Activity (history) | One pipeline / work queue: “Do this next” (fulfil → add to invoice → issue → record payment → pay vendor) | **No pipeline / work queue that chains all steps** |
| **Navigation** | Sidebar: Fulfilments, Requirements, Finance, Ledger | Same, but **in-context next actions** reduce need to remember where to go | **Contextual CTAs missing in several places** |

So we’re **partway** there: invoice detail already combines “Issue” and “Record payment”. What’s missing is:

1. **“Add to invoice” from requirement/fulfilment** (pre-fill project and/or requirement).
2. **“Pay vendor” / “Mark payout paid”** from requirement or from a dedicated “Pending payouts” list with in-place action.
3. **A single pipeline / work queue** that shows the next steps across the journey and lets you act on them (optional but strong for “auto mode”).

---

## 4. Recommended next steps (to get closer to “auto mode”) — **Implemented**

1. **Requirement detail: “Add to invoice”** — **Done.** When a requirement is fulfilled, the detail panel shows **“Add to invoice”** → links to `/finance?project=<id>&new=1`, which opens the New invoice panel with that project pre-selected and amount suggested from fulfilled requirements.

2. **Finance: “Suggest from fulfilled”** — Already existed; deep-link from requirement now opens Finance with project and new-invoice panel (see above).

3. **Pending payouts: “Mark paid” in place** — **Done.** On **Finance**, the Vendor payouts table has a **“Mark paid”** button per pending row; one click marks paid with today’s date (with confirm).

4. **Pipeline / work queue (optional)**  
   A single page that shows “do this next” (fulfil → add to invoice → issue → record payment → pay vendor) is still optional; the dashboard “Next actions” (below) plus in-context CTAs reduce the need for it.

5. **Dashboard “Next actions”** — **Done.** When setup is complete, the dashboard shows a **“Next actions”** section: **“X to fulfil”** (→ Fulfilments), **“X to collect”** (→ Finance, invoices awaiting payment), **“X payout(s) to pay”** (→ Finance). Only shown when at least one of these counts is > 0.

---

## 5. Summary

- **Current (after implementation):** Flow is more **guided**: “Add to invoice” from fulfilled requirement (deep-link to Finance + new invoice), “Mark paid” in place on Finance for pending payouts, and dashboard “Next actions” (to fulfil, to collect, to pay) so the next step is visible and one click away.
- **Ideal:** **Auto mode** = next step obvious and doable from the current screen, or from one pipeline / work queue. We are closer: (1) and (2) and (5) are done; optional (4) pipeline view would further reduce navigation.
- **Still optional:** A single **pipeline / work queue** page that lists all “do next” items in one view (fulfil → add to invoice → issue → record payment → pay vendor) for users who prefer one screen to drive the whole journey.
