# Comment Muncher — Design Spec

**Date:** 2026-04-15
**Status:** Draft
**Owner:** cfiorillo-cfa

## Overview

Comment Muncher is a client-side web app that extracts comments from DOCX files and exports them in structured formats (CSV, XLSX). Files are processed entirely in the browser — nothing is uploaded to a server.

Built for Code for America staff who review heavily commented policy and proposal documents, but designed as a general-purpose tool anyone can use.

## Goals

- Upload a DOCX, immediately see a table of all comments
- Export the full comment set as CSV or XLSX
- Extract rich metadata: comment text, highlighted content, author, date, reply threads, resolved status, document location
- Zero backend — files never leave the browser
- USWDS-inspired, accessible UI

## Non-Goals (v1)

- Google Docs input
- Google Sheets export
- In-app filtering, tagging, or comment resolution
- User accounts or persistence
- Multi-file upload
- PDF or other format support

## Architecture

### Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| Framework | React | SPA, component-based UI |
| DOCX unzip | JSZip | Unzips DOCX in-browser |
| XML parsing | DOMParser (native) | Parses OOXML from the DOCX |
| XLSX export | SheetJS (xlsx) | Generates XLSX and CSV downloads |
| Styling | USWDS design tokens (CSS custom properties) | Consistent gov-friendly look without the full USWDS dependency |
| Hosting | Static (GitHub Pages, Netlify, etc.) | No server required |

### Data Flow

```
User drops/selects DOCX
  → JSZip.loadAsync(file)
  → Extract and parse:
      word/comments.xml        → comment text, author, date, IDs
      word/document.xml        → commentRangeStart/End → highlighted text, paragraph location
      word/commentsExtended.xml → reply threading (paraId), resolved status (w15:done)
  → Merge into Comment[] array
  → Render as sortable table
  → Export on demand (CSV / XLSX)
```

### Data Model

```typescript
interface Comment {
  id: string;                    // Internal DOCX comment ID
  threadId: number;              // Sequential, user-friendly thread number
  author: string;
  date: string;                  // ISO 8601 from DOCX
  dateDisplay: string;           // Readable format, e.g. "Mar 12, 2024"
  text: string;                  // Plain text (rich text stripped)
  highlightedContent: string;    // Text between commentRangeStart/End
  location: string;              // Nearest preceding heading, or "Paragraph N"
  resolved: boolean | null;      // null if commentsExtended.xml absent
  parentCommentId: string | null; // null = top-level comment
  isReply: boolean;
}
```

## DOCX Parsing — Detail

This is the core of the app and where most complexity lives.

### comments.xml

Each `<w:comment>` element contains:
- `w:id` — unique comment identifier
- `w:author` — display name of commenter
- `w:date` — ISO timestamp
- Child `<w:p>` elements — the comment body (may contain formatted runs)

**Extraction:** Iterate `<w:comment>` elements. For each, concatenate all text content from descendant `<w:t>` elements, stripping formatting. This gives us plain-text comment content.

### document.xml — Highlighted Content

Comments are anchored to document text via range markers:
- `<w:commentRangeStart w:id="N"/>` — marks where the highlight begins
- `<w:commentRangeEnd w:id="N"/>` — marks where the highlight ends

**The hard part:** These markers can span multiple `<w:p>` (paragraph) elements, multiple `<w:r>` (run) elements, and even cross table cell boundaries. The extraction algorithm:

1. Find `commentRangeStart` with matching ID
2. Walk forward through sibling and descendant nodes
3. Collect all `<w:t>` text content encountered
4. Stop at matching `commentRangeEnd`
5. Join collected text with spaces (or newlines at paragraph boundaries)

**Edge cases to handle:**
- Range markers in different table cells
- Nested/overlapping comment ranges
- Missing `commentRangeEnd` (treat as single-point anchor, use surrounding paragraph text)
- Comments with no range markers at all (show "N/A" for highlighted content)

### document.xml — Location

To provide document context for each comment:

1. Build an ordered list of headings from `<w:pStyle>` values matching `Heading1`, `Heading2`, etc.
2. For each comment range start, find the nearest preceding heading
3. If found: `location = "Section: {heading text}"`
4. If no preceding heading (comment is before the first heading, or document has no headings): `location = "Paragraph {N}"` (1-indexed paragraph count)

### commentsExtended.xml — Threading and Resolved Status

This file may not exist in all DOCX files (older Word versions, LibreOffice exports).

