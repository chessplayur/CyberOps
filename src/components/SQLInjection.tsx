import { useState, useEffect, useCallback, useMemo } from 'react';
import { Database, ArrowLeft, CheckCircle, XCircle, Terminal, Shield, Lightbulb, ChevronRight } from 'lucide-react';
import HowToPlay from './HowToPlay';

// ─── Types ────────────────────────────────────────────────────────────────────

type TechniqueKey = 'boolean' | 'comment' | 'union';

interface SQLChallenge {
  id: number;
  title: string;
  story: string;
  technique: TechniqueKey;
  // The query template shown to the player — {INPUT} marks the injection point
  queryTemplate: string;
  // What columns the DB table has (shown as schema reference)
  tableSchema: { table: string; columns: string[] }[];
  secretValue: string;
  secretLabel: string;
  // Lesson shown before the player attempts
  lesson: {
    concept: string;
    explanation: string;
    example: string;
    exampleAnnotation: string;
  };
  // Validate the raw injection string (what goes into {INPUT})
  validate: (injection: string) => boolean;
  // A worked hint revealed on request
  hint: string;
  // The canonical working injection shown on Give Up
  solution: string;
  level: number;
}

// ─── Challenges ───────────────────────────────────────────────────────────────
// Each challenge teaches exactly one concept and makes the surrounding query
// fully visible so beginners understand what they're manipulating.

const CHALLENGES: SQLChallenge[] = [
  {
    id: 1,
    title: 'Login bypass',
    story: 'The admin panel checks your username and password against a database. You don\'t know the password — but the query has a flaw you can exploit.',
    technique: 'boolean',
    queryTemplate: `SELECT * FROM users\nWHERE username = 'admin'\n  AND password = '{INPUT}';`,
    tableSchema: [{ table: 'users', columns: ['id', 'username', 'password', 'role'] }],
    secretValue: 'Sup3rS3cr3t!',
    secretLabel: 'admin password',
    lesson: {
      concept: 'Boolean injection',
      explanation:
        'SQL treats OR as "either condition is enough". If you append `\' OR \'1\'=\'1` to the password field, the query becomes … AND (password = \'\' OR \'1\'=\'1\'). Since \'1\'=\'1\' is always true, the whole condition is true — and the login succeeds regardless of the real password.',
      example: "' OR '1'='1",
      exampleAnnotation: "The ' closes the string. OR adds a second condition. '1'='1 is always true.",
    },
    validate: (s: string) => {
      const n = s.toLowerCase().replace(/\s+/g, '');
      return n.includes("or'1'='1") || n.includes('or1=1') || n.includes("or''=''") || n.includes('ortrue');
    },
    hint: "Close the string with a single quote, then add OR followed by something always true: ' OR '1'='1",
    solution: "' OR '1'='1",
    level: 1,
  },
  {
    id: 2,
    title: 'Comment out the rest',
    story: 'The login now checks a third condition: the account must be active. You need to comment out that part of the query entirely.',
    technique: 'comment',
    queryTemplate: `SELECT * FROM users\nWHERE username = '{INPUT}'\n  AND password = 'anything'\n  AND active = 1;`,
    tableSchema: [{ table: 'users', columns: ['id', 'username', 'password', 'role', 'active'] }],
    secretValue: 'FLAG{comment_bypass}',
    secretLabel: 'hidden flag',
    lesson: {
      concept: 'SQL comment injection',
      explanation:
        'In SQL, -- (double dash) starts a comment. Everything after it is ignored by the database. If you put -- in the username field, the query stops reading at that point — so the password and active checks never run.',
      example: "admin'--",
      exampleAnnotation: "' closes the username string. -- comments out AND password = ... AND active = 1.",
    },
    validate: (s: string) => {
      const n = s.toLowerCase().replace(/\s+/g, '');
      return (n.includes("admin'--") || n.includes("admin'#") || n.includes("admin'/*")) && n.startsWith('admin');
    },
    hint: "Type the username you want, close its string with ', then add -- to ignore the rest: admin'--",
    solution: "admin'--",
    level: 2,
  },
  {
    id: 3,
    title: 'Extracting data with UNION',
    story: 'You\'re past the login. Now you need to extract credit card numbers from a different table using a search field.',
    technique: 'union',
    queryTemplate: `SELECT id, name, email FROM products\nWHERE name = '{INPUT}';`,
    tableSchema: [
      { table: 'products', columns: ['id', 'name', 'email'] },
      { table: 'payments', columns: ['id', 'card_number', 'email'] },
    ],
    secretValue: '4532-8876-1234-5678',
    secretLabel: 'card number',
    lesson: {
      concept: 'UNION SELECT extraction',
      explanation:
        'UNION lets you bolt a second SELECT onto the first. If the original query returns 3 columns (id, name, email), your UNION SELECT must also return 3 columns. You can fill unused slots with NULL or a placeholder string. The database concatenates both result sets and returns them together.',
      example: "' UNION SELECT id, card_number, email FROM payments--",
      exampleAnnotation: "' ends the search string. UNION SELECT pulls columns from the payments table. -- drops the trailing semicolon.",
    },
    validate: (s: string) => {
      const n = s.toLowerCase().replace(/\s+/g, '');
      return (
        n.includes('union') &&
        n.includes('select') &&
        (n.includes('card_number') || n.includes('*')) &&
        n.includes('payments')
      );
    },
    hint: "Close the search string with ', then UNION SELECT the same number of columns from payments, and end with --",
    solution: "' UNION SELECT id, card_number, email FROM payments--",
    level: 3,
  },
];

