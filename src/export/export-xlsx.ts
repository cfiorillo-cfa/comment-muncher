import * as XLSX from 'xlsx';
import type { Comment } from '../types';

export function generateXlsxBlob(comments: Comment[], hasThreading: boolean): Blob {
  const headers = hasThreading
    ? ['Thread', 'Reply', 'Author', 'Date', 'Comment', 'Highlighted Text', 'Location', 'Resolved']
    : ['Author', 'Date', 'Comment', 'Highlighted Text', 'Location'];

  const rows = comments.map(c => {
    const base = [c.author, c.date, c.text, c.highlightedContent, c.location];
    if (hasThreading) {
      return [
        c.threadId,
        c.isReply ? 'Yes' : 'No',
        ...base,
        c.resolved === null ? '' : c.resolved ? 'Yes' : 'No',
      ];
    }
    return base;
  });

  const wsData = [headers, ...rows];
  const ws = XLSX.utils.aoa_to_sheet(wsData);

  // Auto-size columns based on content width
  const colWidths = headers.map((h, i) => {
    const maxLen = Math.max(
      h.length,
      ...rows.map(r => String(r[i] ?? '').length)
    );
    return { wch: Math.min(maxLen + 2, 60) };
  });
  ws['!cols'] = colWidths;

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Comments');

  const buffer = XLSX.write(wb, { type: 'array', bookType: 'xlsx' });
  return new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
}
