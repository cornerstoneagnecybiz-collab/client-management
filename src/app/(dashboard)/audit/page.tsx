import { createClient } from '@/lib/supabase/server';
import { AuditView } from './audit-view';
import Link from 'next/link';
import { ChevronRight } from 'lucide-react';

const ACTION_LABELS: Record<string, string> = {
  invoice_issued: 'Invoice issued',
  payment_received: 'Payment received',
  vendor_payout_paid: 'Vendor payout paid',
  requirement_fulfilled: 'Requirement fulfilled',
};

export type AuditRow = {
  id: string;
  user_id: string | null;
  action: string;
  entity_type: string;
  entity_id: string;
  meta: Record<string, unknown> | null;
  created_at: string;
};

export default async function AuditPage({
  searchParams,
}: {
  searchParams: Promise<{ action?: string; limit?: string }>;
}) {
  const { action: actionFilter, limit: limitParam } = await searchParams;
  const limit = Math.min(Math.max(parseInt(limitParam ?? '50', 10) || 50, 10), 200);
  const supabase = await createClient();

  let query = supabase
    .from('activity_log')
    .select('id, user_id, action, entity_type, entity_id, meta, created_at')
    .order('created_at', { ascending: false })
    .limit(limit);

  if (actionFilter) query = query.eq('action', actionFilter);

  const { data: rows, error } = await query;

  if (error) {
    return (
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Audit log</h1>
        <p className="mt-2 text-sm text-red-500">Failed to load: {error.message}</p>
      </div>
    );
  }

  const entries: AuditRow[] = (rows ?? []).map((r) => ({
    id: r.id,
    user_id: r.user_id,
    action: r.action,
    entity_type: r.entity_type,
    entity_id: r.entity_id,
    meta: r.meta as Record<string, unknown> | null,
    created_at: r.created_at,
  }));

  return (
    <AuditView
      entries={entries}
      actionOptions={Object.entries(ACTION_LABELS).map(([value, label]) => ({ value, label }))}
      initialAction={actionFilter ?? null}
      limit={limit}
    />
  );
}
