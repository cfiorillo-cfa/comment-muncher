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
    // Silent fallback
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
    // Silent fallback
  }
}

export default function KonamiMuncher() {
  const [sequence, setSequence] = useState<string[]>([]);
  const [phase, setPhase] = useState<'idle' | 'eating' | 'rebuilding' | 'done'>('idle');
  const [pacPos, setPacPos] = useState(-1);
  const [eatenLetters, setEatenLetters] = useState<Set<number>>(new Set());
  const prevPacPos = useRef(-1);

  // Listen for Konami code
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      setSequence(prev => {
        const next = [...prev, e.key].slice(-KONAMI.length);
        if (next.length === KONAMI.length && next.every((k, i) => k === KONAMI[i])) {
          setTimeout(() => {
            setPacPos(-1);
            setEatenLetters(new Set());
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

  // Eating: pac-man advances, eats the letter it reaches
  useEffect(() => {
    if (phase !== 'eating') return;
    if (pacPos < TITLE.length - 1) {
      const timer = setTimeout(() => {
        setPacPos(i => {
          const next = i + 1;
          setEatenLetters(prev => new Set(prev).add(next));
          return next;
        });
      }, 65);
      return () => clearTimeout(timer);
    } else {
      // All eaten — pause, then rebuild
      const timer = setTimeout(() => {
        setPhase('rebuilding');
      }, 600);
      return () => clearTimeout(timer);
    }
  }, [phase, pacPos]);

  // Rebuilding: pac-man goes back, letters reappear as it passes
  useEffect(() => {
    if (phase !== 'rebuilding') return;
    if (pacPos >= 0) {
      const timer = setTimeout(() => {
        setPacPos(i => {
          setEatenLetters(prev => {
            const next = new Set(prev);
            next.delete(i);
            return next;
          });
          return i - 1;
        });
      }, 40);
      return () => clearTimeout(timer);
    } else {
      const timer = setTimeout(() => {
        setPhase('done');
        setTimeout(() => {
          setPhase('idle');
          setSequence([]);
          setPacPos(-1);
          setEatenLetters(new Set());
          prevPacPos.current = -1;
        }, 1500);
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [phase, pacPos]);

  // Sound effects
  useEffect(() => {
    if (phase === 'eating' && pacPos > prevPacPos.current) {
      playBlip();
    } else if (phase === 'rebuilding' && pacPos < prevPacPos.current) {
      playRestore();
    }
    prevPacPos.current = pacPos;
  }, [phase, pacPos]);

  const reset = useCallback(() => {
    setPhase('idle');
    setSequence([]);
    setPacPos(-1);
    setEatenLetters(new Set());
    prevPacPos.current = -1;
  }, []);

  if (phase === 'idle' || phase === 'done') return null;

  // Pac-man sits right on top of the current letter
  const pacLeft = `${pacPos * 0.78}em`;

  return (
    <div className="konami-overlay" onClick={reset}>
      <div className="konami-stage">
        <div className="konami-title">
          {TITLE.split('').map((char, i) => (
            <span
              key={i}
              className={`konami-letter${eatenLetters.has(i) ? ' konami-letter--eaten' : ''}`}
            >
              {char === ' ' ? '\u00A0' : char}
            </span>
          ))}
        </div>
        <div
          className={`konami-pac ${phase === 'rebuilding' ? 'konami-pac--reverse' : 'konami-pac--forward'}`}
          style={{ left: pacLeft }}
        >
          <div className="konami-pac__body" />
        </div>
      </div>
    </div>
  );
}
