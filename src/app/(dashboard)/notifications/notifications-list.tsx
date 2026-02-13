'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ChevronRight } from 'lucide-react';
import {
  markNotificationRead,
  markAllNotificationsRead,
  type NotificationRow,
} from './actions';

function formatTimeAgo(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const sec = Math.floor((now.getTime() - d.getTime()) / 1000);
  if (sec < 60) return 'Just now';
  if (sec < 3600) return `${Math.floor(sec / 60)}m ago`;
  if (sec < 3600 * 24) return `${Math.floor(sec / 3600)}h ago`;
  if (sec < 3600 * 24 * 7) return `${Math.floor(sec / (3600 * 24))}d ago`;
  return d.toLocaleDateString();
}

export function NotificationsList({ initialItems }: { initialItems: NotificationRow[] }) {
  const router = useRouter();
  const [items, setItems] = useState(initialItems);

  async function handleItemClick(n: NotificationRow) {
    if (!n.read_at) await markNotificationRead(n.id);
    setItems((prev) => prev.map((i) => (i.id === n.id ? { ...i, read_at: i.read_at ?? new Date().toISOString() } : i)));
    if (n.link_href) router.push(n.link_href);
  }

  async function handleMarkAllRead() {
    await markAllNotificationsRead();
    setItems((prev) => prev.map((i) => ({ ...i, read_at: i.read_at ?? new Date().toISOString() })));
  }

  const unreadCount = items.filter((n) => !n.read_at).length;

  if (items.length === 0) {
    return <p className="rounded-xl border border-border bg-muted/30 px-4 py-8 text-center text-sm text-muted-foreground">No notifications yet.</p>;
  }

  return (
    <div className="space-y-2">
      {unreadCount > 0 && (
        <div className="flex justify-end">
          <button
            type="button"
            onClick={handleMarkAllRead}
            className="text-xs text-muted-foreground hover:text-foreground"
          >
            Mark all as read
          </button>
        </div>
      )}
      <ul className="space-y-1">
        {items.map((n) => (
          <li key={n.id}>
            <button
              type="button"
              onClick={() => handleItemClick(n)}
              className={`flex w-full items-start gap-3 rounded-xl border border-border bg-card px-4 py-3 text-left transition-colors hover:bg-muted/50 ${!n.read_at ? 'border-primary/30 bg-primary/5' : ''}`}
            >
              <div className="min-w-0 flex-1">
                <p className={`text-sm ${!n.read_at ? 'font-medium' : ''}`}>{n.title}</p>
                {n.body && <p className="mt-0.5 text-xs text-muted-foreground">{n.body}</p>}
                <p className="mt-1 text-xs text-muted-foreground">{formatTimeAgo(n.created_at)}</p>
              </div>
              {n.link_href && <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
