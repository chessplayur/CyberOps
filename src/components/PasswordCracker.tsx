import { useState, useEffect, useCallback } from 'react';
import { Lock, ArrowLeft, Hash, CheckCircle, XCircle, Eye, Zap } from 'lucide-react';
import HowToPlay from './HowToPlay';

// ─── Types ────────────────────────────────────────────────────────────────────

interface PasswordChallenge {
  id: number;
  hash: string;
  hint: string;
  password: string;
  hashType: string;
  difficulty: number;
}

type DifficultyMode = 'easy' | 'medium' | 'hard';

// ─── Constants ────────────────────────────────────────────────────────────────

const DICTIONARY = [
  'password', '123456', 'admin', 'letmein', 'welcome', 'monkey', 'dragon', 'master',
  'qwerty', 'login', 'abc123', 'starwars', 'batman', 'trustno1', 'iloveyou', 'sunshine',
  'princess', 'football', 'baseball', 'soccer', 'hockey', 'michael', 'jennifer', 'jordan',
  'hunting', 'fishing', 'ranger', 'cowboy', 'hunter', 'killer', 'sniper', 'ninja',
];

const EXTRA_PASSWORDS = [
  'sunshine123', 'qazwsx', 'letmein123', 'dragonfire', 'cyberpunk', 'securepass', 'hacker123',
  'middleware', 'bluebird', 'rocketman', 'moonshine', 'keystone', 'vault', 'nightfall', 'winter2024',
  'nebula2025', 'matrixing', 'blackhat', 'firewall47', 'protocol', 'quantum1', 'redteam',
];

const ALL_PASSWORDS = [...DICTIONARY, ...EXTRA_PASSWORDS];

const EASY_BANK_SIZE = 8;
const MEDIUM_BANK_SIZE = 16;

// Cost in points to reveal one more hash character
const REVEAL_COST: Record<DifficultyMode, number> = {
  easy: 10,
  medium: 20,
  hard: 30,
};

// How many characters are shown for free at the start
const START_REVEALED: Record<DifficultyMode, number> = {
  easy: 3,
  medium: 2,
  hard: 1,
};

// Base points awarded for a correct guess (before reveal penalty)
const BASE_POINTS: Record<DifficultyMode, number> = {
  easy: 100,
  medium: 160,
  hard: 250,
};

const HASH_TYPES: Record<string, { name: string; hash: (s: string) => string }> = {
  MD5: {
    name: 'MD5',
    hash: (s: string) => {
      let hash = 0;
      for (let i = 0; i < s.length; i++) {
        const char = s.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash;
      }
      return Math.abs(hash).toString(16).padStart(8, '0');
    },
  },
  SHA256: {
    name: 'SHA-256',
    hash: (s: string) => {
      let hash = 5381;
      for (let i = 0; i < s.length; i++) {
        hash = ((hash << 5) + hash) ^ s.charCodeAt(i);
      }
      return Math.abs(hash).toString(16).padStart(16, '0');
    },
  },
};

