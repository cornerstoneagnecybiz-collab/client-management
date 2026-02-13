/**
 * Server-only: build invoice PDF document for printing (not browser screen print).
 * Used by GET /finance/invoice/[id]/pdf. Requires Node (fs/path).
 */
import { PDFDocument, StandardFonts, type PDFImage } from 'pdf-lib';
import path from 'node:path';
import fs from 'node:fs';
import { INVOICE_COMPANY } from './invoice-branding';

/** Embed image bytes as PNG or JPEG (tries PNG first). */
async function embedImage(doc: PDFDocument, bytes: Uint8Array): Promise<PDFImage | null> {
  try {
    return await doc.embedPng(bytes);
  } catch {
    try {
      return await doc.embedJpg(bytes);
    } catch {
      return null;
    }
  }
}

const A4 = { width: 595, height: 842 };
const MARGIN = 40;
const FONT_SIZE = 10;
const FONT_SIZE_SM = 8;
const FONT_SIZE_TITLE = 18;
const LINE_HEIGHT = 15;
/** Push content down so it sits more vertically centered on the page (reduces bottom whitespace). */
const VERTICAL_CENTER_OFFSET = 90;

/** Strip/replace chars that WinAnsi (standard PDF fonts) cannot encode. */
function toWinAnsi(s: string): string {
  return s
    .replace(/₹/g, 'Rs.')
    .replace(/[\u2013\u2014]/g, '-') // en/em dash
    .replace(/\u00B7/g, '|') // middle dot
    .replace(/[^\x00-\xFF]/g, ' '); // any other non-Latin1 -> space
}

