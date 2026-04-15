# Comment Muncher Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a client-side web app that extracts comments from DOCX files and exports them as CSV/XLSX.

**Architecture:** React SPA with Vite. DOCX files are unzipped in-browser with JSZip, parsed via native DOMParser, and rendered in a sortable table. Exports generated client-side with SheetJS. No backend.

**Tech Stack:** React 18, TypeScript, Vite, JSZip, SheetJS (xlsx), Vitest + jsdom, USWDS design tokens (CSS custom properties)

**Spec:** `docs/superpowers/specs/2026-04-15-comment-muncher-design.md`

---

## File Structure

```
comment-muncher/
├── index.html
├── package.json
├── tsconfig.json
├── vite.config.ts
├── assets/
│   └── cfa_logo.png              # Already exists
├── src/
│   ├── main.tsx                   # React entry point
│   ├── App.tsx                    # Root component — manages upload/results state
│   ├── App.css                    # App-level layout styles
│   ├── types.ts                   # Comment, RawComment, CommentAnchor, CommentExtension
│   ├── parser/
│   │   ├── xml-helpers.ts         # Namespace URIs, text extraction utility
│   │   ├── xml-helpers.test.ts
│   │   ├── parse-comments.ts      # comments.xml → RawComment[]
│   │   ├── parse-comments.test.ts
│   │   ├── parse-document.ts      # document.xml → CommentAnchor[]
│   │   ├── parse-document.test.ts
│   │   ├── parse-threading.ts     # commentsExtended.xml → CommentExtension[]
│   │   ├── parse-threading.test.ts
│   │   ├── parse-docx.ts          # Orchestrator: unzip, coordinate, merge → Comment[]
│   │   └── parse-docx.test.ts
│   ├── export/
│   │   ├── export-csv.ts          # Comment[] → CSV string → download
│   │   ├── export-csv.test.ts
│   │   ├── export-xlsx.ts         # Comment[] → XLSX blob → download
│   │   ├── export-xlsx.test.ts
│   │   └── trigger-download.ts    # Browser download helper (create anchor, click, cleanup)
│   ├── components/
│   │   ├── Header.tsx
│   │   ├── DropZone.tsx
│   │   ├── DropZone.css
│   │   ├── CommentTable.tsx
│   │   ├── CommentTable.css
│   │   ├── ExportButtons.tsx
│   │   ├── ErrorMessage.tsx
│   │   └── StatusBadge.tsx
│   └── styles/
│       └── tokens.css             # USWDS design tokens as CSS custom properties
```

---

## Task 1: Project Scaffolding

**Files:**
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `vite.config.ts`
- Create: `index.html`
- Create: `src/main.tsx`
- Create: `src/types.ts`
- Create: `src/parser/xml-helpers.ts`
- Create: `src/parser/xml-helpers.test.ts`

- [ ] **Step 1: Create `package.json`**

```json
{
  "name": "comment-muncher",
  "private": true,
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc -b && vite build",
    "preview": "vite preview",
    "test": "vitest",
    "test:run": "vitest run"
  },
  "dependencies": {
    "jszip": "^3.10.1",
    "react": "^18.3.1",
    "react-dom": "^18.3.1",
    "xlsx": "https://cdn.sheetjs.com/xlsx-0.20.3/xlsx-0.20.3.tgz"
  },
  "devDependencies": {
    "@types/react": "^18.3.12",
    "@types/react-dom": "^18.3.1",
    "@vitejs/plugin-react": "^4.3.4",
    "typescript": "^5.6.0",
    "vite": "^6.0.0",
    "vitest": "^2.1.0",
    "jsdom": "^25.0.0"
  }
}
```

Note: SheetJS community edition is installed from their CDN tarball, not npm. This is the official install method per SheetJS docs.

- [ ] **Step 2: Create `tsconfig.json`**

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "useDefineForClassFields": true,
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "isolatedModules": true,
    "moduleDetection": "force",
    "noEmit": true,
    "jsx": "react-jsx",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true,
    "noUncheckedSideEffectImports": true
  },
  "include": ["src"]
}
```

- [ ] **Step 3: Create `vite.config.ts`**

```typescript
/// <reference types="vitest" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
  },
});
```

- [ ] **Step 4: Create `index.html`**

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Comment Muncher</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

- [ ] **Step 5: Create `src/main.tsx`**

```tsx
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
```

- [ ] **Step 6: Create `src/App.tsx` (placeholder)**

```tsx
export default function App() {
  return <div>Comment Muncher</div>;
}
```

- [ ] **Step 7: Create `src/types.ts`**

```typescript
/** Raw comment data extracted from comments.xml */
export interface RawComment {
  id: string;
  author: string;
  date: string;
  text: string;
  paraId: string | null;
}

/** Highlighted content and location extracted from document.xml */
export interface CommentAnchor {
  commentId: string;
  highlightedContent: string;
  location: string;
}

/** Threading and resolved status from commentsExtended.xml */
export interface CommentExtension {
  paraId: string;
  done: boolean;
  parentParaId: string | null;
}

/** Final merged comment for display and export */
export interface Comment {
  id: string;
  threadId: number;
  author: string;
  date: string;
  dateDisplay: string;
  text: string;
  highlightedContent: string;
  location: string;
  resolved: boolean | null;
  parentCommentId: string | null;
  isReply: boolean;
}

/** Result of parsing a DOCX file */
export interface ParseResult {
  comments: Comment[];
  filename: string;
  hasThreading: boolean;
}
```

- [ ] **Step 8: Create `src/parser/xml-helpers.ts`**

```typescript
/** OOXML namespace URIs */
export const W_NS = 'http://schemas.openxmlformats.org/wordprocessingml/2006/main';
export const W14_NS = 'http://schemas.microsoft.com/office/word/2010/wordml';
export const W15_NS = 'http://schemas.microsoft.com/office/word/2012/wordml';

/**
 * Extract all plain text from an XML element by concatenating
 * all descendant <w:t> elements. Strips rich text formatting.
 */
export function getTextContent(element: Element): string {
  const textNodes = element.getElementsByTagNameNS(W_NS, 't');
  const parts: string[] = [];
  for (let i = 0; i < textNodes.length; i++) {
    parts.push(textNodes[i].textContent ?? '');
  }
  return parts.join('');
}

/** Parse an XML string into a Document. Returns null if malformed. */
export function parseXml(xml: string): Document | null {
  const parser = new DOMParser();
  const doc = parser.parseFromString(xml, 'application/xml');
  if (doc.querySelector('parsererror')) {
    return null;
  }
  return doc;
}
```

- [ ] **Step 9: Write test for xml-helpers**

Create `src/parser/xml-helpers.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { getTextContent, parseXml, W_NS } from './xml-helpers';

describe('parseXml', () => {
  it('parses valid XML', () => {
    const doc = parseXml('<root><child/></root>');
    expect(doc).not.toBeNull();
    expect(doc!.documentElement.tagName).toBe('root');
  });

  it('returns null for malformed XML', () => {
    const doc = parseXml('<root><unclosed>');
    expect(doc).toBeNull();
  });
});

