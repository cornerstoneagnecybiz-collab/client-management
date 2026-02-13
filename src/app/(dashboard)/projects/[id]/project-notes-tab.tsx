'use client';

import * as React from 'react';
import Link from 'next/link';
import { MessageSquarePlus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { createProjectNote, updateProjectNote, deleteProjectNote } from './actions/notes';

interface ReqRow {
  id: string;
  service_name: string;
  title: string;
}

interface VendorRow {
  id: string;
  name: string;
}

interface NoteRow {
  id: string;
  content: string;
  created_at: string;
  updated_at: string;
}

interface ProjectNotesTabProps {
  projectId: string;
  notes: NoteRow[];
  requirements: ReqRow[];
  vendors: VendorRow[];
}

const MENTION_REGEX = /\[@(req|vendor):([^\]]+)\]/g;
const DATE_REGEX = /\[#(\d{4}-\d{2}-\d{2})\]/g;

function parseContent(
  content: string,
  reqMap: Map<string, ReqRow>,
  vendorMap: Map<string, VendorRow>
): React.ReactNode[] {
  const parts: React.ReactNode[] = [];
  let lastIndex = 0;
  const combined = new RegExp(`${MENTION_REGEX.source}|${DATE_REGEX.source}`, 'g');
  let m: RegExpExecArray | null;
  combined.lastIndex = 0;
  while ((m = combined.exec(content)) !== null) {
    if (m.index > lastIndex) {
      parts.push(content.slice(lastIndex, m.index));
    }
    if (m[0].startsWith('[@')) {
      const type = m[1];
      const id = m[2];
      if (type === 'req') {
        const req = reqMap.get(id);
        parts.push(
          <Link
            key={`req-${id}-${m.index}`}
            href={`/requirements?id=${id}`}
            className="font-medium text-primary hover:underline"
          >
            @{req?.service_name ?? req?.title ?? id}
          </Link>
        );
      } else {
        const vendor = vendorMap.get(id);
        parts.push(
          <span key={`vendor-${id}-${m.index}`} className="font-medium text-primary">
            @{vendor?.name ?? id}
          </span>
        );
      }
    } else {
      const dateStr = m[1];
      parts.push(
        <span key={`date-${m.index}`} className="text-muted-foreground">
          #{new Date(dateStr + 'Z').toLocaleDateString('en-US')}
        </span>
      );
    }
    lastIndex = m.index + m[0].length;
  }
  if (lastIndex < content.length) {
    parts.push(content.slice(lastIndex));
  }
  return parts.length ? parts : [content];
}

export function ProjectNotesTab({
  projectId,
  notes: initialNotes,
  requirements,
  vendors,
}: ProjectNotesTabProps) {
  const [notes, setNotes] = React.useState(initialNotes);
  const [newContent, setNewContent] = React.useState('');
  const [editingId, setEditingId] = React.useState<string | null>(null);
  const [editContent, setEditContent] = React.useState('');
  const [mentionOpen, setMentionOpen] = React.useState(false);
  const [mentionStart, setMentionStart] = React.useState(0);
  const [mentionFilter, setMentionFilter] = React.useState('');
  const textareaRef = React.useRef<HTMLTextAreaElement>(null);
  const editTextareaRef = React.useRef<HTMLTextAreaElement>(null);

  const reqMap = React.useMemo(() => new Map(requirements.map((r) => [r.id, r])), [requirements]);
  const vendorMap = React.useMemo(() => new Map(vendors.map((v) => [v.id, v])), [vendors]);

  const mentionOptions = React.useMemo(() => {
    const q = mentionFilter.toLowerCase();
    const reqs = requirements
      .filter((r) => !q || r.service_name.toLowerCase().includes(q) || (r.title || '').toLowerCase().includes(q))
      .map((r) => ({ type: 'req' as const, id: r.id, label: r.service_name }));
    const vends = vendors
      .filter((v) => !q || v.name.toLowerCase().includes(q))
      .map((v) => ({ type: 'vendor' as const, id: v.id, label: v.name }));
    return [...reqs, ...vends];
  }, [requirements, vendors, mentionFilter]);

  const openMentionAt = (start: number, forEdit: boolean) => {
    setMentionStart(start);
    setMentionFilter('');
    setMentionForEdit(forEdit);
    setMentionOpen(true);
  };

  const insertMention = (type: 'req' | 'vendor', id: string, forEdit: boolean) => {
    const marker = `[@${type}:${id}]`;
    if (!forEdit) {
      const v = newContent;
      const before = v.slice(0, mentionStart);
      const after = v.slice(mentionStart);
      setNewContent(before + marker + (after.startsWith('@') ? after.slice(1) : after));
      setTimeout(() => textareaRef.current?.focus(), 0);
    } else {
      const v = editContent;
      const before = v.slice(0, mentionStart);
      const after = v.slice(mentionStart);
      setEditContent(before + marker + (after.startsWith('@') ? after.slice(1) : after));
      setTimeout(() => editTextareaRef.current?.focus(), 0);
    }
    setMentionOpen(false);
  };

  const handleNewKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (mentionOpen && !mentionForEdit) {
      if (e.key === 'Escape') setMentionOpen(false);
      return;
    }
    const ta = e.currentTarget;
    const pos = ta.selectionStart ?? 0;
    if (e.key === '@') openMentionAt(pos, false);
  };

  const handleNewInput = (e: React.FormEvent<HTMLTextAreaElement>) => {
    const ta = e.target as HTMLTextAreaElement;
    const v = ta.value;
    setNewContent(v);
    if (mentionOpen) {
      const slice = v.slice(mentionStart, ta.selectionStart ?? v.length);
      const at = slice.indexOf('@');
      const afterAt = at >= 0 ? slice.slice(at + 1) : '';
      if (afterAt.includes(' ') || afterAt.includes('\n')) setMentionOpen(false);
      else setMentionFilter(afterAt);
    }
  };

  const handleEditKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (mentionOpen && mentionForEdit) {
      if (e.key === 'Escape') setMentionOpen(false);
      return;
    }
    const ta = e.currentTarget;
    if (e.key === '@') openMentionAt(ta.selectionStart ?? 0, true);
  };

  const handleEditInput = (e: React.FormEvent<HTMLTextAreaElement>) => {
    const ta = e.target as HTMLTextAreaElement;
    const v = ta.value;
    setEditContent(v);
    if (mentionOpen) {
      const pos = ta.selectionStart ?? 0;
      const slice = v.slice(mentionStart, pos);
      const at = slice.indexOf('@');
      const afterAt = at >= 0 ? slice.slice(at + 1) : '';
      if (afterAt.includes(' ') || afterAt.includes('\n')) setMentionOpen(false);
      else setMentionFilter(afterAt);
    }
  };

  const submitNew = async () => {
    const content = newContent.trim();
    if (!content) return;
    const { id, error } = await createProjectNote(projectId, content);
    if (error) return;
    setNewContent('');
    setNotes((prev) => [
      { id: id!, content, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
      ...prev,
    ]);
  };

  const startEdit = (n: NoteRow) => {
    setEditingId(n.id);
    setEditContent(n.content);
    setMentionOpen(false);
  };

  const saveEdit = async () => {
    if (!editingId) return;
    const { error } = await updateProjectNote(editingId, editContent);
    if (error) return;
    setNotes((prev) =>
      prev.map((n) =>
        n.id === editingId ? { ...n, content: editContent, updated_at: new Date().toISOString() } : n
      )
    );
    setEditingId(null);
  };

  const removeNote = async (id: string) => {
    const { error } = await deleteProjectNote(id);
    if (error) return;
    setNotes((prev) => prev.filter((n) => n.id !== id));
    if (editingId === id) setEditingId(null);
  };

  const [mentionForEdit, setMentionForEdit] = React.useState(false);
  const showMentionInNew = !editingId && mentionOpen;
  const showMentionInEdit = mentionForEdit && mentionOpen;

  return (
    <div className="glass-card overflow-hidden">
      <div className="border-b border-border p-4">
        <p className="text-xs text-muted-foreground mb-2">
          Use <kbd className="rounded border bg-muted px-1">@</kbd> to tag requirements or vendors. Use{' '}
          <kbd className="rounded border bg-muted px-1">#YYYY-MM-DD</kbd> for dates.
        </p>
        <div className="relative">
          <textarea
            ref={textareaRef}
            placeholder="Add a note..."
            value={newContent}
            onChange={handleNewInput}
            onKeyDown={handleNewKeyDown}
            className="min-h-[100px] w-full rounded-lg border border-border bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            rows={3}
          />
          {showMentionInNew && (
            <div className="absolute left-0 top-full z-10 mt-1 max-h-48 w-72 overflow-auto rounded-lg border border-border bg-popover shadow-md">
              {mentionOptions.length === 0 ? (
                <div className="p-2 text-sm text-muted-foreground">No matches</div>
              ) : (
                mentionOptions.map((opt) => (
                  <button
                    key={`${opt.type}-${opt.id}`}
                    type="button"
                    className="w-full px-3 py-2 text-left text-sm hover:bg-muted"
                    onClick={() => insertMention(opt.type, opt.id, false)}
                  >
                    <span className="text-muted-foreground">{opt.type === 'req' ? 'Req' : 'Vendor'}:</span> {opt.label}
                  </button>
                ))
              )}
            </div>
          )}
        </div>
        <div className="mt-2 flex gap-2">
          <Button size="sm" onClick={submitNew}>
            <MessageSquarePlus className="h-4 w-4" />
            Add note
          </Button>
        </div>
      </div>
      <ul className="divide-y divide-border">
        {notes.map((note) => (
          <li key={note.id} className="p-4">
            {editingId === note.id ? (
              <div className="relative">
                <textarea
                  ref={editTextareaRef}
                  value={editContent}
                  onChange={(e) => setEditContent(e.target.value)}
                  onKeyDown={handleEditKeyDown}
                  onInput={handleEditInput}
                  className="min-h-[80px] w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  rows={3}
                />
                {showMentionInEdit && (
                  <div className="absolute left-0 top-full z-10 mt-1 max-h-48 w-72 overflow-auto rounded-lg border border-border bg-popover shadow-md">
                    {mentionOptions.map((opt) => (
                      <button
                        key={`${opt.type}-${opt.id}`}
                        type="button"
                        className="w-full px-3 py-2 text-left text-sm hover:bg-muted"
                        onClick={() => insertMention(opt.type, opt.id, true)}
                      >
                        {opt.type === 'req' ? 'Req' : 'Vendor'}: {opt.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div className="text-sm text-foreground">
                {parseContent(note.content, reqMap, vendorMap)}
              </div>
            )}
            <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
              {editingId === note.id ? (
                <>
                  <Button size="sm" onClick={saveEdit}>Save</Button>
                  <Button size="sm" variant="ghost" onClick={() => setEditingId(null)}>Cancel</Button>
                </>
              ) : (
                <>
                  <time dateTime={note.updated_at}>
                    {new Date(note.updated_at).toLocaleString('en-US')}
                  </time>
                  <button
                    type="button"
                    className="text-primary hover:underline"
                    onClick={() => startEdit(note)}
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    className="text-destructive hover:underline"
                    onClick={() => removeNote(note.id)}
                  >
                    <Trash2 className="h-3 w-3 inline" /> Delete
                  </button>
                </>
              )}
            </div>
          </li>
        ))}
      </ul>
      {notes.length === 0 && (
        <div className="p-8 text-center text-sm text-muted-foreground">
          No notes yet. Add one above.
        </div>
      )}
    </div>
  );
}
