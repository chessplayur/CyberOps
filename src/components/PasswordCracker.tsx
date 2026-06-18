import { useState, useEffect, useCallback } from 'react';
import { Lock, ArrowLeft, Eye, EyeOff, Hash, CheckCircle, XCircle, Lightbulb, Zap } from 'lucide-react';
import HowToPlay from './HowToPlay';

interface PasswordChallenge {
  id: number;
  hash: string;
  hint: string;
  password: string;
  hashType: string;
  difficulty: number;
}

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

const PASSWORD_POOL = [...DICTIONARY, ...EXTRA_PASSWORDS];

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

function generateChallenges(level: number): PasswordChallenge[] {
  const challenges: PasswordChallenge[] = [];
  const numChallenges = Math.min(3 + level, 5);

  for (let i = 0; i < numChallenges; i++) {
    const useCommon = Math.random() < 0.25;
    const password = useCommon
      ? DICTIONARY[Math.floor(Math.random() * DICTIONARY.length)]
      : EXTRA_PASSWORDS[Math.floor(Math.random() * EXTRA_PASSWORDS.length)];
    const hashType = level <= 2 ? 'MD5' : 'SHA256';
    const hash = HASH_TYPES[hashType].hash(password);

    challenges.push({
      id: i + 1,
      hash,
      hint: `Password is ${password.length} characters, starts with "${password[0].toUpperCase()}"`,
      password,
      hashType,
      difficulty: level,
    });
  }

  return challenges;
}

interface Props {
  onComplete: (type: string, level: number, score: number, time: number, hints: number) => void;
  onBack: () => void;
  playerLevel: number;
}

