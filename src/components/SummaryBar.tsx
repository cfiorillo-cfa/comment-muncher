import { useMemo } from 'react';
import type { Comment } from '../types';
import './SummaryBar.css';

interface SummaryBarProps {
  comments: Comment[];
  hasThreading: boolean;
}

export default function SummaryBar({ comments, hasThreading }: SummaryBarProps) {
  const stats = useMemo(() => {
    const total = comments.length;

    const openCount = hasThreading
      ? comments.filter(c => c.resolved === false).length
      : 0;
    const resolvedCount = hasThreading
      ? comments.filter(c => c.resolved === true).length
      : 0;

    const authorCounts = comments.reduce<Record<string, number>>((acc, c) => {
      acc[c.author] = (acc[c.author] ?? 0) + 1;
      return acc;
    }, {});

    const uniqueAuthors = Object.keys(authorCounts).length;

    const topCommenter =
      uniqueAuthors > 0
        ? Object.entries(authorCounts).reduce((best, curr) =>
            curr[1] > best[1] ? curr : best
          )[0]
        : null;

    return { total, openCount, resolvedCount, uniqueAuthors, topCommenter };
  }, [comments, hasThreading]);

  return (
    <div className="summary-bar" role="region" aria-label="Comment summary">
      <span className="summary-bar__chip">
        {stats.total} {stats.total === 1 ? 'comment' : 'comments'}
      </span>

      {hasThreading && (
        <>
          <span className="summary-bar__chip summary-bar__chip--open">
            {stats.openCount} open
          </span>
          <span className="summary-bar__chip summary-bar__chip--resolved">
            {stats.resolvedCount} resolved
          </span>
        </>
      )}

      <span className="summary-bar__chip">
        {stats.uniqueAuthors} {stats.uniqueAuthors === 1 ? 'author' : 'authors'}
      </span>

      {stats.topCommenter && (
        <span className="summary-bar__chip" title="Top commenter">
          Top: {stats.topCommenter}
        </span>
      )}
    </div>
  );
}
