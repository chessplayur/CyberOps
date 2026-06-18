import { useState, useEffect, useCallback } from 'react';
import { Shield, ArrowLeft, CheckCircle, Key, Lock, Unlock, Lightbulb } from 'lucide-react';
import HowToPlay from './HowToPlay';

interface CipherChallenge {
  id: number;
  ciphertext: string;
  plaintext: string;
  cipherType: 'caesar' | 'vigenere' | 'substitution' | 'reverse';
  hint: string;
  level: number;
}

const CIPHER_TYPES: CipherChallenge['cipherType'][] = ['caesar', 'vigenere', 'substitution', 'reverse'];

const SAMPLES = [
  'THE QUICK BROWN FOX JUMPS OVER THE LAZY DOG',
  'SECURITY THROUGH OBSCURITY IS NOT SECURITY',
  'ENCRYPTION PROTECTS YOUR DATA FROM EAVESDROPPERS',
  'NEVER TRUST USER INPUT ALWAYS VALIDATE AND SANITIZE',
  'PASSWORDS SHOULD BE LONG AND RANDOM USE A MANAGER',
  'FIREWALLS BLOCK UNAUTHORIZED ACCESS TO YOUR NETWORK',
];

function caesarShift(text: string, shift: number): string {
  return text.split('').map((char) => {
    if (char.match(/[A-Z]/)) {
      const code = char.charCodeAt(0);
      return String.fromCharCode(((code - 65 + shift) % 26) + 65);
    }
    return char;
  }).join('');
}

