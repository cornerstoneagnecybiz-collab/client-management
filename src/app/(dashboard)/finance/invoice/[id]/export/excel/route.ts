import { NextResponse } from 'next/server';
import * as XLSX from 'xlsx';
import { getInvoicePrintData } from '../../../../actions';

function formatMoney(n: number): string {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2 }).format(n);
}

function formatDate(d: string | null): string {
  if (!d) return '—';
  return new Date(d + 'Z').toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: invoiceId } = await params;
  if (!invoiceId) {
    return NextResponse.json({ error: 'Invoice ID required' }, { status: 400 });
  }

  const data = await getInvoicePrintData(invoiceId);
  if (data.error || !data.invoice) {
    return NextResponse.json({ error: data.error ?? 'Invoice not found' }, { status: 404 });
  }

  const { invoice, project, client, lineItems = [], payments = [], totalPaid = 0 } = data;
  const invoiceNumber =
    invoice.invoice_number ??
    `INV-${invoice.issue_date ? invoice.issue_date.slice(0, 4) : new Date().getFullYear()}-${invoice.id.slice(0, 6).toUpperCase()}`;
  const typeLabel = invoice.type === 'project' ? 'Project' : invoice.type === 'milestone' ? 'Milestone' : 'Monthly';
  const subtotal = lineItems.reduce((s, r) => s + r.amount, 0);

  const rows: (string | number)[][] = [
    ['Company Name'],
    ['Address line 1'],
    ['City, State — PIN'],
    [],
    ['INVOICE', invoiceNumber],
    ['Type', typeLabel],
    ['Issue date', formatDate(invoice.issue_date)],
    ['Due date', formatDate(invoice.due_date)],
    ['Project', project?.name ?? '—'],
    ['Status', invoice.status],
    [],
    ['Bill to'],
    [client?.name ?? '—'],
    ...(client?.company ? [[client.company]] : []),
    [(client?.phone || client?.email) ? [client?.phone, client?.email].filter(Boolean).join(' · ') : '—'],
    [],
    ['#', 'Description', 'Type', 'Qty', 'Rate (₹)', 'Amount (₹)'],
    ...lineItems.map((row, i) => [
      i + 1,
      row.description,
      row.type,
      row.qty,
      row.rate,
      row.amount,
    ]),
    [],
    ['Subtotal', '', '', '', '', subtotal],
    ['Total (₹)', '', '', '', '', invoice.amount],
  ];

  if (payments.length > 0) {
    rows.push([]);
    rows.push(['Payments received']);
    payments.forEach((p) => {
      rows.push([formatDate(p.date), p.mode ?? '', '', '', '', p.amount]);
    });
    rows.push(['Total paid', '', '', '', '', totalPaid]);
  }

  const ws = XLSX.utils.aoa_to_sheet(rows);
  const colWidths = [{ wch: 6 }, { wch: 40 }, { wch: 14 }, { wch: 6 }, { wch: 14 }, { wch: 14 }];
  ws['!cols'] = colWidths;

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Invoice');

  const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
  const filename = `${invoiceNumber}.xlsx`;

  return new NextResponse(buf, {
    status: 200,
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  });
}
