import { describe, it, expect } from 'vitest';
import { generateCsv } from './export-csv';
import type { Comment } from '../types';

function makeComment(overrides: Partial<Comment> = {}): Comment {
  return {
    id: '1',
    threadId: 1,
    author: 'Maria S.',
    date: '2024-03-12T10:30:00Z',
    dateDisplay: 'Mar 12, 2024',
    text: 'Check these numbers',
    highlightedContent: 'total allocation of $2.4M',
    location: 'Section: Budget',
    resolved: false,
    parentCommentId: null,
    isReply: false,
    ...overrides,
  };
}

describe('generateCsv', () => {
  it('generates CSV with all columns when threading is available', () => {
    const comments = [
      makeComment(),
      makeComment({
        id: '2',
        author: 'David R.',
        text: 'Numbers are correct',
        isReply: true,
        parentCommentId: '1',
      }),
    ];

    const csv = generateCsv(comments, true);
    const lines = csv.split('\n');

    expect(lines[0]).toBe(
      'thread_id,is_reply,author,date,comment,highlighted_text,location,resolved'
    );
    expect(lines[1]).toBe(
      '1,FALSE,Maria S.,2024-03-12T10:30:00Z,Check these numbers,total allocation of $2.4M,Section: Budget,FALSE'
    );
    expect(lines[2]).toContain('TRUE'); // is_reply
  });

  it('omits thread_id, is_reply, and resolved when threading is unavailable', () => {
    const comments = [makeComment({ resolved: null })];
    const csv = generateCsv(comments, false);
    const lines = csv.split('\n');

    expect(lines[0]).toBe('author,date,comment,highlighted_text,location');
  });

  it('escapes fields containing commas', () => {
    const comments = [
      makeComment({ text: 'Hello, world' }),
    ];
    const csv = generateCsv(comments, false);
    expect(csv).toContain('"Hello, world"');
  });

  it('escapes fields containing double quotes', () => {
    const comments = [
      makeComment({ text: 'He said "hello"' }),
    ];
    const csv = generateCsv(comments, false);
    expect(csv).toContain('"He said ""hello"""');
  });

  it('escapes fields containing newlines', () => {
    const comments = [
      makeComment({ text: 'Line 1\nLine 2' }),
    ];
    const csv = generateCsv(comments, false);
    expect(csv).toContain('"Line 1\nLine 2"');
  });

  it('returns only headers for empty comment array', () => {
    const csv = generateCsv([], true);
    const lines = csv.split('\n').filter(l => l.length > 0);
    expect(lines).toHaveLength(1);
  });
});
