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
