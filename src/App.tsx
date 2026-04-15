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
