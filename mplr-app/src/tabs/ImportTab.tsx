import React, { useRef, useState } from 'react';
import { useMPLRStore } from '../store';
import { Badge, Button, Card, EmptyState } from '../components/ui';
import { parseMPLRWorkbook, type ImportResult } from '../lib/importWorkbook';

type ImportMode = 'merge' | 'replace';

export function ImportTab() {
  const { data, saveAll } = useMPLRStore();
  const fileRef = useRef<HTMLInputElement>(null);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [fileName, setFileName] = useState('');
  const [mode, setMode] = useState<ImportMode>('merge');
  const [applying, setApplying] = useState(false);
  const [applied, setApplied] = useState(false);

  async function handleFile(file: File) {
    setApplied(false);
    setFileName(file.name);
    const buf = await file.arrayBuffer();
    try {
      const parsed = parseMPLRWorkbook(buf);
      setResult(parsed);
    } catch (e: any) {
      alert('Failed to parse workbook: ' + e.message);
      setResult(null);
    }
  }

  function apply() {
    if (!result) return;
    setApplying(true);
    const next: any = {};
    next.leases = mode === 'replace' ? result.leases : [...data.leases, ...result.leases];
    next.rateTiers =
      mode === 'replace'
        ? result.rateTiers
        : {
            newLease: [...data.rateTiers.newLease, ...result.rateTiers.newLease],
            renewal: [...data.rateTiers.renewal, ...result.rateTiers.renewal],
          };
    next.renewals = mode === 'replace' ? result.renewals : [...data.renewals, ...result.renewals];
    next.goals = mode === 'replace' ? result.goals : [...data.goals, ...result.goals];
    next.relets = mode === 'replace' ? result.relets : [...data.relets, ...result.relets];
    if (result.totalBedsHint && (!data.totalBeds || mode === 'replace')) {
      next.totalBeds = result.totalBedsHint;
    }
    saveAll(next).finally(() => {
      setApplying(false);
      setApplied(true);
    });
  }

  return (
    <div>
      <Card title="Import MPLR Workbook">
        <p className="text-sm text-surface-500 mb-4">
          Upload the property's MPLR working Excel workbook (.xlsx or .xlsm). This will look for tabs named
          similarly to <strong>MPLR</strong> (Lease Registry), <strong>Tier Tracker</strong>,{' '}
          <strong>Resident Renewal Follow-Up</strong>, <strong>Goals &amp; Actuals</strong>, and{' '}
          <strong>Resident Relets</strong>, and import each into its matching dashboard tab.
        </p>
        <input
          ref={fileRef}
          type="file"
          accept=".xlsx,.xls,.xlsm,.csv"
          className="hidden"
          onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
        />
        <div className="flex gap-3 items-center">
          <Button variant="primary" onClick={() => fileRef.current?.click()}>Choose Workbook...</Button>
          {fileName && <span className="text-sm text-surface-500">{fileName}</span>}
        </div>
      </Card>

      {result && (
        <Card title="Import Preview">
          <div className="mb-4">
            <div className="text-[12px] font-bold text-surface-500 uppercase tracking-wide mb-2">Matched Sheets</div>
            <div className="flex flex-wrap gap-2">
              {result.matchedSheets.map((m) => (
                <Badge key={m.domain} tone="success">{m.domain} &larr; "{m.sheetName}" ({m.rows} rows)</Badge>
              ))}
            </div>
          </div>

          {result.warnings.length > 0 && (
            <div className="mb-4">
              <div className="text-[12px] font-bold text-surface-500 uppercase tracking-wide mb-2">Not Found</div>
              <div className="flex flex-col gap-1">
                {result.warnings.map((w, i) => (
                  <div key={i} className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded px-3 py-2">{w}</div>
                ))}
              </div>
            </div>
          )}

          {result.totalBedsHint && (
            <div className="mb-4 text-sm text-surface-600">
              Detected total beds in property: <strong>{result.totalBedsHint}</strong>
              {data.totalBeds > 0 && <span className="text-surface-400"> (current setting: {data.totalBeds}, kept unless you choose Replace)</span>}
            </div>
          )}

          <div className="grid grid-cols-2 gap-3 mb-5 text-sm">
            <div className="border border-surface-200 rounded-lg p-3">
              <div className="font-semibold">Leases</div>
              <div className="text-surface-500">{result.leases.length} rows parsed</div>
            </div>
            <div className="border border-surface-200 rounded-lg p-3">
              <div className="font-semibold">Rate Tiers</div>
              <div className="text-surface-500">
                {result.rateTiers.newLease.length} new-lease tier(s), {result.rateTiers.renewal.length} renewal tier(s)
              </div>
            </div>
            <div className="border border-surface-200 rounded-lg p-3">
              <div className="font-semibold">Renewal Follow-Up</div>
              <div className="text-surface-500">{result.renewals.length} residents parsed</div>
            </div>
            <div className="border border-surface-200 rounded-lg p-3">
              <div className="font-semibold">Goals & Actuals</div>
              <div className="text-surface-500">{result.goals.length} weeks parsed</div>
            </div>
            <div className="border border-surface-200 rounded-lg p-3">
              <div className="font-semibold">Resident Relets</div>
              <div className="text-surface-500">{result.relets.length} rows parsed</div>
            </div>
          </div>

          <div className="flex items-center gap-4 mb-5">
            <span className="text-[12px] font-bold text-surface-500 uppercase tracking-wide">Import Mode</span>
            <label className="flex items-center gap-2 text-sm">
              <input type="radio" checked={mode === 'merge'} onChange={() => setMode('merge')} /> Merge (append to existing data)
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input type="radio" checked={mode === 'replace'} onChange={() => setMode('replace')} /> Replace (overwrite existing data)
            </label>
          </div>

          <Button variant="primary" disabled={applying} onClick={apply}>
            {applying ? 'Importing...' : `Import into ${data.property}`}
          </Button>
          {applied && <span className="ml-3 text-sm text-success font-semibold">Imported successfully.</span>}
        </Card>
      )}

      {!result && <EmptyState>Choose a workbook above to preview what will be imported.</EmptyState>}
    </div>
  );
}
