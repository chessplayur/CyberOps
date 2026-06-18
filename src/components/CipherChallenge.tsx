import { useState, useEffect, useCallback, useRef } from 'react';
import { Shield, ArrowLeft, CheckCircle, Lock, Unlock, Lightbulb, RefreshCw } from 'lucide-react';
import HowToPlay from './HowToPlay';

interface CipherChallenge {
  id: number;
  plaintext: string;
  ciphertext: string;
  cipherType: 'caesar' | 'vigenere' | 'substitution' | 'reverse';
  hint: string;
  key: string;
  level: number;
}

const CIPHER_TYPES: CipherChallenge['cipherType'][] = ['caesar', 'vigenere', 'substitution', 'reverse'];

const SAMPLES = [
  'THE QUICK BROWN FOX',
  'SECURITY IS KEY',
  'ENCRYPT EVERYTHING',
  'NEVER TRUST INPUT',
  'HACK THE PLANET',
  'ZERO DAY EXPLOIT',
];

function caesarShift(text: string, shift: number): string {
  return text.split('').map((char) => {
    if (char.match(/[A-Z]/)) {
      return String.fromCharCode(((char.charCodeAt(0) - 65 + shift) % 26) + 65);
    }
    return char;
  }).join('');
}

function vigenereEncrypt(text: string, key: string): string {
  let result = '';
  let keyIndex = 0;
  for (const char of text) {
    if (char.match(/[A-Z]/)) {
      const shift = key.charCodeAt(keyIndex % key.length) - 65;
      result += caesarShift(char, shift);
      keyIndex++;
    } else {
      result += char;
    }
  }
  return result;
}

function substitutionEncrypt(text: string): string {
  const cipher = 'QWERTYUIOPASDFGHJKLZXCVBNM';
  return text.split('').map((char) => {
    if (char.match(/[A-Z]/)) return cipher[char.charCodeAt(0) - 65];
    return char;
  }).join('');
}

function encrypt(plaintext: string, cipherType: CipherChallenge['cipherType'], key: string): string {
  const upper = plaintext.toUpperCase();
  switch (cipherType) {
    case 'caesar':    return caesarShift(upper, parseInt(key));
    case 'vigenere':  return vigenereEncrypt(upper, key);
    case 'substitution': return substitutionEncrypt(upper);
    case 'reverse':   return upper.split('').reverse().join('');
  }
}

function generateChallenge(difficulty: number): CipherChallenge {
  const cipherType = CIPHER_TYPES[difficulty % CIPHER_TYPES.length];
  const plaintext = SAMPLES[Math.floor(Math.random() * SAMPLES.length)];
  let key = '';
  let hint = '';

  switch (cipherType) {
    case 'caesar': {
      const shift = Math.floor(Math.random() * 10) + 3;
      key = String(shift);
      hint = `Shift every letter forward by ${shift}. A becomes ${String.fromCharCode(65 + shift)}, B becomes ${String.fromCharCode(66 + shift)}, and so on.`;
      break;
    }
    case 'vigenere': {
      key = ['KEY', 'CODE', 'HACK'][Math.floor(Math.random() * 3)];
      hint = `Each letter is shifted by the corresponding letter of the keyword "${key}". K=10, E=4, Y=24 — so the shifts cycle as ${key.split('').map(c => c.charCodeAt(0) - 65).join(', ')}.`;
      break;
    }
    case 'substitution': {
      key = 'QWERTY';
      hint = `Each letter maps to its QWERTY keyboard position. A→Q, B→W, C→E, D→R, E→T, F→Y…`;
      break;
    }
    case 'reverse': {
      key = 'REVERSE';
      hint = `The entire message is written backwards. The last letter becomes the first.`;
      break;
    }
  }

  const ciphertext = encrypt(plaintext, cipherType, key);
  return { id: difficulty, plaintext, ciphertext, cipherType, hint, key, level: difficulty };
}

interface Props {
  onComplete: (type: string, level: number, score: number, time: number, hints: number) => void;
  onBack: () => void;
  playerLevel: number;
}

const TYPE_LABEL: Record<CipherChallenge['cipherType'], string> = {
  caesar: 'Caesar cipher',
  vigenere: 'Vigenère cipher',
  substitution: 'Substitution cipher',
  reverse: 'Reverse cipher',
};