describe('getTextContent', () => {
  it('extracts text from w:t elements', () => {
    const xml = `
      <w:comment xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
        <w:p>
          <w:r><w:t>Hello </w:t></w:r>
          <w:r><w:rPr><w:b/></w:rPr><w:t>world</w:t></w:r>
        </w:p>
      </w:comment>
    `;
    const doc = parseXml(xml)!;
    const comment = doc.documentElement;
    expect(getTextContent(comment)).toBe('Hello world');
  });

  it('returns empty string when no text nodes', () => {
    const xml = `
      <w:comment xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
        <w:p><w:pPr><w:pStyle w:val="CommentText"/></w:pPr></w:p>
      </w:comment>
    `;
    const doc = parseXml(xml)!;
    expect(getTextContent(doc.documentElement)).toBe('');
  });
});
```

- [ ] **Step 10: Run tests to verify helpers work**

Run: `npx vitest run src/parser/xml-helpers.test.ts`
Expected: All tests PASS

- [ ] **Step 11: Install dependencies and verify dev server starts**

```bash
npm install
npm run dev -- --open
```

Verify: browser opens to a page showing "Comment Muncher". Kill the dev server.

- [ ] **Step 12: Commit**

```bash
git add package.json package-lock.json tsconfig.json vite.config.ts index.html src/
git commit -m "feat: scaffold project with Vite, React, TypeScript, and core types"
```

---

## Task 2: Parse comments.xml

**Files:**
- Create: `src/parser/parse-comments.ts`
- Create: `src/parser/parse-comments.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `src/parser/parse-comments.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { parseCommentsXml } from './parse-comments';

const COMMENTS_XML = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:comments xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"
            xmlns:w14="http://schemas.microsoft.com/office/word/2010/wordml">
  <w:comment w:id="1" w:author="Maria S." w:date="2024-03-12T10:30:00Z" w:initials="MS">
    <w:p w14:paraId="1A2B3C01" w14:textId="00000001" w:rsidR="00000000">
      <w:pPr><w:pStyle w:val="CommentText"/></w:pPr>
      <w:r><w:t>Need to verify these numbers with finance</w:t></w:r>
    </w:p>
  </w:comment>
  <w:comment w:id="2" w:author="David R." w:date="2024-03-13T14:15:00Z" w:initials="DR">
    <w:p w14:paraId="1A2B3C02" w14:textId="00000002" w:rsidR="00000000">
      <w:pPr><w:pStyle w:val="CommentText"/></w:pPr>
      <w:r><w:t>Confirmed with Jess, </w:t></w:r>
      <w:r><w:rPr><w:b/></w:rPr><w:t>numbers are correct</w:t></w:r>
    </w:p>
  </w:comment>
</w:comments>`;