/** Format amount for PDF (ASCII only: WinAnsi cannot encode ₹). */
function formatMoney(n: number): string {
  return 'Rs. ' + new Intl.NumberFormat('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n);
}

function formatDate(d: string | null): string {
  if (!d) return '-';
  return new Date(d + 'Z').toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

function formatBillingMonth(isoDate: string | null): string {
  if (!isoDate) return '';
  const d = new Date(isoDate + 'Z');
  return d.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
}

type InvoicePdfData = {
  invoice: {
    id: string;
    type: string;
    amount: number;
    status: string;
    issue_date: string | null;
    due_date: string | null;
    billing_month: string | null;
    project_id: string;
    invoice_number?: string;
  };
  project?: { name: string };
  client?: { name: string; company: string | null; phone: string | null; email: string | null };
  lineItems: { description: string; type: string; qty: number; rate: number; amount: number }[];
  payments: { amount: number; date: string; mode: string | null }[];
  totalPaid: number;
};

export async function buildInvoicePdf(data: InvoicePdfData, showTaxInvoice: boolean): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const helvetica = await doc.embedFont(StandardFonts.Helvetica);
  const helveticaBold = await doc.embedFont(StandardFonts.HelveticaBold);
  const page = doc.addPage([A4.width, A4.height]);

  let y = A4.height - MARGIN - VERTICAL_CENTER_OFFSET;

  // Logo + company block
  const publicDir = path.join(process.cwd(), 'public');
  const logoPath = path.join(publicDir, INVOICE_COMPANY.logoPath.replace(/^\//, ''));
  const signatoryPath = path.join(publicDir, INVOICE_COMPANY.signatoryImagePath.replace(/^\//, ''));

  try {
    if (fs.existsSync(logoPath)) {
      const logoBytes = new Uint8Array(fs.readFileSync(logoPath));
      const img = await embedImage(doc, logoBytes);
      if (img) {
        const logoW = 100;
        const logoH = Math.min(40, (img.height / img.width) * logoW);
        page.drawImage(img, { x: MARGIN, y: y - logoH, width: logoW, height: logoH });
      }
    }
  } catch {
    // skip logo if missing or invalid
  }

  const companyX = MARGIN + 110;
  let companyY = y;
  page.drawText(INVOICE_COMPANY.name, { x: companyX, y: companyY, size: 14, font: helveticaBold });
  companyY -= 12;
  page.drawText(INVOICE_COMPANY.addressLine1, { x: companyX, y: companyY, size: FONT_SIZE, font: helvetica });
  companyY -= LINE_HEIGHT;
  page.drawText(INVOICE_COMPANY.state, { x: companyX, y: companyY, size: FONT_SIZE, font: helvetica });
  companyY -= LINE_HEIGHT;
  page.drawText(INVOICE_COMPANY.phone, { x: companyX, y: companyY, size: FONT_SIZE, font: helvetica });
  y = companyY - 26;

  // Title & invoice number
  const invoiceNumber =
    data.invoice.invoice_number ??
    `INV-${(data.invoice.issue_date ?? '').slice(0, 4) || new Date().getFullYear()}-${data.invoice.id.slice(0, 6).toUpperCase()}`;
  const typeLabel =
    data.invoice.type === 'project'
      ? 'Project'
      : data.invoice.type === 'milestone'
        ? 'Milestone'
        : 'Monthly';
  const billingMonthLabel = formatBillingMonth(data.invoice.billing_month);

  page.drawText(showTaxInvoice ? 'TAX INVOICE' : 'INVOICE', {
    x: MARGIN,
    y,
    size: FONT_SIZE_TITLE,
    font: helveticaBold,
  });
  page.drawText(`Invoice no. ${invoiceNumber}`, {
    x: A4.width - MARGIN - helvetica.widthOfTextAtSize(`Invoice no. ${invoiceNumber}`, FONT_SIZE),
    y,
    size: FONT_SIZE,
    font: helvetica,
  });
  y -= 32;

  // Meta
  page.drawText(`Type: ${typeLabel}${billingMonthLabel ? ` - ${billingMonthLabel}` : ''}`, {
    x: MARGIN,
    y,
    size: FONT_SIZE_SM,
    font: helvetica,
  });
  page.drawText(`Issue date: ${formatDate(data.invoice.issue_date)}`, {
    x: MARGIN + 200,
    y,
    size: FONT_SIZE_SM,
    font: helvetica,
  });
  y -= LINE_HEIGHT;
  page.drawText(`Due date: ${formatDate(data.invoice.due_date)}`, {
    x: MARGIN,
    y,
    size: FONT_SIZE_SM,
    font: helvetica,
  });
  page.drawText(`Project: ${toWinAnsi(data.project?.name ?? '-')}`, {
    x: MARGIN + 200,
    y,
    size: FONT_SIZE_SM,
    font: helvetica,
  });
  y -= 28;

  // Bill to
  page.drawText('Bill to', { x: MARGIN, y, size: FONT_SIZE_SM, font: helveticaBold });
  y -= LINE_HEIGHT;
  page.drawText(toWinAnsi(data.client?.name ?? '-'), { x: MARGIN, y, size: FONT_SIZE, font: helveticaBold });
  y -= LINE_HEIGHT;
  if (data.client?.company) {
    page.drawText(toWinAnsi(data.client.company), { x: MARGIN, y, size: FONT_SIZE, font: helvetica });
    y -= LINE_HEIGHT;
  }
  const clientContact = [data.client?.phone, data.client?.email].filter(Boolean).join(' | ') || '-';
  page.drawText(toWinAnsi(clientContact), { x: MARGIN, y, size: FONT_SIZE_SM, font: helvetica });
  y -= 24;

  // Line items table
  const tableTop = y;
  const colDesc = MARGIN;
  const colType = MARGIN + 220;
  const colQty = MARGIN + 280;
  const colRate = MARGIN + 320;
  const colAmt = A4.width - MARGIN - 60;

  page.drawText('#', { x: colDesc, y, size: FONT_SIZE_SM, font: helveticaBold });
  page.drawText('Description', { x: colDesc + 12, y, size: FONT_SIZE_SM, font: helveticaBold });
  page.drawText('Type', { x: colType, y, size: FONT_SIZE_SM, font: helveticaBold });
  page.drawText('Qty', { x: colQty, y, size: FONT_SIZE_SM, font: helveticaBold });
  page.drawText('Rate (Rs.)', { x: colRate, y, size: FONT_SIZE_SM, font: helveticaBold });
  page.drawText('Amount (Rs.)', { x: colAmt, y, size: FONT_SIZE_SM, font: helveticaBold });
  y -= LINE_HEIGHT + 6;

  for (let i = 0; i < data.lineItems.length; i++) {
    const row = data.lineItems[i];
    const desc = toWinAnsi(row.description.length > 45 ? row.description.slice(0, 42) + '...' : row.description);
    page.drawText(String(i + 1), { x: colDesc, y, size: FONT_SIZE_SM, font: helvetica });
    page.drawText(desc, { x: colDesc + 12, y, size: FONT_SIZE_SM, font: helvetica });
    page.drawText(toWinAnsi(row.type), { x: colType, y, size: FONT_SIZE_SM, font: helvetica });
    page.drawText(String(row.qty), { x: colQty, y, size: FONT_SIZE_SM, font: helvetica });
    page.drawText(formatMoney(row.rate), { x: colRate, y, size: FONT_SIZE_SM, font: helvetica });
    page.drawText(formatMoney(row.amount), {
      x: colAmt,
      y,
      size: FONT_SIZE_SM,
      font: helvetica,
    });
    y -= LINE_HEIGHT;
  }

  y -= 18;
  // Total
  if (showTaxInvoice) {
    const subtotal = data.lineItems.reduce((s, r) => s + r.amount, 0);
    page.drawText(`Subtotal: ${formatMoney(subtotal)}`, {
      x: A4.width - MARGIN - 120,
      y,
      size: FONT_SIZE_SM,
      font: helvetica,
    });
    y -= LINE_HEIGHT;
  }
  page.drawText(`Total (Rs.): ${formatMoney(data.invoice.amount)}`, {
    x: A4.width - MARGIN - 120,
    y,
    size: FONT_SIZE,
    font: helveticaBold,
  });
  y -= 28;

  // Payments
  if (data.payments.length > 0) {
    page.drawText('Payments received', { x: MARGIN, y, size: FONT_SIZE_SM, font: helveticaBold });
    y -= LINE_HEIGHT;
    for (const p of data.payments) {
      page.drawText(`${formatDate(p.date)}${p.mode ? ` | ${p.mode}` : ''}`, {
        x: MARGIN,
        y,
        size: FONT_SIZE_SM,
        font: helvetica,
      });
      page.drawText(formatMoney(p.amount), {
        x: A4.width - MARGIN - 80,
        y,
        size: FONT_SIZE_SM,
        font: helvetica,
      });
      y -= LINE_HEIGHT;
    }
    page.drawText(`Total paid: ${formatMoney(data.totalPaid)}`, {
      x: MARGIN,
      y,
      size: FONT_SIZE_SM,
      font: helveticaBold,
    });
    y -= 24;
  }

  // Authorised signatory
  try {
    if (fs.existsSync(signatoryPath)) {
      const sigBytes = new Uint8Array(fs.readFileSync(signatoryPath));
      const sigImg = await embedImage(doc, sigBytes);
      if (sigImg) {
        const sigW = 80;
        const sigH = Math.min(35, (sigImg.height / sigImg.width) * sigW);
        page.drawImage(sigImg, { x: A4.width - MARGIN - 120, y: y - sigH, width: sigW, height: sigH });
      }
    }
  } catch {
    // skip
  }
  y -= 48;
  page.drawText('Authorised signatory', {
    x: A4.width - MARGIN - 120,
    y,
    size: FONT_SIZE_SM,
    font: helvetica,
  });
  y -= 36;

  // Footer
  page.drawText('This is a computer-generated invoice.', {
    x: A4.width / 2 - 100,
    y,
    size: FONT_SIZE_SM,
    font: helvetica,
  });
  y -= LINE_HEIGHT + 4;
  page.drawText(showTaxInvoice ? 'Tax invoice under GST.' : 'Not a tax invoice.', {
    x: A4.width / 2 - 70,
    y,
    size: FONT_SIZE_SM,
    font: helvetica,
  });

  return doc.save();
}
