import { useMemo, useState } from 'react';
import type { Comment } from '../types';
import StatusBadge from './StatusBadge';
import './CommentTable.css';

interface CommentTableProps {
  comments: Comment[];
  hasThreading: boolean;
}

type SortKey = 'text' | 'highlightedContent' | 'author' | 'date' | 'location' | 'resolved' | 'threadId';
type SortDir = 'asc' | 'desc';

export default function CommentTable({ comments, hasThreading }: CommentTableProps) {
  const [sortKey, setSortKey] = useState<SortKey>('date');
  const [sortDir, setSortDir] = useState<SortDir>('asc');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  function handleCopy(key: string, text: string) {
    navigator.clipboard.writeText(text);
    setCopiedId(key);
    setTimeout(() => setCopiedId(null), 1500);
  }

  const sorted = useMemo(() => {
    const copy = [...comments];
    copy.sort((a, b) => {
      let aVal: string | number | boolean | null = a[sortKey];
      let bVal: string | number | boolean | null = b[sortKey];
      if (aVal === null) aVal = '';
      if (bVal === null) bVal = '';
      if (typeof aVal === 'boolean') aVal = aVal ? 1 : 0;
      if (typeof bVal === 'boolean') bVal = bVal ? 1 : 0;
      if (typeof aVal === 'number' && typeof bVal === 'number') {
        return sortDir === 'asc' ? aVal - bVal : bVal - aVal;
      }
      const cmp = String(aVal).localeCompare(String(bVal));
      return sortDir === 'asc' ? cmp : -cmp;
    });
    return copy;
  }, [comments, sortKey, sortDir]);

  function handleSort(key: SortKey) {
    if (key === sortKey) {
      setSortDir(d => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
  }

  function sortIndicator(key: SortKey): string {
    if (key !== sortKey) return '';
    return sortDir === 'asc' ? ' \u25B2' : ' \u25BC';
  }

  return (
    <div className="comment-table-wrapper">
      <table className="comment-table">
        <thead>
          <tr>
            <th scope="col" onClick={() => handleSort('text')}>
              Comment<span className="sort-indicator">{sortIndicator('text')}</span>
            </th>
            <th scope="col" onClick={() => handleSort('highlightedContent')}>
              Highlighted Text<span className="sort-indicator">{sortIndicator('highlightedContent')}</span>
            </th>
            <th scope="col" onClick={() => handleSort('author')}>
              Author<span className="sort-indicator">{sortIndicator('author')}</span>
            </th>
            <th scope="col" onClick={() => handleSort('date')}>
              Date<span className="sort-indicator">{sortIndicator('date')}</span>
            </th>
            <th scope="col" onClick={() => handleSort('location')}>
              Location<span className="sort-indicator">{sortIndicator('location')}</span>
            </th>
            {hasThreading && (
              <th scope="col" onClick={() => handleSort('resolved')}>
                Status<span className="sort-indicator">{sortIndicator('resolved')}</span>
              </th>
            )}
          </tr>
        </thead>
        <tbody>
          {sorted.map(comment => (
            <tr key={comment.id} className={comment.isReply ? 'reply-row' : ''}>
              <td
                className="copyable"
                title="Click to copy"
                onClick={() => handleCopy(`${comment.id}-text`, comment.text)}
              >
                {comment.isReply && <span className="reply-prefix" aria-label="Reply">&#8627;</span>}
                {comment.text}
                {copiedId === `${comment.id}-text` && (
                  <span className="copied-tooltip">Copied!</span>
                )}
              </td>
              <td
                className="highlighted copyable"
                title="Click to copy"
                onClick={() => handleCopy(`${comment.id}-highlight`, comment.highlightedContent ?? '')}
              >
                {comment.highlightedContent}
                {copiedId === `${comment.id}-highlight` && (
                  <span className="copied-tooltip">Copied!</span>
                )}
              </td>
              <td>{comment.author}</td>
              <td style={{ whiteSpace: 'nowrap' }}>{comment.dateDisplay}</td>
              <td>{comment.location}</td>
              {hasThreading && (
                <td>
                  {comment.resolved !== null && (
                    <StatusBadge resolved={comment.resolved} />
                  )}
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
