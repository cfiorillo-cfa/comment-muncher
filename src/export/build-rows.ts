import type { Comment } from '../types';

export function buildExportData(
  comments: Comment[],
  hasThreading: boolean
): { headers: string[]; rows: (string | number)[][] } {
  const headers = hasThreading
    ? ['Thread', 'Reply', 'Author', 'Date', 'Comment', 'Highlighted Text', 'Location', 'Resolved']
    : ['Author', 'Date', 'Comment', 'Highlighted Text', 'Location'];

  const rows = comments.map(c => {
    const base: (string | number)[] = [c.author, c.date, c.text, c.highlightedContent, c.location];
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

  return { headers, rows };
}