function vigenereEncrypt(text: string, key: string): string {
  let result = '';
  let keyIndex = 0;
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
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

function substitutionEncrypt(text: string, _key: string): string {
  const cipher = 'QWERTYUIOPASDFGHJKLZXCVBNM';
  return text.split('').map((char) => {
    if (char.match(/[A-Z]/)) {
      return cipher[char.charCodeAt(0) - 65];
    }
    return char;
  }).join('');
}

function generateChallenge(difficulty: number): CipherChallenge {
  const cipherType = CIPHER_TYPES[difficulty % CIPHER_TYPES.length];
  const plaintext = SAMPLES[Math.floor(Math.random() * SAMPLES.length)];

  let ciphertext = '';
  let hint = '';

  switch (cipherType) {
    case 'caesar':
      const shift = Math.floor(Math.random() * 25) + 1;
      ciphertext = caesarShift(plaintext, shift);
      hint = `Caesar Cipher: Shift ${shift} letters backward to decrypt`;
      break;
    case 'vigenere':
      const key = ['KEYWORD', 'SECRET', 'HACK', 'CODE'][Math.floor(Math.random() * 4)];
      ciphertext = vigenereEncrypt(plaintext, key);
      hint = `Vigenere Cipher: Key is "${key}"`;
      break;
    case 'substitution':
      ciphertext = substitutionEncrypt(plaintext, 'QWERTY');
      hint = 'Substitution Cipher: QWERTY keyboard mapping';
      break;
    case 'reverse':
      ciphertext = plaintext.split('').reverse().join('');
      hint = 'Simple reverse cipher: Text is backwards';
      break;
  }

  return {
    id: difficulty,
    ciphertext,
    plaintext,
    cipherType,
    hint,
    level: difficulty,
  };
}

interface Props {
  onComplete: (type: string, level: number, score: number, time: number, hints: number) => void;
  onBack: () => void;
  playerLevel: number;
}

export default function CipherChallenge({ onComplete, onBack, playerLevel }: Props) {
  const [challenges, setChallenges] = useState<CipherChallenge[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [guess, setGuess] = useState('');
  const [score, setScore] = useState(0);
  const [startTime] = useState(Date.now());
  const [hintsUsed, setHintsUsed] = useState(0);
  const [showHint, setShowHint] = useState(false);
  const [completed, setCompleted] = useState<number[]>([]);
  const [feedback, setFeedback] = useState<{ message: string; success: boolean } | null>(null);
  const [decoding, setDecoding] = useState(false);
  const [showHelp, setShowHelp] = useState(false);

  useEffect(() => {
    const numChallenges = Math.min(3 + playerLevel, 5);
    const generated = [];
    for (let i = 0; i < numChallenges; i++) {
      generated.push(generateChallenge(i + playerLevel));
    }
    setChallenges(generated);
  }, [playerLevel]);

  const currentChallenge = challenges[currentIndex];
  const allDone = completed.length === challenges.length && challenges.length > 0;

  const handleDecode = useCallback(() => {
    if (!currentChallenge || decoding) return;

    setDecoding(true);

    setTimeout(() => {
      const normalizedGuess = guess.toUpperCase().trim().replace(/\s+/g, ' ');
      const normalizedAnswer = currentChallenge.plaintext.toUpperCase().trim().replace(/\s+/g, ' ');

      if (normalizedGuess === normalizedAnswer) {
        const basePoints = 120 * currentChallenge.level;
        const hintPenalty = showHint ? 40 : 0;
        const points = Math.max(basePoints - hintPenalty, 60);

        setScore((s) => s + points);
        setCompleted((c) => [...c, currentIndex]);
        setFeedback({ message: `DECRYPTION SUCCESSFUL! +${points} pts`, success: true });

        setTimeout(() => {
          if (currentIndex < challenges.length - 1) {
            setCurrentIndex((i) => i + 1);
            setGuess('');
            setShowHint(false);
            setFeedback(null);
          }
        }, 1500);
      } else {
        setFeedback({ message: 'DECRYPTION FAILED - Incorrect plaintext', success: false });
      }
      setDecoding(false);
    }, 600);
  }, [currentChallenge, guess, decoding, showHint, currentIndex, challenges.length]);

  const useHint = useCallback(() => {
    if (!showHint && currentChallenge) {
      setShowHint(true);
      setHintsUsed((h) => h + 1);
    }
  }, [showHint, currentChallenge]);

  const giveUp = useCallback(() => {
    if (!currentChallenge) return;

    setFeedback({ message: `GIVE UP — the plaintext is "${currentChallenge.plaintext}"`, success: false });
    setCompleted((c) => [...c, currentIndex]);

    setTimeout(() => {
      if (currentIndex < challenges.length - 1) {
        setCurrentIndex((i) => i + 1);
        setGuess('');
        setShowHint(false);
        setFeedback(null);
      }
    }, 2000);
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
          <button onClick={handleComplete} className="cyber-button-primary w-full py-4">
            Return to Hub
          </button>
        </div>
      </div>
    );
  }

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
              <Lightbulb className="w-5 h-5" />
              <span className="sr-only">How to play</span>
            </button>
            <span className="text-neon-purple font-mono text-sm">
              {completed.length}/{challenges.length} DECODED
            </span>
            <span className="text-neon-orange font-display">{score} PTS</span>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-8">
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <Shield className="w-6 h-6 text-neon-purple" />
            <h1 className="font-display text-2xl text-white tracking-wider">CIPHER DECODER</h1>
          </div>
          <p className="text-gray-400 font-mono text-sm">
            Decrypt encoded messages using classical cryptography techniques
          </p>
        </div>

        <div className="cyber-panel p-6 mb-6">
          <div className="flex items-center gap-3 mb-4">
            <Lock className="w-5 h-5 text-neon-purple" />
            <span className="text-neon-purple font-mono text-sm uppercase tracking-wider">Challenge #{currentChallenge.id}</span>
          </div>

          <div className="bg-cyber-dark/50 rounded p-4 border border-cyber-border mb-4">
            <div className="text-xs text-gray-400 mb-2 uppercase tracking-wider">Ciphertext ({currentChallenge.cipherType.toUpperCase()}):</div>
            <div className="text-neon-cyan font-mono text-lg tracking-wide break-all">
              {currentChallenge.ciphertext}
            </div>
          </div>

          {showHint && (
            <div className="text-neon-orange bg-neon-orange/10 rounded p-3 mb-4 border border-neon-orange/30">
              <span className="text-xs uppercase tracking-wider">Hint: </span>
              {currentChallenge.hint}
            </div>
          )}
        </div>

        {feedback && (
          <div className={`flex items-center gap-3 p-4 rounded-lg mb-6 ${feedback.success ? 'bg-neon-green/10 border border-neon-green/30' : 'bg-neon-red/10 border border-neon-red/30'}`}>
            {feedback.success ? <CheckCircle className="w-5 h-5 text-neon-green" /> : <Lock className="w-5 h-5 text-neon-red" />}
            <span className={`font-mono ${feedback.success ? 'text-neon-green' : 'text-neon-red'}`}>{feedback.message}</span>
          </div>
        )}

        <div className="cyber-panel p-6">
          <label className="block text-xs text-gray-400 uppercase tracking-wider mb-2 font-mono">
            Decrypted Plaintext
          </label>
          <textarea
            value={guess}
            onChange={(e) => setGuess(e.target.value)}
            className="cyber-input h-24 resize-none"
            placeholder="Enter the decrypted message..."
            disabled={decoding}
          />

          <div className="flex flex-wrap gap-3 mt-4">
            <button onClick={handleDecode} disabled={decoding || !guess} className="cyber-button-primary flex items-center gap-2">
              <Key className="w-4 h-4" />
              {decoding ? 'Decoding...' : 'Decrypt'}
            </button>
            <button onClick={useHint} disabled={showHint} className="cyber-button-success flex items-center gap-2">
              {showHint ? 'Hint Used' : 'Get Hint'}
            </button>
            <button
              type="button"
              onClick={giveUp}
              className="px-4 py-3 rounded-lg border border-neon-red text-neon-red hover:bg-neon-red/10 transition"
            >
              Give Up
            </button>
          </div>

          <div className="mt-6 space-y-2">
            <div className="text-xs text-gray-400 uppercase tracking-wider font-mono">Cipher Reference:</div>
            <div className="bg-cyber-dark/50 rounded p-3 border border-cyber-border text-xs font-mono text-gray-500 space-y-1">
              <div><span className="text-neon-cyan">Caesar:</span> Each letter shifted by fixed amount</div>
              <div><span className="text-neon-cyan">Vigenere:</span> Polyalphabetic cipher using keyword</div>
              <div><span className="text-neon-cyan">Substitution:</span> Each letter maps to different letter</div>
              <div><span className="text-neon-cyan">Reverse:</span> Text written backwards</div>
            </div>
          </div>
        </div>
      </main>
      <HowToPlay open={showHelp} onClose={() => setShowHelp(false)} title="Cipher Decoder">
        <h3 className="text-white">Overview</h3>
        <p>Decode the ciphertext using the indicated cipher type. Common techniques include Caesar shifts, Vigenère keys, substitution, and reversing the text.</p>
        <h4 className="mt-3">Tips</h4>
        <ul>
          <li>For Caesar ciphers, try shifting letters forward/backward; frequency helps for longer text.</li>
          <li>For Vigenère, common short keys are often used in this game — try the shown key hints.</li>
          <li>Use the hint if stuck; it reveals a helpful clue but costs points.</li>
        </ul>
      </HowToPlay>
    </div>
  );
}
