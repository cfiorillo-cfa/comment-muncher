import type { Comment } from '../types';

export function generateCsv(comments: Comment[], hasThreading: boolean): string {
  const headers = hasThreading
    ? ['thread_id', 'is_reply', 'author', 'date', 'comment', 'highlighted_text', 'location', 'resolved']
    : ['author', 'date', 'comment', 'highlighted_text', 'location'];

  const rows = comments.map(c => {
    const base = [c.author, c.date, c.text, c.highlightedContent, c.location];
    if (hasThreading) {
      return [
        String(c.threadId),
        c.isReply ? 'TRUE' : 'FALSE',
        ...base,
        c.resolved === null ? '' : c.resolved ? 'TRUE' : 'FALSE',
      ];
    }
    return base;
  });

  const lines = [headers, ...rows].map(row => row.map(escapeCsvField).join(','));
  return lines.join('\n') + '\n';
}

function escapeCsvField(field: string): string {
  if (field.includes(',') || field.includes('"') || field.includes('\n')) {
    return '"' + field.replace(/"/g, '""') + '"';
  }
  return field;
}
