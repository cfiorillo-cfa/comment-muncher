import { useEffect, useState, useCallback, useRef } from 'react';
import './KonamiMuncher.css';

const KONAMI = ['ArrowUp','ArrowUp','ArrowDown','ArrowDown','ArrowLeft','ArrowRight','ArrowLeft','ArrowRight','b','a'];
const TITLE = 'Comment Muncher';
const LETTER_EAT_INTERVAL = 110;  // ms between each letter vanishing
const LETTER_RESTORE_INTERVAL = 60;

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
  } catch { /* silent */ }
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
  } catch { /* silent */ }
}

export default function KonamiMuncher() {
  const [, setSequence] = useState<string[]>([]);
  const [phase, setPhase] = useState<'idle' | 'eating' | 'rebuilding' | 'done'>('idle');
  const [eatCount, setEatCount] = useState(0); // how many letters have been eaten (0 to TITLE.length)
  const prevEatCount = useRef(0);
  const titleRef = useRef<HTMLDivElement>(null);

  // Listen for Konami code
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      setSequence(prev => {
        const next = [...prev, e.key].slice(-KONAMI.length);
        if (next.length === KONAMI.length && next.every((k, i) => k === KONAMI[i])) {
          setTimeout(() => {
            setEatCount(0);
            setPhase('eating');
          }, 100);
        }
        return next;
      });
    }
    if (phase === 'idle') {
      window.addEventListener('keydown', handleKey);
      return () => window.removeEventListener('keydown', handleKey);
    }
  }, [phase]);

  // Eating: letters vanish one at a time
  useEffect(() => {
    if (phase !== 'eating') return;
    if (eatCount < TITLE.length) {
      const timer = setTimeout(() => setEatCount(c => c + 1), LETTER_EAT_INTERVAL);
      return () => clearTimeout(timer);
    } else {
      const timer = setTimeout(() => setPhase('rebuilding'), 500);
      return () => clearTimeout(timer);
    }
  }, [phase, eatCount]);

  // Rebuilding: letters reappear one at a time from the end
  useEffect(() => {
    if (phase !== 'rebuilding') return;
    if (eatCount > 0) {
      const timer = setTimeout(() => setEatCount(c => c - 1), LETTER_RESTORE_INTERVAL);
      return () => clearTimeout(timer);
    } else {
      const timer = setTimeout(() => {
        setPhase('done');
        setTimeout(() => {
          setPhase('idle');
          setSequence([]);
          setEatCount(0);
          prevEatCount.current = 0;
        }, 1500);
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [phase, eatCount]);

  // Sound effects
  useEffect(() => {
    if (phase === 'eating' && eatCount > prevEatCount.current) {
      playBlip();
    } else if (phase === 'rebuilding' && eatCount < prevEatCount.current) {
      playRestore();
    }
    prevEatCount.current = eatCount;
  }, [phase, eatCount]);

  const reset = useCallback(() => {
    setPhase('idle');
    setSequence([]);
    setEatCount(0);
    prevEatCount.current = 0;
  }, []);

  if (phase === 'idle' || phase === 'done') return null;

  // Pac-man leads: position is 2 letters ahead of the last eaten letter
  const pacLetterPos = phase === 'eating'
    ? Math.min(eatCount + 2, TITLE.length)
    : Math.max(eatCount - 2, -1);

  return (
    <div className="konami-overlay" onClick={reset}>
      <div className="konami-stage">
        <div className="konami-title" ref={titleRef}>
          {TITLE.split('').map((char, i) => {
            const eaten = phase === 'eating' ? i < eatCount : i >= eatCount;
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
          style={{ left: `${pacLetterPos * 1.85}rem` }}
        >
          <div className="konami-pac__body" />
        </div>
      </div>
    </div>
  );
}
