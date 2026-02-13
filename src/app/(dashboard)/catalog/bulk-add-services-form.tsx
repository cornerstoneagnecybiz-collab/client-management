'use client';

import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { createServicesBulk, type ServiceInput } from './actions';
import { parseCsvToServices, CSV_EXAMPLE, CSV_HEADER_ROW, type ParsedServiceRow } from './csv-parser';
import { ClipboardPaste, Upload, FileSpreadsheet, Copy } from 'lucide-react';
import type { CatalogType } from '@/types/database';

interface BulkAddServicesFormProps {
  onSuccess: () => void;
  onCancel: () => void;
}

type Mode = 'paste' | 'upload';

const CATALOG_TYPE_OPTIONS: { value: CatalogType; label: string }[] = [
  { value: 'goods', label: 'Goods' },
  { value: 'services', label: 'Services' },
  { value: 'consulting', label: 'Consulting' },
];

function parsedToInput(row: ParsedServiceRow, catalog_type: CatalogType): ServiceInput {
  return {
    service_name: row.service_name,
    category: row.category || null,
    service_type: row.service_type || null,
    catalog_type,
    our_rate_min: row.our_rate_min ? parseFloat(row.our_rate_min) : null,
    our_rate_max: row.our_rate_max ? parseFloat(row.our_rate_max) : null,
    commission: row.commission ? parseFloat(row.commission) : null,
    default_client_rate: row.default_client_rate ? parseFloat(row.default_client_rate) : null,
  };
}

