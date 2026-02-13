'use client';

import { useRouter } from 'next/navigation';
import { ChevronRight, Calendar, Repeat } from 'lucide-react';
import type { ProjectStatus } from '@/types';

const STATUS_LABELS: Record<ProjectStatus, string> = {
  draft: 'Draft',
  active: 'Active',
  on_hold: 'On hold',
  completed: 'Completed',
  cancelled: 'Cancelled',
};

const ENGAGEMENT_LABELS: Record<'one_time' | 'monthly', { label: string; short: string }> = {
  one_time: { label: 'One-time project', short: 'One-time' },
  monthly: { label: 'Monthly retainer', short: 'Monthly' },
};

interface ProjectRowProps {
  row: {
    id: string;
    name: string;
    status: ProjectStatus;
    engagement_type: 'one_time' | 'monthly';
    start_date: string | null;
    end_date: string | null;
    client_name: string;
  };
  index: number;
}

export function ProjectRow({ row, index }: ProjectRowProps) {
  const router = useRouter();

  function goToDetail() {
    router.push(`/projects/${row.id}`);
  }

  return (
    <tr
      role="button"
      tabIndex={0}
      className={`border-b border-border/50 hover:bg-muted/30 transition-colors cursor-pointer ${index % 2 === 1 ? 'bg-muted/10' : ''}`}
      onClick={goToDetail}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          goToDetail();
        }
      }}
    >
      <td className="content-cell px-4 font-medium">{row.name}</td>
      <td className="content-cell px-4 text-muted-foreground">{row.client_name}</td>
      <td className="content-cell px-4">
        <span
          className="inline-flex items-center gap-1 rounded-lg px-2 py-0.5 text-xs font-medium bg-muted text-muted-foreground"
          title={ENGAGEMENT_LABELS[row.engagement_type]?.label}
        >
          {row.engagement_type === 'monthly' ? <Repeat className="h-3 w-3" /> : <Calendar className="h-3 w-3" />}
          {ENGAGEMENT_LABELS[row.engagement_type]?.short ?? 'One-time'}
        </span>
      </td>
      <td className="content-cell px-4">
        <span className="inline-flex items-center rounded-lg px-2 py-0.5 text-xs font-medium bg-muted text-muted-foreground">
          {STATUS_LABELS[row.status]}
        </span>
      </td>
      <td className="content-cell px-4 text-muted-foreground">
        {row.start_date ? new Date(row.start_date).toLocaleDateString('en-US') : '—'}
      </td>
      <td className="content-cell px-4 text-muted-foreground">
        {row.end_date ? new Date(row.end_date).toLocaleDateString('en-US') : '—'}
      </td>
      <td className="content-cell px-2 text-muted-foreground">
        <ChevronRight className="h-4 w-4 shrink-0" aria-hidden />
      </td>
    </tr>
  );
}