export default function CipherChallenge({ onComplete, onBack, playerLevel }: Props) {
  const [challenges, setChallenges] = useState<CipherChallenge[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [typed, setTyped]   = useState('');
  const [score, setScore]   = useState(0);
  const [startTime]         = useState(Date.now());
  const [hintsUsed, setHintsUsed] = useState(0);
  const [showHint, setShowHint]   = useState(false);
  const [completed, setCompleted] = useState<number[]>([]);
  const [feedback, setFeedback]   = useState<{ message: string; success: boolean } | null>(null);
  const [showHelp, setShowHelp]   = useState(false);
  const [revealAnswer, setRevealAnswer] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const numChallenges = Math.min(3 + playerLevel, 5);
    setChallenges(Array.from({ length: numChallenges }, (_, i) => generateChallenge(i + playerLevel)));
  }, [playerLevel]);

  useEffect(() => {
    setTyped('');
    setFeedback(null);
    setShowHint(false);
    setRevealAnswer(false);
    inputRef.current?.focus();
  }, [currentIndex]);

  const currentChallenge = challenges[currentIndex];
  const allDone = completed.length === challenges.length && challenges.length > 0;

  // Live-encrypt whatever the user has typed so far
  const liveEncrypted = currentChallenge
    ? encrypt(typed.toUpperCase(), currentChallenge.cipherType, currentChallenge.key)
    : '';

  // Match typed chars one-by-one against the target ciphertext
  const targetCipher = currentChallenge?.ciphertext ?? '';

  const handleSubmit = useCallback(() => {
    if (!currentChallenge) return;
    if (liveEncrypted.trim().toUpperCase() === targetCipher.trim()) {
      const basePoints = 120 * Math.max(currentChallenge.level, 1);
      const hintPenalty = hintsUsed * 20;
      const points = Math.max(basePoints - hintPenalty, 60);
      setScore((s) => s + points);
      setCompleted((c) => [...c, currentIndex]);
      setFeedback({ message: `Correct! +${points} pts`, success: true });
      setTimeout(() => {
        if (currentIndex < challenges.length - 1) setCurrentIndex((i) => i + 1);
      }, 1400);
    } else {
      setFeedback({ message: 'Not quite — keep typing or check the encryption below', success: false });
    }
  }, [currentChallenge, liveEncrypted, targetCipher, hintsUsed, currentIndex, challenges.length]);

  const useHint = useCallback(() => {
    if (!showHint) {
      setShowHint(true);
      setHintsUsed((h) => h + 1);
    }
  }, [showHint]);

  const giveUp = useCallback(() => {
    if (!currentChallenge) return;
    setRevealAnswer(true);
    setTyped(currentChallenge.plaintext);
    setFeedback({ message: `The answer was: ${currentChallenge.plaintext}`, success: false });
    setCompleted((c) => [...c, currentIndex]);
    setTimeout(() => {
      if (currentIndex < challenges.length - 1) setCurrentIndex((i) => i + 1);
    }, 2500);
  }, [currentChallenge, currentIndex, challenges.length]);

  const handleComplete = useCallback(() => {
    const elapsed = Math.floor((Date.now() - startTime) / 1000);
    onComplete('cipher', playerLevel, score, elapsed, hintsUsed);
  }, [onComplete, playerLevel, score, startTime, hintsUsed]);

  if (challenges.length === 0) {
    return <div className="min-h-screen flex items-center justify-center text-neon-cyan font-mono">Loading...</div>;
  }

  if (allDone) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="scanline-effect" />
        <div className="cyber-panel-glow p-8 text-center max-w-md">
          <Unlock className="w-20 h-20 mx-auto text-neon-green mb-6" />
          <h2 className="font-display text-3xl text-neon-green mb-4">ALL CIPHERS DECODED</h2>
          <p className="text-gray-400 font-mono mb-2">Cryptographic mastery achieved</p>
          <p className="text-neon-cyan text-2xl font-display mb-8">{score} Points</p>
          <button onClick={handleComplete} className="cyber-button-primary w-full py-4">Return to Hub</button>
        </div>
      </div>
    );
  }

  // Per-character coloring: green = matches target so far, red = wrong, gray = not yet typed
  const renderCipherComparison = () => {
    return targetCipher.split('').map((targetChar, i) => {
      const encChar = liveEncrypted[i] ?? '';
      let color = 'text-gray-600'; // not yet typed
      if (encChar) color = encChar === targetChar ? 'text-neon-green' : 'text-neon-red';
      return (
        <span key={i} className={`font-mono text-lg tracking-widest transition-colors ${color}`}>
          {targetChar}
        </span>
      );
    });
  };

  const renderLiveEncrypted = () => {
    return liveEncrypted.split('').map((char, i) => {
      const targetChar = targetCipher[i] ?? '';
      const isCorrect = char === targetChar;
      return (
        <span key={i} className={`font-mono text-lg tracking-widest ${isCorrect ? 'text-neon-cyan' : 'text-neon-red'}`}>
          {char}
        </span>
      );
    });
  };

  return (
    <div className="min-h-screen">
      <div className="scanline-effect" />
      <header className="border-b border-cyber-border bg-cyber-panel/80 backdrop-blur-sm sticky top-0 z-40">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
          <button onClick={onBack} className="flex items-center gap-2 text-gray-400 hover:text-neon-cyan transition-colors">
            <ArrowLeft className="w-5 h-5" />
            <span className="font-mono text-sm">Exit Mission</span>
          </button>
          <div className="flex items-center gap-6">
            <button type="button" onClick={() => setShowHelp(true)} className="flex items-center gap-2 text-gray-400 hover:text-neon-cyan transition-colors">
              <Lightbulb className="w-5 h-5" /><span className="sr-only">How to play</span>
            </button>
            <span className="text-neon-purple font-mono text-sm">{completed.length}/{challenges.length} DECODED</span>
            <span className="text-neon-orange font-display">{score} PTS</span>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-8 space-y-6">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <Shield className="w-6 h-6 text-neon-purple" />
            <h1 className="font-display text-2xl text-white tracking-wider">CIPHER ENCODER</h1>
          </div>
          <p className="text-gray-400 font-mono text-sm">
            Type the plaintext. Watch it encrypt live. Match the target ciphertext.
          </p>
        </div>

        {/* Challenge card */}
        <div className="cyber-panel p-6 space-y-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Lock className="w-4 h-4 text-neon-purple" />
              <span className="text-neon-purple font-mono text-xs uppercase tracking-wider">
                Challenge {currentChallenge.id} — {TYPE_LABEL[currentChallenge.cipherType]}
              </span>
            </div>
            <span className="text-gray-600 font-mono text-xs">
              Key: <span className="text-neon-orange">{currentChallenge.key}</span>
            </span>
          </div>

          {/* Target ciphertext — what they need to produce */}
          <div className="bg-cyber-dark/60 rounded-lg p-4 border border-cyber-border">
            <div className="text-xs text-gray-500 font-mono uppercase tracking-wider mb-2">Target ciphertext</div>
            <div className="flex flex-wrap gap-0.5">{renderCipherComparison()}</div>
          </div>

          {/* Divider with arrow */}
          <div className="flex items-center gap-3">
            <div className="flex-1 border-t border-cyber-border/40" />
            <span className="text-gray-600 text-xs font-mono">your encryption ↑ · your input ↓</span>
            <div className="flex-1 border-t border-cyber-border/40" />
          </div>

          {/* Live encrypted output of what they've typed */}
          <div className="bg-cyber-dark/30 rounded-lg p-4 border border-cyber-border/50 min-h-[56px]">
            <div className="text-xs text-gray-500 font-mono uppercase tracking-wider mb-2">Live encrypted output</div>
            <div className="flex flex-wrap gap-0.5 min-h-[28px]">
              {liveEncrypted ? renderLiveEncrypted() : (
                <span className="text-gray-700 font-mono text-lg">start typing below…</span>
              )}
            </div>
          </div>

          {/* Plain text input */}
          <div>
            <div className="text-xs text-gray-500 font-mono uppercase tracking-wider mb-2">Your plaintext input</div>
            <input
              ref={inputRef}
              type="text"
              value={typed}
              onChange={(e) => {
                setTyped(e.target.value.toUpperCase());
                setFeedback(null);
              }}
              onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
              className="cyber-input font-mono text-lg tracking-widest uppercase"
              placeholder="TYPE HERE…"
              disabled={revealAnswer}
              autoComplete="off"
              spellCheck={false}
            />
          </div>

          {showHint && (
            <div className="text-neon-orange bg-neon-orange/10 rounded-lg p-3 border border-neon-orange/30 font-mono text-sm">
              <span className="text-xs uppercase tracking-wider text-neon-orange/60">Hint — </span>
              {currentChallenge.hint}
            </div>
          )}

          {feedback && (
            <div className={`flex items-center gap-3 p-3 rounded-lg ${feedback.success ? 'bg-neon-green/10 border border-neon-green/30' : 'bg-neon-red/10 border border-neon-red/30'}`}>
              {feedback.success
                ? <CheckCircle className="w-5 h-5 text-neon-green flex-shrink-0" />
                : <Lock className="w-5 h-5 text-neon-red flex-shrink-0" />}
              <span className={`font-mono text-sm ${feedback.success ? 'text-neon-green' : 'text-neon-red'}`}>
                {feedback.message}
              </span>
            </div>
          )}

          <div className="flex flex-wrap gap-3 pt-1">
            <button
              onClick={handleSubmit}
              disabled={!typed}
              className="cyber-button-primary flex items-center gap-2"
            >
              <CheckCircle className="w-4 h-4" />
              Submit
            </button>
            <button
              onClick={useHint}
              disabled={showHint}
              className="cyber-button-success flex items-center gap-2"
            >
              <Lightbulb className="w-4 h-4" />
              {showHint ? 'Hint shown' : 'Get hint (−20 pts)'}
            </button>
            <button
              onClick={() => { setTyped(''); setFeedback(null); }}
              className="flex items-center gap-2 px-4 py-3 rounded-lg border border-cyber-border text-gray-400 hover:text-white hover:border-gray-500 transition"
            >
              <RefreshCw className="w-4 h-4" />
              Clear
            </button>
            <button
              type="button"
              onClick={giveUp}
              disabled={revealAnswer}
              className="px-4 py-3 rounded-lg border border-neon-red text-neon-red hover:bg-neon-red/10 transition"
            >
              Give Up
            </button>
          </div>
        </div>

        {/* Cipher reference */}
        <div className="cyber-panel p-5">
          <div className="text-xs text-gray-500 font-mono uppercase tracking-wider mb-3">How this cipher works</div>
          <div className="font-mono text-sm text-gray-400 space-y-1">
            {currentChallenge.cipherType === 'caesar' && (
              <>
                <div>Each letter shifts forward by <span className="text-neon-cyan">{currentChallenge.key}</span> positions.</div>
                <div className="text-gray-600 text-xs mt-2 space-y-0.5">
                  {['A','B','C','D','E'].map(l => (
                    <span key={l} className="mr-4">
                      {l} → <span className="text-neon-cyan">{caesarShift(l, parseInt(currentChallenge.key))}</span>
                    </span>
                  ))}
                  <span className="text-gray-700">…</span>
                </div>
              </>
            )}
            {currentChallenge.cipherType === 'vigenere' && (
              <>
                <div>Keyword: <span className="text-neon-cyan">{currentChallenge.key}</span> — shifts cycle through its letters.</div>
                <div className="text-gray-600 text-xs mt-2 flex flex-wrap gap-x-4 gap-y-0.5">
                  {currentChallenge.key.split('').map((k, i) => (
                    <span key={i}>pos {i + 1}: shift +<span className="text-neon-cyan">{k.charCodeAt(0) - 65}</span> ({k})</span>
                  ))}
                </div>
              </>
            )}
            {currentChallenge.cipherType === 'substitution' && (
              <>
                <div>Each letter maps to its QWERTY position.</div>
                <div className="text-gray-600 text-xs mt-2 flex flex-wrap gap-x-3 gap-y-0.5">
                  {'ABCDEFGHIJ'.split('').map((l, i) => (
                    <span key={l}>{l}→<span className="text-neon-cyan">{'QWERTYUIOP'[i]}</span></span>
                  ))}
                  <span className="text-gray-700">…</span>
                </div>
              </>
            )}
            {currentChallenge.cipherType === 'reverse' && (
              <div>The entire message is written <span className="text-neon-cyan">backwards</span>.</div>
            )}
          </div>
        </div>
      </main>

      <HowToPlay open={showHelp} onClose={() => setShowHelp(false)} title="Cipher Encoder">
        <h3 className="text-white">The goal</h3>
        <p>
          You're given an encrypted ciphertext and told which cipher was used. Your job is to figure out
          what the original plaintext was — by typing guesses and watching them encrypt in real time.
        </p>
        <h4 className="mt-4 text-neon-cyan">How to play</h4>
        <ol className="mt-2 space-y-2">
          <li><strong>1.</strong> Look at the target ciphertext at the top.</li>
          <li><strong>2.</strong> Type a guess in the input at the bottom.</li>
          <li><strong>3.</strong> Your input is encrypted live — green letters match the target, red letters don't.</li>
          <li><strong>4.</strong> Adjust your guess until all letters turn green, then hit Submit.</li>
        </ol>
        <h4 className="mt-4 text-neon-cyan">Cipher types</h4>
        <ul className="mt-2 space-y-1">
          <li><strong className="text-neon-cyan">Caesar</strong> — every letter shifted by a fixed number. Work backwards by the same amount.</li>
          <li><strong className="text-neon-cyan">Vigenère</strong> — shift changes per character using a keyword. The hint reveals the keyword.</li>
          <li><strong className="text-neon-cyan">Substitution</strong> — each letter replaced by its QWERTY keyboard equivalent.</li>
          <li><strong className="text-neon-cyan">Reverse</strong> — message is backwards. Type it in reverse.</li>
        </ul>
      </HowToPlay>
    </div>
  );
}