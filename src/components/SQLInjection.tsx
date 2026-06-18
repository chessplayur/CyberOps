import { useState, useEffect, useCallback } from 'react';
import { Database, ArrowLeft, CheckCircle, XCircle, Terminal, Shield, Lightbulb } from 'lucide-react';
import HowToPlay from './HowToPlay';

interface SQLChallenge {
  id: number;
  prompt: string;
  table: string;
  targetColumn: string;
  secretValue: string;
  validInjection: string[];
  level: number;
}

const CHALLENGES: SQLChallenge[] = [
  {
    id: 1,
    prompt: 'Bypass login. Find the admin password from the "users" table.',
    table: 'users',
    targetColumn: 'password',
    secretValue: 'Sup3rS3cr3t!',
    validInjection: ["' OR '1'='1", "' OR 1=1--", "' OR '1'='1'--", "' OR ''='"],
    level: 1,
  },
  {
    id: 2,
    prompt: 'Extract all credit card numbers from the "payments" table.',
    table: 'payments',
    targetColumn: 'card_number',
    secretValue: '4532-8876-1234-5678',
    validInjection: ["' UNION SELECT card_number FROM payments--", "' UNION SELECT * FROM payments--"],
    level: 2,
  },
  {
    id: 3,
    prompt: 'Find the hidden flag in the "secrets" table using stacked queries.',
    table: 'secrets',
    targetColumn: 'flag',
    secretValue: 'FLAG{SQL_MASTERY}',
    validInjection: ["'; SELECT flag FROM secrets--", "' UNION SELECT flag FROM secrets--"],
    level: 3,
  },
];

function generateChallenges(level: number): SQLChallenge[] {
  const relevant = CHALLENGES.filter((c) => c.level <= level + 1);
  return relevant.slice(0, Math.min(3, relevant.length));
}

interface Props {
  onComplete: (type: string, level: number, score: number, time: number, hints: number) => void;
  onBack: () => void;
  playerLevel: number;
}

