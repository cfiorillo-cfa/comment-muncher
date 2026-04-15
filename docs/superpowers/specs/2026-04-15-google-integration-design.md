# Google Docs Import + Google Sheets Export — Design Spec

**Date:** 2026-04-15
**Status:** Draft
**Owner:** cfiorillo-cfa
**Depends on:** Comment Muncher v1 (complete)

## Overview

Add two opt-in Google features to Comment Muncher: import comments from a Google Doc by pasting its URL, and export the comment table to a new Google Sheet. Both use client-side OAuth via Google Identity Services. No backend. The existing DOCX flow is unchanged.

## Goals

- Import comments from a Google Doc URL with the same richness as DOCX (author, date, text, highlighted content, replies, resolved status)
- Export comment table to a new Google Sheet with one click
- Auth on demand — users who only use DOCX never see a Google prompt
- Zero backend — all API calls happen client-side
- Honest privacy messaging about the two-tier model

## Non-Goals

- Google Drive file picker (v3 candidate — paste URL is sufficient for now)
- Appending to existing Google Sheets (always creates new)
- Persisting auth tokens across sessions (token lives in memory only)
- Batch processing multiple Google Docs
- Editing or resolving comments from within Comment Muncher

## Architecture

### Auth

**Library:** Google Identity Services (GIS) — loaded dynamically from `accounts.google.com/gsi/client` via a `<script>` tag only when a Google feature is first triggered. Not bundled.

**OAuth client type:** Public client (SPA). Client ID embedded in code. No client secret.

**Scopes requested (both at once on first auth):**
- `https://www.googleapis.com/auth/drive.readonly` — read comments on Google Docs
- `https://www.googleapis.com/auth/spreadsheets` — create and write Google Sheets

