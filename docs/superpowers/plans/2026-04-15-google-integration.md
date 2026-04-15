# Google Docs Import + Sheets Export Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add Google Docs comment import (paste URL) and Google Sheets export to Comment Muncher, using client-side OAuth via Google Identity Services.

**Architecture:** GIS library loaded dynamically on first Google action. Auth on demand — DOCX flow untouched. Drive API v3 fetches comments, Sheets API v4 creates exports. Shared row-building logic extracted from existing exporters.

**Tech Stack:** Google Identity Services (dynamic script), Drive API v3, Sheets API v4, existing React/TypeScript/Vite stack

**Spec:** `docs/superpowers/specs/2026-04-15-google-integration-design.md`

---

## File Structure

```
src/google/
├── gis-types.d.ts         # Type declarations for Google Identity Services
├── config.ts              # Client ID constant (placeholder until GCP project created)
├── auth.ts                # GIS script loading, token management, getAccessToken()
├── auth.test.ts           # Token state management tests
├── fetch-comments.ts      # Google Doc URL → ParseResult
├── fetch-comments.test.ts # URL parsing + API response mapping tests
├── export-sheets.ts       # Comment[] → new Google Sheet, returns URL
└── export-sheets.test.ts  # Request body construction tests

src/export/
├── build-rows.ts          # Shared: Comment[] + hasThreading → { headers, rows }
├── build-rows.test.ts     # Row building tests
├── export-csv.ts          # (unchanged — keeps its own TRUE/FALSE format)
└── export-xlsx.ts         # (refactored to use build-rows.ts)

src/components/
├── GoogleDocInput.tsx      # URL input + Import button (new component)
├── GoogleDocInput.css      # Styles for Google import section
└── ExportButtons.tsx       # (modified — add Sheets button + success link)

src/App.tsx                 # (modified — add Google Doc import handler, Sheets state)
src/App.css                 # (modified — add divider styles)
```

---

## Task 1: Extract Shared Row Builder

**Files:**
- Create: `src/export/build-rows.ts`
- Create: `src/export/build-rows.test.ts`
- Modify: `src/export/export-xlsx.ts`

Extract the shared header + row building from the XLSX exporter into `build-rows.ts`. XLSX and Sheets will use this. CSV stays as-is (it needs different boolean formatting: TRUE/FALSE for machine readability).

- [ ] **Step 1: Write the failing tests**

Create `src/export/build-rows.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { buildExportData } from './build-rows';
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

describe('buildExportData', () => {
  it('returns headers and rows with threading columns when hasThreading is true', () => {
    const comments = [
      makeComment(),
      makeComment({
        id: '2',
        author: 'David R.',
        text: 'Numbers are correct',
        isReply: true,
        parentCommentId: '1',
        resolved: true,
      }),
    ];

    const { headers, rows } = buildExportData(comments, true);

    expect(headers).toEqual([
      'Thread', 'Reply', 'Author', 'Date', 'Comment',
      'Highlighted Text', 'Location', 'Resolved',
    ]);
    expect(rows).toHaveLength(2);
    expect(rows[0]).toEqual([
      1, 'No', 'Maria S.', '2024-03-12T10:30:00Z',
      'Check these numbers', 'total allocation of $2.4M',
      'Section: Budget', 'No',
    ]);
    expect(rows[1]).toEqual([
      1, 'Yes', 'David R.', '2024-03-12T10:30:00Z',
      'Numbers are correct', 'total allocation of $2.4M',
      'Section: Budget', 'Yes',
    ]);
  });

  it('omits threading columns when hasThreading is false', () => {
    const comments = [makeComment({ resolved: null })];
    const { headers, rows } = buildExportData(comments, false);

    expect(headers).toEqual([
      'Author', 'Date', 'Comment', 'Highlighted Text', 'Location',
    ]);
    expect(rows[0]).toEqual([
      'Maria S.', '2024-03-12T10:30:00Z',
      'Check these numbers', 'total allocation of $2.4M',
      'Section: Budget',
    ]);
  });

  it('returns empty rows for empty comment array', () => {
    const { headers, rows } = buildExportData([], true);
    expect(headers).toHaveLength(8);
    expect(rows).toEqual([]);
  });

  it('handles null resolved as empty string', () => {
    const comments = [makeComment({ resolved: null })];
    const { rows } = buildExportData(comments, true);
    expect(rows[0][7]).toBe('');
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/export/build-rows.test.ts`
Expected: FAIL — `buildExportData` is not defined

- [ ] **Step 3: Implement `build-rows.ts`**

Create `src/export/build-rows.ts`:

```typescript
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
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/export/build-rows.test.ts`
Expected: All tests PASS

- [ ] **Step 5: Refactor `export-xlsx.ts` to use `build-rows.ts`**

