'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import {
  FolderKanban,
  ClipboardList,
  Wallet,
  FileText,
  ChevronRight,
  TrendingUp,
  ArrowDownLeft,
  ArrowUpRight,
  BarChart3,
  List,
} from 'lucide-react';

function formatMoney(n: number): string {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n);
}

export type AnalyticsData = {
  projectCountByStatus: Record<string, number>;
  reqCountByStatus: Record<string, number>;
  invoiceCountByStatus: Record<string, number>;
  invoiceAmountByStatus: Record<string, number>;
  clientInvoices: number;
  clientPayments: number;
  vendorExpected: number;
  vendorPaid: number;
  actualProfitTotal: number;
  plannedProfitTotal: number;
  totalProjects: number;
  totalRequirements: number;
  statusLabels: Record<string, string>;
  cashFlowByMonth: { month: string; client_invoice: number; client_payment: number; vendor_payment: number }[];
};

const VIEWS = [
  { id: 'overview', label: 'Overview', icon: BarChart3 },
  { id: 'projects', label: 'Projects', icon: FolderKanban },
  { id: 'requirements', label: 'Requirements', icon: ClipboardList },
  { id: 'financial', label: 'Financial', icon: Wallet },
  { id: 'invoices', label: 'Invoices', icon: FileText },
] as const;

function BarChart({
  data,
  labels,
  formatValue = (n) => String(n),
  maxVal,
}: {
  data: [string, number][];
  labels: Record<string, string>;
  formatValue?: (n: number) => string;
  maxVal?: number;
}) {
  const max = maxVal ?? Math.max(...data.map(([, v]) => v), 1);
  return (
    <div className="space-y-2">
      {data.map(([key, value]) => (
        <div key={key} className="flex items-center gap-3">
          <span className="w-24 shrink-0 text-sm">{labels[key] ?? key}</span>
          <div className="flex-1 h-8 rounded-lg bg-muted/30 overflow-hidden">
            <div
              className="h-full rounded-lg bg-primary/60 min-w-[2px] transition-all"
              style={{ width: `${(value / max) * 100}%` }}
            />
          </div>
          <span className="w-20 shrink-0 text-right text-sm tabular-nums">{formatValue(value)}</span>
        </div>
      ))}
    </div>
  );
}