export default function PasswordCracker({ onComplete, onBack, playerLevel }: Props) {
  const [challenges, setChallenges] = useState<PasswordChallenge[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [guess, setGuess] = useState('');
  const [score, setScore] = useState(0);
  const [startTime] = useState(Date.now());
  const [hintsUsed, setHintsUsed] = useState(0);
  const [showHint, setShowHint] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [feedback, setFeedback] = useState<{ message: string; success: boolean } | null>(null);
  const [scanning, setScanning] = useState(false);
  const [cracked, setCracked] = useState<number[]>([]);

  useEffect(() => {
    setChallenges(generateChallenges(playerLevel));
  }, [playerLevel]);

  const currentChallenge = challenges[currentIndex];
  const allCracked = cracked.length === challenges.length;

  const handleCrack = useCallback(() => {
    if (!currentChallenge || scanning) return;

    setScanning(true);
    setFeedback(null);

    setTimeout(() => {
      if (guess.toLowerCase() === currentChallenge.password.toLowerCase()) {
        const basePoints = 100 * currentChallenge.difficulty;
        const hintPenalty = showHint ? 30 : 0;
        const points = Math.max(basePoints - hintPenalty, 50);

        setScore((s) => s + points);
        setCracked((c) => [...c, currentIndex]);
        setFeedback({ message: `PASSWORD CRACKED! +${points} pts`, success: true });

        setTimeout(() => {
          if (currentIndex < challenges.length - 1) {
            setCurrentIndex((i) => i + 1);
            setGuess('');
            setShowHint(false);
            setFeedback(null);
          }
        }, 1000);
      } else {
        setFeedback({ message: 'DECRYPTION FAILED - Incorrect password', success: false });
      }
      setScanning(false);
    }, 800);
  }, [currentChallenge, guess, scanning, showHint, currentIndex, challenges.length]);

  const useHint = useCallback(() => {
    if (!showHint && currentChallenge) {
      setShowHint(true);
      setHintsUsed((h) => h + 1);
    }
  }, [showHint, currentChallenge]);

  const handleComplete = useCallback(() => {
    const elapsed = Math.floor((Date.now() - startTime) / 1000);
    onComplete('password', playerLevel, score, elapsed, hintsUsed);
  }, [onComplete, playerLevel, score, startTime, hintsUsed]);

  const giveUp = useCallback(() => {
    if (!currentChallenge || scanning) return;

    setScanning(false);
    setFeedback({ message: `GIVE UP — correct password was "${currentChallenge.password}"`, success: false });
    setCracked((c) => [...c, currentIndex]);

    setTimeout(() => {
      if (currentIndex < challenges.length - 1) {
        setCurrentIndex((i) => i + 1);
        setGuess('');
        setShowHint(false);
        setFeedback(null);
      }
    }, 2000);
  }, [currentChallenge, currentIndex, challenges.length, scanning]);

  const dictionaryAttack = useCallback(() => {
    if (!currentChallenge || scanning) return;
    setScanning(true);
    setFeedback(null);

    let index = 0;
    const interval = setInterval(() => {
      if (index >= DICTIONARY.length) {
        clearInterval(interval);
        setScanning(false);
        setFeedback({ message: 'Dictionary attack failed. Password not found in wordlist.', success: false });
        return;
      }

      const tryPassword = DICTIONARY[index];
      if (tryPassword.toLowerCase() === currentChallenge.password.toLowerCase()) {
        setGuess(tryPassword);
        clearInterval(interval);
        setScanning(false);
        return;
      }
      index++;
    }, 50);
  }, [currentChallenge, scanning]);

  if (challenges.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-neon-cyan font-mono animate-pulse">Loading challenge...</div>
      </div>
    );
  }

  if (allCracked) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="scanline-effect" />
        <div className="cyber-panel-glow p-8 text-center max-w-md">
          <CheckCircle className="w-20 h-20 mx-auto text-neon-green mb-6" />
          <h2 className="font-display text-3xl text-neon-green mb-4">MISSION COMPLETE</h2>
          <div className="space-y-3 mb-8">
            <p className="text-gray-400 font-mono">All passwords cracked</p>
            <p className="text-neon-cyan text-2xl font-display">{score} Points</p>
          </div>
          <button onClick={handleComplete} className="cyber-button-primary w-full py-4">
            Return to Hub
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
    <div className="min-h-screen">
      <div className="scanline-effect" />
      <header className="border-b border-cyber-border bg-cyber-panel/80 backdrop-blur-sm sticky top-0 z-40">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
          <button onClick={onBack} className="flex items-center gap-2 text-gray-400 hover:text-neon-cyan transition-colors">
            <ArrowLeft className="w-5 h-5" />
            <span className="font-mono text-sm">Exit Mission</span>
          </button>
          <div className="flex items-center gap-6">
            <button onClick={() => setShowHelp(true)} className="flex items-center gap-2 text-gray-400 hover:text-neon-cyan transition-colors">
              <Lightbulb className="w-5 h-5" />
              <span className="sr-only">How to play</span>
            </button>
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
            Use dictionary attacks and hash analysis to crack the encrypted passwords
          </p>
        </div>

        <div className="terminal-window mb-6">
          <div className="terminal-header">
            <div className="terminal-dot bg-neon-red" />
            <div className="terminal-dot bg-neon-orange" />
            <div className="terminal-dot bg-neon-green" />
            <span className="ml-4 text-xs text-gray-500 font-mono">password_cracker.exe</span>
          </div>
          <div className="terminal-body min-h-[200px]">
            <div className="terminal-text mb-4">
              <span className="text-neon-cyan">[SYSTEM]</span> Challenge #{currentChallenge.id} of {challenges.length}
            </div>
            <div className="space-y-2">
              <div className="text-gray-400">
                <span className="text-neon-orange">Hash Type:</span> {currentChallenge.hashType}
              </div>
              <div className="text-gray-400 flex items-center gap-2">
                <span className="text-neon-orange">Hash:</span>
                <code className="text-neon-green bg-cyber-dark/50 px-2 py-1 rounded text-xs">
                  {currentChallenge.hash}
                </code>
              </div>
              {showHint && currentChallenge.hint && (
                <div className="text-neon-cyan animate-pulse">
                  <span className="text-neon-orange">Hint:</span> {currentChallenge.hint}
                </div>
              )}
            </div>
          </div>
        </div>

        {feedback && (
          <div className={`flex items-center gap-3 p-4 rounded-lg mb-6 ${feedback.success ? 'bg-neon-green/10 border border-neon-green/30' : 'bg-neon-red/10 border border-neon-red/30'}`}>
            {feedback.success ? <CheckCircle className="w-5 h-5 text-neon-green" /> : <XCircle className="w-5 h-5 text-neon-red" />}
            <span className={`font-mono ${feedback.success ? 'text-neon-green' : 'text-neon-red'}`}>
              {feedback.message}
            </span>
          </div>
        )}

        <div className="cyber-panel p-6">
          <div className="mb-4">
            <label className="block text-xs text-gray-400 uppercase tracking-wider mb-2 font-mono">
              Decrypted Password
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

          <div className="flex flex-wrap gap-3">
            <button
              onClick={handleCrack}
              disabled={scanning || !guess}
              className="cyber-button-danger flex items-center gap-2"
            >
              <Hash className="w-4 h-4" />
              {scanning ? 'Cracking...' : 'Crack Password'}
            </button>
            <button
              onClick={dictionaryAttack}
              disabled={scanning}
              className="cyber-button-success flex items-center gap-2"
            >
              <Zap className="w-4 h-4" />
              Dictionary Attack
            </button>
            <button
              onClick={useHint}
              disabled={showHint || scanning}
              className="cyber-button-primary flex items-center gap-2"
            >
              <Lightbulb className="w-4 h-4" />
              {showHint ? 'Hint Used' : 'Get Hint'}
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

          <div className="mt-4 flex items-center gap-2">
            <span className="text-gray-500 text-xs font-mono">Progress:</span>
            <div className="flex-1 progress-bar">
              <div
                className="progress-fill"
                style={{ width: `${(cracked.length / challenges.length) * 100}%` }}
              />
            </div>
            <span className="text-neon-cyan text-xs font-mono">{cracked.length}/{challenges.length}</span>
          </div>
        </div>
      </main>
    </div>
      <HowToPlay open={showHelp} onClose={() => setShowHelp(false)} title="Password Cracker">
        <h3 className="text-white">What is happening?</h3>
        <p>
          Each challenge shows a <strong>hashed password</strong> (a cryptographic fingerprint) and a hash algorithm. Your goal is to find the original password.
        </p>

        <h4 className="mt-4 text-neon-cyan">What is a Hash?</h4>
        <p>
          A hash is a one-way mathematical function. Think of it like a fingerprint—you can't reverse it to get the original person back. 
          The same password always creates the same hash, but different passwords create completely different hashes.
        </p>
        <ul className="mt-2">
          <li><strong>MD5 Hash</strong>: 32 characters (looks like: 5f4dcc3b5aa765d61d8327deb882cf99)</li>
          <li><strong>SHA-256 Hash</strong>: 64 characters (looks like: 5e884898da28047151d0e56f8dc629275...)</li>
        </ul>

        <h4 className="mt-4 text-neon-cyan">Step-by-Step Guide to Cracking</h4>
        <ol className="mt-2 space-y-2">
          <li><strong>Step 1 - Check the Hash Type</strong>: Look at the terminal—it shows "MD5" or "SHA-256". This tells you the algorithm used.</li>
          <li><strong>Step 2 - Use Dictionary Attack (25% Success Rate)</strong>: Click the "Dictionary Attack" button. It tries common passwords automatically. If it finds a match, you win! If not, move to Step 3.</li>
          <li><strong>Step 3 - Use a Hint (Costs 30 points)</strong>: Click "Get Hint" to reveal:
            <ul className="ml-4 mt-1">
              <li>Password length (e.g., "8 characters")</li>
              <li>First letter (e.g., "starts with D")</li>
            </ul>
          </li>
          <li><strong>Step 4 - Guess the Password</strong>: Based on the hint, guess common passwords that match. Type your guess and click "Crack Password".</li>
          <li><strong>Step 5 - If Stuck, Give Up</strong>: Click "Give Up" to reveal the answer (no points awarded, but you learn the password).</li>
        </ol>

        <h4 className="mt-4 text-neon-cyan">Password Patterns to Try</h4>
        <div className="bg-cyber-dark/50 rounded p-3 mt-2 text-sm space-y-1">
          <p><strong>After you get a hint like "8 characters, starts with D":</strong></p>
          <ul className="ml-4 mt-1">
            <li>Common words: dragon, dolphin, diamond, danger, dancer</li>
            <li>Words + numbers: dragon1, dragon2, dragon99, dragon123</li>
            <li>Pop culture: Dragon (from How to Train Your Dragon), Draco (from Harry Potter)</li>
            <li>Seasonal: Dragon2024, Dragon2025</li>
          </ul>
        </div>

        <h4 className="mt-4 text-neon-cyan">Example Challenge Walkthrough</h4>
        <div className="bg-neon-purple/10 rounded p-3 mt-2 text-sm border border-neon-purple/30">
          <p><strong>You see:</strong></p>
          <p className="font-mono mt-1">Hash: 5f4dcc3b5aa765d61d8327deb882cf99</p>
          <p className="font-mono">Type: MD5</p>
          <p className="mt-2"><strong>Your actions:</strong></p>
          <ol className="ml-4 mt-1">
            <li>Click "Dictionary Attack" → Fails (not a common password)</li>
            <li>Click "Get Hint" → "8 characters, starts with P"</li>
            <li>Think: P + 8 chars could be "password" (8 chars), "python99", "princess"</li>
            <li>Type "password" and click "Crack Password"</li>
            <li>Success! You cracked it and earned 100 points!</li>
          </ol>
        </div>

        <h4 className="mt-4 text-neon-cyan">Why This Matters (Real-World Context)</h4>
        <p>
          Cybersecurity experts break into systems by guessing weak passwords. Companies enforce strong password rules 
          (16+ characters, mixed case, numbers, symbols) to prevent this. This mission teaches you how weak passwords can be cracked in seconds.
        </p>

        <h4 className="mt-4 text-neon-cyan">Pro Tips</h4>
        <ul className="mt-2">
          <li>✓ Dictionary Attack is your friend—use it first always</li>
          <li>✓ The Hint is worth -30 points but saves you time and frustration</li>
          <li>✓ Common passwords are still the #1 vulnerability (don't use them in real life!)</li>
          <li>✓ If you give up, you learn the password for future reference</li>
          <li>✓ Try variations: add 1-3 numbers at the end (123, 99, 2024)</li>
        </ul>
      </HowToPlay>
    </>
  );
}
