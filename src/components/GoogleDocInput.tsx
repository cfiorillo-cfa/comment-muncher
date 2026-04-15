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
        Google will ask for permission to view your Drive files and manage
        spreadsheets. Comment Muncher only reads comments from the doc you
        provide and only creates new spreadsheets for export — it never
        browses, modifies, or deletes anything else. No data is stored.
      </p>
    </div>
  );
}
