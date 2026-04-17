// src/app/(dashboard)/dashboard/action-queue.tsx
'use client';

import { useRef, useState, type KeyboardEvent } from 'react';
import Link from 'next/link';
import { ArrowRight, Check } from 'lucide-react';
import type { CollectItem, FulfilItem, PayItem } from './_lib/types';
import { cn } from '@/lib/utils';

function formatINR(n: number): string {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n);
}

type Tab = 'collect' | 'pay' | 'fulfil';

interface Props {
  collect: CollectItem[];
  pay: PayItem[];
  fulfil: FulfilItem[];
  collectCount: number;
  payCount: number;
  fulfilCount: number;
}

const TAB_ORDER: Tab[] = ['collect', 'pay', 'fulfil'];

export function ActionQueue(p: Props) {
  const defaultTab: Tab =
    p.collectCount > 0 ? 'collect' :
    p.payCount > 0 ? 'pay' :
    p.fulfilCount > 0 ? 'fulfil' : 'collect';
  const [tab, setTab] = useState<Tab>(defaultTab);
  const tabRefs = useRef<Record<Tab, HTMLButtonElement | null>>({
    collect: null, pay: null, fulfil: null,
  });

  function onKey(e: KeyboardEvent<HTMLDivElement>) {
    const i = TAB_ORDER.indexOf(tab);
    let next: Tab | null = null;
    if (e.key === 'ArrowRight') next = TAB_ORDER[(i + 1) % TAB_ORDER.length];
    else if (e.key === 'ArrowLeft') next = TAB_ORDER[(i - 1 + TAB_ORDER.length) % TAB_ORDER.length];
    else if (e.key === 'Home') next = TAB_ORDER[0];
    else if (e.key === 'End') next = TAB_ORDER[TAB_ORDER.length - 1];
    if (next) {
      e.preventDefault();
      setTab(next);
      tabRefs.current[next]?.focus();
    }
  }

  return (
    <section className="rounded-2xl border border-border bg-card/60 p-5 backdrop-blur-xl">
      <header className="mb-3 flex items-center justify-between">
        <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          Needs attention
        </div>
        <Link
          href={tab === 'collect' ? '/billing' : tab === 'pay' ? '/settlement' : '/billing'}
          className="text-[11px] font-medium text-primary hover:underline"
        >
          View all →
        </Link>
      </header>
      <div
        role="tablist"
        aria-label="Action queue"
        onKeyDown={onKey}
        className="mb-3 flex gap-1 rounded-lg bg-muted/30 p-1"
      >
        <TabButton tabId="collect" active={tab === 'collect'} onClick={() => setTab('collect')} label="Collect" count={p.collectCount} tabRef={(el) => { tabRefs.current.collect = el; }} />
        <TabButton tabId="pay"     active={tab === 'pay'}     onClick={() => setTab('pay')}     label="Pay"     count={p.payCount}     tabRef={(el) => { tabRefs.current.pay = el; }} />
        <TabButton tabId="fulfil"  active={tab === 'fulfil'}  onClick={() => setTab('fulfil')}  label="Fulfil"  count={p.fulfilCount}  tabRef={(el) => { tabRefs.current.fulfil = el; }} />
      </div>
      <div role="tabpanel" id="aq-panel-collect" aria-labelledby="aq-tab-collect" hidden={tab !== 'collect'}>
        {p.collect.length > 0
          ? <ul>{p.collect.map((c) => <CollectRow key={c.invoice.id} item={c} />)}</ul>
          : <EmptyState text="Nothing to collect — clear." />}
      </div>
      <div role="tabpanel" id="aq-panel-pay" aria-labelledby="aq-tab-pay" hidden={tab !== 'pay'}>
        {p.pay.length > 0
          ? <ul>{p.pay.map((i) => <PayRow key={i.payout.id} item={i} />)}</ul>
          : <EmptyState text="Nothing to pay — clear." />}
      </div>
      <div role="tabpanel" id="aq-panel-fulfil" aria-labelledby="aq-tab-fulfil" hidden={tab !== 'fulfil'}>
        {p.fulfil.length > 0
          ? <ul>{p.fulfil.map((i) => <FulfilRow key={i.requirement.id} item={i} />)}</ul>
          : <EmptyState text="Nothing to fulfil — clear." />}
      </div>
    </section>
  );
}

