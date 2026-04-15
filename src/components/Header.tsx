import { useCallback, useEffect, useState } from 'react';
import cfaLogo from '../../assets/cfa_logo.png';
import './Header.css';

export default function Header() {
  const [isDark, setIsDark] = useState(() => {
    return localStorage.getItem('theme') === 'dark';
  });
  const [nomVisible, setNomVisible] = useState(false);

  useEffect(() => {
    if (isDark) {
      document.documentElement.setAttribute('data-theme', 'dark');
    } else {
      document.documentElement.removeAttribute('data-theme');
    }
    localStorage.setItem('theme', isDark ? 'dark' : 'light');
  }, [isDark]);

  useEffect(() => {
    const stored = localStorage.getItem('theme');
    if (stored === 'dark') {
      document.documentElement.setAttribute('data-theme', 'dark');
    }
  }, []);

  const handleTitleClick = useCallback(() => {
    setNomVisible(true);
    setTimeout(() => setNomVisible(false), 1200);
  }, []);

  return (
    <header className="header">
      <div className="header__gradient" />
      <div className="header__content">
        <img
          src={cfaLogo}
          alt="Code for America"
          className="header__logo"
        />
        <span
          className="header__title"
          onClick={handleTitleClick}
          style={{ cursor: 'default', userSelect: 'none', position: 'relative' }}
        >
          Comment Muncher
          {nomVisible && (
            <span className="header__nom">nom nom nom</span>
          )}
        </span>
        <button
          onClick={() => setIsDark((prev) => !prev)}
          aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
          title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
          className="header__theme-toggle"
        >
          {isDark ? '☀️' : '🌙'}
        </button>
      </div>
    </header>
  );
}