export default function SQLInjection({ onComplete, onBack, playerLevel }: Props) {
  const [challenges, setChallenges] = useState<SQLChallenge[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [query, setQuery] = useState('');
  const [score, setScore] = useState(0);
  const [startTime] = useState(Date.now());
  const [hintsUsed, setHintsUsed] = useState(0);
  const [feedback, setFeedback] = useState<{ message: string; success: boolean } | null>(null);
  const [showHelp, setShowHelp] = useState(false);
  const [revealedData, setRevealedData] = useState<string | null>(null);
  const [completed, setCompleted] = useState<number[]>([]);

  useEffect(() => {
    setChallenges(generateChallenges(playerLevel));
  }, [playerLevel]);

  const currentChallenge = challenges[currentIndex];
  const allDone = completed.length === challenges.length && challenges.length > 0;

  const validateInjection = useCallback((injection: string, challenge: SQLChallenge): boolean => {
    const normalizedInjection = injection.toLowerCase().trim();
    return challenge.validInjection.some((valid) => normalizedInjection.includes(valid.toLowerCase().replace("'", '').replace('--', '')));
  }, []);

  const executeQuery = useCallback(() => {
    if (!currentChallenge) return;

    const isSuccess = validateInjection(query, currentChallenge);

    if (isSuccess) {
      const points = 150 * currentChallenge.level;
      setScore((s) => s + points);
      setRevealedData(`EXTRACTED DATA:\n[+] ${currentChallenge.targetColumn}: ${currentChallenge.secretValue}\n[+] Table: ${currentChallenge.table}`);
      setFeedback({ message: `INJECTION SUCCESSFUL! +${points} pts`, success: true });
      setCompleted((c) => [...c, currentIndex]);

      setTimeout(() => {
        if (currentIndex < challenges.length - 1) {
          setCurrentIndex((i) => i + 1);
          setQuery('');
          setRevealedData(null);
          setFeedback(null);
        }
      }, 2000);
    } else {
      const errorMessages = [
        'ERROR: syntax error at or near "',
        'ERROR: column does not exist',
        'ERROR: permission denied for table',
        'ERROR: invalid input syntax for integer',
      ];
      setFeedback({
        message: errorMessages[Math.floor(Math.random() * errorMessages.length)],
        success: false,
      });
    }
  }, [currentChallenge, query, validateInjection, currentIndex, challenges.length]);

  const giveUp = useCallback(() => {
    if (!currentChallenge) return;

    setFeedback({ message: 'GIVE UP — query revealed the secret data below', success: false });
    setRevealedData(`EXTRACTED DATA:\n[+] ${currentChallenge.targetColumn}: ${currentChallenge.secretValue}\n[+] Table: ${currentChallenge.table}`);
    setCompleted((c) => [...c, currentIndex]);

    setTimeout(() => {
      if (currentIndex < challenges.length - 1) {
        setCurrentIndex((i) => i + 1);
        setQuery('');
        setRevealedData(null);
        setFeedback(null);
      }
    }, 2000);
  }, [currentChallenge, currentIndex, challenges.length]);

  const handleComplete = useCallback(() => {
    const elapsed = Math.floor((Date.now() - startTime) / 1000);
    onComplete('sql', playerLevel, score, elapsed, hintsUsed);
  }, [onComplete, playerLevel, score, startTime, hintsUsed]);

  if (challenges.length === 0) {
    return <div className="min-h-screen flex items-center justify-center text-neon-cyan font-mono">Loading...</div>;
  }

  if (allDone) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="scanline-effect" />
        <div className="cyber-panel-glow p-8 text-center max-w-md">
          <CheckCircle className="w-20 h-20 mx-auto text-neon-green mb-6" />
          <h2 className="font-display text-3xl text-neon-green mb-4">DATABASE BREACHED</h2>
          <p className="text-gray-400 font-mono mb-2">All SQL injections successful</p>
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
            <button onClick={() => setShowHelp(true)} className="flex items-center gap-2 text-gray-400 hover:text-neon-cyan transition-colors">
              <Lightbulb className="w-5 h-5" />
              <span className="sr-only">How to play</span>
            </button>
            <span className="text-neon-orange font-mono text-sm">
              {completed.length}/{challenges.length} BREACHED
            </span>
            <span className="text-neon-cyan font-display">{score} PTS</span>
          </div>
        </div>
        <HowToPlay open={showHelp} onClose={() => setShowHelp(false)} title="SQL Injection">
          <h3 className="text-white">Overview</h3>
          <p>These challenges simulate vulnerable SQL queries. Your job is to craft an input that manipulates the query to return secret data.</p>
          <h4 className="mt-3">Safety note</h4>
          <p>Only perform these exercises in this sandbox. Never attempt SQL injection against systems you don't own.</p>
          <h4 className="mt-3">Hints & strategy</h4>
          <ul>
            <li>Common payloads: <code>' OR '1'='1</code>, <code>' UNION SELECT ... --</code></li>
            <li>Start with simple boolean bypasses to bypass authentication challenges.</li>
            <li>For extraction tasks, use UNION SELECT patterns to reveal columns.</li>
          </ul>
        </HowToPlay>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-8">
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <Database className="w-6 h-6 text-neon-orange" />
            <h1 className="font-display text-2xl text-white tracking-wider">SQL INJECTION</h1>
          </div>
          <p className="text-gray-400 font-mono text-sm">
            Exploit vulnerable database queries to extract hidden data
          </p>
        </div>

        <div className="terminal-window mb-6">
          <div className="terminal-header">
            <div className="terminal-dot bg-neon-red" />
            <div className="terminal-dot bg-neon-orange" />
            <div className="terminal-dot bg-neon-green" />
            <span className="ml-4 text-xs text-gray-500 font-mono">sql_terminal@db-server:~$</span>
          </div>
          <div className="terminal-body min-h-[200px]">
            <div className="terminal-text mb-4">
              <span className="text-neon-cyan">[TARGET]</span> Challenge #{currentChallenge.id} - Level {currentChallenge.level}
            </div>
            <div className="text-white mb-4 p-3 bg-cyber-dark/50 rounded border border-cyber-border">
              <span className="text-neon-orange">MISSION:</span> {currentChallenge.prompt}
            </div>
            <div className="text-gray-400 text-sm">
              <div><span className="text-neon-green">Table:</span> {currentChallenge.table}</div>
              <div><span className="text-neon-green">Target:</span> {currentChallenge.targetColumn}</div>
            </div>
          </div>
        </div>

        {feedback && (
          <div className={`flex items-start gap-3 p-4 rounded-lg mb-6 ${feedback.success ? 'bg-neon-green/10 border border-neon-green/30' : 'bg-neon-red/10 border border-neon-red/30'}`}>
            {feedback.success ? <CheckCircle className="w-5 h-5 text-neon-green flex-shrink-0" /> : <XCircle className="w-5 h-5 text-neon-red flex-shrink-0" />}
            <pre className={`font-mono text-sm whitespace-pre-wrap ${feedback.success ? 'text-neon-green' : 'text-neon-red'}`}>
              {feedback.message}
              {revealedData && <div className="mt-2">{revealedData}</div>}
            </pre>
          </div>
        )}

        <div className="cyber-panel p-6">
          <label className="block text-xs text-gray-400 uppercase tracking-wider mb-2 font-mono">
            SQL Query Input
          </label>
          <div className="relative">
            <textarea
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="cyber-input h-24 resize-none font-mono"
              placeholder="SELECT * FROM users WHERE username = '..."
              spellCheck={false}
            />
          </div>

          <div className="flex flex-wrap gap-3 mt-4">
            <button onClick={executeQuery} disabled={!query} className="cyber-button-danger flex items-center gap-2">
              <Terminal className="w-4 h-4" />
              Execute Query
            </button>
            <button
              type="button"
              onClick={giveUp}
              className="px-4 py-3 rounded-lg border border-neon-red text-neon-red hover:bg-neon-red/10 transition"
            >
              Give Up
            </button>
          </div>

          <div className="mt-6 p-4 bg-cyber-dark/50 rounded border border-cyber-border">
            <div className="flex items-center gap-2 mb-2">
              <Shield className="w-4 h-4 text-neon-cyan" />
              <span className="text-xs text-gray-400 uppercase tracking-wider font-mono">Hints</span>
            </div>
            <div className="text-xs text-gray-500 font-mono space-y-1">
              <div>- Try classic injection: <code className="text-neon-green">' OR '1'='1</code></div>
              <div>- UNION attacks can extract additional data</div>
              <div>- Comment out rest of query with <code className="text-neon-green">--</code></div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
