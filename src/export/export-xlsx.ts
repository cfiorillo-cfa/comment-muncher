import * as XLSX from 'xlsx';
import type { Comment } from '../types';

export function generateXlsxBlob(comments: Comment[], hasThreading: boolean): Blob {
  const headers = hasThreading
    ? ['Thread', 'Reply', 'Author', 'Date', 'Comment', 'Highlighted Text', 'Location', 'Resolved']
    : ['Author', 'Date', 'Comment', 'Highlighted Text', 'Location'];

  const rows = comments.map(c => {
    const date = new Date(c.date);
    const validDate = isNaN(date.getTime()) ? c.date : date;

    const base: unknown[] = [c.author, validDate, c.text, c.highlightedContent, c.location];
    if (hasThreading) {
      return [
        c.threadId,
        c.isReply,
        ...base,
        c.resolved === null ? '' : c.resolved,
      ];
    }
    return base;
  });

  const wsData: unknown[][] = [headers, ...rows];
  const ws = XLSX.utils.aoa_to_sheet(wsData, { cellDates: true });

  // Find the date column index and apply datetime format
  const dateColIdx = hasThreading ? 3 : 1;
  for (let r = 1; r <= rows.length; r++) {
    const cellRef = XLSX.utils.encode_cell({ r, c: dateColIdx });
    const cell = ws[cellRef];
    if (cell && cell.t === 'd') {
      cell.z = 'yyyy-mm-dd hh:mm';
    }
  }

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
