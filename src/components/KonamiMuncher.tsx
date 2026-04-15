import { useEffect, useState, useCallback } from 'react';
import './KonamiMuncher.css';

const KONAMI = ['ArrowUp','ArrowUp','ArrowDown','ArrowDown','ArrowLeft','ArrowRight','ArrowLeft','ArrowRight','b','a'];
const TITLE = 'Comment Muncher';

export default function KonamiMuncher() {
  const [sequence, setSequence] = useState<string[]>([]);
  const [phase, setPhase] = useState<'idle' | 'eating' | 'rebuilding' | 'done'>('idle');
  const [eatIndex, setEatIndex] = useState(-1);

  // Listen for Konami code
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      setSequence(prev => {
        const next = [...prev, e.key].slice(-KONAMI.length);
        if (next.length === KONAMI.length && next.every((k, i) => k === KONAMI[i])) {
          setTimeout(() => setPhase('eating'), 100);
        }
        return next;
      });
    }
    if (phase === 'idle') {
      window.addEventListener('keydown', handleKey);
      return () => window.removeEventListener('keydown', handleKey);
    }
  }, [phase]);

  // Eating animation — chomp one letter at a time
  useEffect(() => {
    if (phase !== 'eating') return;
    if (eatIndex < TITLE.length - 1) {
      const timer = setTimeout(() => setEatIndex(i => i + 1), 120);
      return () => clearTimeout(timer);
    } else {
      // All eaten — pause, then rebuild
      const timer = setTimeout(() => {
        setPhase('rebuilding');
        setEatIndex(TITLE.length - 1);
      }, 600);
      return () => clearTimeout(timer);
    }
  }, [phase, eatIndex]);

  // Rebuilding animation — letters reappear one at a time from the end
  useEffect(() => {
    if (phase !== 'rebuilding') return;
    if (eatIndex >= 0) {
      const timer = setTimeout(() => setEatIndex(i => i - 1), 80);
      return () => clearTimeout(timer);
    } else {
      const timer = setTimeout(() => {
        setPhase('done');
        // Reset after a beat so it can be triggered again
        setTimeout(() => {
          setPhase('idle');
          setSequence([]);
          setEatIndex(-1);
        }, 2000);
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [phase, eatIndex]);

  const reset = useCallback(() => {
    setPhase('idle');
    setSequence([]);
    setEatIndex(-1);
  }, []);

  if (phase === 'idle' || phase === 'done') return null;

  // Pac-man position: aligned with the letter being eaten
  const pacLeft = phase === 'eating'
    ? `${(eatIndex + 1) * 0.78}em`
    : `${(eatIndex + 1) * 0.78}em`;

  return (
    <div className="konami-overlay" onClick={reset}>
      <div className="konami-stage">
        <div className="konami-title">
          {TITLE.split('').map((char, i) => {
            const eaten = phase === 'eating' ? i <= eatIndex : i > eatIndex;
            return (
              <span
                key={i}
                className={`konami-letter${eaten ? ' konami-letter--eaten' : ''}`}
              >
                {char === ' ' ? '\u00A0' : char}
              </span>
            );
          })}
        </div>
        <div
          className={`konami-pac${phase === 'rebuilding' ? ' konami-pac--reverse' : ''}`}
          style={{ left: pacLeft }}
        >
          <div className="konami-pac__body">
            <div className="konami-pac__eye" />
          </div>
        </div>
      </div>
    </div>
  );
}
