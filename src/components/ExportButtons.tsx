import { useCallback, useState } from 'react';
import type { Comment } from '../types';
import { generateCsv } from '../export/export-csv';
import { generateXlsxBlob } from '../export/export-xlsx';
import { triggerDownload } from '../export/trigger-download';
import { getAccessToken } from '../google/auth';
import { exportToSheets } from '../google/export-sheets';

interface ExportButtonsProps {
  comments: Comment[];
  filename: string;
  hasThreading: boolean;
}

export default function ExportButtons({
  comments,
  filename,
  hasThreading,
}: ExportButtonsProps) {
  const [sheetsUrl, setSheetsUrl] = useState<string | null>(null);
  const [sheetsError, setSheetsError] = useState('');
  const [sheetsLoading, setSheetsLoading] = useState(false);

  function handleCsv() {
    const csv = generateCsv(comments, hasThreading);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    triggerDownload(blob, `${filename}_comments.csv`);
  }

  function handleXlsx() {
    const blob = generateXlsxBlob(comments, hasThreading);
    triggerDownload(blob, `${filename}_comments.xlsx`);
  }

  const handleSheets = useCallback(async () => {
    setSheetsError('');
    setSheetsUrl(null);
    setSheetsLoading(true);
    try {
      const token = await getAccessToken();
      const url = await exportToSheets(comments, filename, hasThreading, token);
      setSheetsUrl(url);
    } catch (err) {
      setSheetsError(err instanceof Error ? err.message : 'Export failed');
    } finally {
      setSheetsLoading(false);
    }
  }, [comments, filename, hasThreading]);

  const buttonBase: React.CSSProperties = {
    padding: 'var(--space-2) var(--space-4)',
    borderRadius: 'var(--border-radius)',
    fontSize: 'var(--font-size-sm)',
    fontWeight: 600,
    cursor: 'pointer',
    border: 'none',
  };

  const outlinedStyle: React.CSSProperties = {
    ...buttonBase,
    background: 'var(--color-white)',
    border: '1px solid var(--color-base-lighter)',
    color: 'var(--color-base-darkest)',
  };

  return (
    <div>
      <div style={{ display: 'flex', gap: 'var(--space-2)', alignItems: 'center' }}>
        <button onClick={handleCsv} style={outlinedStyle}>CSV</button>
        <button
          onClick={handleXlsx}
          style={{
            ...buttonBase,
            background: 'var(--color-primary)',
            color: 'var(--color-white)',
          }}
        >
          XLSX
        </button>
        <button
          onClick={handleSheets}
          disabled={sheetsLoading}
          style={{
            ...outlinedStyle,
            opacity: sheetsLoading ? 0.6 : 1,
            cursor: sheetsLoading ? 'not-allowed' : 'pointer',
          }}
        >
          {sheetsLoading ? 'Creating...' : 'Sheets'}
        </button>
      </div>
      {sheetsUrl && (
        <p style={{ margin: 'var(--space-2) 0 0', fontSize: 'var(--font-size-sm)' }}>
          Created —{' '}
          <a
            href={sheetsUrl}
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: 'var(--color-primary)' }}
          >
            Open in Google Sheets
          </a>
        </p>
      )}
      {sheetsError && (
        <p style={{ margin: 'var(--space-2) 0 0', fontSize: 'var(--font-size-sm)', color: 'var(--color-error)' }}>
          {sheetsError}
        </p>
      )}
    </div>
  );
}