**When present:**
- `<w15:commentEx>` elements link to comments via `w15:paraId`
- `w15:done="1"` indicates resolved status
- Parent-child threading is determined by matching `paraId` references

**When absent:**
- All comments are treated as top-level (no threading)
- Resolved status is `null` — the "Status" column is hidden from the UI
- CSV/XLSX exports omit the `resolved` and `thread_id` columns

## UI Design

### Two-State Interface

The app has exactly two states: **Upload** and **Results**. No routing, no navigation.

### Upload Screen

- **Header:** CfA logo + "Comment Muncher" title, separated by a USWDS blue (#005ea2) bottom border
- **Drop zone:** Centered, dashed-border box with:
  - File icon
  - "Drop your .docx file here" heading
  - "or click to browse" subtitle
  - "Choose file" button (triggers native file picker)
- **Privacy message:** Below drop zone — lock icon + "Your files never leave your browser"
- **Accepts:** `.docx` files only. Drag-and-drop and click-to-browse both supported.

### Results Screen

- **Header:** Same CfA logo + title bar as upload screen
- **Subheader row:**
  - Left: filename + comment count (e.g., "budget_proposal_v3.docx — 24 comments")
  - Right: export buttons (CSV, XLSX)
- **Comment table:**
  - Columns: Comment | Highlighted Text | Author | Date | Location | Status
  - Column headers are clickable to sort (ascending/descending toggle)
  - Reply rows are indented with a ↳ prefix and slightly muted text color
  - Status badges: green "Resolved" / red "Open" pills (with text labels, not color alone)
  - If no threading info: Status column hidden, no indentation
- **Footer:** "Upload another" link to reset back to upload state

### Error States

All errors display inline where the drop zone was — no modals, no toasts.

| Condition | Message |
|-----------|---------|
| Non-DOCX file dropped | "Please upload a .docx file" |
| Valid DOCX, zero comments | "No comments found in this document" + "Upload another" link |
| Corrupt or unreadable file | "Couldn't read this file. It may be corrupted or not a valid .docx" |
| Missing comments.xml | "This document doesn't contain any comment data" |

### Accessibility

USWDS-inspired means following through on accessibility:

- Semantic `<table>` with `<thead>`, `<th scope="col">`, `<tbody>`
- Drop zone is keyboard-navigable (focusable, activates on Enter/Space)
- Status badges use text labels, not color alone
- All interactive elements have visible focus indicators
- Sufficient color contrast per WCAG 2.1 AA
- `aria-live` region for status messages (loading, error, comment count)

## Export Format

### CSV

Flat structure — one row per comment/reply.

| Column | Description |
|--------|------------|
| `thread_id` | Sequential thread number (1, 2, 3...) — all replies in a thread share the same ID |
| `is_reply` | `TRUE` / `FALSE` |
| `author` | Comment author name |
| `date` | ISO 8601 timestamp |
| `comment` | Plain-text comment content |
| `highlighted_text` | The document text the comment is anchored to |
| `location` | Section heading or paragraph number |
| `resolved` | `TRUE` / `FALSE` / omitted if unknown |

If threading info is unavailable, `thread_id` and `is_reply` columns are omitted.
If resolved status is unavailable, `resolved` column is omitted.

### XLSX

Same data and columns as CSV, plus:
- Bold header row
- Auto-sized column widths
- Worksheet named "Comments"

### File Naming

Downloads are named: `{original_filename}_comments.csv` / `{original_filename}_comments.xlsx`

Example: uploading `budget_proposal_v3.docx` produces `budget_proposal_v3_comments.xlsx`.

## Technical Risks

1. **Highlighted text extraction across complex ranges** — This is the most likely source of bugs. Comment ranges spanning tables, nested structures, or missing end markers need careful handling. Plan for iterative testing with real-world DOCX files.

2. **DOCX format variability** — Files from Word, LibreOffice, Google Docs export, and other tools may structure their XML differently. We should test with files from multiple sources.

3. **Large file performance** — JSZip loads the entire file into memory. For typical documents (< 50MB) this is fine. Very large files with embedded media will be slower but still functional since we only parse the XML parts.

## Future Considerations (v2+)

- Google Docs input (Drive API + OAuth)
- Google Sheets export (Sheets API + OAuth)
- In-app filtering, sorting, and tagging
- Comment resolution workflow
- Multi-file batch processing
- PDF comment extraction
