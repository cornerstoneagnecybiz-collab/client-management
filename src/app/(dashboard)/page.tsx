import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { projectNameFromRelation } from '@/lib/utils';
import { redirect } from 'next/navigation';
import {
  DollarSign,
  TrendingUp,
  Clock,
  ArrowRightLeft,
  FolderKanban,
  ClipboardList,
  Banknote,
  ChevronRight,
  History,
  ListChecks,
} from 'lucide-react';

function formatMoney(n: number): string {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n);
}

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().slice(0, 10);

  const [
    { count: clientsCount },
    { count: projectsCount },
    { count: activeProjectsCount },
    { count: openReqsCount },
    { count: requirementsCount },
    { data: ledgerRows },
    { data: invoicesWithPayments },
    { data: pendingPayouts },
  ] = await Promise.all([
    supabase.from('clients').select('*', { count: 'exact', head: true }),
    supabase.from('projects').select('*', { count: 'exact', head: true }),
    supabase.from('projects').select('*', { count: 'exact', head: true }).eq('status', 'active'),
    supabase.from('requirements').select('*', { count: 'exact', head: true }).in('fulfilment_status', ['pending', 'in_progress']),
    supabase.from('requirements').select('*', { count: 'exact', head: true }),
    supabase.from('ledger_entries').select('type, amount, date'),
    supabase.from('invoices').select('id, amount, status').in('status', ['issued', 'overdue']),
    supabase.from('vendor_payouts').select('amount').eq('status', 'pending'),
  ]);

  const clientPaymentsTotal = (ledgerRows ?? []).filter((r) => r.type === 'client_payment').reduce((s, r) => s + r.amount, 0);
  const vendorPaidTotal = (ledgerRows ?? []).filter((r) => r.type === 'vendor_payment').reduce((s, r) => s + r.amount, 0);
  const actualProfitTotal = clientPaymentsTotal - vendorPaidTotal;

  const clientPaymentsThisMonth = (ledgerRows ?? []).filter(
    (r) => r.type === 'client_payment' && r.date >= monthStart && r.date <= monthEnd
  ).reduce((s, r) => s + r.amount, 0);
  const vendorPaidThisMonth = (ledgerRows ?? []).filter(
    (r) => r.type === 'vendor_payment' && r.date >= monthStart && r.date <= monthEnd
  ).reduce((s, r) => s + r.amount, 0);
  const monthlyProfit = clientPaymentsThisMonth - vendorPaidThisMonth;

  let pendingCollections = 0;
  let invoicesToCollectCount = 0;
  if (invoicesWithPayments?.length) {
    const invoiceIds = invoicesWithPayments.map((i) => i.id);
    const { data: payments } = await supabase.from('payments_received').select('invoice_id, amount').in('invoice_id', invoiceIds);
    const paidByInvoice: Record<string, number> = {};
    for (const p of payments ?? []) {
      paidByInvoice[p.invoice_id] = (paidByInvoice[p.invoice_id] ?? 0) + p.amount;
    }
    for (const inv of invoicesWithPayments) {
      const paid = paidByInvoice[inv.id] ?? 0;
      if (inv.amount > paid) {
        pendingCollections += inv.amount - paid;
        invoicesToCollectCount += 1;
      }
    }
  }

  const pendingPayoutsTotal = (pendingPayouts ?? []).reduce((s, r) => s + r.amount, 0);
  const pendingPayoutsCount = (pendingPayouts ?? []).length;

  const { data: recentLedger } = await supabase
    .from('ledger_entries')
    .select('id, type, amount, date, project_id, projects(name)')
    .order('date', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(10);

  const hasClients = (clientsCount ?? 0) > 0;
  const hasProjects = (projectsCount ?? 0) > 0;
  const hasRequirements = (requirementsCount ?? 0) > 0;
  let nextStep: { label: string; href: string; description: string } | null = null;
  if (!hasClients) nextStep = { label: 'Add your first client', href: '/clients', description: 'Clients are the starting point. Then you can create projects for them.' };
  else if (!hasProjects) nextStep = { label: 'Create a project', href: '/projects/new', description: 'Link a project to a client to track work and billing.' };
  else if (!hasRequirements) nextStep = { label: 'Add requirements', href: '/requirements', description: 'Define scope, assign vendors, and set pricing per project.' };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">Executive overview and operations pulse.</p>
      </div>

      <section>
        <h2 className="text-sm font-medium text-muted-foreground mb-3">Quick links</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <Link
            href="/activity"
            className="glass-card flex items-center gap-4 rounded-xl border-2 border-border p-4 transition-colors hover:border-primary/30 hover:bg-muted/20"
          >
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/15 text-primary">
              <History className="h-6 w-6" />
            </div>
            <div className="min-w-0">
              <p className="font-semibold">Activity</p>
              <p className="text-xs text-muted-foreground">Invoices issued, payments received, vendor payouts.</p>
            </div>
            <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
          </Link>
          <Link
            href="/fulfilments"
            className="glass-card flex items-center gap-4 rounded-xl border-2 border-border p-4 transition-colors hover:border-primary/30 hover:bg-muted/20"
          >
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/15 text-primary">
              <ListChecks className="h-6 w-6" />
            </div>
            <div className="min-w-0">
              <p className="font-semibold">Fulfilments</p>
              <p className="text-xs text-muted-foreground">Pending requirements to fulfil.</p>
            </div>
            <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
          </Link>
        </div>
      </section>

      {nextStep && (
        <section>
          <h2 className="text-sm font-medium text-muted-foreground mb-3">Get started</h2>
          <Link
            href={nextStep.href}
            className="glass-card flex items-start gap-4 rounded-xl border-2 border-primary/20 bg-primary/5 p-4 transition-colors hover:border-primary/40 hover:bg-primary/10"
          >
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/20">
              <ChevronRight className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="font-semibold">{nextStep.label}</p>
              <p className="mt-0.5 text-sm text-muted-foreground">{nextStep.description}</p>
            </div>
          </Link>
        </section>
      )}

      {!nextStep && (openReqsCount ?? 0) + invoicesToCollectCount + pendingPayoutsCount > 0 && (
        <section>
          <h2 className="text-sm font-medium text-muted-foreground mb-3">Next actions</h2>
          <div className="grid gap-3 sm:grid-cols-3">
            {(openReqsCount ?? 0) > 0 && (
              <Link
                href="/fulfilments"
                className="glass-card flex items-center gap-3 rounded-xl border p-4 transition-colors hover:bg-muted/30"
              >
                <ClipboardList className="h-8 w-8 shrink-0 text-muted-foreground" />
                <div>
                  <p className="font-medium">{openReqsCount} to fulfil</p>
                  <p className="text-xs text-muted-foreground">Requirements pending or in progress</p>
                </div>
                <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground ml-auto" />
              </Link>
            )}
            {invoicesToCollectCount > 0 && (
              <Link
                href="/finance"
                className="glass-card flex items-center gap-3 rounded-xl border p-4 transition-colors hover:bg-muted/30"
              >
                <DollarSign className="h-8 w-8 shrink-0 text-muted-foreground" />
                <div>
                  <p className="font-medium">{invoicesToCollectCount} to collect</p>
                  <p className="text-xs text-muted-foreground">Invoices awaiting payment</p>
                </div>
                <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground ml-auto" />
              </Link>
            )}
            {pendingPayoutsCount > 0 && (
              <Link
                href="/finance"
                className="glass-card flex items-center gap-3 rounded-xl border p-4 transition-colors hover:bg-muted/30"
              >
                <Banknote className="h-8 w-8 shrink-0 text-muted-foreground" />
                <div>
                  <p className="font-medium">{pendingPayoutsCount} payout{pendingPayoutsCount !== 1 ? 's' : ''} to pay</p>
                  <p className="text-xs text-muted-foreground">Vendor payouts pending</p>
                </div>
                <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground ml-auto" />
              </Link>
            )}
          </div>
        </section>
      )}

      {!nextStep && (
        <section>
          <h2 className="text-sm font-medium text-muted-foreground mb-3">Quick actions</h2>
          <div className="grid gap-3 sm:grid-cols-3">
            <Link
              href="/finance"
              className="glass-card flex items-center gap-3 rounded-xl border p-4 transition-colors hover:bg-muted/30"
            >
              <DollarSign className="h-8 w-8 shrink-0 text-muted-foreground" />
              <div>
                <p className="font-medium">New invoice</p>
                <p className="text-xs text-muted-foreground">Create a draft invoice</p>
              </div>
              <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground ml-auto" />
            </Link>
            <Link
              href="/finance"
              className="glass-card flex items-center gap-3 rounded-xl border p-4 transition-colors hover:bg-muted/30"
            >
              <Banknote className="h-8 w-8 shrink-0 text-muted-foreground" />
              <div>
                <p className="font-medium">Record payment</p>
                <p className="text-xs text-muted-foreground">Log client payment received</p>
              </div>
              <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground ml-auto" />
            </Link>
            <Link
              href="/requirements"
              className="glass-card flex items-center gap-3 rounded-xl border p-4 transition-colors hover:bg-muted/30"
            >
              <ClipboardList className="h-8 w-8 shrink-0 text-muted-foreground" />
              <div>
                <p className="font-medium">Add requirement</p>
                <p className="text-xs text-muted-foreground">Define scope and pricing</p>
              </div>
              <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground ml-auto" />
            </Link>
          </div>
        </section>
      )}

      <section>
        <h2 className="text-sm font-medium text-muted-foreground mb-3">Executive KPIs</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <KpiCard title="Monthly revenue" value={formatMoney(clientPaymentsThisMonth)} icon={DollarSign} />
          <KpiCard title="Monthly profit" value={formatMoney(monthlyProfit)} icon={TrendingUp} />
          <KpiCard title="Pending collections" value={formatMoney(pendingCollections)} icon={Clock} />
          <KpiCard title="Pending payouts" value={formatMoney(pendingPayoutsTotal)} icon={ArrowRightLeft} />
        </div>
      </section>

      <section>
        <h2 className="text-sm font-medium text-muted-foreground mb-3">Operations Pulse</h2>
        <div className="grid gap-4 sm:grid-cols-3">
          <KpiCard
            title="Active projects"
            value={String(activeProjectsCount ?? 0)}
            icon={FolderKanban}
            href="/projects"
          />
          <KpiCard
            title="Open requirements"
            value={String(openReqsCount ?? 0)}
            icon={ClipboardList}
            href="/requirements"
          />
          <KpiCard
            title="Actual profit (all time)"
            value={formatMoney(actualProfitTotal)}
            icon={TrendingUp}
            href="/ledger"
          />
        </div>
      </section>

      <section>
        <h2 className="text-sm font-medium text-muted-foreground mb-3">Financial summary</h2>
        <div className="glass-card p-5">
          <dl className="grid gap-4 sm:grid-cols-3">
            <div>
              <dt className="text-xs text-muted-foreground">Total client payments (ledger)</dt>
              <dd className="mt-1 text-lg font-semibold tabular-nums text-emerald-600 dark:text-emerald-400">{formatMoney(clientPaymentsTotal)}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Total vendor paid (ledger)</dt>
              <dd className="mt-1 text-lg font-semibold tabular-nums text-rose-600 dark:text-rose-400">{formatMoney(vendorPaidTotal)}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Actual profit</dt>
              <dd className={`mt-1 text-lg font-semibold tabular-nums ${actualProfitTotal >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                {formatMoney(actualProfitTotal)}
              </dd>
            </div>
          </dl>
          <Link href="/ledger" className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline">
            View ledger
            <ChevronRight className="h-4 w-4" />
          </Link>
        </div>
      </section>

      <section>
        <h2 className="text-sm font-medium text-muted-foreground mb-3">Recent activity</h2>
        <div className="glass-card overflow-hidden">
          {!recentLedger?.length ? (
            <div className="p-8 text-center text-muted-foreground text-sm">
              No activity yet. Record payments and vendor payouts in Finance, or add entries in Ledger.
            </div>
          ) : (
            <ul className="divide-y divide-border">
              {recentLedger.map((e) => (
                <li key={e.id}>
                  <Link
                    href="/activity"
                    className="flex items-center justify-between px-4 py-3 text-sm hover:bg-muted/30 transition-colors"
                  >
                    <span className="flex items-center gap-3">
                      <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-muted">
                        <Banknote className="h-4 w-4 text-muted-foreground" />
                      </span>
                      <span>
                        <span className="font-medium capitalize">{String(e.type).replace(/_/g, ' ')}</span>
                        <span className="ml-2 text-muted-foreground">{projectNameFromRelation(e.projects)}</span>
                      </span>
                    </span>
                    <span className="tabular-nums">
                      {e.type === 'client_payment' ? '+' : e.type === 'vendor_payment' ? '−' : ''}{formatMoney(e.amount)}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
          <div className="border-t border-border px-4 py-2 flex gap-4">
            <Link href="/activity" className="text-sm font-medium text-primary hover:underline">
              View all activity →
            </Link>
            <Link href="/ledger" className="text-sm text-muted-foreground hover:underline">
              Ledger
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}

function KpiCard({
  title,
  value,
  icon: Icon,
  href,
}: {
  title: string;
  value: string;
  icon: React.ComponentType<{ className?: string }> | null;
  href?: string;
}) {
  const content = (
    <div className="glass-card p-5 h-full">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-muted-foreground">{title}</span>
        {Icon && <Icon className="h-4 w-4 text-muted-foreground" />}
      </div>
      <p className="mt-2 text-2xl font-semibold tabular-nums">{value}</p>
    </div>
  );

  if (href) {
    return (
      <Link href={href} className="block transition-opacity hover:opacity-90">
        {content}
      </Link>
    );
  }
  return content;
}
