'use server';

import { createClient } from '@/lib/supabase/server';

export type AuditAction =
  | 'invoice_issued'
  | 'payment_received'
  | 'vendor_payout_paid'
  | 'requirement_fulfilled';

/** Append an entry to the activity log. user_id is set from current auth when available. */
export async function logAudit(
  action: AuditAction,
  entityType: string,
  entityId: string,
  meta?: Record<string, unknown>
): Promise<void> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  await supabase.from('activity_log').insert({
    user_id: user?.id ?? null,
    action,
    entity_type: entityType,
    entity_id: entityId,
    meta: meta ?? null,
  });
}