const DIFFICULTY_CONFIG: Record<DifficultyMode, { label: string; color: string; description: string }> = {
  easy: {
    label: 'Easy',
    color: 'text-neon-green',
    description: `Word bank of 8 · 3 chars free · reveal more for ${REVEAL_COST.easy} pts each`,
  },
  medium: {
    label: 'Medium',
    color: 'text-neon-orange',
    description: `Word bank of 16 · 2 chars free · reveal more for ${REVEAL_COST.medium} pts each`,
  },
  hard: {
    label: 'Hard',
    color: 'text-neon-red',
    description: `No word bank · 1 char free · reveal more for ${REVEAL_COST.hard} pts each`,
  },
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function calcPoints(
  mode: DifficultyMode,
  difficulty: number,
  revealedChars: number,
  hashLength: number,
  hintUsed: boolean,
): number {
  const base = BASE_POINTS[mode] * Math.max(difficulty, 1);
  // Penalty scales with how much of the hash was revealed before guessing
  const revealFraction = revealedChars / hashLength;
  const revealPenalty = Math.round(base * revealFraction * 0.6);
  const hintPenalty = hintUsed ? 30 : 0;
  return Math.max(base - revealPenalty - hintPenalty, 20);
}

function generateChallenges(playerLevel: number, mode: DifficultyMode): PasswordChallenge[] {
  const numChallenges = Math.min(3 + playerLevel, 5);
  const pool = mode === 'hard' ? EXTRA_PASSWORDS : ALL_PASSWORDS;
  const challenges: PasswordChallenge[] = [];

  for (let i = 0; i < numChallenges; i++) {
    const password = pool[Math.floor(Math.random() * pool.length)];
    const hashType = playerLevel <= 2 ? 'MD5' : 'SHA256';
    const hash = HASH_TYPES[hashType].hash(password);
    challenges.push({
      id: i + 1,
      hash,
      hint: `Password is ${password.length} characters, starts with "${password[0].toUpperCase()}"`,
      password,
      hashType,
      difficulty: playerLevel,
    });
  }

  return challenges;
}

function buildWordBank(challenge: PasswordChallenge, mode: DifficultyMode): string[] {
  if (mode === 'hard') return [];
  const size = mode === 'easy' ? EASY_BANK_SIZE : MEDIUM_BANK_SIZE;
  const others = ALL_PASSWORDS.filter((p) => p !== challenge.password);
  const picked = shuffle(others).slice(0, size - 1);
  return shuffle([...picked, challenge.password]);
}

// ─── Sub-components ───────────────────────────────────────────────────────────

/**
 * Renders the target hash with revealed characters highlighted and hidden ones
 * shown as dots — giving the player a clear visual of what they know so far.
 */
function TargetHashDisplay({
  hash,
  revealedChars,
}: {
  hash: string;
  revealedChars: number;
}) {
  return (
    <div className="flex flex-wrap gap-1 mt-1">
      {hash.split('').map((ch, i) => {
        const visible = i < revealedChars;
        return (
          <span
            key={i}
            className={`
              inline-flex items-center justify-center w-6 h-7 rounded text-xs font-mono transition-all duration-300
              ${visible
                ? 'bg-neon-green/20 text-neon-green border border-neon-green/40'
                : 'bg-cyber-dark/60 text-gray-700 border border-cyber-border/30'}
            `}
          >
            {visible ? ch : '·'}
          </span>
        );
      })}
    </div>
  );
}

/**
 * Renders a single candidate word with per-character hash comparison.
 * Green = match at that position, red = mismatch, dim = not yet revealed.
 * This is the core educational mechanic: players see exactly where hashes
 * diverge, teaching that even one-character password differences produce
 * completely different hashes (the avalanche effect).
 */
function CandidateRow({
  word,
  challenge,
  revealedChars,
  isSelected,
  isDisabled,
  onSelect,
}: {
  word: string;
  challenge: PasswordChallenge;
  revealedChars: number;
  isSelected: boolean;
  isDisabled: boolean;
  onSelect: () => void;
}) {
  const hashFn = HASH_TYPES[challenge.hashType].hash;
  const candidateHash = hashFn(word);
  const isFullMatch = candidateHash === challenge.hash;

  return (
    <button
      onClick={onSelect}
      disabled={isDisabled}
      className={`
        w-full flex items-center gap-3 px-3 py-2 rounded border font-mono text-sm text-left transition-all
        ${isSelected
          ? 'border-neon-cyan bg-neon-cyan/10'
          : 'border-cyber-border bg-cyber-dark/30 hover:border-gray-500 hover:bg-cyber-dark/60'}
        ${isDisabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
      `}
    >
      {/* Word */}
      <span
        className={`min-w-[110px] shrink-0 ${
          isFullMatch && revealedChars === challenge.hash.length
            ? 'text-neon-green'
            : isSelected
            ? 'text-neon-cyan'
            : 'text-gray-300'
        }`}
      >
        {word}
      </span>

      {/* Per-character hash comparison */}
      <div className="flex flex-wrap gap-[2px]">
        {candidateHash.split('').map((ch, i) => {
          if (i >= revealedChars) {
            return (
              <span
                key={i}
                className="inline-flex items-center justify-center w-4 h-5 text-[10px] rounded-sm bg-cyber-dark/40 text-gray-700"
              >
                ·
              </span>
            );
          }
          const matches = ch === challenge.hash[i];
          return (
            <span
              key={i}
              className={`
                inline-flex items-center justify-center w-4 h-5 text-[10px] rounded-sm font-mono
                ${matches
                  ? 'bg-neon-green/20 text-neon-green'
                  : 'bg-neon-red/20 text-neon-red'}
              `}
            >
              {ch}
            </span>
          );
        })}
      </div>
    </button>
  );
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface Props {
  onComplete: (type: string, level: number, score: number, time: number, hints: number) => void;
  onBack: () => void;
  playerLevel: number;
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function PasswordCracker({ onComplete, onBack, playerLevel }: Props) {
  const [mode, setMode] = useState<DifficultyMode | null>(null);
  const [challenges, setChallenges] = useState<PasswordChallenge[]>([]);
  const [wordBank, setWordBank] = useState<string[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [guess, setGuess] = useState('');
  const [score, setScore] = useState(500); // starting budget for reveals
  const [startTime] = useState(Date.now());
  const [hintsUsed, setHintsUsed] = useState(0);
  const [showHint, setShowHint] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [feedback, setFeedback] = useState<{ message: string; success: boolean } | null>(null);
  const [scanning, setScanning] = useState(false);
  const [cracked, setCracked] = useState<number[]>([]);

  // How many hash characters the player has revealed for the current challenge
  const [revealedChars, setRevealedChars] = useState(0);

  // ── Init ───────────────────────────────────────────────────────────────────

  useEffect(() => {
    if (!mode) return;
    const generated = generateChallenges(playerLevel, mode);
    setChallenges(generated);
    setWordBank(buildWordBank(generated[0], mode));
    setRevealedChars(START_REVEALED[mode]);
  }, [mode, playerLevel]);

  useEffect(() => {
    if (!mode || challenges.length === 0) return;
    setWordBank(buildWordBank(challenges[currentIndex], mode));
    setRevealedChars(START_REVEALED[mode]);
  }, [currentIndex, challenges, mode]);

  // ── Derived ────────────────────────────────────────────────────────────────

  const currentChallenge = challenges[currentIndex];
  const allCracked = cracked.length === challenges.length && challenges.length > 0;

  const canReveal =
    mode !== null &&
    currentChallenge !== undefined &&
    revealedChars < currentChallenge.hash.length &&
    score >= REVEAL_COST[mode] &&
    !scanning;

  // ── Actions ────────────────────────────────────────────────────────────────

  const advanceOrFinish = useCallback(() => {
    setTimeout(() => {
      if (currentIndex < challenges.length - 1) {
        setCurrentIndex((i) => i + 1);
        setGuess('');
        setShowHint(false);
        setFeedback(null);
      }
    }, 1400);
  }, [currentIndex, challenges.length]);

  // Reveal one more character of the hash, deducting points.
  const revealNextChar = useCallback(() => {
    if (!canReveal || !mode) return;
    const cost = REVEAL_COST[mode];
    setScore((s) => s - cost);
    setRevealedChars((r) => r + 1);
    setFeedback(null);
  }, [canReveal, mode]);

  const handleCrack = useCallback(() => {
    if (!currentChallenge || scanning || !mode) return;
    setScanning(true);
    setFeedback(null);

    setTimeout(() => {
      if (guess.toLowerCase() === currentChallenge.password.toLowerCase()) {
        const points = calcPoints(mode, currentChallenge.difficulty, revealedChars, currentChallenge.hash.length, showHint);
        setScore((s) => s + points);
        setCracked((c) => [...c, currentIndex]);
        setFeedback({ message: `PASSWORD CRACKED! +${points} pts`, success: true });
        advanceOrFinish();
      } else {
        // Show the diverging hash so the player learns from the mismatch
        const wrongHash = HASH_TYPES[currentChallenge.hashType].hash(guess);
        setFeedback({
          message: `DECRYPTION FAILED — "${guess}" hashes to ${wrongHash.slice(0, revealedChars)}… which diverges from the target`,
          success: false,
        });
      }
      setScanning(false);
    }, 800);
  }, [currentChallenge, guess, scanning, mode, revealedChars, showHint, currentIndex, advanceOrFinish]);

  const useHint = useCallback(() => {
    if (!showHint && currentChallenge) {
      setShowHint(true);
      setHintsUsed((h) => h + 1);
    }
  }, [showHint, currentChallenge]);

  const giveUp = useCallback(() => {
    if (!currentChallenge || scanning) return;
    setFeedback({
      message: `GIVE UP — correct password was "${currentChallenge.password}"`,
      success: false,
    });
    setCracked((c) => [...c, currentIndex]);
    advanceOrFinish();
  }, [currentChallenge, currentIndex, scanning, advanceOrFinish]);

  const dictionaryAttack = useCallback(() => {
    if (!currentChallenge || scanning) return;
    setScanning(true);
    setFeedback(null);
    let index = 0;
    const interval = setInterval(() => {
      if (index >= DICTIONARY.length) {
        clearInterval(interval);
        setScanning(false);
        setFeedback({ message: 'Dictionary attack failed. Password not in wordlist.', success: false });
        return;
      }
      if (DICTIONARY[index].toLowerCase() === currentChallenge.password.toLowerCase()) {
        setGuess(DICTIONARY[index]);
        clearInterval(interval);
        setScanning(false);
      }
      index++;
    }, 50);
  }, [currentChallenge, scanning]);

  const handleComplete = useCallback(() => {
    const elapsed = Math.floor((Date.now() - startTime) / 1000);
    onComplete('password', playerLevel, score, elapsed, hintsUsed);
  }, [onComplete, playerLevel, score, startTime, hintsUsed]);

  // ── Render: difficulty picker ──────────────────────────────────────────────

  if (!mode) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="scanline-effect" />
        <div className="cyber-panel-glow p-8 max-w-md w-full">
          <div className="flex items-center gap-3 mb-2">
            <Lock className="w-6 h-6 text-neon-red" />
            <h1 className="font-display text-2xl text-white tracking-wider">PASSWORD CRACKER</h1>
          </div>
          <p className="text-gray-400 font-mono text-sm mb-8">Select difficulty to begin</p>
          <div className="space-y-3">
            {(['easy', 'medium', 'hard'] as DifficultyMode[]).map((d) => {
              const cfg = DIFFICULTY_CONFIG[d];
              return (
                <button
                  key={d}
                  onClick={() => setMode(d)}
                  className="w-full text-left p-4 rounded-lg border border-cyber-border bg-cyber-dark/40 hover:border-neon-cyan/50 hover:bg-cyber-dark/70 transition-all"
                >
                  <div className={`font-display text-lg tracking-wider mb-1 ${cfg.color}`}>{cfg.label}</div>
                  <div className="text-gray-500 font-mono text-xs">{cfg.description}</div>
                </button>
              );
            })}
          </div>
          <button
            onClick={onBack}
            className="mt-6 flex items-center gap-2 text-gray-500 hover:text-neon-cyan transition-colors font-mono text-sm"
          >
            <ArrowLeft className="w-4 h-4" /> Back
          </button>
        </div>
      </div>
    );
  }

  // ── Render: loading ────────────────────────────────────────────────────────

  if (challenges.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-neon-cyan font-mono animate-pulse">Loading challenge...</div>
      </div>
    );
  }

  // ── Render: all done ───────────────────────────────────────────────────────

  if (allCracked) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="scanline-effect" />
        <div className="cyber-panel-glow p-8 text-center max-w-md">
          <CheckCircle className="w-20 h-20 mx-auto text-neon-green mb-6" />
          <h2 className="font-display text-3xl text-neon-green mb-4">MISSION COMPLETE</h2>
          <div className="space-y-3 mb-8">
            <p className="text-gray-400 font-mono">All passwords cracked</p>
            <p className={`text-sm font-mono ${DIFFICULTY_CONFIG[mode].color}`}>
              {DIFFICULTY_CONFIG[mode].label} mode
            </p>
            <p className="text-neon-cyan text-2xl font-display">{score} Points</p>
          </div>
          <button onClick={handleComplete} className="cyber-button-primary w-full py-4">
            Return to Hub
          </button>
        </div>
      </div>
    );
  }

  // ── Render: main game ──────────────────────────────────────────────────────

  const cfg = DIFFICULTY_CONFIG[mode];
  const revealCost = REVEAL_COST[mode];
  const hashLen = currentChallenge.hash.length;
  const revealProgress = revealedChars / hashLen;

  return (
    <>
      <div className="min-h-screen">
        <div className="scanline-effect" />

        {/* Header */}
        <header className="border-b border-cyber-border bg-cyber-panel/80 backdrop-blur-sm sticky top-0 z-40">
          <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
            <button
              onClick={onBack}
              className="flex items-center gap-2 text-gray-400 hover:text-neon-cyan transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
              <span className="font-mono text-sm">Exit Mission</span>
            </button>
            <div className="flex items-center gap-6">
              <span className={`font-mono text-xs px-2 py-1 rounded border border-current ${cfg.color}`}>
                {cfg.label.toUpperCase()}
              </span>
              <span className="text-neon-red font-mono text-sm">
                {cracked.length}/{challenges.length} CRACKED
              </span>
              <span className="text-neon-orange font-display">{score} PTS</span>
            </div>
          </div>
        </header>

        <main className="max-w-5xl mx-auto px-4 py-8">
          <div className="mb-8">
            <div className="flex items-center gap-3 mb-2">
              <Lock className="w-6 h-6 text-neon-red" />
              <h1 className="font-display text-2xl text-white tracking-wider">PASSWORD CRACKER</h1>
            </div>
            <p className="text-gray-400 font-mono text-sm">
              Spend points to reveal hash characters — guess earlier to earn more
            </p>
          </div>

          {/* Terminal */}
          <div className="terminal-window mb-6">
            <div className="terminal-header">
              <div className="terminal-dot bg-neon-red" />
              <div className="terminal-dot bg-neon-orange" />
              <div className="terminal-dot bg-neon-green" />
              <span className="ml-4 text-xs text-gray-500 font-mono">password_cracker.exe</span>
            </div>
            <div className="terminal-body min-h-[200px]">
              <div className="terminal-text mb-4">
                <span className="text-neon-cyan">[SYSTEM]</span> Challenge #{currentChallenge.id} of{' '}
                {challenges.length}
              </div>
              <div className="space-y-3">
                <div className="text-gray-400">
                  <span className="text-neon-orange">Hash Type:</span> {currentChallenge.hashType}
                </div>

                {/* Target hash with progressive reveal */}
                <div>
                  <div className="flex items-center gap-4 mb-1">
                    <span className="text-neon-orange">Target Hash:</span>
                    <span className="text-gray-500 text-xs font-mono">
                      {revealedChars}/{hashLen} chars visible · {hashLen - revealedChars} hidden
                    </span>
                  </div>
                  <TargetHashDisplay hash={currentChallenge.hash} revealedChars={revealedChars} />
                </div>

                {/* Reveal progress bar */}
                <div className="flex items-center gap-3 mt-2">
                  <span className="text-gray-600 text-xs font-mono">Revealed</span>
                  <div className="flex-1 h-1.5 bg-cyber-dark/80 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-neon-cyan transition-all duration-300 rounded-full"
                      style={{ width: `${revealProgress * 100}%` }}
                    />
                  </div>
                  <span className="text-neon-cyan text-xs font-mono">
                    {Math.round(revealProgress * 100)}%
                  </span>
                </div>

                {showHint && (
                  <div className="text-neon-cyan">
                    <span className="text-neon-orange">Hint:</span> {currentChallenge.hint}
                  </div>
                )}

                {/* Scoring preview */}
                <div className="text-gray-600 text-xs font-mono border-t border-cyber-border/30 pt-2 mt-2">
                  Correct now earns ≈{' '}
                  <span className="text-neon-green">
                    {calcPoints(mode, currentChallenge.difficulty, revealedChars, hashLen, showHint)} pts
                  </span>
                  {' '}— reveals more characters but reduces your reward
                </div>
              </div>
            </div>
          </div>

          {/* Feedback */}
          {feedback && (
            <div
              className={`flex items-start gap-3 p-4 rounded-lg mb-6 ${
                feedback.success
                  ? 'bg-neon-green/10 border border-neon-green/30'
                  : 'bg-neon-red/10 border border-neon-red/30'
              }`}
            >
              {feedback.success ? (
                <CheckCircle className="w-5 h-5 text-neon-green shrink-0 mt-0.5" />
              ) : (
                <XCircle className="w-5 h-5 text-neon-red shrink-0 mt-0.5" />
              )}
              <span className={`font-mono text-sm ${feedback.success ? 'text-neon-green' : 'text-neon-red'}`}>
                {feedback.message}
              </span>
            </div>
          )}

          <div className="cyber-panel p-6">
            {/* Reveal button — the core new mechanic */}
            <div className="mb-6 p-4 rounded-lg border border-cyber-border/50 bg-cyber-dark/30">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <p className="text-neon-cyan font-mono text-sm">Progressive Reveal</p>
                  <p className="text-gray-500 font-mono text-xs mt-0.5">
                    Each reveal costs {revealCost} pts · guess earlier to maximise score
                  </p>
                </div>
                <button
                  onClick={revealNextChar}
                  disabled={!canReveal}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg border font-mono text-sm transition-all ${
                    canReveal
                      ? 'border-neon-cyan text-neon-cyan hover:bg-neon-cyan/10'
                      : 'border-cyber-border text-gray-600 cursor-not-allowed'
                  }`}
                >
                  <Eye className="w-4 h-4" />
                  Reveal ({revealCost} pts)
                </button>
              </div>
              {/* Character slots visualisation */}
              <div className="flex flex-wrap gap-1">
                {currentChallenge.hash.split('').map((_, i) => (
                  <div
                    key={i}
                    className={`w-3 h-1.5 rounded-full transition-all duration-300 ${
                      i < revealedChars ? 'bg-neon-cyan' : 'bg-cyber-dark/60'
                    }`}
                  />
                ))}
              </div>
            </div>

            {/* Word bank — easy & medium only */}
            {wordBank.length > 0 && (
              <div className="mb-6">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-xs text-gray-400 uppercase tracking-wider font-mono">
                    Candidates — compare hash positions, click to select
                  </p>
                  <p className="text-xs text-gray-600 font-mono">
                    <span className="text-neon-green">green</span> = match ·{' '}
                    <span className="text-neon-red">red</span> = mismatch ·{' '}
                    <span className="text-gray-700">dim</span> = hidden
                  </p>
                </div>
                <div className="grid grid-cols-1 gap-2">
                  {wordBank.map((word) => (
                    <CandidateRow
                      key={word}
                      word={word}
                      challenge={currentChallenge}
                      revealedChars={revealedChars}
                      isSelected={guess === word}
                      isDisabled={scanning}
                      onSelect={() => {
                        setGuess(word);
                        setFeedback(null);
                      }}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Guess input */}
            <div className="mb-4">
              <label className="block text-xs text-gray-400 uppercase tracking-wider mb-2 font-mono">
                {mode === 'hard' ? 'Type your guess' : 'Selected / typed password'}
              </label>
              <input
                type="text"
                value={guess}
                onChange={(e) => setGuess(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleCrack()}
                className="cyber-input text-lg"
                placeholder="Enter password..."
                disabled={scanning}
              />
            </div>

            {/* Action buttons */}
            <div className="flex flex-wrap gap-3">
              <button
                onClick={handleCrack}
                disabled={scanning || !guess}
                className="cyber-button-danger flex items-center gap-2"
              >
                <Hash className="w-4 h-4" />
                {scanning ? 'Cracking...' : 'Crack Password'}
              </button>

              {mode === 'medium' && (
                <button
                  onClick={dictionaryAttack}
                  disabled={scanning}
                  className="cyber-button-success flex items-center gap-2"
                >
                  <Zap className="w-4 h-4" />
                  Dictionary Attack
                </button>
              )}

              <button
                onClick={useHint}
                disabled={showHint || scanning}
                className="cyber-button-primary flex items-center gap-2"
              >
                {showHint ? 'Hint Used' : 'Get Hint (−30 pts)'}
              </button>

              <button
                type="button"
                onClick={giveUp}
                disabled={scanning}
                className="px-4 py-3 rounded-lg border border-neon-red text-neon-red hover:bg-neon-red/10 transition"
              >
                Give Up
              </button>
            </div>

            {/* Progress */}
            <div className="mt-4 flex items-center gap-2">
              <span className="text-gray-500 text-xs font-mono">Progress:</span>
              <div className="flex-1 progress-bar">
                <div
                  className="progress-fill"
                  style={{ width: `${(cracked.length / challenges.length) * 100}%` }}
                />
              </div>
              <span className="text-neon-cyan text-xs font-mono">
                {cracked.length}/{challenges.length}
              </span>
            </div>
          </div>
        </main>
      </div>

      {/* How to play */}
      <HowToPlay open={showHelp} onClose={() => setShowHelp(false)} title="Password Cracker">
        <h3 className="text-white">What is happening?</h3>
        <p>
          Each challenge gives you a target hash with most characters hidden. Your job is to figure
          out which password produced it — but revealing more characters costs points.
        </p>

        <h4 className="mt-4 text-neon-cyan">The Progressive Reveal mechanic</h4>
        <p>
          You start with only {START_REVEALED[mode ?? 'easy']} characters visible. Each time you
          click <strong className="text-neon-cyan">Reveal</strong>, one more character appears —
          but it costs {mode ? REVEAL_COST[mode] : '...'} points. The fewer characters you needed
          to reveal, the more points a correct guess earns. This mimics how a real rainbow table
          attack works: you compare partial hashes to narrow candidates until only one matches.
        </p>

        <h4 className="mt-4 text-neon-cyan">Reading the candidate list</h4>
        <ul className="mt-2 space-y-1">
          <li><strong className="text-neon-green">Green cells</strong> — this position matches the target hash.</li>
          <li><strong className="text-neon-red">Red cells</strong> — mismatch at this position.</li>
          <li><strong className="text-gray-600">Dim dots</strong> — not yet revealed, unknown.</li>
        </ul>
        <p className="mt-2">
          The correct password will have all revealed positions showing green. Once you spot that
          candidate, select and submit it without spending more points.
        </p>

        <h4 className="mt-4 text-neon-cyan">What is a hash?</h4>
        <p>
          A hash is a one-way function: the same input always produces the same output, but you
          can't reverse it. Changing even one character in the password produces a completely
          different hash — this is the <strong className="text-neon-orange">avalanche effect</strong>.
          That's why wrong guesses don't just look "close" to the target; they diverge immediately.
        </p>

        <h4 className="mt-4 text-neon-cyan">Scoring</h4>
        <ul className="mt-2 space-y-1">
          <li>Correct guess: base points minus a fraction for each character revealed.</li>
          <li>Hint (−30 pts): reveals the password length and first letter.</li>
          <li>Wrong guess: no point penalty, but you wasted your guess attempt.</li>
          <li>Give Up: reveals the answer — use it to learn, not as a shortcut.</li>
        </ul>

        <h4 className="mt-4 text-neon-cyan">Step-by-step</h4>
        <ol className="mt-2 space-y-2">
          <li><strong>1.</strong> Look at the revealed characters of the target hash.</li>
          <li><strong>2.</strong> Scan the candidate list — find the one where all revealed positions are green.</li>
          <li><strong>3.</strong> If two candidates both look green, reveal one more character to break the tie.</li>
          <li><strong>4.</strong> Select your candidate and hit Crack Password.</li>
          <li><strong>5.</strong> On Medium, try Dictionary Attack first — it may auto-fill the answer for free.</li>
        </ol>
      </HowToPlay>
    </>
  );
}