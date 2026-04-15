import { describe, it, expect, vi, beforeEach } from 'vitest';
import { exportToSheets } from './export-sheets';
import type { Comment } from '../types';

function makeComment(overrides: Partial<Comment> = {}): Comment {
  return {
    id: '1', threadId: 1, author: 'Maria S.', date: '2024-03-12T10:30:00Z',
    dateDisplay: 'Mar 12, 2024', text: 'Check these numbers',
    highlightedContent: 'total allocation of $2.4M', location: 'Section: Budget',
    resolved: false, parentCommentId: null, isReply: false, ...overrides,
  };
}

describe('exportToSheets', () => {
  beforeEach(() => { vi.restoreAllMocks(); });

  it('creates spreadsheet, writes data with native types, formats columns, returns URL', async () => {
    const createResponse = { spreadsheetId: 'sheet123', spreadsheetUrl: 'https://docs.google.com/spreadsheets/d/sheet123/edit' };
    const fetchSpy = vi.spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve(createResponse) } as Response)
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({}) } as Response)
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({}) } as Response);

    const url = await exportToSheets(
      [makeComment({ resolved: true, isReply: false })],
      'test-doc', true, 'fake-token'
    );
    expect(url).toBe('https://docs.google.com/spreadsheets/d/sheet123/edit');

    // Verify create request
    const createBody = JSON.parse(fetchSpy.mock.calls[0][1]!.body as string);
    expect(createBody.properties.title).toBe('test-doc_comments');

    // Verify write request uses native types
    const writeBody = JSON.parse(fetchSpy.mock.calls[1][1]!.body as string);
    expect(writeBody.values[0]).toEqual(['Thread', 'Reply', 'Author', 'Date', 'Comment', 'Highlighted Text', 'Location', 'Resolved']);
    const dataRow = writeBody.values[1];
    expect(dataRow[0]).toBe(1);              // Thread — number
    expect(dataRow[1]).toBe(false);           // Reply — boolean
    expect(dataRow[7]).toBe(true);            // Resolved — boolean
    expect(typeof dataRow[3]).toBe('string'); // Date — ISO string (Sheets parses it)

    // Verify batchUpdate for formatting
    const formatBody = JSON.parse(fetchSpy.mock.calls[2][1]!.body as string);
    expect(formatBody.requests).toBeDefined();
    expect(formatBody.requests.length).toBeGreaterThanOrEqual(2);
  });

  it('throws on creation failure', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({ ok: false, status: 500 } as Response);
    await expect(exportToSheets([makeComment()], 'test', true, 'token')).rejects.toThrow("Couldn't create the spreadsheet");
  });

  it('throws on write failure', async () => {
    vi.spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({ spreadsheetId: 'x', spreadsheetUrl: 'url' }) } as Response)
      .mockResolvedValueOnce({ ok: false, status: 500 } as Response);
    await expect(exportToSheets([makeComment()], 'test', true, 'token')).rejects.toThrow("Couldn't write data to the spreadsheet");
  });
});
