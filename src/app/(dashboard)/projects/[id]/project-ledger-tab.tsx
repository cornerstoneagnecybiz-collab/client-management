'use client';

import { Suspense } from 'react';
import { LedgerView } from '@/app/(dashboard)/ledger/ledger-view';
import type { LedgerEntryRow } from '@/app/(dashboard)/ledger/page';

interface ProjectLedgerTabProps {
  projectId: string;
  projectName: string;
  entries: LedgerEntryRow[];
}

export function ProjectLedgerTab({ projectId, projectName, entries }: ProjectLedgerTabProps) {
  return (
    <Suspense fallback={<div className="h-64 rounded-xl bg-muted/30 animate-pulse" />}>
      <LedgerView
        initialEntries={entries}
        projectOptions={[{ value: projectId, label: projectName }]}
        initialProjectId={null}
        initialDateFrom={null}
        initialDateTo={null}
        singleProject={{ id: projectId, name: projectName }}
      />
    </Suspense>
  );
}
