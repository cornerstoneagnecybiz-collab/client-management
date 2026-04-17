import { redirect } from 'next/navigation';

/**
 * /invoicing has been merged into /billing. Preserve deep links by forwarding the query
 * params we support (id, project, new, type → invoiceType, showCancelled). Nested routes
 * under /invoicing/invoice/[id]/* are still served — they are public print/pdf/export leaves.
 */
export default async function InvoicingRedirect({
  searchParams,
}: {
  searchParams: Promise<{ id?: string; project?: string; type?: string; new?: string; showCancelled?: string }>;
}) {
  const { id, project, type, new: newParam, showCancelled } = await searchParams;
  const p = new URLSearchParams();
  if (id) p.set('id', id);
  if (project) p.set('project', project);
  if (type) p.set('invoiceType', type);
  if (newParam) p.set('new', newParam);
  if (showCancelled) p.set('showCancelled', showCancelled);
  const q = p.toString();
  redirect(q ? `/billing?${q}` : '/billing');
}
