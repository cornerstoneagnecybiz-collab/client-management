import { redirect } from 'next/navigation';

/**
 * /fulfilments has been merged into /billing (which shows the full lifecycle from pending
 * through paid). The old ?id=... deep-link referenced a requirement; the Billing page uses
 * `id` for invoice ids, so we drop it on redirect. Stale requirement deep links are rare
 * enough that the Pipeline section's stage filter is a better landing.
 */
export default function FulfilmentsRedirect() {
  redirect('/billing');
}
