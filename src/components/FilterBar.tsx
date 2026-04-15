import { useEffect, useMemo, useState } from 'react';
import type { Comment } from '../types';
import './FilterBar.css';

interface FilterBarProps {
  comments: Comment[];
  hasThreading: boolean;
  onFilter: (filtered: Comment[]) => void;
}

export default function FilterBar({ comments, hasThreading, onFilter }: FilterBarProps) {
  const [author, setAuthor] = useState('');
  const [status, setStatus] = useState('');
  const [search, setSearch] = useState('');

  const uniqueAuthors = useMemo(() => {
    const seen = new Set<string>();
    for (const c of comments) {
      if (c.author) seen.add(c.author);
    }
    return Array.from(seen).sort();
  }, [comments]);

  const filtered = useMemo(() => {
    return comments.filter(c => {
      if (author && c.author !== author) return false;
      if (status) {
        if (status === 'Open' && c.resolved !== false) return false;
        if (status === 'Resolved' && c.resolved !== true) return false;
      }
      if (search) {
        const q = search.toLowerCase();
        const inText = c.text.toLowerCase().includes(q);
        const inHighlight = c.highlightedContent.toLowerCase().includes(q);
        if (!inText && !inHighlight) return false;
      }
      return true;
    });
  }, [comments, author, status, search]);

  useEffect(() => {
    onFilter(filtered);
  }, [filtered, onFilter]);

  const isActive = author !== '' || status !== '' || search !== '';

  function handleClear() {
    setAuthor('');
    setStatus('');
    setSearch('');
  }

  return (
    <div className="filter-bar">
      <select
        className="filter-bar__select"
        value={author}
        onChange={e => setAuthor(e.target.value)}
        aria-label="Filter by author"
      >
        <option value="">All authors</option>
        {uniqueAuthors.map(a => (
          <option key={a} value={a}>{a}</option>
        ))}
      </select>

      {hasThreading && (
        <select
          className="filter-bar__select"
          value={status}
          onChange={e => setStatus(e.target.value)}
          aria-label="Filter by status"
        >
          <option value="">All statuses</option>
          <option value="Open">Open</option>
          <option value="Resolved">Resolved</option>
        </select>
      )}

      <input
        className="filter-bar__search"
        type="text"
        placeholder="Search comments…"
        value={search}
        onChange={e => setSearch(e.target.value)}
        aria-label="Search comments"
      />

      {isActive && (
        <button className="filter-bar__clear" onClick={handleClear}>
          Clear filters
        </button>
      )}
    </div>
  );
}
