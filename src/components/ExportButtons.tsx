import type { Comment } from '../types';
import { generateCsv } from '../export/export-csv';
import { generateXlsxBlob } from '../export/export-xlsx';
import { triggerDownload } from '../export/trigger-download';

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
  function handleCsv() {
    const csv = generateCsv(comments, hasThreading);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    triggerDownload(blob, `${filename}_comments.csv`);
  }

  function handleXlsx() {
    const blob = generateXlsxBlob(comments, hasThreading);
    triggerDownload(blob, `${filename}_comments.xlsx`);
  }

  const buttonBase: React.CSSProperties = {
    padding: 'var(--space-2) var(--space-4)',
    borderRadius: 'var(--border-radius)',
    fontSize: 'var(--font-size-sm)',
    fontWeight: 600,
    cursor: 'pointer',
    border: 'none',
  };

  return (
    <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
      <button
        onClick={handleCsv}
        style={{
          ...buttonBase,
          background: 'var(--color-white)',
          border: '1px solid var(--color-base-lighter)',
          color: 'var(--color-base-darkest)',
        }}
      >
        CSV
      </button>
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
    </div>
  );
}