export function BulkAddServicesForm({ onSuccess, onCancel }: BulkAddServicesFormProps) {
  const [mode, setMode] = useState<Mode>('paste');
  const [catalogType, setCatalogType] = useState<CatalogType>('services');
  const [pasteValue, setPasteValue] = useState('');
  const [parsed, setParsed] = useState<ParsedServiceRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ created: number; errors: { row: number; message: string }[] } | null>(null);
  const [copiedHeaders, setCopiedHeaders] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function handleCopyHeaderRow() {
    try {
      await navigator.clipboard.writeText(CSV_HEADER_ROW);
      setCopiedHeaders(true);
      setTimeout(() => setCopiedHeaders(false), 2000);
    } catch {
      setCopiedHeaders(false);
    }
  }

  function handleParse() {
    setResult(null);
    const rows = parseCsvToServices(pasteValue);
    setParsed(rows);
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    setResult(null);
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const text = String(reader.result ?? '');
      const rows = parseCsvToServices(text);
      setParsed(rows);
      setPasteValue(text);
      setMode('paste');
    };
    reader.readAsText(file, 'UTF-8');
    e.target.value = '';
  }

  function clearAll() {
    setParsed([]);
    setPasteValue('');
    setResult(null);
  }

  async function handleImport() {
    setResult(null);
    const valid = parsed.filter((r) => (r.service_name?.trim() ?? '').length > 0);
    if (valid.length === 0) {
      setResult({ created: 0, errors: [{ row: 0, message: 'No valid rows (need at least a name).' }] });
      return;
    }
    setLoading(true);
    const bulkResult = await createServicesBulk(valid.map((row) => parsedToInput(row, catalogType)));
    setLoading(false);
    setResult(bulkResult);
    if (bulkResult.created > 0) onSuccess();
  }

  const validCount = parsed.filter((r) => (r.service_name?.trim() ?? '').length > 0).length;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3 border-b border-border pb-3">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-muted-foreground">Add as:</span>
          <select
            value={catalogType}
            onChange={(e) => setCatalogType(e.target.value as CatalogType)}
            className="rounded-lg border border-border bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          >
            {CATALOG_TYPE_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
        <div className="flex gap-2">
          <Button
            type="button"
            variant={mode === 'paste' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setMode('paste')}
          >
            <ClipboardPaste className="h-4 w-4" />
            Paste from sheet
          </Button>
          <Button
            type="button"
            variant={mode === 'upload' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => { setMode('upload'); fileInputRef.current?.click(); }}
          >
            <Upload className="h-4 w-4" />
            Upload CSV
          </Button>
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv,text/csv,application/csv"
          className="hidden"
          onChange={handleFileChange}
        />
      </div>

      {mode === 'paste' && (
        <div>
          <div className="flex items-center justify-between gap-2 mb-2">
            <p className="text-sm text-muted-foreground">
              Paste comma-separated values from Excel or Google Sheets. First row can be a header (code, name, category, …).
            </p>
            <Button type="button" variant="outline" size="sm" onClick={handleCopyHeaderRow}>
              <Copy className="h-4 w-4 mr-1.5" />
              {copiedHeaders ? 'Copied' : 'Copy header row'}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground mb-1.5">Paste in row 1 of your sheet to get column headers.</p>
          <textarea
            className="w-full min-h-[180px] rounded-xl border border-border bg-background px-3 py-2 text-sm font-mono placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            placeholder={CSV_EXAMPLE}
            value={pasteValue}
            onChange={(e) => setPasteValue(e.target.value)}
            spellCheck={false}
          />
          <Button type="button" variant="outline" size="sm" className="mt-2" onClick={handleParse}>
            Parse and preview
          </Button>
        </div>
      )}

      {mode === 'upload' && !parsed.length && (
        <div
          className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-border bg-muted/20 py-12 px-4"
          onClick={() => fileInputRef.current?.click()}
        >
          <FileSpreadsheet className="h-12 w-12 text-muted-foreground mb-3" />
          <p className="text-sm font-medium">Drop a CSV file or click to browse</p>
          <p className="text-xs text-muted-foreground mt-1">Columns: name, category, sub-type, our_min, our_max, commission, default_client_rate (code auto-generated)</p>
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,text/csv,application/csv"
            className="hidden"
            onChange={handleFileChange}
          />
        </div>
      )}

      {parsed.length > 0 && (
        <>
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium">
              {validCount} row{validCount === 1 ? '' : 's'} to import (name required; code auto-generated)
            </p>
            <Button type="button" variant="ghost" size="sm" onClick={clearAll}>
              Clear
            </Button>
          </div>
          <div className="overflow-x-auto rounded-lg border border-border">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  <th className="text-left font-medium px-3 py-2">Name</th>
                  <th className="text-left font-medium px-3 py-2 w-20">Category</th>
                  <th className="text-left font-medium px-3 py-2 w-20">Sub-type</th>
                  <th className="text-right font-medium px-3 py-2 w-20">Our min</th>
                  <th className="text-right font-medium px-3 py-2 w-20">Our max</th>
                  <th className="text-right font-medium px-3 py-2 w-16">Commission</th>
                  <th className="text-right font-medium px-3 py-2 w-24">Client rate</th>
                </tr>
              </thead>
              <tbody>
                {parsed.slice(0, 20).map((row, index) => (
                  <tr key={index} className={`border-b border-border/50 ${index % 2 === 1 ? 'bg-muted/5' : ''}`}>
                    <td className="px-3 py-1.5">{row.service_name || '—'}</td>
                    <td className="px-3 py-1.5 text-muted-foreground">{row.category || '—'}</td>
                    <td className="px-3 py-1.5 text-muted-foreground">{row.service_type || '—'}</td>
                    <td className="px-3 py-1.5 text-right tabular-nums">{row.our_rate_min || '—'}</td>
                    <td className="px-3 py-1.5 text-right tabular-nums">{row.our_rate_max || '—'}</td>
                    <td className="px-3 py-1.5 text-right tabular-nums">{row.commission || '—'}</td>
                    <td className="px-3 py-1.5 text-right tabular-nums">{row.default_client_rate || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {parsed.length > 20 && (
            <p className="text-xs text-muted-foreground">Showing first 20 of {parsed.length} rows. All will be imported.</p>
          )}

          {result && (
            <div className={`rounded-lg border p-3 text-sm ${result.errors.length > 0 ? 'border-amber-500/50 bg-amber-500/10' : 'border-emerald-500/50 bg-emerald-500/10'}`}>
              {result.created > 0 && <p className="font-medium text-emerald-700 dark:text-emerald-400">Added {result.created} item{result.created === 1 ? '' : 's'}.</p>}
              {result.errors.length > 0 && (
                <ul className="mt-2 list-disc list-inside text-amber-700 dark:text-amber-300">
                  {result.errors.map((e, i) => (
                    <li key={i}>Row {e.row}: {e.message}</li>
                  ))}
                </ul>
              )}
              {result.created > 0 && result.errors.length === 0 && (
                <p className="text-muted-foreground mt-1">You can close this panel or add more.</p>
              )}
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <Button onClick={handleImport} disabled={loading || validCount === 0}>
              {loading ? 'Importing…' : `Import ${validCount} item${validCount === 1 ? '' : 's'}`}
            </Button>
            <Button type="button" variant="outline" onClick={onCancel}>
              Cancel
            </Button>
          </div>
        </>
      )}

      {mode === 'upload' && parsed.length === 0 && (
        <div className="flex gap-3 pt-2">
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
        </div>
      )}
    </div>
  );
}