function generateChallenges(playerLevel: number): SQLChallenge[] {
  return CHALLENGES.filter((c) => c.level <= Math.max(playerLevel + 1, 1));
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

// Render the query template with the injection highlighted in the terminal
function buildRenderedQuery(template: string, injection: string): { pre: string; inj: string; post: string } {
  const marker = '{INPUT}';
  const idx = template.indexOf(marker);
  if (idx === -1) return { pre: template, inj: '', post: '' };
  return {
    pre: template.slice(0, idx),
    inj: injection || '…',
    post: template.slice(idx + marker.length),
  };
}

const TECHNIQUE_LABELS: Record<TechniqueKey, { label: string; color: string }> = {
  boolean: { label: 'Boolean bypass', color: 'text-neon-green' },
  comment:  { label: 'Comment injection', color: 'text-neon-cyan' },
  union:    { label: 'UNION extraction', color: 'text-neon-orange' },
};

// ─── Sub-components ───────────────────────────────────────────────────────────

/** Shows the full query with the injection point highlighted live as the user types */
function LiveQueryPreview({ template, injection }: { template: string; injection: string }) {
  const { pre, inj, post } = buildRenderedQuery(template, injection);
  return (
    <div className="font-mono text-sm leading-relaxed whitespace-pre bg-cyber-dark/60 rounded-lg p-4 border border-cyber-border/50 overflow-x-auto">
      <span className="text-gray-400">{pre}</span>
      <span className={`${injection ? 'text-neon-orange bg-neon-orange/10 rounded px-0.5' : 'text-gray-600'}`}>
        {inj}
      </span>
      <span className="text-gray-400">{post}</span>
    </div>
  );
}

/** Schema reference sidebar */
function SchemaPanel({ schema }: { schema: { table: string; columns: string[] }[] }) {
  return (
    <div className="bg-cyber-dark/40 rounded-lg border border-cyber-border/40 p-3">
      <p className="text-xs text-gray-500 uppercase tracking-wider font-mono mb-2">DB Schema</p>
      {schema.map((t) => (
        <div key={t.table} className="mb-2 last:mb-0">
          <p className="text-neon-cyan font-mono text-xs mb-1">{t.table}</p>
          <div className="flex flex-wrap gap-1">
            {t.columns.map((col) => (
              <span key={col} className="text-[11px] font-mono bg-cyber-dark/80 text-gray-400 px-1.5 py-0.5 rounded border border-cyber-border/30">
                {col}
              </span>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

/** Lesson card shown before the player attempts each challenge */
function LessonCard({
  lesson,
  technique,
  onDismiss,
}: {
  lesson: SQLChallenge['lesson'];
  technique: TechniqueKey;
  onDismiss: () => void;
}) {
  const tag = TECHNIQUE_LABELS[technique];
  return (
    <div className="cyber-panel p-6 mb-6 border border-neon-cyan/20">
      <div className="flex items-center gap-2 mb-3">
        <Shield className="w-4 h-4 text-neon-cyan" />
        <span className={`font-mono text-xs uppercase tracking-wider ${tag.color}`}>{tag.label}</span>
      </div>
      <h3 className="font-display text-white text-lg mb-2">{lesson.concept}</h3>
      <p className="text-gray-400 font-mono text-sm leading-relaxed mb-4">{lesson.explanation}</p>

      <div className="bg-cyber-dark/60 rounded-lg p-3 border border-cyber-border/50 mb-2">
        <p className="text-xs text-gray-500 font-mono mb-1">Example payload</p>
        <code className="text-neon-green font-mono text-sm">{lesson.example}</code>
      </div>
      <p className="text-xs text-gray-500 font-mono italic mb-4">{lesson.exampleAnnotation}</p>

      <button
        onClick={onDismiss}
        className="flex items-center gap-2 text-neon-cyan font-mono text-sm hover:text-white transition-colors"
      >
        Got it — let me try <ChevronRight className="w-4 h-4" />
      </button>
    </div>
  );
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface Props {
  onComplete: (type: string, level: number, score: number, time: number, hints: number) => void;
  onBack: () => void;
  playerLevel: number;
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function SQLInjection({ onComplete, onBack, playerLevel }: Props) {
  const [challenges, setChallenges] = useState<SQLChallenge[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [injection, setInjection] = useState('');
  const [score, setScore] = useState(0);
  const [startTime] = useState(Date.now());
  const [hintsUsed, setHintsUsed] = useState(0);
  const [showHint, setShowHint] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [showLesson, setShowLesson] = useState(true);
  const [feedback, setFeedback] = useState<{ message: string; success: boolean; detail?: string } | null>(null);
  const [revealedData, setRevealedData] = useState<string | null>(null);
  const [completed, setCompleted] = useState<number[]>([]);

  useEffect(() => {
    setChallenges(generateChallenges(playerLevel));
  }, [playerLevel]);

  // Reset lesson/hint state when moving to next challenge
  useEffect(() => {
    setShowLesson(true);
    setShowHint(false);
    setInjection('');
    setFeedback(null);
    setRevealedData(null);
  }, [currentIndex]);

  const currentChallenge = challenges[currentIndex];
  const allDone = completed.length === challenges.length && challenges.length > 0;

  // Live query preview derived from current injection input
  const liveQuery = useMemo(
    () => (currentChallenge ? buildRenderedQuery(currentChallenge.queryTemplate, injection) : null),
    [currentChallenge, injection],
  );

  // ── Actions ────────────────────────────────────────────────────────────────

  const advance = useCallback(() => {
    setTimeout(() => {
      if (currentIndex < challenges.length - 1) {
        setCurrentIndex((i) => i + 1);
      }
    }, 2000);
  }, [currentIndex, challenges.length]);

  const executeQuery = useCallback(() => {
    if (!currentChallenge || !injection.trim()) return;

    const isSuccess = currentChallenge.validate(injection);

    if (isSuccess) {
      const basePoints = 150 * currentChallenge.level;
      const hintPenalty = showHint ? 40 : 0;
      const points = Math.max(basePoints - hintPenalty, 30);
      setScore((s) => s + points);
      setRevealedData(
        `[+] Injection successful\n[+] ${currentChallenge.secretLabel}: ${currentChallenge.secretValue}\n[+] Table: ${currentChallenge.tableSchema[0].table}`,
      );
      setFeedback({ message: `INJECTION SUCCESSFUL! +${points} pts`, success: true });
      setCompleted((c) => [...c, currentIndex]);
      advance();
    } else {
      // Give a diagnostic hint based on what the player typed, not a random error
      const n = injection.toLowerCase();
      let detail = 'Check your syntax — is the string properly closed with a quote?';
      if (!n.includes("'")) detail = "You need to close the string with a single quote ' first.";
      else if (n.includes('union') && !n.includes('select')) detail = 'UNION needs a SELECT after it: UNION SELECT …';
      else if (n.includes('union select') && !n.includes('payments')) detail = 'Make sure you are selecting FROM the right table.';
      else if (n.includes('or') && !n.includes('=')) detail = 'The OR condition needs an equality check, e.g. OR \'1\'=\'1\'.';
      setFeedback({
        message: 'Query rejected — the injection did not work',
        success: false,
        detail,
      });
    }
  }, [currentChallenge, injection, showHint, currentIndex, advance]);

  const giveUp = useCallback(() => {
    if (!currentChallenge) return;
    setInjection(currentChallenge.solution);
    setRevealedData(
      `[+] Working injection: ${currentChallenge.solution}\n[+] ${currentChallenge.secretLabel}: ${currentChallenge.secretValue}`,
    );
    setFeedback({ message: 'GIVE UP — working injection and extracted data shown below', success: false });
    setCompleted((c) => [...c, currentIndex]);
    advance();
  }, [currentChallenge, currentIndex, advance]);

  const useHint = useCallback(() => {
    if (!showHint) {
      setShowHint(true);
      setHintsUsed((h) => h + 1);
    }
  }, [showHint]);

  const handleComplete = useCallback(() => {
    const elapsed = Math.floor((Date.now() - startTime) / 1000);
    onComplete('sql', playerLevel, score, elapsed, hintsUsed);
  }, [onComplete, playerLevel, score, startTime, hintsUsed]);

  // ── Loading ────────────────────────────────────────────────────────────────

  if (challenges.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center text-neon-cyan font-mono">
        Loading...
      </div>
    );
  }

  // ── Complete ───────────────────────────────────────────────────────────────

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

  // ── Main game ──────────────────────────────────────────────────────────────

  const tag = TECHNIQUE_LABELS[currentChallenge.technique];

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
              <button
                onClick={() => setShowHelp(true)}
                className="flex items-center gap-2 text-gray-400 hover:text-neon-cyan transition-colors"
              >
                <Lightbulb className="w-5 h-5" />
                <span className="sr-only">How to play</span>
              </button>
              <span className="text-neon-orange font-mono text-sm">
                {completed.length}/{challenges.length} BREACHED
              </span>
              <span className="text-neon-cyan font-display">{score} PTS</span>
            </div>
          </div>
        </header>

        <main className="max-w-5xl mx-auto px-4 py-8">
          {/* Title */}
          <div className="mb-8">
            <div className="flex items-center gap-3 mb-2">
              <Database className="w-6 h-6 text-neon-orange" />
              <h1 className="font-display text-2xl text-white tracking-wider">SQL INJECTION</h1>
            </div>
            <p className="text-gray-400 font-mono text-sm">
              Manipulate database queries to extract hidden data
            </p>
          </div>

          {/* Lesson card — shown once per challenge, dismissed by player */}
          {showLesson && (
            <LessonCard
              lesson={currentChallenge.lesson}
              technique={currentChallenge.technique}
              onDismiss={() => setShowLesson(false)}
            />
          )}

          {/* Mission brief */}
          <div className="terminal-window mb-6">
            <div className="terminal-header">
              <div className="terminal-dot bg-neon-red" />
              <div className="terminal-dot bg-neon-orange" />
              <div className="terminal-dot bg-neon-green" />
              <span className="ml-4 text-xs text-gray-500 font-mono">sql_terminal@db-server:~$</span>
            </div>
            <div className="terminal-body">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-neon-cyan text-xs font-mono">[CHALLENGE {currentChallenge.id}/{challenges.length}]</span>
                <span className={`text-xs font-mono px-2 py-0.5 rounded border border-current ${tag.color}`}>
                  {tag.label}
                </span>
              </div>
              <h2 className="font-display text-white text-lg mb-3">{currentChallenge.title}</h2>
              <p className="text-gray-400 font-mono text-sm leading-relaxed mb-4">
                {currentChallenge.story}
              </p>
              <div className="text-neon-orange text-xs font-mono mb-1 uppercase tracking-wider">
                Target: {currentChallenge.secretLabel}
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
              <div>
                <p className={`font-mono text-sm ${feedback.success ? 'text-neon-green' : 'text-neon-red'}`}>
                  {feedback.message}
                </p>
                {!feedback.success && feedback.detail && (
                  <p className="font-mono text-xs text-gray-400 mt-1">
                    <span className="text-neon-orange">Tip: </span>{feedback.detail}
                  </p>
                )}
                {revealedData && (
                  <pre className="font-mono text-xs text-neon-green mt-2 whitespace-pre-wrap">
                    {revealedData}
                  </pre>
                )}
              </div>
            </div>
          )}

          <div className="cyber-panel p-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Left: input + live preview */}
              <div className="lg:col-span-2 space-y-4">
                {/* Live query preview — the key beginner UX addition */}
                <div>
                  <p className="text-xs text-gray-400 uppercase tracking-wider font-mono mb-2">
                    Live query preview — your input appears in{' '}
                    <span className="text-neon-orange">orange</span>
                  </p>
                  <LiveQueryPreview
                    template={currentChallenge.queryTemplate}
                    injection={injection}
                  />
                </div>

                {/* Injection input */}
                <div>
                  <label className="block text-xs text-gray-400 uppercase tracking-wider mb-2 font-mono">
                    Your injection (goes into the highlighted slot)
                  </label>
                  <input
                    type="text"
                    value={injection}
                    onChange={(e) => {
                      setInjection(e.target.value);
                      setFeedback(null);
                    }}
                    onKeyDown={(e) => e.key === 'Enter' && executeQuery()}
                    className="cyber-input font-mono text-sm"
                    placeholder="Type your injection here…"
                    spellCheck={false}
                    autoComplete="off"
                  />
                </div>

                {/* Action buttons */}
                <div className="flex flex-wrap gap-3">
                  <button
                    onClick={executeQuery}
                    disabled={!injection.trim()}
                    className="cyber-button-danger flex items-center gap-2"
                  >
                    <Terminal className="w-4 h-4" />
                    Execute
                  </button>
                  <button
                    onClick={useHint}
                    disabled={showHint}
                    className="cyber-button-primary flex items-center gap-2"
                  >
                    <Lightbulb className="w-4 h-4" />
                    {showHint ? 'Hint shown' : 'Hint (−40 pts)'}
                  </button>
                  <button
                    onClick={() => setShowLesson(true)}
                    className="flex items-center gap-2 px-4 py-3 rounded-lg border border-cyber-border text-gray-400 hover:text-neon-cyan hover:border-neon-cyan/40 transition-all font-mono text-sm"
                  >
                    <Shield className="w-4 h-4" />
                    Re-read lesson
                  </button>
                  <button
                    type="button"
                    onClick={giveUp}
                    className="px-4 py-3 rounded-lg border border-neon-red text-neon-red hover:bg-neon-red/10 transition font-mono text-sm"
                  >
                    Give up
                  </button>
                </div>

                {/* Contextual hint */}
                {showHint && (
                  <div className="p-4 bg-cyber-dark/50 rounded border border-neon-cyan/20">
                    <div className="flex items-center gap-2 mb-2">
                      <Shield className="w-4 h-4 text-neon-cyan" />
                      <span className="text-xs text-gray-400 uppercase tracking-wider font-mono">Hint</span>
                    </div>
                    <p className="text-sm text-gray-300 font-mono leading-relaxed">
                      {currentChallenge.hint}
                    </p>
                  </div>
                )}
              </div>

              {/* Right: schema reference */}
              <div className="space-y-4">
                <SchemaPanel schema={currentChallenge.tableSchema} />

                {/* Progress */}
                <div className="bg-cyber-dark/40 rounded-lg border border-cyber-border/40 p-3">
                  <p className="text-xs text-gray-500 uppercase tracking-wider font-mono mb-2">Progress</p>
                  <div className="space-y-2">
                    {challenges.map((c, i) => (
                      <div key={c.id} className="flex items-center gap-2">
                        <div
                          className={`w-2 h-2 rounded-full ${
                            completed.includes(i)
                              ? 'bg-neon-green'
                              : i === currentIndex
                              ? 'bg-neon-cyan animate-pulse'
                              : 'bg-cyber-border'
                          }`}
                        />
                        <span
                          className={`text-xs font-mono ${
                            completed.includes(i)
                              ? 'text-neon-green'
                              : i === currentIndex
                              ? 'text-neon-cyan'
                              : 'text-gray-600'
                          }`}
                        >
                          {c.title}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>

      {/* How to play */}
      <HowToPlay open={showHelp} onClose={() => setShowHelp(false)} title="SQL Injection">
        <h3 className="text-white">What is SQL injection?</h3>
        <p>
          Web apps build database queries by concatenating strings. If your input goes directly into
          the query without being sanitised, you can change the query's logic entirely — making
          it bypass checks, return extra data, or even destroy tables.
        </p>

        <h4 className="mt-4 text-neon-cyan">The live query preview</h4>
        <p>
          Every challenge shows you the full query the server runs. Your input appears highlighted
          in orange exactly where it lands. This lets you see precisely how your injection reshapes
          the SQL before you execute it.
        </p>

        <h4 className="mt-4 text-neon-cyan">Techniques you'll learn</h4>
        <ul className="mt-2 space-y-2">
          <li>
            <strong className="text-neon-green">Boolean bypass</strong> — add{' '}
            <code>OR '1'='1</code> to make a condition always true, skipping password checks.
          </li>
          <li>
            <strong className="text-neon-cyan">Comment injection</strong> — add{' '}
            <code>--</code> to comment out the rest of the query, dropping unwanted conditions.
          </li>
          <li>
            <strong className="text-neon-orange">UNION extraction</strong> — bolt a second{' '}
            <code>SELECT</code> onto the query to pull data from a different table entirely.
          </li>
        </ul>

        <h4 className="mt-4 text-neon-cyan">Step by step</h4>
        <ol className="mt-2 space-y-2">
          <li><strong>1.</strong> Read the lesson card — it explains the technique and gives an example.</li>
          <li><strong>2.</strong> Look at the live query preview to understand what the database sees.</li>
          <li><strong>3.</strong> Type your injection — watch how it changes the query in real time.</li>
          <li><strong>4.</strong> Hit Execute. If it fails, read the tip — it tells you what to fix.</li>
          <li><strong>5.</strong> Use Hint if stuck, or Re-read lesson to revisit the concept.</li>
        </ol>

        <h4 className="mt-4 text-neon-red">Safety note</h4>
        <p>
          This is a sandbox. Never attempt SQL injection against systems you don't own — it is
          illegal in most jurisdictions.
        </p>
      </HowToPlay>
    </>
  );
}