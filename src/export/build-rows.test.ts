import { describe, it, expect } from 'vitest';
import { buildExportData } from './build-rows';
import type { Comment } from '../types';

function makeComment(overrides: Partial<Comment> = {}): Comment {
  return {
    id: '1', threadId: 1, author: 'Maria S.', date: '2024-03-12T10:30:00Z',
    dateDisplay: 'Mar 12, 2024', text: 'Check these numbers',
    highlightedContent: 'total allocation of $2.4M', location: 'Section: Budget',
    resolved: false, parentCommentId: null, isReply: false, ...overrides,
  };
}

describe('buildExportData', () => {
  it('returns headers and rows with threading columns when hasThreading is true', () => {
    const comments = [makeComment(), makeComment({ id: '2', author: 'David R.', text: 'Numbers are correct', isReply: true, parentCommentId: '1', resolved: true })];
    const { headers, rows } = buildExportData(comments, true);
    expect(headers).toEqual(['Thread', 'Reply', 'Author', 'Date', 'Comment', 'Highlighted Text', 'Location', 'Resolved']);
    expect(rows).toHaveLength(2);
    expect(rows[0]).toEqual([1, 'No', 'Maria S.', '2024-03-12T10:30:00Z', 'Check these numbers', 'total allocation of $2.4M', 'Section: Budget', 'No']);
    expect(rows[1]).toEqual([1, 'Yes', 'David R.', '2024-03-12T10:30:00Z', 'Numbers are correct', 'total allocation of $2.4M', 'Section: Budget', 'Yes']);
  });

  it('omits threading columns when hasThreading is false', () => {
    const { headers, rows } = buildExportData([makeComment({ resolved: null })], false);
    expect(headers).toEqual(['Author', 'Date', 'Comment', 'Highlighted Text', 'Location']);
    expect(rows[0]).toEqual(['Maria S.', '2024-03-12T10:30:00Z', 'Check these numbers', 'total allocation of $2.4M', 'Section: Budget']);
  });

  it('returns empty rows for empty array', () => {
    const { rows } = buildExportData([], true);
    expect(rows).toEqual([]);
  });

  it('handles null resolved as empty string', () => {
    const { rows } = buildExportData([makeComment({ resolved: null })], true);
    expect(rows[0][7]).toBe('');
  });
});
