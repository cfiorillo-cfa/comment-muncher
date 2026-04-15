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
