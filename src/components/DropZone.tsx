import { useCallback, useState } from 'react';
import './DropZone.css';

interface DropZoneProps {
  onFile: (file: File) => void;
  onError: (message: string) => void;
}

export default function DropZone({ onFile, onError }: DropZoneProps) {
  const [dragOver, setDragOver] = useState(false);

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

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      validateAndEmit(e.target.files?.[0]);
    },
    [validateAndEmit]
  );

  return (
    <>
      <label
        className={`dropzone${dragOver ? ' drag-over' : ''}`}
        htmlFor="docx-file-input"
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
      >
        <div className="dropzone__icon" aria-hidden="true">
          &#128196;
        </div>
        <p className="dropzone__title">Drop your .docx file here</p>
        <p className="dropzone__subtitle">or click to browse</p>
        <span className="dropzone__button" aria-hidden="true">Choose file</span>
        <input
          id="docx-file-input"
          type="file"
          accept=".docx"
          onChange={handleChange}
          className="dropzone__input"
        />
      </label>
      <p className="dropzone__privacy" aria-live="polite">
        &#128274; Your files never leave your browser
      </p>
    </>
  );
}
