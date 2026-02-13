import { NextResponse } from 'next/server';
import { getInvoicePrintData } from '../../../actions';
import { buildInvoicePdf } from '@/lib/invoice-pdf';

/** PDF generation uses Node fs/path for logo and signatory images */
export const runtime = 'nodejs';

/**
 * GET /finance/invoice/[id]/pdf?tax=0|1
 * Returns the invoice as a PDF document for printing (invoice doc only, not browser screen print).
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: invoiceId } = await params;
    if (!invoiceId) {
      return NextResponse.json({ error: 'Invoice ID required' }, { status: 400 });
    }

    const { searchParams } = new URL(request.url);
    const showTaxInvoice = searchParams.get('tax') === '1';

    const data = await getInvoicePrintData(invoiceId);
    if (data.error || !data.invoice) {
      return NextResponse.json({ error: data.error ?? 'Invoice not found' }, { status: 404 });
    }

    const pdfData = {
      invoice: data.invoice,
      project: data.project,
      client: data.client,
      lineItems: data.lineItems ?? [],
      payments: data.payments ?? [],
      totalPaid: data.totalPaid ?? 0,
    };

    const pdfBytes = await buildInvoicePdf(pdfData, showTaxInvoice);
    const invoiceNumber =
      data.invoice.invoice_number ??
      `INV-${(data.invoice.issue_date ?? '').slice(0, 4)}-${data.invoice.id.slice(0, 6).toUpperCase()}`;
    const filename = `${invoiceNumber}.pdf`;

    return new NextResponse(pdfBytes, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="${filename}"`,
      },
    });
  } catch (err) {
    console.error('Invoice PDF error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to generate PDF' },
      { status: 500 }
    );
  }
}
