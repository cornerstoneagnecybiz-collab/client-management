import { notFound } from 'next/navigation';
import { getInvoicePrintData } from '../../../actions';
import { InvoicePrintLayout } from '../../../invoice-print-layout';

export default async function InvoicePrintPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ tax?: string }>;
}) {
  const { id } = await params;
  const { tax } = await searchParams;
  const data = await getInvoicePrintData(id);
  if (data.error || !data.invoice) notFound();
  return (
    <InvoicePrintLayout
      invoice={data.invoice}
      project={data.project}
      client={data.client}
      lineItems={data.lineItems ?? []}
      payments={data.payments ?? []}
      totalPaid={data.totalPaid ?? 0}
      showTaxInvoice={tax === '1'}
    />
  );
}
