import { useState, useMemo } from 'react';
import type { Comment } from '../types';
import './CommentStats.css';

interface CommentStatsProps {
  comments: Comment[];
  hasThreading: boolean;
}

export default function CommentStats({ comments, hasThreading }: CommentStatsProps) {
  const [expanded, setExpanded] = useState(false);

  const stats = useMemo(() => {
    // Comments over time: group by date (date portion only)
    const dateCounts = comments.reduce<Record<string, number>>((acc, c) => {
      const datePart = c.date ? c.date.split('T')[0] : 'Unknown';
      acc[datePart] = (acc[datePart] ?? 0) + 1;
      return acc;
    }, {});
    const dateEntries = Object.entries(dateCounts).sort(([a], [b]) => a.localeCompare(b));
    const maxDateCount = dateEntries.reduce((max, [, n]) => Math.max(max, n), 0);

    // Top commenters: sorted by count, max 5
    const authorCounts = comments.reduce<Record<string, number>>((acc, c) => {
      acc[c.author] = (acc[c.author] ?? 0) + 1;
      return acc;
    }, {});
    const topCommenters = Object.entries(authorCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5);
    const maxAuthorCount = topCommenters.length > 0 ? topCommenters[0][1] : 0;

    // Most-commented sections: group by non-empty location
    const locationCounts = comments.reduce<Record<string, number>>((acc, c) => {
      if (c.location && c.location.trim() !== '') {
        acc[c.location] = (acc[c.location] ?? 0) + 1;
      }
      return acc;
    }, {});
    const locationEntries = Object.entries(locationCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5);
    const maxLocationCount = locationEntries.length > 0 ? locationEntries[0][1] : 0;
    const hasLocations = locationEntries.length > 0;

    // Resolution rate (only meaningful with threading)
    const resolvedCount = comments.filter(c => c.resolved === true).length;
    const openCount = comments.filter(c => c.resolved === false).length;
    const threadedTotal = resolvedCount + openCount;
    const resolvedPct = threadedTotal > 0 ? Math.round((resolvedCount / threadedTotal) * 100) : 0;

    return {
      dateEntries,
      maxDateCount,
      topCommenters,
      maxAuthorCount,
      locationEntries,
      maxLocationCount,
      hasLocations,
      resolvedCount,
      openCount,
      threadedTotal,
      resolvedPct,
    };
  }, [comments]);

  if (comments.length === 0) return null;

  return (
    <div className="comment-stats">
      <button
        className="comment-stats__toggle"
        onClick={() => setExpanded(prev => !prev)}
        aria-expanded={expanded}
      >
        {expanded ? 'Hide stats' : 'Show stats'}
      </button>

      {expanded && (
        <div className="comment-stats__grid">
          {/* Comments over time */}
          <div className="comment-stats__card">
            <h3>Comments over time</h3>
            {stats.dateEntries.map(([date, count]) => (
              <div key={date} className="comment-stats__bar-row">
                <span className="comment-stats__bar-label" title={date}>
                  {date}
                </span>
                <div className="comment-stats__bar">
                  <div
                    className="comment-stats__bar-fill"
                    style={{
                      width: stats.maxDateCount > 0
                        ? `${Math.round((count / stats.maxDateCount) * 100)}%`
                        : '0%',
                    }}
                  />
                </div>
                <span className="comment-stats__bar-count">{count}</span>
              </div>
            ))}
          </div>

          {/* Top commenters */}
          <div className="comment-stats__card">
            <h3>Top commenters</h3>
            {stats.topCommenters.map(([author, count]) => (
              <div key={author} className="comment-stats__bar-row">
                <span className="comment-stats__bar-label" title={author}>
                  {author}
                </span>
                <div className="comment-stats__bar">
                  <div
                    className="comment-stats__bar-fill"
                    style={{
                      width: stats.maxAuthorCount > 0
                        ? `${Math.round((count / stats.maxAuthorCount) * 100)}%`
                        : '0%',
                    }}
                  />
                </div>
                <span className="comment-stats__bar-count">{count}</span>
              </div>
            ))}
          </div>

          {/* Most-commented sections (only if any locations exist) */}
          {stats.hasLocations && (
            <div className="comment-stats__card">
              <h3>Most-commented sections</h3>
              {stats.locationEntries.map(([location, count]) => (
                <div key={location} className="comment-stats__bar-row">
                  <span className="comment-stats__bar-label" title={location}>
                    {location}
                  </span>
                  <div className="comment-stats__bar">
                    <div
                      className="comment-stats__bar-fill"
                      style={{
                        width: stats.maxLocationCount > 0
                          ? `${Math.round((count / stats.maxLocationCount) * 100)}%`
                          : '0%',
                      }}
                    />
                  </div>
                  <span className="comment-stats__bar-count">{count}</span>
                </div>
              ))}
            </div>
          )}

          {/* Resolution rate (only if hasThreading) */}
          {hasThreading && (
            <div className="comment-stats__card">
              <h3>Resolution rate</h3>
              <div className="comment-stats__progress">
                <div
                  className="comment-stats__progress-fill"
                  style={{ width: `${stats.resolvedPct}%` }}
                />
              </div>
              <p className="comment-stats__progress-label">
                {stats.resolvedPct}% resolved ({stats.resolvedCount} of {stats.threadedTotal})
                &nbsp;&mdash;&nbsp;{stats.openCount} open
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
