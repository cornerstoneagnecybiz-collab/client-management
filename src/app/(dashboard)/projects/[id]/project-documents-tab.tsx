'use client';

import * as React from 'react';
import { FileText, Table2, Pencil, Trash2, FolderOpen, FileDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { SlidePanel } from '@/components/ui/slide-panel';
import { createProjectDocument, updateProjectDocument, deleteProjectDocument } from './actions/documents';
import type { ProjectDocument } from '@/types/database';

interface ProjectDocumentsTabProps {
  projectId: string;
  documents: ProjectDocument[];
}

interface TextDocContent {
  type?: string;
  content?: unknown[];
  text?: string;
}

interface SheetContent {
  rows?: string[][];
}

const DEFAULT_TEXT: TextDocContent = { type: 'doc', text: '' };
const DEFAULT_SHEET: SheetContent = { rows: [['']] };

function exportDocAsPdf(doc: ProjectDocument) {
  const isText = doc.doc_type === 'text';
  const textContent = (doc.content_json as TextDocContent | null)?.text ?? '';
  const sheetRows = (doc.content_json as SheetContent | null)?.rows ?? [];
  const win = window.open('', '_blank');
  if (!win) return;
  const tableHtml =
    sheetRows.length > 0
      ? `<table border="1" cellpadding="8" cellspacing="0" style="border-collapse: collapse; width: 100%;"><tbody>${sheetRows
          .map(
            (row) =>
              `<tr>${row.map((c) => `<td>${escapeHtml(c)}</td>`).join('')}</tr>`
          )
          .join('')}</tbody></table>`
      : '';
  win.document.write(`
    <!DOCTYPE html>
    <html>
      <head><title>${escapeHtml(doc.title)}</title>
        <style>body { font-family: system-ui, sans-serif; padding: 24px; max-width: 800px; margin: 0 auto; } pre { white-space: pre-wrap; }</style>
      </head>
      <body>
        <h1>${escapeHtml(doc.title)}</h1>
        ${isText ? `<pre>${escapeHtml(textContent)}</pre>` : tableHtml}
      </body>
    </html>
  `);
  win.document.close();
  win.focus();
  setTimeout(() => {
    win.print();
    win.close();
  }, 250);
}

function escapeHtml(s: string): string {
  const el = document.createElement('div');
  el.textContent = s;
  return el.innerHTML;
}

export function ProjectDocumentsTab({ projectId, documents: initialDocs }: ProjectDocumentsTabProps) {
  const [documents, setDocuments] = React.useState(initialDocs);
  const [openId, setOpenId] = React.useState<string | null>(null);
  const [creating, setCreating] = React.useState<'text' | 'sheet' | null>(null);
  const [createError, setCreateError] = React.useState<string | null>(null);

  const openDoc = documents.find((d) => d.id === openId);
  const isText = openDoc?.doc_type === 'text';
  const isSheet = openDoc?.doc_type === 'sheet';

  const addDocument = async (doc_type: 'text' | 'sheet') => {
    setCreateError(null);
    setCreating(doc_type);
    const title = doc_type === 'text' ? 'Untitled document' : 'Untitled sheet';
    const { id, error } = await createProjectDocument(projectId, title, doc_type);
    setCreating(null);
    if (error) {
      setCreateError(error);
      return;
    }
    if (!id) {
      setCreateError('Could not create document');
      return;
    }
    const content_json = (doc_type === 'text' ? DEFAULT_TEXT : DEFAULT_SHEET) as Record<string, unknown>;
    setDocuments((prev) => [
      {
        id,
        project_id: projectId,
        title,
        doc_type,
        content_json,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      ...prev,
    ]);
    setOpenId(id);
  };

  const removeDocument = async (id: string) => {
    const { error } = await deleteProjectDocument(id);
    if (error) return;
    setDocuments((prev) => prev.filter((d) => d.id !== id));
    if (openId === id) setOpenId(null);
  };

  return (
    <div className="glass-card overflow-hidden">
      <div className="flex flex-col gap-2 border-b border-border px-4 py-3">
        {createError && (
          <p className="text-sm text-destructive" role="alert">
            {createError}
          </p>
        )}
        <div className="flex items-center justify-between">
          <h2 className="font-medium">Documents</h2>
          <div className="flex gap-2">
          <Button
            size="sm"
            variant="outline"
            disabled={creating !== null}
            onClick={() => addDocument('text')}
          >
            <FileText className="h-4 w-4" />
            New text doc
          </Button>
          <Button
            size="sm"
            variant="outline"
            disabled={creating !== null}
            onClick={() => addDocument('sheet')}
          >
            <Table2 className="h-4 w-4" />
            New sheet
          </Button>
        </div>
        </div>
      </div>
      {documents.length === 0 ? (
        <div className="p-12 text-center">
          <FolderOpen className="mx-auto h-12 w-12 text-muted-foreground/50" />
          <p className="mt-3 text-sm font-medium text-foreground">No documents yet</p>
          <p className="mt-1 text-sm text-muted-foreground">Create a text doc or sheet to get started.</p>
        </div>
      ) : (
        <ul className="divide-y divide-border">
          {documents.map((doc) => (
            <li
              key={doc.id}
              className="flex items-center gap-3 px-4 py-3 hover:bg-muted/30"
            >
              {doc.doc_type === 'text' ? (
                <FileText className="h-4 w-4 text-muted-foreground" />
              ) : (
                <Table2 className="h-4 w-4 text-muted-foreground" />
              )}
              <button
                type="button"
                className="min-w-0 flex-1 text-left text-sm font-medium hover:underline"
                onClick={() => setOpenId(doc.id)}
              >
                {doc.title}
              </button>
              <span className="text-xs text-muted-foreground">
                {new Date(doc.updated_at).toLocaleDateString()}
              </span>
              <Button
                size="icon"
                variant="ghost"
                className="h-8 w-8"
                onClick={() => setOpenId(doc.id)}
                aria-label="Open"
              >
                <Pencil className="h-4 w-4" />
              </Button>
              <Button
                size="icon"
                variant="ghost"
                className="h-8 w-8 text-destructive hover:text-destructive"
                onClick={() => removeDocument(doc.id)}
                aria-label="Delete"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </li>
          ))}
        </ul>
      )}

      {openDoc && (
        <DocEditorPanel
          doc={openDoc}
          onClose={() => setOpenId(null)}
          onUpdate={(updates) => {
            setDocuments((prev) =>
              prev.map((d) =>
                d.id === openDoc.id
                  ? { ...d, ...updates, updated_at: new Date().toISOString() }
                  : d
              )
            );
          }}
          onExportPdf={() => exportDocAsPdf(openDoc)}
        />
      )}
    </div>
  );
}

interface DocEditorPanelProps {
  doc: ProjectDocument;
  onClose: () => void;
  onUpdate: (updates: Partial<ProjectDocument>) => void;
  onExportPdf?: () => void;
}

function DocEditorPanel({ doc, onClose, onUpdate, onExportPdf }: DocEditorPanelProps) {
  const [title, setTitle] = React.useState(doc.title);
  const [contentJson, setContentJson] = React.useState(doc.content_json);

  const isText = doc.doc_type === 'text';
  const isSheet = doc.doc_type === 'sheet';

  const textContent = (contentJson as TextDocContent | null)?.text ?? '';
  const sheetRows = (contentJson as SheetContent | null)?.rows ?? [['']];

  const saveTitle = async () => {
    const t = title.trim() || 'Untitled';
    if (t === doc.title) return;
    const { error } = await updateProjectDocument(doc.id, { title: t });
    if (!error) onUpdate({ title: t });
  };

  const saveContent = async (next: Record<string, unknown> | null) => {
    const { error } = await updateProjectDocument(doc.id, { content_json: next });
    if (!error) onUpdate({ content_json: next });
  };

  const setText = (value: string) => {
    const next = { ...(contentJson as object || {}), text: value };
    setContentJson(next);
    saveContent(next);
  };

  const setSheetRows = (rows: string[][]) => {
    const next = { rows };
    setContentJson(next);
    saveContent(next);
  };

  const addSheetRow = () => {
    const cols = sheetRows[0]?.length ?? 1;
    setSheetRows([...sheetRows, Array(cols).fill('')]);
  };

  const addSheetCol = () => {
    setSheetRows(sheetRows.map((r) => [...r, '']));
  };

  const setSheetCell = (rowIdx: number, colIdx: number, value: string) => {
    const next = sheetRows.map((r) => [...r]);
    if (!next[rowIdx]) next[rowIdx] = [];
    next[rowIdx][colIdx] = value;
    setSheetRows(next);
  };

  return (
    <SlidePanel open={true} onOpenChange={(open) => !open && onClose()} title={title}>
      <div className="space-y-4">
        {onExportPdf && (
          <div className="flex justify-end">
            <Button size="sm" variant="outline" onClick={onExportPdf}>
              <FileDown className="h-4 w-4" />
              Export PDF
            </Button>
          </div>
        )}
        <div>
          <label className="text-xs text-muted-foreground">Title</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onBlur={saveTitle}
            className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>

        {isText && (
          <div>
            <label className="text-xs text-muted-foreground">Content</label>
            <textarea
              value={textContent}
              onChange={(e) => setText(e.target.value)}
              onBlur={() => saveContent({ ...(contentJson as object || {}), text: textContent })}
              className="mt-1 min-h-[300px] w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              placeholder="Write your document..."
            />
          </div>
        )}

        {isSheet && (
          <div>
            <div className="mb-2 flex gap-2">
              <Button size="sm" variant="outline" onClick={addSheetRow}>
                Add row
              </Button>
              <Button size="sm" variant="outline" onClick={addSheetCol}>
                Add column
              </Button>
            </div>
            <div className="overflow-auto rounded-lg border border-border">
              <table className="w-full border-collapse text-sm">
                <tbody>
                  {sheetRows.map((row, ri) => (
                    <tr key={ri}>
                      {row.map((cell, ci) => (
                        <td key={ci} className="border border-border p-0">
                          <input
                            type="text"
                            value={cell}
                            onChange={(e) => setSheetCell(ri, ci, e.target.value)}
                            onBlur={() => saveContent({ rows: sheetRows })}
                            className="min-w-[120px] border-0 bg-transparent px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-ring"
                          />
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </SlidePanel>
  );
}