describe('parseCommentsXml', () => {
  it('extracts comment id, author, date, and text', () => {
    const comments = parseCommentsXml(COMMENTS_XML);
    expect(comments).toHaveLength(2);
    expect(comments[0]).toEqual({
      id: '1',
      author: 'Maria S.',
      date: '2024-03-12T10:30:00Z',
      text: 'Need to verify these numbers with finance',
      paraId: '1A2B3C01',
    });
  });

  it('concatenates text across multiple runs (strips formatting)', () => {
    const comments = parseCommentsXml(COMMENTS_XML);
    expect(comments[1].text).toBe('Confirmed with Jess, numbers are correct');
  });

  it('extracts paraId from first paragraph', () => {
    const comments = parseCommentsXml(COMMENTS_XML);
    expect(comments[0].paraId).toBe('1A2B3C01');
    expect(comments[1].paraId).toBe('1A2B3C02');
  });

  it('returns null paraId when w14:paraId is absent', () => {
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
      <w:comments xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
        <w:comment w:id="1" w:author="Test" w:date="2024-01-01T00:00:00Z">
          <w:p><w:r><w:t>No paraId here</w:t></w:r></w:p>
        </w:comment>
      </w:comments>`;
    const comments = parseCommentsXml(xml);
    expect(comments[0].paraId).toBeNull();
  });

  it('returns empty array for XML with no comments', () => {
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
      <w:comments xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"/>`;
    expect(parseCommentsXml(xml)).toEqual([]);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/parser/parse-comments.test.ts`
Expected: FAIL — `parseCommentsXml` is not defined

- [ ] **Step 3: Implement `parse-comments.ts`**

Create `src/parser/parse-comments.ts`:

```typescript
import type { RawComment } from '../types';
import { W_NS, W14_NS, getTextContent, parseXml } from './xml-helpers';

export function parseCommentsXml(xml: string): RawComment[] {
  const doc = parseXml(xml);
  if (!doc) return [];

  const commentElements = doc.getElementsByTagNameNS(W_NS, 'comment');
  const comments: RawComment[] = [];

  for (let i = 0; i < commentElements.length; i++) {
    const el = commentElements[i];
    const id = el.getAttributeNS(W_NS, 'id') ?? el.getAttribute('w:id') ?? '';
    const author = el.getAttributeNS(W_NS, 'author') ?? el.getAttribute('w:author') ?? '';
    const date = el.getAttributeNS(W_NS, 'date') ?? el.getAttribute('w:date') ?? '';

    const paragraphs = el.getElementsByTagNameNS(W_NS, 'p');
    const firstP = paragraphs[0] ?? null;
    const paraId =
      firstP?.getAttributeNS(W14_NS, 'paraId') ??
      firstP?.getAttribute('w14:paraId') ??
      null;

    const text = getTextContent(el);

    comments.push({ id, author, date, text, paraId });
  }

  return comments;
}
```

Note: We try both `getAttributeNS` and `getAttribute` with prefix because jsdom and browser DOMParser handle namespace attributes differently in some edge cases. The first non-null value wins.

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/parser/parse-comments.test.ts`
Expected: All tests PASS

- [ ] **Step 5: Commit**

```bash
git add src/parser/parse-comments.ts src/parser/parse-comments.test.ts
git commit -m "feat: add comments.xml parser with tests"
```

---

## Task 3: Parse document.xml — Highlighted Content + Location

**Files:**
- Create: `src/parser/parse-document.ts`
- Create: `src/parser/parse-document.test.ts`

This is the most complex parser. It extracts both the highlighted text (content between `commentRangeStart` and `commentRangeEnd`) and the document location (nearest preceding heading or paragraph number).

- [ ] **Step 1: Write the failing tests**

Create `src/parser/parse-document.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { parseDocumentXml } from './parse-document';

const W = 'http://schemas.openxmlformats.org/wordprocessingml/2006/main';

function makeDocXml(bodyContent: string): string {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
    <w:document xmlns:w="${W}">
      <w:body>${bodyContent}</w:body>
    </w:document>`;
}

describe('parseDocumentXml', () => {
  it('extracts highlighted text for a single-run comment', () => {
    const xml = makeDocXml(`
      <w:p>
        <w:r><w:t>Before </w:t></w:r>
        <w:commentRangeStart w:id="1"/>
        <w:r><w:t>highlighted text</w:t></w:r>
        <w:commentRangeEnd w:id="1"/>
        <w:r><w:t> after</w:t></w:r>
      </w:p>
    `);
    const anchors = parseDocumentXml(xml);
    expect(anchors).toHaveLength(1);
    expect(anchors[0].commentId).toBe('1');
    expect(anchors[0].highlightedContent).toBe('highlighted text');
  });

  it('extracts highlighted text spanning multiple runs', () => {
    const xml = makeDocXml(`
      <w:p>
        <w:commentRangeStart w:id="1"/>
        <w:r><w:t>first </w:t></w:r>
        <w:r><w:t>second</w:t></w:r>
        <w:commentRangeEnd w:id="1"/>
      </w:p>
    `);
    const anchors = parseDocumentXml(xml);
    expect(anchors[0].highlightedContent).toBe('first second');
  });

  it('extracts highlighted text spanning multiple paragraphs', () => {
    const xml = makeDocXml(`
      <w:p>
        <w:commentRangeStart w:id="1"/>
        <w:r><w:t>paragraph one</w:t></w:r>
      </w:p>
      <w:p>
        <w:r><w:t>paragraph two</w:t></w:r>
        <w:commentRangeEnd w:id="1"/>
      </w:p>
    `);
    const anchors = parseDocumentXml(xml);
    expect(anchors[0].highlightedContent).toBe('paragraph one paragraph two');
  });

  it('handles multiple simultaneous comment ranges', () => {
    const xml = makeDocXml(`
      <w:p>
        <w:commentRangeStart w:id="1"/>
        <w:r><w:t>shared </w:t></w:r>
        <w:commentRangeStart w:id="2"/>
        <w:r><w:t>overlap</w:t></w:r>
        <w:commentRangeEnd w:id="1"/>
        <w:r><w:t> extra</w:t></w:r>
        <w:commentRangeEnd w:id="2"/>
      </w:p>
    `);
    const anchors = parseDocumentXml(xml);
    const byId = new Map(anchors.map(a => [a.commentId, a]));
    expect(byId.get('1')!.highlightedContent).toBe('shared overlap');
    expect(byId.get('2')!.highlightedContent).toBe('overlap extra');
  });

  it('returns "N/A" for comments with no range markers', () => {
    // A comment ID that exists in comments.xml but has no range in document.xml
    const xml = makeDocXml(`<w:p><w:r><w:t>No comments here</w:t></w:r></w:p>`);
    const anchors = parseDocumentXml(xml);
    expect(anchors).toEqual([]);
  });

  it('uses nearest preceding heading for location', () => {
    const xml = makeDocXml(`
      <w:p>
        <w:pPr><w:pStyle w:val="Heading1"/></w:pPr>
        <w:r><w:t>Budget Overview</w:t></w:r>
      </w:p>
      <w:p>
        <w:commentRangeStart w:id="1"/>
        <w:r><w:t>some text</w:t></w:r>
        <w:commentRangeEnd w:id="1"/>
      </w:p>
    `);
    const anchors = parseDocumentXml(xml);
    expect(anchors[0].location).toBe('Section: Budget Overview');
  });

  it('falls back to paragraph number when no headings exist', () => {
    const xml = makeDocXml(`
      <w:p><w:r><w:t>First paragraph</w:t></w:r></w:p>
      <w:p><w:r><w:t>Second paragraph</w:t></w:r></w:p>
      <w:p>
        <w:commentRangeStart w:id="1"/>
        <w:r><w:t>third</w:t></w:r>
        <w:commentRangeEnd w:id="1"/>
      </w:p>
    `);
    const anchors = parseDocumentXml(xml);
    expect(anchors[0].location).toBe('Paragraph 3');
  });

  it('falls back to paragraph number when comment is before first heading', () => {
    const xml = makeDocXml(`
      <w:p>
        <w:commentRangeStart w:id="1"/>
        <w:r><w:t>before heading</w:t></w:r>
        <w:commentRangeEnd w:id="1"/>
      </w:p>
      <w:p>
        <w:pPr><w:pStyle w:val="Heading1"/></w:pPr>
        <w:r><w:t>First Heading</w:t></w:r>
      </w:p>
    `);
    const anchors = parseDocumentXml(xml);
    expect(anchors[0].location).toBe('Paragraph 1');
  });

  it('handles missing commentRangeEnd gracefully', () => {
    const xml = makeDocXml(`
      <w:p>
        <w:commentRangeStart w:id="1"/>
        <w:r><w:t>orphaned start</w:t></w:r>
      </w:p>
    `);
    const anchors = parseDocumentXml(xml);
    // Should still return something — use all text from start to end of document
    expect(anchors[0].highlightedContent).toBe('orphaned start');
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/parser/parse-document.test.ts`
Expected: FAIL — `parseDocumentXml` is not defined

- [ ] **Step 3: Implement `parse-document.ts`**

Create `src/parser/parse-document.ts`:

```typescript
import type { CommentAnchor } from '../types';
import { W_NS, getTextContent, parseXml } from './xml-helpers';

interface ActiveRange {
  texts: string[];
  location: string;
}

interface WalkState {
  paragraphIndex: number;
  currentHeading: string | null;
  activeRanges: Map<string, ActiveRange>;
  results: CommentAnchor[];
}

/**
 * Parse document.xml to extract highlighted content and document location
 * for each comment. Uses a single depth-first walk to handle all cases
 * including multi-paragraph ranges and overlapping comments.
 */
export function parseDocumentXml(xml: string): CommentAnchor[] {
  const doc = parseXml(xml);
  if (!doc) return [];

  const body = doc.getElementsByTagNameNS(W_NS, 'body')[0];
  if (!body) return [];

  const state: WalkState = {
    paragraphIndex: 0,
    currentHeading: null,
    activeRanges: new Map(),
    results: [],
  };

  walkNode(body, state);

  // Finalize any ranges that never got an end marker
  for (const [commentId, range] of state.activeRanges) {
    state.results.push({
      commentId,
      highlightedContent: range.texts.join(' ').trim(),
      location: range.location,
    });
  }

  return state.results;
}

function walkNode(node: Node, state: WalkState): void {
  if (!(node instanceof Element)) {
    return;
  }

  // Track paragraphs and headings
  if (node.localName === 'p' && node.namespaceURI === W_NS) {
    state.paragraphIndex++;
    const style = getParagraphStyle(node);
    if (style && /^Heading\d+$/i.test(style)) {
      state.currentHeading = getTextContent(node);
    }
  }

  // Comment range start — begin collecting text
  if (node.localName === 'commentRangeStart' && node.namespaceURI === W_NS) {
    const id =
      node.getAttributeNS(W_NS, 'id') ?? node.getAttribute('w:id') ?? '';
    const location = state.currentHeading
      ? `Section: ${state.currentHeading}`
      : `Paragraph ${state.paragraphIndex}`;
    state.activeRanges.set(id, { texts: [], location });
  }

  // Text node — add to all active ranges
  if (node.localName === 't' && node.namespaceURI === W_NS) {
    const text = node.textContent ?? '';
    for (const range of state.activeRanges.values()) {
      range.texts.push(text);
    }
  }

  // Comment range end — finalize this range
  if (node.localName === 'commentRangeEnd' && node.namespaceURI === W_NS) {
    const id =
      node.getAttributeNS(W_NS, 'id') ?? node.getAttribute('w:id') ?? '';
    const range = state.activeRanges.get(id);
    if (range) {
      state.results.push({
        commentId: id,
        highlightedContent: range.texts.join(' ').trim(),
        location: range.location,
      });
      state.activeRanges.delete(id);
    }
  }

  // Recurse into children
  for (let i = 0; i < node.childNodes.length; i++) {
    walkNode(node.childNodes[i], state);
  }
}

function getParagraphStyle(p: Element): string | null {
  const pPr = p.getElementsByTagNameNS(W_NS, 'pPr')[0];
  if (!pPr) return null;
  const pStyle = pPr.getElementsByTagNameNS(W_NS, 'pStyle')[0];
  if (!pStyle) return null;
  return (
    pStyle.getAttributeNS(W_NS, 'val') ??
    pStyle.getAttribute('w:val') ??
    null
  );
}
```

Key design decisions:
- Single depth-first walk handles all cases: multi-paragraph, overlapping, nested
- `activeRanges` map tracks all simultaneously open comment ranges
- Text nodes are added to ALL active ranges (handles overlapping comments correctly)
- Missing `commentRangeEnd` is handled by finalizing orphaned ranges at the end
- Heading detection happens when we enter a paragraph, before processing its children — this works because the heading style is in `<w:pPr>` which is a child we check via `getParagraphStyle`, but the heading TEXT is also in the paragraph's `<w:t>` elements. The `getTextContent` call processes the heading's text content separately from the walk.

**Important subtlety:** The `walkNode` function checks paragraph style WHEN it encounters a `<w:p>` element, BEFORE recursing into children. But `getTextContent` reads the paragraph's descendant `<w:t>` elements immediately. This means the heading text is read in one shot here, NOT accumulated through the walk. This is correct because heading text and comment range text are independent concerns.

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/parser/parse-document.test.ts`
Expected: All tests PASS

- [ ] **Step 5: Commit**

```bash
git add src/parser/parse-document.ts src/parser/parse-document.test.ts
git commit -m "feat: add document.xml parser for highlighted content and location"
```

---

## Task 4: Parse commentsExtended.xml — Threading + Resolved Status

**Files:**
- Create: `src/parser/parse-threading.ts`
- Create: `src/parser/parse-threading.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `src/parser/parse-threading.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { parseThreadingXml } from './parse-threading';

const W15 = 'http://schemas.microsoft.com/office/word/2012/wordml';

describe('parseThreadingXml', () => {
  it('extracts resolved status and threading info', () => {
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
      <w15:commentsEx xmlns:w15="${W15}">
        <w15:commentEx w15:paraId="1A2B3C01" w15:done="1"/>
        <w15:commentEx w15:paraId="1A2B3C02" w15:paraIdParent="1A2B3C01" w15:done="0"/>
      </w15:commentsEx>`;

    const extensions = parseThreadingXml(xml);
    expect(extensions).toHaveLength(2);

    expect(extensions[0]).toEqual({
      paraId: '1A2B3C01',
      done: true,
      parentParaId: null,
    });

    expect(extensions[1]).toEqual({
      paraId: '1A2B3C02',
      done: false,
      parentParaId: '1A2B3C01',
    });
  });

  it('treats done="0" as false', () => {
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
      <w15:commentsEx xmlns:w15="${W15}">
        <w15:commentEx w15:paraId="AAA" w15:done="0"/>
      </w15:commentsEx>`;
    const extensions = parseThreadingXml(xml);
    expect(extensions[0].done).toBe(false);
  });

  it('treats missing done attribute as false', () => {
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
      <w15:commentsEx xmlns:w15="${W15}">
        <w15:commentEx w15:paraId="AAA"/>
      </w15:commentsEx>`;
    const extensions = parseThreadingXml(xml);
    expect(extensions[0].done).toBe(false);
  });

  it('returns empty array for null input', () => {
    expect(parseThreadingXml(null)).toEqual([]);
  });

  it('returns empty array for empty XML', () => {
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
      <w15:commentsEx xmlns:w15="${W15}"/>`;
    expect(parseThreadingXml(xml)).toEqual([]);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/parser/parse-threading.test.ts`
Expected: FAIL — `parseThreadingXml` is not defined

- [ ] **Step 3: Implement `parse-threading.ts`**

Create `src/parser/parse-threading.ts`:

```typescript
import type { CommentExtension } from '../types';
import { W15_NS, parseXml } from './xml-helpers';

/**
 * Parse commentsExtended.xml for reply threading and resolved status.
 * Accepts null (file may not exist in all DOCX files) and returns [].
 */
export function parseThreadingXml(xml: string | null): CommentExtension[] {
  if (!xml) return [];

  const doc = parseXml(xml);
  if (!doc) return [];

  const elements = doc.getElementsByTagNameNS(W15_NS, 'commentEx');
  const extensions: CommentExtension[] = [];

  for (let i = 0; i < elements.length; i++) {
    const el = elements[i];
    const paraId =
      el.getAttributeNS(W15_NS, 'paraId') ??
      el.getAttribute('w15:paraId') ??
      '';
    const doneAttr =
      el.getAttributeNS(W15_NS, 'done') ?? el.getAttribute('w15:done');
    const parentParaId =
      el.getAttributeNS(W15_NS, 'paraIdParent') ??
      el.getAttribute('w15:paraIdParent') ??
      null;

    extensions.push({
      paraId,
      done: doneAttr === '1',
      parentParaId,
    });
  }

  return extensions;
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/parser/parse-threading.test.ts`
Expected: All tests PASS

- [ ] **Step 5: Commit**

```bash
git add src/parser/parse-threading.ts src/parser/parse-threading.test.ts
git commit -m "feat: add commentsExtended.xml parser for threading and resolved status"
```

---

## Task 5: DOCX Orchestrator — Unzip + Merge

**Files:**
- Create: `src/parser/parse-docx.ts`
- Create: `src/parser/parse-docx.test.ts`

This is the integration layer: unzips the DOCX, calls each parser, merges results into the final `Comment[]` with thread IDs, display dates, and parent linkage.

- [ ] **Step 1: Write the failing tests**

Create `src/parser/parse-docx.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import JSZip from 'jszip';
import { parseDocx } from './parse-docx';

const W = 'http://schemas.openxmlformats.org/wordprocessingml/2006/main';
const W14 = 'http://schemas.microsoft.com/office/word/2010/wordml';
const W15 = 'http://schemas.microsoft.com/office/word/2012/wordml';

async function makeDocx(files: Record<string, string>): Promise<File> {
  const zip = new JSZip();
  for (const [path, content] of Object.entries(files)) {
    zip.file(path, content);
  }
  const blob = await zip.generateAsync({ type: 'blob' });
  return new File([blob], 'test.docx', {
    type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  });
}

const COMMENTS_XML = `<?xml version="1.0" encoding="UTF-8"?>
<w:comments xmlns:w="${W}" xmlns:w14="${W14}">
  <w:comment w:id="1" w:author="Maria S." w:date="2024-03-12T10:30:00Z">
    <w:p w14:paraId="AAA001"><w:r><w:t>Check these numbers</w:t></w:r></w:p>
  </w:comment>
  <w:comment w:id="2" w:author="David R." w:date="2024-03-13T14:15:00Z">
    <w:p w14:paraId="AAA002"><w:r><w:t>Numbers are correct</w:t></w:r></w:p>
  </w:comment>
</w:comments>`;

const DOCUMENT_XML = `<?xml version="1.0" encoding="UTF-8"?>
<w:document xmlns:w="${W}">
  <w:body>
    <w:p>
      <w:pPr><w:pStyle w:val="Heading1"/></w:pPr>
      <w:r><w:t>Budget</w:t></w:r>
    </w:p>
    <w:p>
      <w:commentRangeStart w:id="1"/>
      <w:r><w:t>total allocation of $2.4M</w:t></w:r>
      <w:commentRangeEnd w:id="1"/>
    </w:p>
  </w:body>
</w:document>`;

const COMMENTS_EXTENDED_XML = `<?xml version="1.0" encoding="UTF-8"?>
<w15:commentsEx xmlns:w15="${W15}">
  <w15:commentEx w15:paraId="AAA001" w15:done="1"/>
  <w15:commentEx w15:paraId="AAA002" w15:paraIdParent="AAA001" w15:done="0"/>
</w15:commentsEx>`;

describe('parseDocx', () => {
  it('parses a complete DOCX with all XML files present', async () => {
    const file = await makeDocx({
      'word/comments.xml': COMMENTS_XML,
      'word/document.xml': DOCUMENT_XML,
      'word/commentsExtended.xml': COMMENTS_EXTENDED_XML,
    });

    const result = await parseDocx(file);

    expect(result.filename).toBe('test');
    expect(result.hasThreading).toBe(true);
    expect(result.comments).toHaveLength(2);

    const parent = result.comments[0];
    expect(parent.id).toBe('1');
    expect(parent.author).toBe('Maria S.');
    expect(parent.text).toBe('Check these numbers');
    expect(parent.highlightedContent).toBe('total allocation of $2.4M');
    expect(parent.location).toBe('Section: Budget');
    expect(parent.resolved).toBe(true);
    expect(parent.isReply).toBe(false);
    expect(parent.parentCommentId).toBeNull();
    expect(parent.threadId).toBe(1);

    const reply = result.comments[1];
    expect(reply.id).toBe('2');
    expect(reply.author).toBe('David R.');
    expect(reply.isReply).toBe(true);
    expect(reply.parentCommentId).toBe('1');
    expect(reply.threadId).toBe(1); // Same thread as parent
    expect(reply.resolved).toBe(false);
  });

  it('handles missing commentsExtended.xml gracefully', async () => {
    const file = await makeDocx({
      'word/comments.xml': COMMENTS_XML,
      'word/document.xml': DOCUMENT_XML,
    });

    const result = await parseDocx(file);

    expect(result.hasThreading).toBe(false);
    expect(result.comments[0].resolved).toBeNull();
    expect(result.comments[0].isReply).toBe(false);
    expect(result.comments[0].parentCommentId).toBeNull();
  });

  it('formats display dates', async () => {
    const file = await makeDocx({
      'word/comments.xml': COMMENTS_XML,
      'word/document.xml': DOCUMENT_XML,
    });

    const result = await parseDocx(file);
    // dateDisplay should be a readable format
    expect(result.comments[0].dateDisplay).toBe('Mar 12, 2024');
  });

  it('throws on missing comments.xml', async () => {
    const file = await makeDocx({
      'word/document.xml': DOCUMENT_XML,
    });

    await expect(parseDocx(file)).rejects.toThrow();
  });

  it('returns empty comments for DOCX with no comment elements', async () => {
    const emptyComments = `<?xml version="1.0" encoding="UTF-8"?>
      <w:comments xmlns:w="${W}"/>`;
    const file = await makeDocx({
      'word/comments.xml': emptyComments,
      'word/document.xml': DOCUMENT_XML,
    });

    const result = await parseDocx(file);
    expect(result.comments).toEqual([]);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/parser/parse-docx.test.ts`
Expected: FAIL — `parseDocx` is not defined

- [ ] **Step 3: Implement `parse-docx.ts`**

Create `src/parser/parse-docx.ts`:

```typescript
import JSZip from 'jszip';
import type { Comment, ParseResult, RawComment, CommentExtension } from '../types';
import { parseCommentsXml } from './parse-comments';
import { parseDocumentXml } from './parse-document';
import { parseThreadingXml } from './parse-threading';

export async function parseDocx(file: File): Promise<ParseResult> {
  const zip = await JSZip.loadAsync(file);

  const commentsFile = zip.file('word/comments.xml');
  if (!commentsFile) {
    throw new Error('This document doesn\'t contain any comment data');
  }

  const documentFile = zip.file('word/document.xml');
  const extendedFile = zip.file('word/commentsExtended.xml');

  const [commentsXml, documentXml, extendedXml] = await Promise.all([
    commentsFile.async('string'),
    documentFile ? documentFile.async('string') : Promise.resolve(''),
    extendedFile ? extendedFile.async('string') : Promise.resolve(null),
  ]);

  const rawComments = parseCommentsXml(commentsXml);
  const anchors = documentXml ? parseDocumentXml(documentXml) : [];
  const extensions = parseThreadingXml(extendedXml);

  const hasThreading = extensions.length > 0;

  const anchorMap = new Map(anchors.map(a => [a.commentId, a]));

  // Build paraId → comment ID mapping
  const paraIdToCommentId = new Map<string, string>();
  for (const raw of rawComments) {
    if (raw.paraId) {
      paraIdToCommentId.set(raw.paraId, raw.id);
    }
  }

  // Build paraId → extension mapping
  const extMap = new Map<string, CommentExtension>();
  for (const ext of extensions) {
    extMap.set(ext.paraId, ext);
  }

  // Determine parent comment IDs via paraId chain
  const commentIdToParentId = new Map<string, string>();
  for (const raw of rawComments) {
    if (!raw.paraId) continue;
    const ext = extMap.get(raw.paraId);
    if (!ext?.parentParaId) continue;
    const parentCommentId = paraIdToCommentId.get(ext.parentParaId);
    if (parentCommentId) {
      commentIdToParentId.set(raw.id, parentCommentId);
    }
  }

  // Assign thread IDs: each top-level comment starts a thread
  const commentIdToThreadId = new Map<string, number>();
  let threadCounter = 0;
  for (const raw of rawComments) {
    if (!commentIdToParentId.has(raw.id)) {
      threadCounter++;
      commentIdToThreadId.set(raw.id, threadCounter);
    }
  }
  // Replies inherit parent's thread ID
  for (const raw of rawComments) {
    const parentId = commentIdToParentId.get(raw.id);
    if (parentId) {
      const threadId = commentIdToThreadId.get(parentId);
      if (threadId) {
        commentIdToThreadId.set(raw.id, threadId);
      }
    }
  }

  // Merge everything into final Comment[]
  const comments: Comment[] = rawComments.map(raw => {
    const anchor = anchorMap.get(raw.id);
    const ext = raw.paraId ? extMap.get(raw.paraId) : undefined;
    const parentCommentId = commentIdToParentId.get(raw.id) ?? null;

    return {
      id: raw.id,
      threadId: commentIdToThreadId.get(raw.id) ?? 0,
      author: raw.author,
      date: raw.date,
      dateDisplay: formatDate(raw.date),
      text: raw.text,
      highlightedContent: anchor?.highlightedContent ?? 'N/A',
      location: anchor?.location ?? 'Unknown',
      resolved: hasThreading ? (ext?.done ?? false) : null,
      parentCommentId,
      isReply: parentCommentId !== null,
    };
  });

  // Strip .docx extension from filename
  const filename = file.name.replace(/\.docx$/i, '');

  return { comments, filename, hasThreading };
}

function formatDate(isoDate: string): string {
  const date = new Date(isoDate);
  if (isNaN(date.getTime())) return isoDate;
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/parser/parse-docx.test.ts`
Expected: All tests PASS

- [ ] **Step 5: Run all parser tests together**

Run: `npx vitest run src/parser/`
Expected: All tests PASS

- [ ] **Step 6: Commit**

```bash
git add src/parser/parse-docx.ts src/parser/parse-docx.test.ts
git commit -m "feat: add DOCX orchestrator — unzip, parse, merge into Comment[]"
```

---

## Task 6: CSV Export

**Files:**
- Create: `src/export/export-csv.ts`
- Create: `src/export/export-csv.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `src/export/export-csv.test.ts`:

```typescript
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
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/export/export-csv.test.ts`
Expected: FAIL — `generateCsv` is not defined

- [ ] **Step 3: Implement `export-csv.ts`**

Create `src/export/export-csv.ts`:

```typescript
import type { Comment } from '../types';

export function generateCsv(comments: Comment[], hasThreading: boolean): string {
  const headers = hasThreading
    ? ['thread_id', 'is_reply', 'author', 'date', 'comment', 'highlighted_text', 'location', 'resolved']
    : ['author', 'date', 'comment', 'highlighted_text', 'location'];

  const rows = comments.map(c => {
    const base = [c.author, c.date, c.text, c.highlightedContent, c.location];
    if (hasThreading) {
      return [
        String(c.threadId),
        c.isReply ? 'TRUE' : 'FALSE',
        ...base,
        c.resolved === null ? '' : c.resolved ? 'TRUE' : 'FALSE',
      ];
    }
    return base;
  });

  const lines = [headers, ...rows].map(row => row.map(escapeCsvField).join(','));
  return lines.join('\n') + '\n';
}

function escapeCsvField(field: string): string {
  if (field.includes(',') || field.includes('"') || field.includes('\n')) {
    return '"' + field.replace(/"/g, '""') + '"';
  }
  return field;
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/export/export-csv.test.ts`
Expected: All tests PASS

- [ ] **Step 5: Commit**

```bash
git add src/export/export-csv.ts src/export/export-csv.test.ts
git commit -m "feat: add CSV export with proper escaping"
```

---

## Task 7: XLSX Export

**Files:**
- Create: `src/export/export-xlsx.ts`
- Create: `src/export/export-xlsx.test.ts`
- Create: `src/export/trigger-download.ts`

- [ ] **Step 1: Write the failing tests**

Create `src/export/export-xlsx.test.ts`:

```typescript
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
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/export/export-xlsx.test.ts`
Expected: FAIL — `generateXlsxBlob` is not defined

- [ ] **Step 3: Implement `export-xlsx.ts`**

Create `src/export/export-xlsx.ts`:

```typescript
import * as XLSX from 'xlsx';
import type { Comment } from '../types';

export function generateXlsxBlob(comments: Comment[], hasThreading: boolean): Blob {
  const headers = hasThreading
    ? ['Thread', 'Reply', 'Author', 'Date', 'Comment', 'Highlighted Text', 'Location', 'Resolved']
    : ['Author', 'Date', 'Comment', 'Highlighted Text', 'Location'];

  const rows = comments.map(c => {
    const base = [c.author, c.date, c.text, c.highlightedContent, c.location];
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

  const wsData = [headers, ...rows];
  const ws = XLSX.utils.aoa_to_sheet(wsData);

  // Auto-size columns based on content width
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

- [ ] **Step 4: Create `trigger-download.ts`**

Create `src/export/trigger-download.ts`:

```typescript
export function triggerDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `npx vitest run src/export/export-xlsx.test.ts`
Expected: All tests PASS

- [ ] **Step 6: Commit**

```bash
git add src/export/export-xlsx.ts src/export/export-xlsx.test.ts src/export/trigger-download.ts
git commit -m "feat: add XLSX export and browser download trigger"
```

---

## Task 8: USWDS Tokens + Header + ErrorMessage

**Files:**
- Create: `src/styles/tokens.css`
- Create: `src/components/Header.tsx`
- Create: `src/components/ErrorMessage.tsx`

- [ ] **Step 1: Create `src/styles/tokens.css`**

```css
:root {
  /* USWDS Color Tokens */
  --color-primary: #005ea2;
  --color-primary-dark: #1a4480;
  --color-base-darkest: #1b1b1b;
  --color-base-dark: #565c65;
  --color-base: #71767a;
  --color-base-light: #a9aeb1;
  --color-base-lighter: #dfe1e2;
  --color-base-lightest: #f0f4f8;
  --color-white: #ffffff;
  --color-success: #2e6e2e;
  --color-success-lighter: #ecf3ec;
  --color-error: #b50909;
  --color-error-lighter: #fce4e4;
  --color-focus: #2491ff;

  /* Typography */
  --font-family: 'Source Sans Pro', 'Helvetica Neue', Helvetica, Roboto, Arial, sans-serif;
  --font-size-sm: 0.875rem;
  --font-size-base: 1rem;
  --font-size-lg: 1.125rem;
  --font-size-xl: 1.25rem;

  /* Spacing */
  --space-1: 4px;
  --space-2: 8px;
  --space-3: 12px;
  --space-4: 16px;
  --space-5: 24px;
  --space-6: 32px;
  --space-8: 48px;

  /* Border */
  --border-radius: 4px;

  /* Focus */
  --focus-outline: 2px solid var(--color-focus);
  --focus-offset: 2px;
}

*,
*::before,
*::after {
  box-sizing: border-box;
}

body {
  margin: 0;
  font-family: var(--font-family);
  font-size: var(--font-size-base);
  color: var(--color-base-darkest);
  background: var(--color-white);
  -webkit-font-smoothing: antialiased;
}

:focus-visible {
  outline: var(--focus-outline);
  outline-offset: var(--focus-offset);
}
```

- [ ] **Step 2: Create `src/components/Header.tsx`**

```tsx
import cfaLogo from '../../assets/cfa_logo.png';

export default function Header() {
  return (
    <header
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 'var(--space-3)',
        padding: 'var(--space-4) var(--space-5)',
        borderBottom: '2px solid var(--color-primary)',
      }}
    >
      <img
        src={cfaLogo}
        alt="Code for America"
        style={{ width: 32, height: 32, borderRadius: '50%' }}
      />
      <span
        style={{
          fontSize: 'var(--font-size-xl)',
          fontWeight: 700,
          color: 'var(--color-base-darkest)',
        }}
      >
        Comment Muncher
      </span>
    </header>
  );
}
```

- [ ] **Step 3: Create `src/components/ErrorMessage.tsx`**

```tsx
interface ErrorMessageProps {
  message: string;
  onReset: () => void;
}

export default function ErrorMessage({ message, onReset }: ErrorMessageProps) {
  return (
    <div
      role="alert"
      style={{
        textAlign: 'center',
        padding: 'var(--space-8) var(--space-5)',
        maxWidth: 480,
        margin: '0 auto',
      }}
    >
      <p
        style={{
          fontSize: 'var(--font-size-lg)',
          color: 'var(--color-base-dark)',
          marginBottom: 'var(--space-5)',
        }}
      >
        {message}
      </p>
      <button
        onClick={onReset}
        style={{
          background: 'none',
          border: 'none',
          color: 'var(--color-primary)',
          fontSize: 'var(--font-size-base)',
          cursor: 'pointer',
          textDecoration: 'underline',
          padding: 'var(--space-2)',
        }}
      >
        Upload another file
      </button>
    </div>
  );
}
```

- [ ] **Step 4: Import tokens in `src/main.tsx`**

Update `src/main.tsx` to import the tokens:

```tsx
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './styles/tokens.css';
import App from './App';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
```

- [ ] **Step 5: Verify dev server still works**

Run: `npm run dev`
Verify: page loads without errors. Kill the dev server.

- [ ] **Step 6: Commit**

```bash
git add src/styles/tokens.css src/components/Header.tsx src/components/ErrorMessage.tsx src/main.tsx
git commit -m "feat: add USWDS design tokens, Header, and ErrorMessage components"
```

---

## Task 9: DropZone Component

**Files:**
- Create: `src/components/DropZone.tsx`
- Create: `src/components/DropZone.css`

- [ ] **Step 1: Create `src/components/DropZone.css`**

```css
.dropzone {
  text-align: center;
  padding: 48px 24px;
  border: 2px dashed var(--color-base);
  border-radius: var(--border-radius);
  background: var(--color-white);
  cursor: pointer;
  transition: border-color 0.15s, background-color 0.15s;
  max-width: 480px;
  margin: var(--space-8) auto;
}

.dropzone:hover,
.dropzone:focus-within {
  border-color: var(--color-primary);
  background: var(--color-base-lightest);
}

.dropzone.drag-over {
  border-color: var(--color-primary);
  background: var(--color-base-lightest);
  border-style: solid;
}

.dropzone__icon {
  font-size: 48px;
  color: var(--color-primary);
  margin-bottom: var(--space-3);
}

.dropzone__title {
  font-size: var(--font-size-lg);
  font-weight: 600;
  color: var(--color-base-darkest);
  margin: 0 0 var(--space-2);
}

.dropzone__subtitle {
  font-size: var(--font-size-sm);
  color: var(--color-base);
  margin: 0 0 var(--space-4);
}

.dropzone__button {
  display: inline-block;
  background: var(--color-primary);
  color: var(--color-white);
  padding: var(--space-2) var(--space-5);
  border: none;
  border-radius: var(--border-radius);
  font-size: var(--font-size-sm);
  font-weight: 600;
  cursor: pointer;
}

.dropzone__button:hover {
  background: var(--color-primary-dark);
}

.dropzone__privacy {
  text-align: center;
  margin-top: var(--space-3);
  font-size: var(--font-size-sm);
  color: var(--color-base);
}
```

- [ ] **Step 2: Create `src/components/DropZone.tsx`**

```tsx
import { useCallback, useRef, useState } from 'react';
import './DropZone.css';

interface DropZoneProps {
  onFile: (file: File) => void;
  onError: (message: string) => void;
}

export default function DropZone({ onFile, onError }: DropZoneProps) {
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const validateAndEmit = useCallback(
    (file: File | undefined) => {
      if (!file) return;
      if (!file.name.toLowerCase().endsWith('.docx')) {
        onError('Please upload a .docx file');
        return;
      }
      onFile(file);
    },
    [onFile, onError]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      validateAndEmit(e.dataTransfer.files[0]);
    },
    [validateAndEmit]
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  }, []);

  const handleDragLeave = useCallback(() => {
    setDragOver(false);
  }, []);

  const handleClick = useCallback(() => {
    inputRef.current?.click();
  }, []);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        inputRef.current?.click();
      }
    },
    []
  );

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      validateAndEmit(e.target.files?.[0]);
    },
    [validateAndEmit]
  );

  return (
    <>
      <div
        className={`dropzone${dragOver ? ' drag-over' : ''}`}
        role="button"
        tabIndex={0}
        aria-label="Upload a .docx file. Drop a file here or press Enter to browse."
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={handleClick}
        onKeyDown={handleKeyDown}
      >
        <div className="dropzone__icon" aria-hidden="true">
          &#128196;
        </div>
        <p className="dropzone__title">Drop your .docx file here</p>
        <p className="dropzone__subtitle">or click to browse</p>
        <span className="dropzone__button">Choose file</span>
        <input
          ref={inputRef}
          type="file"
          accept=".docx"
          onChange={handleChange}
          style={{ display: 'none' }}
          aria-hidden="true"
          tabIndex={-1}
        />
      </div>
      <p className="dropzone__privacy" aria-live="polite">
        &#128274; Your files never leave your browser
      </p>
    </>
  );
}
```

- [ ] **Step 3: Verify component renders**

Temporarily update `src/App.tsx` to render the DropZone:

```tsx
import Header from './components/Header';
import DropZone from './components/DropZone';

export default function App() {
  return (
    <>
      <Header />
      <DropZone
        onFile={(f) => console.log('File:', f.name)}
        onError={(e) => console.log('Error:', e)}
      />
    </>
  );
}
```

Run: `npm run dev`
Verify: Header with CfA logo and drop zone render. Drag a non-docx file → console shows error. Drag a docx → console shows filename. Drop zone is keyboard-focusable with Tab, activates on Enter. Kill the dev server.

- [ ] **Step 4: Commit**

```bash
git add src/components/DropZone.tsx src/components/DropZone.css src/App.tsx
git commit -m "feat: add DropZone component with drag-and-drop and keyboard support"
```

---

## Task 10: CommentTable + StatusBadge

**Files:**
- Create: `src/components/StatusBadge.tsx`
- Create: `src/components/CommentTable.tsx`
- Create: `src/components/CommentTable.css`

- [ ] **Step 1: Create `src/components/StatusBadge.tsx`**

```tsx
interface StatusBadgeProps {
  resolved: boolean;
}

export default function StatusBadge({ resolved }: StatusBadgeProps) {
  const style: React.CSSProperties = {
    display: 'inline-block',
    padding: '2px 8px',
    borderRadius: 10,
    fontSize: 'var(--font-size-sm)',
    fontWeight: 600,
    background: resolved ? 'var(--color-success-lighter)' : 'var(--color-error-lighter)',
    color: resolved ? 'var(--color-success)' : 'var(--color-error)',
  };

  return <span style={style}>{resolved ? 'Resolved' : 'Open'}</span>;
}
```

- [ ] **Step 2: Create `src/components/CommentTable.css`**

```css
.comment-table-wrapper {
  overflow-x: auto;
  margin: 0 var(--space-5);
}

.comment-table {
  width: 100%;
  border-collapse: collapse;
  font-size: var(--font-size-sm);
}

.comment-table th {
  background: var(--color-base-lightest);
  color: var(--color-base);
  font-weight: 600;
  text-align: left;
  padding: var(--space-2) var(--space-3);
  border-bottom: 1px solid var(--color-base-lighter);
  cursor: pointer;
  user-select: none;
  white-space: nowrap;
}

.comment-table th:hover {
  color: var(--color-base-darkest);
}

.comment-table th .sort-indicator {
  margin-left: var(--space-1);
  font-size: 0.75rem;
}

.comment-table td {
  padding: var(--space-2) var(--space-3);
  border-bottom: 1px solid var(--color-base-lightest);
  vertical-align: top;
  color: var(--color-base-darkest);
}

.comment-table .reply-row td {
  color: var(--color-base-dark);
}

.comment-table .reply-prefix {
  color: var(--color-base);
  margin-right: var(--space-1);
}

.comment-table .highlighted {
  color: var(--color-primary);
}
```

- [ ] **Step 3: Create `src/components/CommentTable.tsx`**

```tsx
import { useMemo, useState } from 'react';
import type { Comment } from '../types';
import StatusBadge from './StatusBadge';
import './CommentTable.css';

interface CommentTableProps {
  comments: Comment[];
  hasThreading: boolean;
}

type SortKey = 'text' | 'highlightedContent' | 'author' | 'date' | 'location' | 'resolved' | 'threadId';
type SortDir = 'asc' | 'desc';

export default function CommentTable({ comments, hasThreading }: CommentTableProps) {
  const [sortKey, setSortKey] = useState<SortKey>('date');
  const [sortDir, setSortDir] = useState<SortDir>('asc');

  const sorted = useMemo(() => {
    const copy = [...comments];
    copy.sort((a, b) => {
      let aVal: string | number | boolean | null = a[sortKey];
      let bVal: string | number | boolean | null = b[sortKey];
      if (aVal === null) aVal = '';
      if (bVal === null) bVal = '';
      if (typeof aVal === 'boolean') aVal = aVal ? 1 : 0;
      if (typeof bVal === 'boolean') bVal = bVal ? 1 : 0;
      if (typeof aVal === 'number' && typeof bVal === 'number') {
        return sortDir === 'asc' ? aVal - bVal : bVal - aVal;
      }
      const cmp = String(aVal).localeCompare(String(bVal));
      return sortDir === 'asc' ? cmp : -cmp;
    });
    return copy;
  }, [comments, sortKey, sortDir]);

  function handleSort(key: SortKey) {
    if (key === sortKey) {
      setSortDir(d => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
  }

  function sortIndicator(key: SortKey): string {
    if (key !== sortKey) return '';
    return sortDir === 'asc' ? ' \u25B2' : ' \u25BC';
  }

  return (
    <div className="comment-table-wrapper">
      <table className="comment-table">
        <thead>
          <tr>
            <th scope="col" onClick={() => handleSort('text')}>
              Comment<span className="sort-indicator">{sortIndicator('text')}</span>
            </th>
            <th scope="col" onClick={() => handleSort('highlightedContent')}>
              Highlighted Text<span className="sort-indicator">{sortIndicator('highlightedContent')}</span>
            </th>
            <th scope="col" onClick={() => handleSort('author')}>
              Author<span className="sort-indicator">{sortIndicator('author')}</span>
            </th>
            <th scope="col" onClick={() => handleSort('date')}>
              Date<span className="sort-indicator">{sortIndicator('date')}</span>
            </th>
            <th scope="col" onClick={() => handleSort('location')}>
              Location<span className="sort-indicator">{sortIndicator('location')}</span>
            </th>
            {hasThreading && (
              <th scope="col" onClick={() => handleSort('resolved')}>
                Status<span className="sort-indicator">{sortIndicator('resolved')}</span>
              </th>
            )}
          </tr>
        </thead>
        <tbody>
          {sorted.map(comment => (
            <tr key={comment.id} className={comment.isReply ? 'reply-row' : ''}>
              <td>
                {comment.isReply && <span className="reply-prefix" aria-label="Reply">&#8627;</span>}
                {comment.text}
              </td>
              <td className="highlighted">{comment.highlightedContent}</td>
              <td>{comment.author}</td>
              <td style={{ whiteSpace: 'nowrap' }}>{comment.dateDisplay}</td>
              <td>{comment.location}</td>
              {hasThreading && (
                <td>
                  {comment.resolved !== null && (
                    <StatusBadge resolved={comment.resolved} />
                  )}
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
```

- [ ] **Step 4: Commit**

```bash
git add src/components/StatusBadge.tsx src/components/CommentTable.tsx src/components/CommentTable.css
git commit -m "feat: add CommentTable with sorting and StatusBadge"
```

---

## Task 11: ExportButtons

**Files:**
- Create: `src/components/ExportButtons.tsx`

- [ ] **Step 1: Create `src/components/ExportButtons.tsx`**

```tsx
import type { Comment } from '../types';
import { generateCsv } from '../export/export-csv';
import { generateXlsxBlob } from '../export/export-xlsx';
import { triggerDownload } from '../export/trigger-download';

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
  function handleCsv() {
    const csv = generateCsv(comments, hasThreading);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    triggerDownload(blob, `${filename}_comments.csv`);
  }

  function handleXlsx() {
    const blob = generateXlsxBlob(comments, hasThreading);
    triggerDownload(blob, `${filename}_comments.xlsx`);
  }

  const buttonBase: React.CSSProperties = {
    padding: 'var(--space-2) var(--space-4)',
    borderRadius: 'var(--border-radius)',
    fontSize: 'var(--font-size-sm)',
    fontWeight: 600,
    cursor: 'pointer',
    border: 'none',
  };

  return (
    <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
      <button
        onClick={handleCsv}
        style={{
          ...buttonBase,
          background: 'var(--color-white)',
          border: '1px solid var(--color-base-lighter)',
          color: 'var(--color-base-darkest)',
        }}
      >
        CSV
      </button>
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
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/ExportButtons.tsx
git commit -m "feat: add ExportButtons component for CSV and XLSX download"
```

---

## Task 12: App Integration

**Files:**
- Modify: `src/App.tsx` (replace placeholder)
- Create: `src/App.css`

Wire everything together: upload → parse → display → export.

- [ ] **Step 1: Create `src/App.css`**

```css
.app {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

.results-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: var(--space-4) var(--space-5);
  border-bottom: 1px solid var(--color-base-lighter);
}

.results-header__info {
  display: flex;
  align-items: baseline;
  gap: var(--space-2);
}

.results-header__filename {
  font-weight: 700;
  font-size: var(--font-size-lg);
  color: var(--color-base-darkest);
}

.results-header__count {
  color: var(--color-base);
  font-size: var(--font-size-sm);
}

.results-footer {
  text-align: center;
  padding: var(--space-5);
}

.results-footer__link {
  background: none;
  border: none;
  color: var(--color-primary);
  font-size: var(--font-size-base);
  cursor: pointer;
  text-decoration: underline;
  padding: var(--space-2);
}

.loading {
  text-align: center;
  padding: var(--space-8);
  color: var(--color-base);
  font-size: var(--font-size-lg);
}
```

- [ ] **Step 2: Implement `src/App.tsx`**

```tsx
import { useCallback, useState } from 'react';
import type { ParseResult } from './types';
import { parseDocx } from './parser/parse-docx';
import Header from './components/Header';
import DropZone from './components/DropZone';
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
        <DropZone onFile={handleFile} onError={handleError} />
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
                {state.data.filename}.docx
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

- [ ] **Step 4: Run the dev server and test the full flow**

Run: `npm run dev`

Test manually:
1. Page loads with header + drop zone
2. Drop a non-docx file → error message appears
3. Click "Upload another file" → returns to drop zone
4. Drop a valid DOCX with comments → loading message → results table appears
5. Verify comment text, highlighted content, author, date, location display correctly
6. Click column headers to sort → table reorders
7. Click CSV → downloads `filename_comments.csv`, open it, verify contents
8. Click XLSX → downloads `filename_comments.xlsx`, open it, verify contents
9. Click "Upload another file" → returns to drop zone
10. Tab through the UI → all interactive elements are focusable

Kill the dev server.

- [ ] **Step 5: Run the build**

Run: `npm run build`
Expected: Build completes without errors. Output in `dist/`.

- [ ] **Step 6: Commit**

```bash
git add src/App.tsx src/App.css
git commit -m "feat: integrate all components into working app"
```

---

## Task 13: Accessibility + Final Polish

**Files:**
- Modify: `src/components/CommentTable.tsx` (if needed)
- Modify: `src/components/DropZone.tsx` (if needed)

- [ ] **Step 1: Verify accessibility requirements from spec**

Check against the spec's accessibility section:
- [ ] Semantic `<table>` with `<thead>`, `<th scope="col">`, `<tbody>` — already in CommentTable
- [ ] Drop zone is keyboard-navigable — already has `tabIndex={0}`, `onKeyDown`
- [ ] Status badges use text labels, not color alone — StatusBadge shows "Resolved"/"Open" text
- [ ] All interactive elements have visible focus indicators — tokens.css sets `:focus-visible` globally
- [ ] Sufficient color contrast per WCAG 2.1 AA — USWDS tokens meet AA
- [ ] `aria-live` region for status messages — loading and comment count have `aria-live="polite"`

- [ ] **Step 2: Run the dev server and test keyboard navigation**

Run: `npm run dev`

Tab through the entire UI:
1. Tab to drop zone → visible focus ring
2. Press Enter → file picker opens
3. After file loads, Tab through sort headers, export buttons, "Upload another" link
4. Each element shows a clear blue focus ring

Verify screen reader compatibility:
- Drop zone has descriptive `aria-label`
- Error messages use `role="alert"`
- Loading state uses `role="status"`
- Table headers use `scope="col"`
- Reply prefix ↳ has `aria-label="Reply"`

- [ ] **Step 3: Verify error states work correctly**

In the browser:
1. Drop a `.txt` file → "Please upload a .docx file" + "Upload another file" link
2. Drop a DOCX with no comments → "No comments found in this document"
3. Drop a corrupt zip file → "Couldn't read this file..." message

- [ ] **Step 4: Run full test suite one final time**

Run: `npx vitest run`
Expected: All tests PASS

Run: `npm run build`
Expected: Clean build, no warnings

- [ ] **Step 5: Commit any polish changes**

```bash
git add -A
git commit -m "chore: accessibility verification and final polish"
```

(Skip this commit if no changes were needed.)