export function AnalyticsView({ data }: { data: AnalyticsData }) {
  const [view, setView] = useState<(typeof VIEWS)[number]['id']>('overview');
  const {
    projectCountByStatus,
    reqCountByStatus,
    invoiceCountByStatus,
    invoiceAmountByStatus,
    clientInvoices,
    clientPayments,
    vendorExpected,
    vendorPaid,
    actualProfitTotal,
    plannedProfitTotal,
    totalProjects,
    totalRequirements,
    statusLabels,
    cashFlowByMonth = [],
  } = data;

  const projectData = Object.entries(projectCountByStatus).sort(([a], [b]) => a.localeCompare(b));
  const reqData = Object.entries(reqCountByStatus).sort(([a], [b]) => a.localeCompare(b));
  const invoiceData = Object.entries(invoiceCountByStatus).sort(([a], [b]) => a.localeCompare(b));

  const projectPieData = projectData.map(([name, value]) => ({ name: statusLabels[name] ?? name, value }));
  const reqPieData = reqData.map(([name, value]) => ({ name: statusLabels[name] ?? name, value }));
  const invoicePieData = invoiceData.map(([name, value]) => ({ name: statusLabels[name] ?? name, value }));

  const COLORS = ['#22c55e', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#64748b'];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Analytics</h1>
          <p className="mt-1 text-muted-foreground">Insights across projects, requirements, and finance.</p>
        </div>
        <div className="flex gap-1 rounded-xl border border-border bg-muted/30 p-1">
          {VIEWS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              type="button"
              onClick={() => setView(id)}
              className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                view === id ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Icon className="h-4 w-4" />
              {label}
            </button>
          ))}
        </div>
      </div>

      {view === 'overview' && (
        <>
          <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            <Link
              href="/projects"
              className="group rounded-2xl border border-border bg-card p-5 shadow-sm transition-all hover:border-primary/30 hover:shadow-md"
            >
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-muted-foreground">Projects</span>
                <FolderKanban className="h-5 w-5 text-muted-foreground transition-colors group-hover:text-primary" />
              </div>
              <p className="mt-2 text-2xl font-bold tabular-nums">{totalProjects}</p>
              <p className="mt-0.5 text-xs text-muted-foreground">Total</p>
            </Link>
            <Link
              href="/requirements"
              className="group rounded-2xl border border-border bg-card p-5 shadow-sm transition-all hover:border-primary/30 hover:shadow-md"
            >
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-muted-foreground">Requirements</span>
                <ClipboardList className="h-5 w-5 text-muted-foreground transition-colors group-hover:text-primary" />
              </div>
              <p className="mt-2 text-2xl font-bold tabular-nums">{totalRequirements}</p>
              <p className="mt-0.5 text-xs text-muted-foreground">Total</p>
            </Link>
            <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-muted-foreground">Received</span>
                <ArrowDownLeft className="h-5 w-5 text-emerald-500" />
              </div>
              <p className="mt-2 text-2xl font-bold tabular-nums text-emerald-600 dark:text-emerald-400">
                {formatMoney(clientPayments)}
              </p>
              <p className="mt-0.5 text-xs text-muted-foreground">Client payments</p>
            </div>
            <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-muted-foreground">Paid out</span>
                <ArrowUpRight className="h-5 w-5 text-rose-500" />
              </div>
              <p className="mt-2 text-2xl font-bold tabular-nums text-rose-600 dark:text-rose-400">
                {formatMoney(vendorPaid)}
              </p>
              <p className="mt-0.5 text-xs text-muted-foreground">Vendor payouts</p>
            </div>
            <div className="rounded-2xl border border-primary/20 bg-primary/5 p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-primary/80">Profit</span>
                <TrendingUp className="h-5 w-5 text-primary" />
              </div>
              <p
                className={`mt-2 text-2xl font-bold tabular-nums ${
                  actualProfitTotal >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
                }`}
              >
                {formatMoney(actualProfitTotal)}
              </p>
              <p className="mt-0.5 text-xs text-muted-foreground">Actual (ledger)</p>
            </div>
          </section>
        </>
      )}

      {view === 'projects' && (
        <section className="rounded-2xl border border-border bg-card overflow-hidden shadow-sm">
          <div className="flex items-center gap-2 border-b border-border bg-muted/30 px-4 py-3">
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
            <h2 className="text-sm font-semibold">Projects by status</h2>
          </div>
          <div className="p-4">
            {projectData.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">No projects yet.</p>
            ) : (
              <div className="flex flex-col gap-6 sm:flex-row sm:items-start">
                <div className="w-full sm:w-64 h-64 shrink-0">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={projectPieData}
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={80}
                        paddingAngle={2}
                        dataKey="value"
                        nameKey="name"
                        label={({ name, percent }) => `${name} ${((percent ?? 0) * 100).toFixed(0)}%`}
                      >
                        {projectPieData.map((_, i) => (
                          <Cell key={i} fill={COLORS[i % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(v: number | undefined) => [v ?? 0, 'Count']} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex-1 min-w-0">
                  <BarChart data={projectData} labels={statusLabels} />
                </div>
              </div>
            )}
            <Link href="/projects" className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline">
              View projects <ChevronRight className="h-4 w-4" />
            </Link>
          </div>
        </section>
      )}

      {view === 'requirements' && (
        <section className="rounded-2xl border border-border bg-card overflow-hidden shadow-sm">
          <div className="flex items-center gap-2 border-b border-border bg-muted/30 px-4 py-3">
            <ClipboardList className="h-4 w-4 text-muted-foreground" />
            <h2 className="text-sm font-semibold">Requirements by fulfilment</h2>
          </div>
          <div className="p-4">
            {reqData.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">No requirements yet.</p>
            ) : (
              <div className="flex flex-col gap-6 sm:flex-row sm:items-start">
                <div className="w-full sm:w-64 h-64 shrink-0">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={reqPieData}
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={80}
                        paddingAngle={2}
                        dataKey="value"
                        nameKey="name"
                        label={({ name, percent }) => `${name} ${((percent ?? 0) * 100).toFixed(0)}%`}
                      >
                        {reqPieData.map((_, i) => (
                          <Cell key={i} fill={COLORS[i % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(v: number | undefined) => [v ?? 0, 'Count']} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex-1 min-w-0">
                  <BarChart data={reqData} labels={statusLabels} />
                </div>
              </div>
            )}
            <Link href="/requirements" className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline">
              View requirements <ChevronRight className="h-4 w-4" />
            </Link>
          </div>
        </section>
      )}

      {view === 'financial' && (
        <section className="rounded-2xl border border-border bg-card overflow-hidden shadow-sm">
          <div className="flex items-center gap-2 border-b border-border bg-muted/30 px-4 py-3">
            <Wallet className="h-4 w-4 text-muted-foreground" />
            <h2 className="text-sm font-semibold">Financial summary</h2>
          </div>
          <div className="p-4 space-y-6">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div className="rounded-xl bg-muted/20 p-4">
                <p className="text-xs font-medium text-muted-foreground">Client invoices (billed)</p>
                <p className="mt-1 text-lg font-semibold tabular-nums">{formatMoney(clientInvoices)}</p>
              </div>
              <div className="rounded-xl bg-emerald-500/10 p-4">
                <p className="text-xs font-medium text-muted-foreground">Client payments (received)</p>
                <p className="mt-1 text-lg font-semibold tabular-nums text-emerald-600 dark:text-emerald-400">
                  {formatMoney(clientPayments)}
                </p>
              </div>
              <div className="rounded-xl bg-muted/20 p-4">
                <p className="text-xs font-medium text-muted-foreground">Vendor expected</p>
                <p className="mt-1 text-lg font-semibold tabular-nums">{formatMoney(vendorExpected)}</p>
              </div>
              <div className="rounded-xl bg-rose-500/10 p-4">
                <p className="text-xs font-medium text-muted-foreground">Vendor paid</p>
                <p className="mt-1 text-lg font-semibold tabular-nums text-rose-600 dark:text-rose-400">
                  {formatMoney(vendorPaid)}
                </p>
              </div>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-primary/20 bg-primary/5 p-4">
              <div>
                <p className="text-xs font-medium text-muted-foreground">Planned profit (from requirements)</p>
                <p className="mt-1 text-lg font-semibold tabular-nums">{formatMoney(plannedProfitTotal)}</p>
              </div>
              <Link href="/ledger" className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline">
                View ledger <ChevronRight className="h-4 w-4" />
              </Link>
            </div>
            {cashFlowByMonth.length > 0 && (
              <div>
                <h3 className="text-sm font-medium mb-2">Cash flow over time (line)</h3>
                <div className="h-72 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart
                      data={cashFlowByMonth.map((r) => ({
                        ...r,
                        monthLabel: r.month,
                        Billed: r.client_invoice,
                        Received: r.client_payment,
                        'Paid out': r.vendor_payment,
                      }))}
                      margin={{ top: 5, right: 20, left: 0, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis dataKey="monthLabel" tick={{ fontSize: 12 }} />
                      <YAxis tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`} tick={{ fontSize: 12 }} />
                      <Tooltip formatter={(v: number | undefined) => [formatMoney(v ?? 0), '']} labelFormatter={(l) => `Month: ${l}`} />
                      <Legend />
                      <Line type="monotone" dataKey="Received" stroke="#22c55e" strokeWidth={2} dot={{ r: 3 }} name="Received" />
                      <Line type="monotone" dataKey="Paid out" stroke="#ef4444" strokeWidth={2} dot={{ r: 3 }} name="Paid out" />
                      <Line type="monotone" dataKey="Billed" stroke="#3b82f6" strokeWidth={2} dot={{ r: 3 }} name="Billed" />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}
            <div>
              <h3 className="text-sm font-medium mb-2">Summary (bar)</h3>
              <BarChart
                data={[
                  ['Received', clientPayments],
                  ['Paid out', vendorPaid],
                ]}
                labels={{ Received: 'Received', 'Paid out': 'Paid out' }}
                formatValue={formatMoney}
                maxVal={Math.max(clientPayments, vendorPaid, 1)}
              />
            </div>
          </div>
        </section>
      )}

      {view === 'invoices' && (
        <section className="rounded-2xl border border-border bg-card overflow-hidden shadow-sm">
          <div className="flex items-center gap-2 border-b border-border bg-muted/30 px-4 py-3">
            <FileText className="h-4 w-4 text-muted-foreground" />
            <h2 className="text-sm font-semibold">Invoices by status</h2>
          </div>
          <div className="p-4">
            {invoiceData.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">No invoices yet.</p>
            ) : (
              <>
                <div className="flex flex-col gap-6 sm:flex-row sm:items-start">
                  <div className="w-full sm:w-64 h-64 shrink-0">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={invoicePieData}
                          cx="50%"
                          cy="50%"
                          innerRadius={50}
                          outerRadius={80}
                          paddingAngle={2}
                          dataKey="value"
                          nameKey="name"
                          label={({ name, percent }) => `${name} ${((percent ?? 0) * 100).toFixed(0)}%`}
                        >
                          {invoicePieData.map((_, i) => (
                            <Cell key={i} fill={COLORS[i % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(v: number | undefined) => [v ?? 0, 'Count']} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="flex-1 min-w-0">
                    <BarChart
                      data={invoiceData.map(([k]) => [k, invoiceAmountByStatus[k] ?? 0])}
                      labels={statusLabels}
                      formatValue={formatMoney}
                      maxVal={Math.max(...Object.values(invoiceAmountByStatus), 1)}
                    />
                  </div>
                </div>
                <div className="mt-4 flex items-center gap-2 text-sm text-muted-foreground">
                  <List className="h-4 w-4" />
                  Counts: {invoiceData.map(([k, v]) => `${statusLabels[k] ?? k}: ${v}`).join(', ')}
                </div>
              </>
            )}
            <Link href="/finance" className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline">
              View finance <ChevronRight className="h-4 w-4" />
            </Link>
          </div>
        </section>
      )}
    </div>
  );
}