interface TabButtonProps {
  tabId: Tab;
  active: boolean;
  onClick: () => void;
  label: string;
  count: number;
  tabRef: (el: HTMLButtonElement | null) => void;
}

function TabButton({ tabId, active, onClick, label, count, tabRef }: TabButtonProps) {
  return (
    <button
      ref={tabRef}
      role="tab"
      id={`aq-tab-${tabId}`}
      aria-selected={active}
      aria-controls={`aq-panel-${tabId}`}
      tabIndex={active ? 0 : -1}
      onClick={onClick}
      className={cn(
        'flex flex-1 items-center justify-center gap-2 rounded-md px-3 py-1.5 text-[12px] font-semibold transition-colors',
        active ? 'bg-primary/20 text-primary' : 'text-muted-foreground hover:text-foreground',
      )}
    >
      {label}
      <span className={cn('rounded-full px-1.5 py-0.5 text-[10px]', active ? 'bg-primary/25 text-primary' : 'bg-muted text-foreground/70')}>
        {count}
      </span>
    </button>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="flex items-center justify-center gap-2 py-10 text-sm text-muted-foreground">
      <Check className="h-4 w-4" /> {text}
    </div>
  );
}

function CollectRow({ item }: { item: CollectItem }) {
  const overdueBadge = item.daysOverdue != null && item.daysOverdue > 0
    ? `overdue ${item.daysOverdue}d`
    : item.daysUntilDue != null
      ? `due in ${item.daysUntilDue}d`
      : 'no due date';
  const amountClass = item.daysOverdue != null && item.daysOverdue > 0
    ? 'text-rose-400'
    : item.daysUntilDue != null && item.daysUntilDue <= 7 ? 'text-amber-400' : '';
  return (
    <li className="grid grid-cols-[1fr_auto_auto] items-center gap-3 border-b border-border py-2.5 last:border-0">
      <div>
        <div className="text-[13px] font-semibold">INV-{item.invoice.id.slice(0, 8)} · {item.clientName}</div>
        <div className="text-[11px] text-muted-foreground">
          {item.projectName} · {overdueBadge}
        </div>
      </div>
      <div className={cn('font-semibold tabular-nums', amountClass)}>{formatINR(item.amountDue)}</div>
      <Link href="/billing" className="text-[12px] font-medium text-primary hover:underline inline-flex items-center gap-1">
        Record <ArrowRight className="h-3 w-3" />
      </Link>
    </li>
  );
}

function PayRow({ item }: { item: PayItem }) {
  return (
    <li className="grid grid-cols-[1fr_auto_auto] items-center gap-3 border-b border-border py-2.5 last:border-0">
      <div>
        <div className="text-[13px] font-semibold">{item.vendorName}</div>
        <div className="text-[11px] text-muted-foreground">{item.projectName}</div>
      </div>
      <div className="font-semibold tabular-nums">{formatINR(item.payout.amount)}</div>
      <Link href="/settlement" className="text-[12px] font-medium text-primary hover:underline inline-flex items-center gap-1">
        Pay <ArrowRight className="h-3 w-3" />
      </Link>
    </li>
  );
}

function FulfilRow({ item }: { item: FulfilItem }) {
  return (
    <li className="grid grid-cols-[1fr_auto_auto] items-center gap-3 border-b border-border py-2.5 last:border-0">
      <div>
        <div className="text-[13px] font-semibold">{item.requirement.title || item.requirement.service_name}</div>
        <div className="text-[11px] text-muted-foreground">
          {item.projectName} · {item.vendorName ?? 'no vendor'} · {item.daysOpen}d open
        </div>
      </div>
      <div className="text-[11px] uppercase tracking-wider text-muted-foreground">{item.requirement.fulfilment_status}</div>
      <Link href="/billing" className="text-[12px] font-medium text-primary hover:underline inline-flex items-center gap-1">
        Open <ArrowRight className="h-3 w-3" />
      </Link>
    </li>
  );
}
