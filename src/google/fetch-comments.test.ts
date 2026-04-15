import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fetchGoogleDocComments, extractDocId } from './fetch-comments';

describe('extractDocId', () => {
  it('extracts ID from standard URL', () => {
    expect(extractDocId('https://docs.google.com/document/d/1aBcDeFgHiJkLmNoPqRsTuVwXyZ/edit')).toBe('1aBcDeFgHiJkLmNoPqRsTuVwXyZ');
  });
  it('extracts ID from URL with hash', () => {
    expect(extractDocId('https://docs.google.com/document/d/1aBcDeFg/edit#heading=h.abc123')).toBe('1aBcDeFg');
  });
  it('extracts ID from URL without /edit', () => {
    expect(extractDocId('https://docs.google.com/document/d/1aBcDeFg')).toBe('1aBcDeFg');
  });
  it('extracts ID from URL with query params', () => {
    expect(extractDocId('https://docs.google.com/document/d/1aBcDeFg/edit?usp=sharing')).toBe('1aBcDeFg');
  });
  it('returns null for non-Google Docs URLs', () => {
    expect(extractDocId('https://example.com/doc/123')).toBeNull();
  });
  it('returns null for empty string', () => {
    expect(extractDocId('')).toBeNull();
  });
  it('returns null for Google Sheets URL', () => {
    expect(extractDocId('https://docs.google.com/spreadsheets/d/1aBcDeFg/edit')).toBeNull();
  });
});

describe('fetchGoogleDocComments', () => {
  beforeEach(() => { vi.restoreAllMocks(); });

  const MOCK_API_RESPONSE = {
    comments: [
      {
        id: 'c1', content: 'Check these numbers',
        author: { displayName: 'Maria S.' },
        createdTime: '2024-03-12T10:30:00Z', resolved: true,
        quotedFileContent: { value: 'total allocation of $2.4M' },
        replies: [{ id: 'r1', content: 'Numbers are correct', author: { displayName: 'David R.' }, createdTime: '2024-03-13T14:15:00Z' }],
      },
      {
        id: 'c2', content: 'Needs a rewrite',
        author: { displayName: 'Tanya L.' },
        createdTime: '2024-03-14T09:00:00Z', resolved: false,
        quotedFileContent: { value: 'pursuant to regulation' },
        replies: [],
      },
    ],
  };

  it('maps API response to ParseResult with correct fields', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({ ok: true, json: () => Promise.resolve(MOCK_API_RESPONSE) } as Response);

    const result = await fetchGoogleDocComments('https://docs.google.com/document/d/abc123/edit', 'fake-token');
    expect(result.filename).toBe('Google Doc');
    expect(result.hasThreading).toBe(true);
    expect(result.comments).toHaveLength(3);

    const parent = result.comments[0];
    expect(parent.id).toBe('c1');
    expect(parent.author).toBe('Maria S.');
    expect(parent.text).toBe('Check these numbers');
    expect(parent.highlightedContent).toBe('total allocation of $2.4M');
    expect(parent.resolved).toBe(true);
    expect(parent.isReply).toBe(false);
    expect(parent.threadId).toBe(1);
    expect(parent.location).toBe('');

    const reply = result.comments[1];
    expect(reply.id).toBe('r1');
    expect(reply.isReply).toBe(true);
    expect(reply.parentCommentId).toBe('c1');
    expect(reply.threadId).toBe(1);

    const second = result.comments[2];
    expect(second.threadId).toBe(2);
  });

  it('throws on invalid URL', async () => {
    await expect(fetchGoogleDocComments('https://example.com', 'token')).rejects.toThrow('Please paste a valid Google Docs URL');
  });

  it('throws on API error', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({ ok: false, status: 404 } as Response);
    await expect(fetchGoogleDocComments('https://docs.google.com/document/d/abc/edit', 'token')).rejects.toThrow("Couldn't access this document");
  });

  it('handles comments with no quotedFileContent', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ comments: [{ id: 'c1', content: 'A comment', author: { displayName: 'Test' }, createdTime: '2024-01-01T00:00:00Z', resolved: false, replies: [] }] }),
    } as Response);
    const result = await fetchGoogleDocComments('https://docs.google.com/document/d/abc/edit', 'token');
    expect(result.comments[0].highlightedContent).toBe('');
  });

  it('handles pagination', async () => {
    const page1 = { comments: [{ id: 'c1', content: 'First', author: { displayName: 'A' }, createdTime: '2024-01-01T00:00:00Z', resolved: false, replies: [] }], nextPageToken: 'page2token' };
    const page2 = { comments: [{ id: 'c2', content: 'Second', author: { displayName: 'B' }, createdTime: '2024-01-02T00:00:00Z', resolved: false, replies: [] }] };

    vi.spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve(page1) } as Response)
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve(page2) } as Response);

    const result = await fetchGoogleDocComments('https://docs.google.com/document/d/abc/edit', 'token');
    expect(result.comments).toHaveLength(2);
    expect(result.comments[0].text).toBe('First');
    expect(result.comments[1].text).toBe('Second');
  });
});