**Token lifecycle:**
- Stored in memory (`useState` or module-level variable). Never persisted to localStorage, sessionStorage, or cookies.
- Expires after ~1 hour (Google's default).
- On expiry, next Google action re-triggers the consent popup.
- No refresh tokens (not available for public clients with implicit/code flow in SPA).

**Google Cloud project setup (manual, one-time):**
- Create a project in Google Cloud Console
- Enable Drive API and Sheets API
- Create an OAuth 2.0 Client ID (Web application type)
- Add authorized JavaScript origins: `https://cfiorillo-cfa.github.io` and `http://localhost:5173` (dev)
- For CfA-internal use: set OAuth consent screen to "Internal" (skip Google verification)

### Data Flow — Google Docs Import

```
User pastes Google Doc URL
  → Extract document ID via regex: docs.google.com/document/d/{ID}/...
  → Ensure valid access token (auth on demand if needed)
  → GET https://www.googleapis.com/drive/v3/files/{ID}/comments
      ?fields=comments(id,content,author/displayName,createdTime,resolved,quotedFileContent/value,replies(id,content,author/displayName,createdTime))
      &pageSize=100
  → Handle pagination if nextPageToken present
  → Map API response → Comment[]
  → Return ParseResult (same interface as parseDocx)
  → Render in CommentTable
```

**API response → Comment mapping:**

| Drive API v3 field | Comment field |
|-------------------|---------------|
| `id` | `id` |
| `author.displayName` | `author` |
| `createdTime` | `date` (ISO 8601) |
| Formatted `createdTime` | `dateDisplay` |
| `content` | `text` |
| `quotedFileContent.value` | `highlightedContent` |
| `resolved` | `resolved` (already a boolean in v3) |
| Position in comments array | `threadId` (sequential) |
| `replies[]` → separate Comment entries | `parentCommentId`, `isReply` |

**Location field:** The Drive API doesn't provide section/heading context like DOCX does. Set `location` to empty string for all Google Doc comments.

**Pagination:** The Drive API v3 returns max 100 comments per page (`pageSize=100`). If `nextPageToken` is present, fetch subsequent pages until exhausted.

### Data Flow — Google Sheets Export

```
User clicks "Sheets" export button
  → Ensure valid access token (auth on demand if needed)
  → POST https://sheets.googleapis.com/v4/spreadsheets
      Body: { properties: { title: "{filename}_comments" }, sheets: [{ properties: { title: "Comments" } }] }
  → Returns spreadsheet ID and URL
  → PUT https://sheets.googleapis.com/v4/spreadsheets/{ID}/values/Comments!A1
      ?valueInputOption=RAW
      Body: { values: [[headers], [row1], [row2], ...] }
  → Show link to user: "Open in Google Sheets"
```

**Row building:** Extract shared row-building logic from the existing CSV/XLSX exports into `src/export/build-rows.ts`. All three exports (CSV, XLSX, Sheets) use the same function to build the header and data arrays.

### New Files

```
src/google/
├── auth.ts              # GIS script loading, token management, auth trigger
├── fetch-comments.ts    # Google Doc URL → ParseResult
├── export-sheets.ts     # Comment[] → new Google Sheet, returns URL
└── config.ts            # Client ID constant

src/export/
├── build-rows.ts        # Shared: Comment[] → [headers[], ...rows[]] (extracted from csv/xlsx)
```

### Modified Files

```
src/App.tsx              # Add Google Doc import option on upload screen
src/components/
├── ExportButtons.tsx    # Add "Sheets" button
├── DropZone.tsx         # Add "or import from Google Docs" link + URL input
└── DropZone.css         # Styles for the URL input
src/export/
├── export-csv.ts        # Refactor to use build-rows.ts
└── export-xlsx.ts       # Refactor to use build-rows.ts
```

## UI Design

### Upload Screen Changes

Below the existing drop zone and privacy message, add:

```
─────────── or ───────────

Import from Google Docs
[Paste a Google Doc URL here          ] [Import]
```

- The divider and Google option appear below the existing content — drop zone stays prominent
- Clicking "Import" with a valid URL triggers auth (if needed), then fetches comments
- Invalid URL → inline error: "Please paste a valid Google Docs URL"
- Auth denied/failed → inline error: "Couldn't connect to Google. Please try again."
- Doc has no comments → same "No comments found" error as DOCX flow

### Results Screen Changes

Export buttons become three options:

```
[CSV]  [XLSX]  [Sheets]
```

- "Sheets" button styled like CSV (outlined) to keep XLSX as the visual primary
- After Sheets export succeeds, show a link below the buttons: "Created — Open in Google Sheets" (opens in new tab)
- If Sheets export fails, show inline error below buttons

### Privacy Messaging

- Upload screen keeps: "Your files never leave your browser"
- When a Google feature first triggers auth, show a one-time note above the Google section: "This connects to Google to access your documents. Comment Muncher doesn't store your data."
- This note is informational, not a blocker — the OAuth consent screen itself is the real permission gate

## Error Handling

| Condition | Message |
|-----------|---------|
| Invalid Google Doc URL | "Please paste a valid Google Docs URL" |
| OAuth popup blocked by browser | "Pop-up blocked — please allow pop-ups for this site and try again" |
| OAuth denied by user | "Google access was not granted" |
| Token expired mid-action | Re-trigger auth automatically, retry the action |
| Doc not found or no access | "Couldn't access this document. Make sure the URL is correct and you have permission to view it." |
| Doc has no comments | "No comments found in this document" |
| Drive API rate limit | "Google's API is temporarily busy. Please wait a moment and try again." |
| Sheets creation failed | "Couldn't create the spreadsheet. Please try again." |

## Testing Strategy

- **auth.ts:** Difficult to unit test (depends on GIS script). Test the token state management and expiry checking, mock the GIS library.
- **fetch-comments.ts:** Unit test the API response → Comment[] mapping with fixture data. Mock the fetch calls.
- **export-sheets.ts:** Unit test the request body construction. Mock the fetch calls.
- **build-rows.ts:** Unit test directly — pure function, same pattern as existing CSV/XLSX tests.
- **Integration:** Manual testing with a real Google Doc is essential. Automated e2e with real OAuth is out of scope.

## Setup Requirements

Before this feature works, someone needs to (one-time, manual):

1. Create a Google Cloud project
2. Enable Drive API and Sheets API
3. Create an OAuth 2.0 Client ID for a Web Application
4. Add authorized origins (`https://cfiorillo-cfa.github.io`, `http://localhost:5173`)
5. Set consent screen to "Internal" (CfA org only) or submit for verification (public)
6. Put the client ID in `src/google/config.ts`

## Privacy Model

| Mode | Data stays local? | Third-party scripts? | Network calls? |
|------|-------------------|---------------------|----------------|
| DOCX (default) | Yes | None | None |
| Google (opt-in) | No — flows through Google APIs | GIS script from Google CDN | Drive API, Sheets API |

Comment Muncher never operates a backend. In Google mode, data flows between the user's browser and Google's APIs directly. No intermediary.

## Future Considerations

- Google Drive file picker widget (richer UX than URL paste)
- Batch import from multiple Google Docs
- Export to existing Google Sheet (append mode)
- Offline support / token refresh via backend proxy
