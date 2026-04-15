import { useCallback, useState } from 'react';
import type { Comment, ParseResult } from './types';
import { parseDocx } from './parser/parse-docx';
import { getAccessToken } from './google/auth';
import { fetchGoogleDocComments } from './google/fetch-comments';
import Header from './components/Header';
import DropZone from './components/DropZone';
import GoogleDocInput from './components/GoogleDocInput';
import SummaryBar from './components/SummaryBar';
import FilterBar from './components/FilterBar';
import CommentStats from './components/CommentStats';
import CommentTable from './components/CommentTable';
import ExportButtons from './components/ExportButtons';
import ErrorMessage from './components/ErrorMessage';
import KonamiMuncher from './components/KonamiMuncher';
import './App.css';

type AppState =
  | { view: 'upload' }
  | { view: 'loading' }
  | { view: 'results'; data: ParseResult }
  | { view: 'error'; message: string };

export default function App() {
  const [state, setState] = useState<AppState>({ view: 'upload' });
  const [filteredComments, setFilteredComments] = useState<Comment[] | null>(null);
  const [dragOver, setDragOver] = useState(false);

  const handleFile = useCallback(async (file: File) => {
    if (!file.name.toLowerCase().endsWith('.docx')) {
      setState({ view: 'error', message: 'Please upload a .docx file' });
      return;
    }
    setState({ view: 'loading' });
    setFilteredComments(null);
    try {
      const result = await parseDocx(file);
      if (result.comments.length === 0) {
        setState({ view: 'error', message: 'No comments found in this document' });
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
    setFilteredComments(null);
    try {
      const token = await getAccessToken();
      const result = await fetchGoogleDocComments(url, token);
      if (result.comments.length === 0) {
        setState({ view: 'error', message: 'No comments found in this document' });
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
    setFilteredComments(null);
  }, []);

  // Drag-and-drop anywhere on the page
  const handlePageDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      const file = e.dataTransfer.files[0];
      if (file) handleFile(file);
    },
    [handleFile]
  );

  const handlePageDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  }, []);

  const handlePageDragLeave = useCallback((e: React.DragEvent) => {
    // Only trigger when leaving the app container itself
    if (e.currentTarget === e.target) {
      setDragOver(false);
    }
  }, []);

  const displayComments =
    state.view === 'results'
      ? filteredComments ?? state.data.comments
      : [];

  return (
    <div
      className={`app${dragOver ? ' app--drag-over' : ''}`}
      onDrop={handlePageDrop}
      onDragOver={handlePageDragOver}
      onDragLeave={handlePageDragLeave}
    >
      <Header />
      {dragOver && (
        <div className="drag-overlay">
          <div className="drag-overlay__content">
            Drop your .docx file anywhere
          </div>
        </div>
      )}
      <KonamiMuncher />
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
              comments={displayComments}
              filename={state.data.filename}
              hasThreading={state.data.hasThreading}
            />
          </div>
          <SummaryBar
            comments={state.data.comments}
            hasThreading={state.data.hasThreading}
          />
          <FilterBar
            comments={state.data.comments}
            hasThreading={state.data.hasThreading}
            onFilter={setFilteredComments}
          />
          <CommentStats
            comments={state.data.comments}
            hasThreading={state.data.hasThreading}
          />
          <CommentTable
            comments={displayComments}
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