Replace `src/export/export-xlsx.ts` with:

```typescript
import * as XLSX from 'xlsx';
import type { Comment } from '../types';
import { buildExportData } from './build-rows';

export function generateXlsxBlob(comments: Comment[], hasThreading: boolean): Blob {
  const { headers, rows } = buildExportData(comments, hasThreading);

  const wsData = [headers, ...rows];
  const ws = XLSX.utils.aoa_to_sheet(wsData);

  const colWidths = headers.map((h, i) => {
    const maxLen = Math.max(
      h.length,
      ...rows.map(r => String(r[i] ?? '').length)
    );
    return { wch: Math.min(maxLen + 2, 60) };
  });
  ws['!cols'] = colWidths;

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Comments');

  const buffer = XLSX.write(wb, { type: 'array', bookType: 'xlsx' });
  return new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
}
```

- [ ] **Step 6: Run all export tests to verify no regressions**

Run: `npx vitest run src/export/`
Expected: All tests PASS (build-rows, csv, xlsx)

- [ ] **Step 7: Commit**

```bash
git add src/export/build-rows.ts src/export/build-rows.test.ts src/export/export-xlsx.ts
git commit -m "refactor: extract shared row builder, refactor XLSX to use it"
```

---

## Task 2: Google Config + GIS Types + Auth Module

**Files:**
- Create: `src/google/gis-types.d.ts`
- Create: `src/google/config.ts`
- Create: `src/google/auth.ts`
- Create: `src/google/auth.test.ts`

- [ ] **Step 1: Create GIS type declarations**

Create `src/google/gis-types.d.ts`:

```typescript
declare namespace google.accounts.oauth2 {
  interface TokenClient {
    requestAccessToken(): void;
  }

  interface TokenResponse {
    access_token: string;
    expires_in: number;
    error?: string;
    error_description?: string;
  }

  interface TokenClientConfig {
    client_id: string;
    scope: string;
    callback: (response: TokenResponse) => void;
    error_callback?: (error: { type: string; message: string }) => void;
  }

  function initTokenClient(config: TokenClientConfig): TokenClient;
}
```

- [ ] **Step 2: Create `config.ts`**

Create `src/google/config.ts`:

```typescript
/**
 * Google OAuth Client ID. Replace with your own from Google Cloud Console.
 * See: docs/superpowers/specs/2026-04-15-google-integration-design.md#setup-requirements
 */
export const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID ?? '';

export const GOOGLE_SCOPES = [
  'https://www.googleapis.com/auth/drive.readonly',
  'https://www.googleapis.com/auth/spreadsheets',
].join(' ');
```

- [ ] **Step 3: Write the failing tests for auth**

Create `src/google/auth.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getAccessToken, isAuthenticated, clearToken, _setTokenForTest } from './auth';

describe('auth token management', () => {
  beforeEach(() => {
    clearToken();
  });

  it('isAuthenticated returns false when no token', () => {
    expect(isAuthenticated()).toBe(false);
  });

  it('isAuthenticated returns true when token is set and not expired', () => {
    _setTokenForTest('test-token', Date.now() + 60000);
    expect(isAuthenticated()).toBe(true);
  });

  it('isAuthenticated returns false when token is expired', () => {
    _setTokenForTest('test-token', Date.now() - 1000);
    expect(isAuthenticated()).toBe(false);
  });

  it('clearToken resets auth state', () => {
    _setTokenForTest('test-token', Date.now() + 60000);
    expect(isAuthenticated()).toBe(true);
    clearToken();
    expect(isAuthenticated()).toBe(false);
  });

  it('getAccessToken returns cached token when valid', async () => {
    _setTokenForTest('cached-token', Date.now() + 60000);
    const token = await getAccessToken();
    expect(token).toBe('cached-token');
  });

  it('getAccessToken throws when no client ID configured', async () => {
    await expect(getAccessToken()).rejects.toThrow('Google Client ID is not configured');
  });
});
```

- [ ] **Step 4: Run tests to verify they fail**

Run: `npx vitest run src/google/auth.test.ts`
Expected: FAIL — module not found

- [ ] **Step 5: Implement `auth.ts`**

Create `src/google/auth.ts`:

