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
          onClick={e => e.stopPropagation()}
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
