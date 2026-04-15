import { describe, it, expect } from 'vitest';
import * as XLSX from 'xlsx';
import { generateXlsxBlob } from './export-xlsx';
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

describe('generateXlsxBlob', () => {
  it('generates a valid XLSX blob', () => {
    const comments = [makeComment()];
    const blob = generateXlsxBlob(comments, true);
    expect(blob).toBeInstanceOf(Blob);
    expect(blob.type).toBe(
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    );
  });

  it('creates a worksheet named "Comments"', async () => {
    const comments = [makeComment()];
    const blob = generateXlsxBlob(comments, true);
    const buffer = await blob.arrayBuffer();
    const wb = XLSX.read(buffer);
    expect(wb.SheetNames).toEqual(['Comments']);
  });

  it('includes all columns with threading', async () => {
    const comments = [makeComment()];
    const blob = generateXlsxBlob(comments, true);
    const buffer = await blob.arrayBuffer();
    const wb = XLSX.read(buffer);
    const ws = wb.Sheets['Comments'];
    const data = XLSX.utils.sheet_to_json<string[]>(ws, { header: 1 });
    const headers = data[0];
    expect(headers).toEqual([
      'Thread', 'Reply', 'Author', 'Date', 'Comment',
      'Highlighted Text', 'Location', 'Resolved',
    ]);
  });

  it('omits threading columns when unavailable', async () => {
    const comments = [makeComment({ resolved: null })];
    const blob = generateXlsxBlob(comments, false);
    const buffer = await blob.arrayBuffer();
    const wb = XLSX.read(buffer);
    const ws = wb.Sheets['Comments'];
    const data = XLSX.utils.sheet_to_json<string[]>(ws, { header: 1 });
    const headers = data[0];
    expect(headers).toEqual([
      'Author', 'Date', 'Comment', 'Highlighted Text', 'Location',
    ]);
  });

  it('contains the correct data rows', async () => {
    const comments = [makeComment()];
    const blob = generateXlsxBlob(comments, true);
    const buffer = await blob.arrayBuffer();
    const wb = XLSX.read(buffer);
    const ws = wb.Sheets['Comments'];
    const data = XLSX.utils.sheet_to_json<string[]>(ws, { header: 1 });
    const row = data[1];
    expect(row).toContain('Maria S.');
    expect(row).toContain('Check these numbers');
    expect(row).toContain('total allocation of $2.4M');
  });
});
