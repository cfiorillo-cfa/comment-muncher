# Comment Muncher

A client-side web app that extracts comments from DOCX files and exports them as CSV/XLSX. Files never leave the browser.

## Project Context

- **Org:** Code for America
- **Owner:** cfiorillo-cfa
- **Stack:** React 18, TypeScript, Vite, JSZip, SheetJS, Vitest

## Design Language

- USWDS (U.S. Web Design System) inspired UI via CSS custom properties in `src/styles/tokens.css`
- Accessible, clean, government-friendly aesthetic
- CfA logo in header (`assets/cfa_logo.png`)

## Extracted Comment Fields

- Comment text (plain text, formatting stripped)
- Highlighted content (text the comment is anchored to)
- Author
- Date/time
- Document location (nearest heading or paragraph number)
- Reply threading (via commentsExtended.xml paraId linkage)
- Resolved/open status

## Commands

- `npm run dev` — Start Vite dev server
- `npm run build` — TypeScript check + production build
- `npm run test` — Run Vitest in watch mode
- `npm run test:run` — Run Vitest once

## Testing

- Vitest with jsdom environment
- 39 tests across 7 test files
- Parser tests use XML string fixtures; orchestrator tests create DOCX zips with JSZip
- Export tests verify CSV escaping and XLSX structure via SheetJS read-back

## Architecture

```
src/
├── parser/       # DOCX parsing: comments.xml, document.xml, commentsExtended.xml
├── export/       # CSV and XLSX generation + browser download trigger
├── components/   # React components: Header, DropZone, CommentTable, ExportButtons, etc.
├── styles/       # USWDS design tokens
└── types.ts      # Shared TypeScript interfaces
```

## Design Specs & Plans

- Design spec: `docs/superpowers/specs/2026-04-15-comment-muncher-design.md`
- Implementation plan: `docs/superpowers/plans/2026-04-15-comment-muncher.md`
