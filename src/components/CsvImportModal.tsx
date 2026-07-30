'use client';

import React, { useState, useRef } from 'react';
import { X, UploadSimple, CheckCircle, WarningCircle } from '@phosphor-icons/react';
import { parseCSV, rowsToObjects, guessColumnMapping } from '@/utils/csv';
import styles from './CsvImportModal.module.css';

export type CsvField = {
  key: string;
  label: string;
  required?: boolean;
};

type Props = {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  fields: CsvField[];
  // Called once per row after mapping — throw or return an error string to
  // record a per-row failure without aborting the whole import.
  onImportRow: (record: Record<string, string>) => Promise<void>;
};

export default function CsvImportModal({ isOpen, onClose, title, description, fields, onImportRow }: Props) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState('');
  const [headers, setHeaders] = useState<string[]>([]);
  const [records, setRecords] = useState<Record<string, string>[]>([]);
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const [isImporting, setIsImporting] = useState(false);
  const [result, setResult] = useState<{ success: number; failed: number; errors: string[] } | null>(null);

  if (!isOpen) return null;

  const reset = () => {
    setFileName('');
    setHeaders([]);
    setRecords([]);
    setMapping({});
    setResult(null);
  };

  const handleFile = async (file: File) => {
    setResult(null);
    const text = await file.text();
    const rows = parseCSV(text);
    const { headers: h, records: r } = rowsToObjects(rows);
    setFileName(file.name);
    setHeaders(h);
    setRecords(r);
    setMapping(guessColumnMapping(h, fields.map(f => f.key)));
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) handleFile(file);
  };

  const handleImport = async () => {
    if (isImporting) return;
    const missingRequired = fields.filter(f => f.required && !mapping[f.key]);
    if (missingRequired.length > 0) {
      alert(`Please map a column for: ${missingRequired.map(f => f.label).join(', ')}`);
      return;
    }
    setIsImporting(true);
    let success = 0;
    const errors: string[] = [];
    for (let i = 0; i < records.length; i++) {
      const raw = records[i];
      const mapped: Record<string, string> = {};
      fields.forEach(f => {
        if (mapping[f.key]) mapped[f.key] = raw[mapping[f.key]] ?? '';
      });
      // Skip fully blank rows (common trailing rows in exported sheets).
      if (Object.values(mapped).every(v => !v)) continue;
      try {
        await onImportRow(mapped);
        success++;
      } catch (err) {
        errors.push(`Row ${i + 2}: ${err instanceof Error ? err.message : 'Could not import this row.'}`);
      }
    }
    setResult({ success, failed: errors.length, errors });
    setIsImporting(false);
  };

  const handleClose = () => {
    if (isImporting) return;
    reset();
    onClose();
  };

  return (
    <div className={styles.backdrop} onClick={handleClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          <div>
            <h2 className={styles.title}>{title}</h2>
            {description && <p className={styles.subtitle}>{description}</p>}
          </div>
          <button type="button" className={styles.closeBtn} onClick={handleClose} disabled={isImporting} aria-label="Close">
            <X size={20} />
          </button>
        </div>

        {!fileName ? (
          <div
            className={styles.dropzone}
            onClick={() => fileInputRef.current?.click()}
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleDrop}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,text/csv"
              style={{ display: 'none' }}
              onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
            />
            <UploadSimple size={28} style={{ marginBottom: '8px' }} />
            <p>Click to choose a CSV file, or drag one here.</p>
          </div>
        ) : !result ? (
          <>
            <p className={styles.subtitle} style={{ marginBottom: '16px' }}>
              {fileName} — {records.length} row{records.length === 1 ? '' : 's'} found. Match your columns below.
            </p>
            <div className={styles.mappingGrid}>
              {fields.map(f => (
                <div key={f.key} className={styles.mappingRow}>
                  <label>{f.label}{f.required ? ' *' : ''}</label>
                  <select
                    className={styles.select}
                    value={mapping[f.key] || ''}
                    onChange={(e) => setMapping({ ...mapping, [f.key]: e.target.value })}
                  >
                    <option value="">— Don't import —</option>
                    {headers.map(h => <option key={h} value={h}>{h}</option>)}
                  </select>
                </div>
              ))}
            </div>

            <div className={styles.previewWrapper}>
              <table className={styles.previewTable}>
                <thead>
                  <tr>{fields.map(f => <th key={f.key}>{f.label}</th>)}</tr>
                </thead>
                <tbody>
                  {records.slice(0, 5).map((r, i) => (
                    <tr key={i}>
                      {fields.map(f => <td key={f.key}>{mapping[f.key] ? r[mapping[f.key]] : '—'}</td>)}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className={styles.footer}>
              <button type="button" className={`${styles.button} ${styles.cancelButton}`} onClick={reset} disabled={isImporting}>
                Choose Different File
              </button>
              <button type="button" className={`${styles.button} ${styles.primaryButton}`} onClick={handleImport} disabled={isImporting} aria-busy={isImporting}>
                {isImporting ? 'Importing…' : `Import ${records.length} Row${records.length === 1 ? '' : 's'}`}
              </button>
            </div>
          </>
        ) : (
          <>
            <div className={styles.resultBox}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--color-chart-emerald)' }}>
                <CheckCircle size={18} weight="fill" />
                <span>{result.success} imported successfully.</span>
              </div>
              {result.failed > 0 && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '8px', color: 'var(--color-chart-expense, #ef4444)' }}>
                  <WarningCircle size={18} weight="fill" />
                  <span>{result.failed} failed.</span>
                </div>
              )}
              {result.errors.length > 0 && (
                <ul className={styles.errorList}>
                  {result.errors.map((e, i) => <li key={i}>{e}</li>)}
                </ul>
              )}
            </div>
            <div className={styles.footer} style={{ marginTop: '16px' }}>
              <button type="button" className={`${styles.button} ${styles.cancelButton}`} onClick={reset}>
                Import Another File
              </button>
              <button type="button" className={`${styles.button} ${styles.primaryButton}`} onClick={handleClose}>
                Done
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
