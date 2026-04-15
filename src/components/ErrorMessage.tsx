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
