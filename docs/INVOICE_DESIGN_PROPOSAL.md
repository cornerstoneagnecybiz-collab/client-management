# Invoice layout & print design — for your approval

This describes the proposed **invoice layout** (non–tax invoice by default, with an option for tax invoice). Once you approve the structure and sections, we’ll implement preview and print in the app.

---

## 1. Document type options

- **Standard invoice (default)** — “Invoice” only; no GST/tax section.  
- **Tax invoice** — Optional; when enabled, show a clear “Tax Invoice” title and a section for GST number, place of supply, tax breakdown (e.g. CGST/SGST or IGST) if you want it.

You’ll be able to choose “Standard invoice” vs “Tax invoice” when creating/editing or when opening the preview/print view.

---

## 2. Layout structure (sections top → bottom)

### A. Header block

- **Left:** Your company logo (upload/settings; placeholder until then).  
- **Right (or below logo):**  
  - Company name  
  - Address (from settings or placeholder)  
  - Optional: phone, email, website  

### B. Title & status

- **Centre or left:** Large title **“INVOICE”** or **“TAX INVOICE”** (depending on option above).  
- **Right:** Status badge (Draft / Issued / Paid / Overdue / Cancelled) — optional in print, always in app preview.

### C. Invoice meta (one row or two)

- **Invoice number** (e.g. INV-2025-001 or from your numbering).  
- **Invoice type:** Project / Milestone / Monthly (from existing type).  
- **Issue date**  
- **Due date**  
- **Project name** (and optional client reference).

### D. Bill to

- **“Bill to”** label.  
- Client name (from project → client).  
- Client address / contact if we have it (otherwise placeholder “Address from client master”).

### E. Line items table (dynamic by nature of work)

Table columns will depend on **invoice type** and whether we’re tying to **requirements** (goods/services/consulting):

**Option A — Requirement-based (project/milestone)**  
When the invoice is for a project (or milestone) and we have requirements:

| # | Description (catalog item / requirement title) | Type (Goods / Services / Consulting) | Qty | Rate (₹) | Amount (₹) |
|---|-----------------------------------------------|--------------------------------------|-----|----------|------------|

- One row per **fulfilled requirement** (or selected requirements) for that project.  
- Description = catalog item name + optional requirement title.  
- Type = from catalog (goods/services/consulting).  
- Qty = 1 (or from requirement if we add qty later).  
- Rate = client price.  
- Amount = rate × qty.

**Option B — Single amount (no line breakdown)**  
For “Monthly” or when you don’t want line items:

- Single row: description “Project fee” / “Milestone payment” / “Monthly retainer” (from type) and amount = invoice amount.  
- Or a short table with one line.

**Option C — Custom line items (future)**  
Later we can add free-form line items (description, qty, rate, amount) for mixed invoices.

**Proposal for first version:**  
- **Project / Milestone:** Use Option A (requirement-based rows) when the project has fulfilled requirements; otherwise fall back to Option B (single amount row).  
- **Monthly:** Use Option B (single amount row with description “Monthly invoice” or similar).

### F. Totals

- **Subtotal** (sum of line items).  
- If **Tax invoice** is on: **Tax** row(s) and **Total**.  
- Otherwise: **Total** only (e.g. “Total amount (₹)”).

### G. Signatures & notes

- **Left:** “Authorised signatory” (or “For [Company name]”) with space for signature image/placeholder.  
- **Right (optional):** Client acceptance line (“Received by ________________”) — optional, can be turned off in settings.  
- **Footer note:** One line of terms (e.g. “Payment terms: as per agreement” or “Please pay by due date”) — from settings or placeholder.

### H. Footer

- Small text: “This is a computer-generated invoice.”  
- If **not** tax invoice: “Not a tax invoice.”  
- If **tax invoice**: “Tax invoice under GST.” (or similar)

---

## 3. Print behaviour

- **Preview:** A dedicated route or slide panel (e.g. “Preview / Print”) that renders this layout with real data.  
- **Print:** Same layout with `@media print` styles: hide app chrome (sidebar, extra buttons), show only the invoice block, good margins, page break control so the table doesn’t split badly.  
- **Logo & signature:** Placeholder areas in the layout; later you can upload images in settings and we’ll plug them in.

---

## 4. What we need from you

Please confirm:

1. **Sections:** Is the order (Header → Title & status → Meta → Bill to → Line items → Totals → Signatures → Footer) okay, or do you want anything moved (e.g. Bill to next to your logo)?  
2. **Line items:** For Project/Milestone, is **requirement-based rows** (Option A) what you want first, with fallback to single amount (Option B) when there are no requirements?  
3. **Tax invoice:** Is “Standard invoice” vs “Tax invoice” toggle enough, with tax invoice showing “Tax Invoice” title + GST number + place of supply (and optional tax breakdown later)?  
4. **Signatures:** One “Authorised signatory” on the left enough for now? Any need for client signature/date on the document?  
5. **Logo:** One logo (top-left) sufficient? Any second logo or stamp area?

Once you approve this, next step is implementing the **preview** and **print layout** in the app (with placeholders for logo/signature and settings for company name, address, and footer text).

---

## Implemented (post-approval)

- **Preview / Print:** From Finance → open an invoice → **Preview / Print** opens `/finance/invoice/[id]/print` in a new tab. Toolbar: Back, Print button, and toggle **Tax invoice** vs **Standard invoice** (URL `?tax=1`).
- **Payment status stamps:** A diagonal watermark stamp shows the invoice status (PAID, OVERDUE, DRAFT, ISSUED, CANCELLED) with colour by status (e.g. green for Paid, red for Overdue). Shown on both screen and print.
- **Layout:** Logo placeholder, company name/address placeholder, INVOICE or TAX INVOICE title, status badge, invoice number (INV-YYYY-xxxxxx), type, dates, project, Bill to (client), requirement-based line items table (or single amount row), totals, Authorised signatory block, footer (“This is a computer-generated invoice” / Not a tax invoice or Tax invoice).
- **Print:** Toolbar is hidden when printing; only the invoice body is printed.
