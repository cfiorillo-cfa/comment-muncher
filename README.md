# Comment Muncher

Extract comments from Word documents and export them as structured data. Built by [Code for America](https://codeforamerica.org).

## What it does

Upload a `.docx` file and instantly see every comment in a sortable table — who said what, when, and on which text. Export the whole set as CSV or XLSX.

**Extracted fields:**
- Comment text
- Highlighted content (the text the comment is anchored to)
- Author
- Date
- Document location (section heading or paragraph number)
- Reply threading
- Resolved / open status

## Privacy

Comment Muncher runs entirely in your browser. Your files are never uploaded to a server. There is no backend, no analytics, no tracking.

## Quick start

```bash
git clone https://github.com/cfiorillo-cfa/comment-muncher.git
cd comment-muncher
npm install
npm run dev
```

Then open http://localhost:5173 in your browser.

## Working with Google Docs

Comment Muncher works with `.docx` files. If your comments live in a Google Doc, you can export it:

**File > Download > Microsoft Word (.docx)**

The downloaded file will include all comments and replies.

## Building for production

```bash
npm run build
```

Output goes to `dist/`. Deploy it anywhere that serves static files — GitHub Pages, Netlify, Vercel, an S3 bucket, etc.

## Running tests

```bash
npm test        # watch mode
npm run test:run # single run
```

## Tech stack

- React 18 + TypeScript
- Vite (build tooling)
- JSZip (DOCX unzipping in-browser)
- SheetJS (XLSX/CSV export)
- Vitest (testing)
- USWDS-inspired design tokens

## License

MIT