```typescript
import { GOOGLE_CLIENT_ID, GOOGLE_SCOPES } from './config';

let accessToken: string | null = null;
let tokenExpiry = 0;

export function isAuthenticated(): boolean {
  return accessToken !== null && Date.now() < tokenExpiry;
}

export function clearToken(): void {
  accessToken = null;
  tokenExpiry = 0;
}

/** Test-only helper to set token state without going through OAuth */
export function _setTokenForTest(token: string, expiry: number): void {
  accessToken = token;
  tokenExpiry = expiry;
}

function loadGisScript(): Promise<void> {
  if (typeof google !== 'undefined' && google.accounts?.oauth2) {
    return Promise.resolve();
  }
  return new Promise((resolve, reject) => {
    if (document.querySelector('script[src*="accounts.google.com/gsi/client"]')) {
      const check = setInterval(() => {
        if (typeof google !== 'undefined' && google.accounts?.oauth2) {
          clearInterval(check);
          resolve();
        }
      }, 50);
      return;
    }
    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Failed to load Google Identity Services'));
    document.head.appendChild(script);
  });
}

export async function getAccessToken(): Promise<string> {
  if (isAuthenticated()) {
    return accessToken!;
  }

  if (!GOOGLE_CLIENT_ID) {
    throw new Error('Google Client ID is not configured');
  }

  await loadGisScript();

  return new Promise<string>((resolve, reject) => {
    const client = google.accounts.oauth2.initTokenClient({
      client_id: GOOGLE_CLIENT_ID,
      scope: GOOGLE_SCOPES,
      callback: (response) => {
        if (response.error) {
          if (response.error === 'access_denied') {
            reject(new Error('Google access was not granted'));
          } else {
            reject(new Error(response.error_description ?? response.error));
          }
          return;
        }
        accessToken = response.access_token;
        tokenExpiry = Date.now() + response.expires_in * 1000;
        resolve(accessToken);
      },
      error_callback: (error) => {
        if (error.type === 'popup_blocked') {
          reject(new Error('Pop-up blocked — please allow pop-ups for this site and try again'));
        } else {
          reject(new Error('Google access was not granted'));
        }
      },
    });
    client.requestAccessToken();
  });
}
```

- [ ] **Step 6: Run tests to verify they pass**

Run: `npx vitest run src/google/auth.test.ts`
Expected: All tests PASS

- [ ] **Step 7: Commit**

```bash
git add src/google/gis-types.d.ts src/google/config.ts src/google/auth.ts src/google/auth.test.ts
git commit -m "feat: add Google auth module with GIS types and token management"
```

---

## Task 3: Google Doc Comment Fetcher

**Files:**
- Create: `src/google/fetch-comments.ts`
- Create: `src/google/fetch-comments.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `src/google/fetch-comments.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fetchGoogleDocComments, extractDocId } from './fetch-comments';

describe('extractDocId', () => {
  it('extracts ID from standard Google Docs URL', () => {
    expect(extractDocId('https://docs.google.com/document/d/1aBcDeFgHiJkLmNoPqRsTuVwXyZ/edit'))
      .toBe('1aBcDeFgHiJkLmNoPqRsTuVwXyZ');
  });

  it('extracts ID from URL with hash fragment', () => {
    expect(extractDocId('https://docs.google.com/document/d/1aBcDeFg/edit#heading=h.abc123'))
      .toBe('1aBcDeFg');
  });

  it('extracts ID from URL without /edit', () => {
    expect(extractDocId('https://docs.google.com/document/d/1aBcDeFg'))
      .toBe('1aBcDeFg');
  });

  it('extracts ID from URL with query params', () => {
    expect(extractDocId('https://docs.google.com/document/d/1aBcDeFg/edit?usp=sharing'))
      .toBe('1aBcDeFg');
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
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  const MOCK_API_RESPONSE = {
    comments: [
      {
        id: 'c1',
        content: 'Check these numbers',
        author: { displayName: 'Maria S.' },
        createdTime: '2024-03-12T10:30:00Z',
        resolved: true,
        quotedFileContent: { value: 'total allocation of $2.4M' },
        replies: [
          {
            id: 'r1',
            content: 'Numbers are correct',
            author: { displayName: 'David R.' },
            createdTime: '2024-03-13T14:15:00Z',
          },
        ],
      },
      {
        id: 'c2',
        content: 'Needs a rewrite',
        author: { displayName: 'Tanya L.' },
        createdTime: '2024-03-14T09:00:00Z',
        resolved: false,
        quotedFileContent: { value: 'pursuant to regulation' },
        replies: [],
      },
    ],
  };

  it('maps API response to ParseResult with correct fields', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(MOCK_API_RESPONSE),
    } as Response);

    const result = await fetchGoogleDocComments(
      'https://docs.google.com/document/d/abc123/edit',
      'fake-token'
    );

    expect(result.filename).toBe('Google Doc');
    expect(result.hasThreading).toBe(true);
    expect(result.comments).toHaveLength(3); // 2 top-level + 1 reply

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
    expect(reply.author).toBe('David R.');
    expect(reply.isReply).toBe(true);
    expect(reply.parentCommentId).toBe('c1');
    expect(reply.threadId).toBe(1);

    const second = result.comments[2];
    expect(second.threadId).toBe(2);
  });

  it('throws on invalid Google Doc URL', async () => {
    await expect(
      fetchGoogleDocComments('https://example.com', 'token')
    ).rejects.toThrow('Please paste a valid Google Docs URL');
  });

  it('throws on API error response', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      ok: false,
      status: 404,
    } as Response);

    await expect(
      fetchGoogleDocComments('https://docs.google.com/document/d/abc/edit', 'token')
    ).rejects.toThrow("Couldn't access this document");
  });

  it('handles comments with no quotedFileContent', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({
        comments: [{
          id: 'c1',
          content: 'A comment',
          author: { displayName: 'Test' },
          createdTime: '2024-01-01T00:00:00Z',
          resolved: false,
          replies: [],
        }],
      }),
    } as Response);

    const result = await fetchGoogleDocComments(
      'https://docs.google.com/document/d/abc/edit',
      'token'
    );
    expect(result.comments[0].highlightedContent).toBe('');
  });

  it('handles pagination', async () => {
    const page1 = {
      comments: [{
        id: 'c1', content: 'First', author: { displayName: 'A' },
        createdTime: '2024-01-01T00:00:00Z', resolved: false, replies: [],
      }],
      nextPageToken: 'page2token',
    };
    const page2 = {
      comments: [{
        id: 'c2', content: 'Second', author: { displayName: 'B' },
        createdTime: '2024-01-02T00:00:00Z', resolved: false, replies: [],
      }],
    };

    vi.spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve(page1) } as Response)
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve(page2) } as Response);

    const result = await fetchGoogleDocComments(
      'https://docs.google.com/document/d/abc/edit',
      'token'
    );
    expect(result.comments).toHaveLength(2);
    expect(result.comments[0].text).toBe('First');
    expect(result.comments[1].text).toBe('Second');
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/google/fetch-comments.test.ts`
Expected: FAIL — module not found

- [ ] **Step 3: Implement `fetch-comments.ts`**

Create `src/google/fetch-comments.ts`:

```typescript
import type { Comment, ParseResult } from '../types';

