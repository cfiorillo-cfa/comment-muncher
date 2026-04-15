import { useEffect, useState, useCallback, useRef } from 'react';
import './KonamiMuncher.css';

const KONAMI = ['ArrowUp','ArrowUp','ArrowDown','ArrowDown','ArrowLeft','ArrowRight','ArrowLeft','ArrowRight','b','a'];
const TITLE = 'Comment Muncher';

function playBlip() {
  try {
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = 'square';
    osc.frequency.setValueAtTime(600, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(200, ctx.currentTime + 0.08);
    gain.gain.setValueAtTime(0.15, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.08);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.08);
    setTimeout(() => ctx.close(), 200);
  } catch {
    // Audio not available — silent fallback
  }
}

function playRestore() {
  try {
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = 'square';
    osc.frequency.setValueAtTime(200, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(500, ctx.currentTime + 0.06);
    gain.gain.setValueAtTime(0.12, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.06);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.06);
    setTimeout(() => ctx.close(), 200);
  } catch {
    // Audio not available — silent fallback
  }
}

export default function KonamiMuncher() {
  const [sequence, setSequence] = useState<string[]>([]);
  const [phase, setPhase] = useState<'idle' | 'eating' | 'rebuilding' | 'done'>('idle');
  const [eatIndex, setEatIndex] = useState(-1);
  const prevEatIndex = useRef(-1);

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

  // Eating animation
  useEffect(() => {
    if (phase !== 'eating') return;
    if (eatIndex < TITLE.length - 1) {
      const timer = setTimeout(() => setEatIndex(i => i + 1), 120);
      return () => clearTimeout(timer);
    } else {
      const timer = setTimeout(() => {
        setPhase('rebuilding');
        setEatIndex(TITLE.length - 1);
      }, 600);
      return () => clearTimeout(timer);
    }
  }, [phase, eatIndex]);

  // Rebuilding animation
  useEffect(() => {
    if (phase !== 'rebuilding') return;
    if (eatIndex >= 0) {
      const timer = setTimeout(() => setEatIndex(i => i - 1), 80);
      return () => clearTimeout(timer);
    } else {
      const timer = setTimeout(() => {
        setPhase('done');
        setTimeout(() => {
          setPhase('idle');
          setSequence([]);
          setEatIndex(-1);
          prevEatIndex.current = -1;
        }, 2000);
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [phase, eatIndex]);

  // Play sounds on index change
  useEffect(() => {
    if (phase === 'eating' && eatIndex > prevEatIndex.current) {
      playBlip();
    } else if (phase === 'rebuilding' && eatIndex < prevEatIndex.current) {
      playRestore();
    }
    prevEatIndex.current = eatIndex;
  }, [phase, eatIndex]);

  const reset = useCallback(() => {
    setPhase('idle');
    setSequence([]);
    setEatIndex(-1);
    prevEatIndex.current = -1;
  }, []);

  if (phase === 'idle' || phase === 'done') return null;

  const pacLeft = `${(eatIndex + 1) * 0.78}em`;

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
          className={`konami-pac ${phase === 'rebuilding' ? 'konami-pac--reverse' : 'konami-pac--forward'}`}
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