const DRIVE_API = 'https://www.googleapis.com/drive/v3/files';
const FIELDS = 'comments(id,content,author/displayName,createdTime,resolved,quotedFileContent/value,replies(id,content,author/displayName,createdTime)),nextPageToken';

export function extractDocId(url: string): string | null {
  const match = url.match(/docs\.google\.com\/document\/d\/([a-zA-Z0-9_-]+)/);
  return match ? match[1] : null;
}

interface DriveComment {
  id: string;
  content: string;
  author: { displayName: string };
  createdTime: string;
  resolved: boolean;
  quotedFileContent?: { value: string };
  replies: DriveReply[];
}

interface DriveReply {
  id: string;
  content: string;
  author: { displayName: string };
  createdTime: string;
}

interface DriveCommentsResponse {
  comments: DriveComment[];
  nextPageToken?: string;
}

export async function fetchGoogleDocComments(
  url: string,
  accessToken: string
): Promise<ParseResult> {
  const docId = extractDocId(url);
  if (!docId) {
    throw new Error('Please paste a valid Google Docs URL');
  }

  const allComments = await fetchAllPages(docId, accessToken);
  return mapToParseResult(allComments);
}

async function fetchAllPages(
  docId: string,
  accessToken: string
): Promise<DriveComment[]> {
  const all: DriveComment[] = [];
  let pageToken: string | undefined;

  do {
    const params = new URLSearchParams({
      fields: FIELDS,
      pageSize: '100',
    });
    if (pageToken) params.set('pageToken', pageToken);

    const res = await fetch(
      `${DRIVE_API}/${docId}/comments?${params}`,
      {
        headers: { Authorization: `Bearer ${accessToken}` },
      }
    );

    if (!res.ok) {
      if (res.status === 404 || res.status === 403) {
        throw new Error(
          "Couldn't access this document. Make sure the URL is correct and you have permission to view it."
        );
      }
      throw new Error("Couldn't access this document");
    }

    const data: DriveCommentsResponse = await res.json();
    all.push(...(data.comments ?? []));
    pageToken = data.nextPageToken;
  } while (pageToken);

  return all;
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function mapToParseResult(driveComments: DriveComment[]): ParseResult {
  const comments: Comment[] = [];
  let threadId = 0;

  for (const dc of driveComments) {
    threadId++;

    comments.push({
      id: dc.id,
      threadId,
      author: dc.author.displayName,
      date: dc.createdTime,
      dateDisplay: formatDate(dc.createdTime),
      text: dc.content,
      highlightedContent: dc.quotedFileContent?.value ?? '',
      location: '',
      resolved: dc.resolved,
      parentCommentId: null,
      isReply: false,
    });

    for (const reply of dc.replies) {
      comments.push({
        id: reply.id,
        threadId,
        author: reply.author.displayName,
        date: reply.createdTime,
        dateDisplay: formatDate(reply.createdTime),
        text: reply.content,
        highlightedContent: '',
        location: '',
        resolved: null,
        parentCommentId: dc.id,
        isReply: true,
      });
    }
  }

  return {
    comments,
    filename: 'Google Doc',
    hasThreading: true,
  };
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/google/fetch-comments.test.ts`
Expected: All tests PASS

- [ ] **Step 5: Commit**

```bash
git add src/google/fetch-comments.ts src/google/fetch-comments.test.ts
git commit -m "feat: add Google Doc comment fetcher with URL parsing and pagination"
```

---

## Task 4: Google Sheets Export

**Files:**
- Create: `src/google/export-sheets.ts`
- Create: `src/google/export-sheets.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `src/google/export-sheets.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { exportToSheets } from './export-sheets';
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

describe('exportToSheets', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('creates a spreadsheet and writes data, returns URL', async () => {
    const createResponse = {
      spreadsheetId: 'sheet123',
      spreadsheetUrl: 'https://docs.google.com/spreadsheets/d/sheet123/edit',
    };

    const fetchSpy = vi.spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(createResponse),
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({}),
      } as Response);

    const url = await exportToSheets(
      [makeComment()],
      'test-doc',
      true,
      'fake-token'
    );

    expect(url).toBe('https://docs.google.com/spreadsheets/d/sheet123/edit');

    // Verify create request
    const createCall = fetchSpy.mock.calls[0];
    expect(createCall[0]).toBe('https://sheets.googleapis.com/v4/spreadsheets');
    const createBody = JSON.parse(createCall[1]!.body as string);
    expect(createBody.properties.title).toBe('test-doc_comments');
    expect(createBody.sheets[0].properties.title).toBe('Comments');

    // Verify write request
    const writeCall = fetchSpy.mock.calls[1];
    expect(writeCall[0]).toContain('sheet123');
    expect(writeCall[0]).toContain('valueInputOption=RAW');
    const writeBody = JSON.parse(writeCall[1]!.body as string);
    expect(writeBody.values[0]).toEqual([
      'Thread', 'Reply', 'Author', 'Date', 'Comment',
      'Highlighted Text', 'Location', 'Resolved',
    ]);
    expect(writeBody.values).toHaveLength(2); // header + 1 row
  });

  it('throws on spreadsheet creation failure', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      ok: false,
      status: 500,
    } as Response);

    await expect(
      exportToSheets([makeComment()], 'test', true, 'token')
    ).rejects.toThrow("Couldn't create the spreadsheet");
  });

  it('throws on data write failure', async () => {
    vi.spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ spreadsheetId: 'x', spreadsheetUrl: 'url' }),
      } as Response)
      .mockResolvedValueOnce({
        ok: false,
        status: 500,
      } as Response);

    await expect(
      exportToSheets([makeComment()], 'test', true, 'token')
    ).rejects.toThrow("Couldn't write data to the spreadsheet");
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/google/export-sheets.test.ts`
Expected: FAIL — module not found

- [ ] **Step 3: Implement `export-sheets.ts`**

Create `src/google/export-sheets.ts`:

```typescript
import type { Comment } from '../types';
import { buildExportData } from '../export/build-rows';

const SHEETS_API = 'https://sheets.googleapis.com/v4/spreadsheets';

export async function exportToSheets(
  comments: Comment[],
  filename: string,
  hasThreading: boolean,
  accessToken: string
): Promise<string> {
  const createRes = await fetch(SHEETS_API, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      properties: { title: `${filename}_comments` },
      sheets: [{ properties: { title: 'Comments' } }],
    }),
  });

  if (!createRes.ok) {
    throw new Error("Couldn't create the spreadsheet. Please try again.");
  }

  const { spreadsheetId, spreadsheetUrl } = await createRes.json();

  const { headers, rows } = buildExportData(comments, hasThreading);

  const writeRes = await fetch(
    `${SHEETS_API}/${spreadsheetId}/values/Comments!A1?valueInputOption=RAW`,
    {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ values: [headers, ...rows] }),
    }
  );

  if (!writeRes.ok) {
    throw new Error("Couldn't write data to the spreadsheet. Please try again.");
  }

  return spreadsheetUrl;
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/google/export-sheets.test.ts`
Expected: All tests PASS

- [ ] **Step 5: Run full test suite**

Run: `npx vitest run`
Expected: All tests PASS

- [ ] **Step 6: Commit**

```bash
git add src/google/export-sheets.ts src/google/export-sheets.test.ts
git commit -m "feat: add Google Sheets export — creates spreadsheet and writes data"
```

---

## Task 5: Google Docs Import UI

**Files:**
- Create: `src/components/GoogleDocInput.tsx`
- Create: `src/components/GoogleDocInput.css`

- [ ] **Step 1: Create `src/components/GoogleDocInput.css`**

```css
.google-import {
  max-width: 480px;
  margin: 0 auto;
  text-align: center;
}

.google-import__divider {
  display: flex;
  align-items: center;
  gap: var(--space-4);
  margin: var(--space-5) 0;
  color: var(--color-base);
  font-size: var(--font-size-sm);
}

.google-import__divider::before,
.google-import__divider::after {
  content: '';
  flex: 1;
  height: 1px;
  background: var(--color-base-lighter);
}

.google-import__title {
  font-size: var(--font-size-base);
  font-weight: 600;
  color: var(--color-base-darkest);
  margin: 0 0 var(--space-3);
}

.google-import__form {
  display: flex;
  gap: var(--space-2);
}

.google-import__input {
  flex: 1;
  padding: var(--space-2) var(--space-3);
  border: 1px solid var(--color-base-lighter);
  border-radius: var(--border-radius);
  font-size: var(--font-size-sm);
  font-family: var(--font-family);
  color: var(--color-base-darkest);
}

.google-import__input:focus {
  outline: var(--focus-outline);
  outline-offset: var(--focus-offset);
  border-color: var(--color-primary);
}

.google-import__input::placeholder {
  color: var(--color-base-light);
}

.google-import__submit {
  padding: var(--space-2) var(--space-4);
  background: var(--color-primary);
  color: var(--color-white);
  border: none;
  border-radius: var(--border-radius);
  font-size: var(--font-size-sm);
  font-weight: 600;
  cursor: pointer;
  white-space: nowrap;
}

.google-import__submit:hover {
  background: var(--color-primary-dark);
}

.google-import__submit:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.google-import__error {
  margin-top: var(--space-2);
  font-size: var(--font-size-sm);
  color: var(--color-error);
}

.google-import__note {
  margin-top: var(--space-3);
  font-size: var(--font-size-sm);
  color: var(--color-base);
}
```

- [ ] **Step 2: Create `src/components/GoogleDocInput.tsx`**

```tsx
import { useCallback, useState } from 'react';
import { extractDocId } from '../google/fetch-comments';
import './GoogleDocInput.css';

interface GoogleDocInputProps {
  onImport: (url: string) => void;
  disabled: boolean;
}

export default function GoogleDocInput({ onImport, disabled }: GoogleDocInputProps) {
  const [url, setUrl] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      const trimmed = url.trim();
      if (!trimmed) return;
      if (!extractDocId(trimmed)) {
        setError('Please paste a valid Google Docs URL');
        return;
      }
      setError('');
      onImport(trimmed);
    },
    [url, onImport]
  );

  return (
    <div className="google-import">
      <div className="google-import__divider">or</div>
      <p className="google-import__title">Import from Google Docs</p>
      <form className="google-import__form" onSubmit={handleSubmit}>
        <input
          type="url"
          className="google-import__input"
          placeholder="Paste a Google Doc URL"
          value={url}
          onChange={e => { setUrl(e.target.value); setError(''); }}
          disabled={disabled}
        />
        <button
          type="submit"
          className="google-import__submit"
          disabled={disabled || !url.trim()}
        >
          Import
        </button>
      </form>
      {error && <p className="google-import__error" role="alert">{error}</p>}
      <p className="google-import__note">
        This connects to Google to access your documents. Comment Muncher doesn't store your data.
      </p>
    </div>
  );
}
```

- [ ] **Step 3: Verify tests still pass**

Run: `npx vitest run`
Expected: All tests PASS

- [ ] **Step 4: Commit**

```bash
git add src/components/GoogleDocInput.tsx src/components/GoogleDocInput.css
git commit -m "feat: add GoogleDocInput component for Google Docs URL import"
```

---

## Task 6: App Integration — Wire Google Features

**Files:**
- Modify: `src/App.tsx`
- Modify: `src/components/ExportButtons.tsx`

- [ ] **Step 1: Update `ExportButtons.tsx` to add Sheets button**

Replace `src/components/ExportButtons.tsx` with:

```tsx
import { useCallback, useState } from 'react';
import type { Comment } from '../types';
import { generateCsv } from '../export/export-csv';
import { generateXlsxBlob } from '../export/export-xlsx';
import { triggerDownload } from '../export/trigger-download';
import { getAccessToken } from '../google/auth';
import { exportToSheets } from '../google/export-sheets';

interface ExportButtonsProps {
  comments: Comment[];
  filename: string;
  hasThreading: boolean;
}

export default function ExportButtons({
  comments,
  filename,
  hasThreading,
}: ExportButtonsProps) {
  const [sheetsUrl, setSheetsUrl] = useState<string | null>(null);
  const [sheetsError, setSheetsError] = useState('');
  const [sheetsLoading, setSheetsLoading] = useState(false);

  function handleCsv() {
    const csv = generateCsv(comments, hasThreading);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    triggerDownload(blob, `${filename}_comments.csv`);
  }

  function handleXlsx() {
    const blob = generateXlsxBlob(comments, hasThreading);
    triggerDownload(blob, `${filename}_comments.xlsx`);
  }

  const handleSheets = useCallback(async () => {
    setSheetsError('');
    setSheetsUrl(null);
    setSheetsLoading(true);
    try {
      const token = await getAccessToken();
      const url = await exportToSheets(comments, filename, hasThreading, token);
      setSheetsUrl(url);
    } catch (err) {
      setSheetsError(err instanceof Error ? err.message : 'Export failed');
    } finally {
      setSheetsLoading(false);
    }
  }, [comments, filename, hasThreading]);

  const buttonBase: React.CSSProperties = {
    padding: 'var(--space-2) var(--space-4)',
    borderRadius: 'var(--border-radius)',
    fontSize: 'var(--font-size-sm)',
    fontWeight: 600,
    cursor: 'pointer',
    border: 'none',
  };

  const outlinedStyle: React.CSSProperties = {
    ...buttonBase,
    background: 'var(--color-white)',
    border: '1px solid var(--color-base-lighter)',
    color: 'var(--color-base-darkest)',
  };

  return (
    <div>
      <div style={{ display: 'flex', gap: 'var(--space-2)', alignItems: 'center' }}>
        <button onClick={handleCsv} style={outlinedStyle}>CSV</button>
        <button
          onClick={handleXlsx}
          style={{
            ...buttonBase,
            background: 'var(--color-primary)',
            color: 'var(--color-white)',
          }}
        >
          XLSX
        </button>
        <button
          onClick={handleSheets}
          disabled={sheetsLoading}
          style={{
            ...outlinedStyle,
            opacity: sheetsLoading ? 0.6 : 1,
            cursor: sheetsLoading ? 'not-allowed' : 'pointer',
          }}
        >
          {sheetsLoading ? 'Creating...' : 'Sheets'}
        </button>
      </div>
      {sheetsUrl && (
        <p style={{ margin: 'var(--space-2) 0 0', fontSize: 'var(--font-size-sm)' }}>
          Created —{' '}
          <a
            href={sheetsUrl}
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: 'var(--color-primary)' }}
          >
            Open in Google Sheets
          </a>
        </p>
      )}
      {sheetsError && (
        <p style={{ margin: 'var(--space-2) 0 0', fontSize: 'var(--font-size-sm)', color: 'var(--color-error)' }}>
          {sheetsError}
        </p>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Update `App.tsx` to add Google Doc import**

Replace `src/App.tsx` with:

```tsx
import { useCallback, useState } from 'react';
import type { ParseResult } from './types';
import { parseDocx } from './parser/parse-docx';
import { getAccessToken } from './google/auth';
import { fetchGoogleDocComments } from './google/fetch-comments';
import Header from './components/Header';
import DropZone from './components/DropZone';
import GoogleDocInput from './components/GoogleDocInput';
import CommentTable from './components/CommentTable';
import ExportButtons from './components/ExportButtons';
import ErrorMessage from './components/ErrorMessage';
import './App.css';

type AppState =
  | { view: 'upload' }
  | { view: 'loading' }
  | { view: 'results'; data: ParseResult }
  | { view: 'error'; message: string };

export default function App() {
  const [state, setState] = useState<AppState>({ view: 'upload' });

  const handleFile = useCallback(async (file: File) => {
    setState({ view: 'loading' });
    try {
      const result = await parseDocx(file);
      if (result.comments.length === 0) {
        setState({
          view: 'error',
          message: 'No comments found in this document',
        });
        return;
      }
      setState({ view: 'results', data: result });
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : "Couldn't read this file. It may be corrupted or not a valid .docx";
      setState({ view: 'error', message });
    }
  }, []);

  const handleGoogleImport = useCallback(async (url: string) => {
    setState({ view: 'loading' });
    try {
      const token = await getAccessToken();
      const result = await fetchGoogleDocComments(url, token);
      if (result.comments.length === 0) {
        setState({
          view: 'error',
          message: 'No comments found in this document',
        });
        return;
      }
      setState({ view: 'results', data: result });
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Couldn't connect to Google. Please try again.";
      setState({ view: 'error', message });
    }
  }, []);

  const handleError = useCallback((message: string) => {
    setState({ view: 'error', message });
  }, []);

  const handleReset = useCallback(() => {
    setState({ view: 'upload' });
  }, []);

  return (
    <div className="app">
      <Header />
      {state.view === 'upload' && (
        <>
          <DropZone onFile={handleFile} onError={handleError} />
          <GoogleDocInput
            onImport={handleGoogleImport}
            disabled={false}
          />
          <div className="info-section">
            <h2 className="info-section__title">
              Extract comments from Word documents
            </h2>
            <p className="info-section__body">
              Upload a <code>.docx</code> file or paste a Google Doc URL to
              instantly see every comment in a sortable table — who said what,
              when, on which text, and whether it's been resolved. Export the
              full set as CSV, XLSX, or Google Sheets.
            </p>
            <div className="info-section__features">
              <div className="info-section__feature">
                <strong>What's extracted</strong>
                <span>
                  Comment text, highlighted content, author, date, document
                  location, reply threads, resolved/open status
                </span>
              </div>
              <div className="info-section__feature">
                <strong>Privacy first</strong>
                <span>
                  DOCX files are processed entirely in your browser — never
                  uploaded. Google Docs access goes through Google's API
                  directly; Comment Muncher doesn't store your data.
                </span>
              </div>
            </div>
          </div>
        </>
      )}
      {state.view === 'loading' && (
        <div className="loading" role="status" aria-live="polite">
          Extracting comments...
        </div>
      )}
      {state.view === 'error' && (
        <ErrorMessage message={state.message} onReset={handleReset} />
      )}
      {state.view === 'results' && (
        <>
          <div className="results-header">
            <div className="results-header__info">
              <span className="results-header__filename">
                {state.data.filename}
                {!state.data.filename.includes('Google') && '.docx'}
              </span>
              <span className="results-header__count" aria-live="polite">
                {state.data.comments.length} comment
                {state.data.comments.length !== 1 ? 's' : ''}
              </span>
            </div>
            <ExportButtons
              comments={state.data.comments}
              filename={state.data.filename}
              hasThreading={state.data.hasThreading}
            />
          </div>
          <CommentTable
            comments={state.data.comments}
            hasThreading={state.data.hasThreading}
          />
          <div className="results-footer">
            <button className="results-footer__link" onClick={handleReset}>
              &#8592; Upload another file
            </button>
          </div>
        </>
      )}
    </div>
  );
}
```

- [ ] **Step 3: Run all tests**

Run: `npx vitest run`
Expected: All tests PASS

- [ ] **Step 4: Run the build**

Run: `npm run build`
Expected: Build completes without errors

- [ ] **Step 5: Commit**

```bash
git add src/App.tsx src/components/ExportButtons.tsx
git commit -m "feat: wire Google Docs import and Sheets export into the app"
```

---

## Task 7: Manual Testing + Final Polish

**Files:**
- Possibly minor adjustments based on testing

- [ ] **Step 1: Add VITE_GOOGLE_CLIENT_ID to .env.local (for dev testing)**

Create `.env.local` (gitignored by default in Vite):

```
VITE_GOOGLE_CLIENT_ID=your-client-id-here.apps.googleusercontent.com
```

Note: Replace with the actual client ID from Google Cloud Console. This file is not committed.

- [ ] **Step 2: Add .env.local to .gitignore if not already there**

Verify `.env` is in `.gitignore` (it is — Vite also ignores `.env.local` by default).

- [ ] **Step 3: Start dev server and test DOCX flow (regression check)**

Run: `npm run dev`

1. Upload `test-budget.docx` via drop zone → verify comments render
2. Sort columns → verify sorting works
3. Export CSV → verify download
4. Export XLSX → verify download
5. Click "Upload another file" → verify reset

All should work exactly as before.

- [ ] **Step 4: Test Google Docs import (requires real client ID)**

1. Set `VITE_GOOGLE_CLIENT_ID` in `.env.local`
2. Paste a Google Doc URL with comments
3. Click Import → OAuth popup appears → approve
4. Comments render in table with threading and resolved status
5. Location column should be empty (expected for Google Docs)

- [ ] **Step 5: Test Google Sheets export**

1. From results screen (DOCX or Google Doc), click "Sheets" button
2. If not already authenticated, OAuth popup appears
3. "Creating..." shows during export
4. "Created — Open in Google Sheets" link appears
5. Click link → spreadsheet opens in new tab with correct data

- [ ] **Step 6: Test error handling**

1. Paste an invalid URL → "Please paste a valid Google Docs URL"
2. Paste a URL to a doc you don't have access to → "Couldn't access this document..."
3. Deny OAuth → "Google access was not granted"

- [ ] **Step 7: Run full test suite and build one final time**

Run: `npx vitest run`
Expected: All tests PASS

Run: `npm run build`
Expected: Clean build

- [ ] **Step 8: Commit any polish changes**

```bash
git add -A
git commit -m "chore: final polish after manual testing"
```

(Skip this commit if no changes were needed.)
