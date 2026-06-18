import { useState, useEffect, useCallback } from 'react';
import { supabase } from './lib/supabase';
import { Shield, Terminal, Lock, Database, Wifi, Mail, Trophy, ChevronRight, Skull, Zap } from 'lucide-react';
import PasswordCracker from './components/PasswordCracker';
import SQLInjection from './components/SQLInjection';
import NetworkScanner from './components/NetworkScanner';
import CipherChallenge from './components/CipherChallenge';
import PhishingDetection from './components/PhishingDetection';
import Leaderboard from './components/Leaderboard';
import PlayerStats from './components/PlayerStats';

type ChallengeType = 'password' | 'sql' | 'network' | 'cipher' | 'phishing' | null;
type GameView = 'intro' | 'register' | 'hub' | 'challenge' | 'leaderboard';

interface Player {
  id: string;
  username: string;
  total_score: number;
  challenges_completed: number;
  current_level: number;
}

const challenges = [
  {
    id: 'password' as ChallengeType,
    name: 'Password Cracker',
    description: 'Break weak passwords using dictionary attacks and pattern analysis',
    icon: Lock,
    color: 'neon-red',
    difficulty: 'Beginner',
    skills: ['Password Security', 'Hash Recognition'],
  },
  {
    id: 'sql' as ChallengeType,
    name: 'SQL Injection',
    description: 'Exploit vulnerable databases to extract hidden data',
    icon: Database,
    color: 'neon-orange',
    difficulty: 'Intermediate',
    skills: ['SQL Injection', 'Database Security'],
  },
  {
    id: 'network' as ChallengeType,
    name: 'Network Scanner',
    description: 'Scan networks, identify open ports, and analyze vulnerabilities',
    icon: Wifi,
    color: 'neon-cyan',
    difficulty: 'Intermediate',
    skills: ['Network Analysis', 'Port Scanning'],
  },
  {
    id: 'cipher' as ChallengeType,
    name: 'Cipher Decoder',
    description: 'Decrypt encoded messages using classical cryptography',
    icon: Shield,
    color: 'neon-purple',
    difficulty: 'Advanced',
    skills: ['Cryptography', 'Pattern Recognition'],
  },
  {
    id: 'phishing' as ChallengeType,
    name: 'Phishing Detection',
    description: 'Identify and analyze malicious emails and fake websites',
    icon: Mail,
    color: 'neon-green',
    difficulty: 'Beginner',
    skills: ['Social Engineering', 'Email Security'],
  },
];

function App() {
  const [view, setView] = useState<GameView>('intro');
  const [player, setPlayer] = useState<Player | null>(null);
  const [activeChallenge, setActiveChallenge] = useState<ChallengeType>(null);
  const [showLeaderboard, setShowLeaderboard] = useState(false);

  useEffect(() => {
    const savedPlayer = localStorage.getItem('cyberops_player');
    if (savedPlayer) {
      setPlayer(JSON.parse(savedPlayer));
      setView('hub');
    }
  }, []);

  const registerPlayer = useCallback(async (username: string) => {
    try {
      const trimmed = username.trim();
      const { data, error } = await supabase
        .from('players')
        .insert({ username: trimmed })
        .select()
        .single();

      if (error) {
        // If unique constraint, try to fetch existing user and treat as login
        // Supabase error may include `code` or `status` — surface message when possible
        console.warn('Supabase insert error', error);
        if ((error as any).code === '23505' || (error as any).status === 409) {
          const { data: existing, error: fetchErr } = await supabase
            .from('players')
            .select('*')
            .eq('username', trimmed)
            .single();
          if (fetchErr) {
            console.warn('Failed to fetch existing player after conflict', fetchErr);
            return { success: false, message: fetchErr.message || 'Registration conflict but failed to retrieve existing player.' };
          }
          if (existing) {
            setPlayer(existing);
            localStorage.setItem('cyberops_player', JSON.stringify(existing));
            setView('hub');
            return { success: true };
          }
        }

        return { success: false, message: error.message || 'Registration failed' };
      }

      if (data) {
        setPlayer(data);
        localStorage.setItem('cyberops_player', JSON.stringify(data));
        setView('hub');
        return { success: true };
      }

      return { success: false, message: 'No response from server.' };
    } catch (err: any) {
      console.error('Unexpected error during registerPlayer', err);
      return { success: false, message: err?.message || String(err) };
    }
  }, []);

  const handleChallengeComplete = useCallback(async (
    challengeType: string,
    level: number,
    score: number,
    timeSeconds: number,
    hintsUsed: number
  ) => {
    if (!player) return;

    await supabase.from('challenge_results').insert({
      player_id: player.id,
      challenge_type: challengeType,
      challenge_level: level,
      score,
      time_seconds: timeSeconds,
      hints_used: hintsUsed,
    });

    const { data: updated } = await supabase
      .from('players')
      .update({
        total_score: player.total_score + score,
        challenges_completed: player.challenges_completed + 1,
      })
      .eq('id', player.id)
      .select()
      .single();

    if (updated) {
      setPlayer(updated);
      localStorage.setItem('cyberops_player', JSON.stringify(updated));
    }

    setActiveChallenge(null);
    setView('hub');
  }, [player]);

  if (view === 'intro') {
    return <IntroScreen onStart={() => setView('register')} onLeaderboard={() => setShowLeaderboard(true)} />;
  }

  if (view === 'register') {
    return <RegisterScreen onRegister={registerPlayer} />;
  }

  if (showLeaderboard) {
    return <Leaderboard onClose={() => setShowLeaderboard(false)} />;
  }

  if (view === 'challenge' && activeChallenge) {
    const ChallengeComponent = {
      password: PasswordCracker,
      sql: SQLInjection,
      network: NetworkScanner,
      cipher: CipherChallenge,
      phishing: PhishingDetection,
    }[activeChallenge];

    return (
      <ChallengeComponent
        onComplete={handleChallengeComplete}
        onBack={() => {
          setActiveChallenge(null);
          setView('hub');
        }}
        playerLevel={player?.current_level || 1}
      />
    );
  }

  return (
    <div className="min-h-screen">
      <div className="scanline-effect" />
      <Header player={player} onLeaderboard={() => setShowLeaderboard(true)} />

      <main className="max-w-7xl mx-auto px-4 py-8">
        <div className="grid lg:grid-cols-4 gap-6">
          <div className="lg:col-span-1">
            {player && <PlayerStats player={player} />}
          </div>

          <div className="lg:col-span-3">
            <div className="cyber-panel-glow p-6 mb-6">
              <div className="flex items-center gap-3 mb-4">
                <Terminal className="w-6 h-6 text-neon-cyan" />
                <h2 className="cyber-title text-2xl">Mission Control</h2>
              </div>
              <p className="text-gray-400 font-mono text-sm mb-6">
                Select a mission to begin your cybersecurity training. Each challenge
                tests different aspects of security expertise.
              </p>

              <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
                {challenges.map((challenge) => {
                  const Icon = challenge.icon;
                  const colorClass = `text-${challenge.color}` as const;
                  const bgClass = `bg-${challenge.color}/10` as const;
                  const borderClass = `border-${challenge.color}/30` as const;

                  return (
                    <button
                      key={challenge.id}
                      onClick={() => {
                        setActiveChallenge(challenge.id);
                        setView('challenge');
                      }}
                      className={`${bgClass} ${borderClass} border rounded-lg p-5 text-left transition-all duration-300 hover:scale-[1.02] group`}
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div className={`p-2 rounded-lg ${bgClass}`}>
                          <Icon className={`w-6 h-6 ${colorClass}`} />
                        </div>
                        <span className="text-xs text-gray-500 uppercase tracking-wider">
                          {challenge.difficulty}
                        </span>
                      </div>

                      <h3 className="font-display text-white text-lg mb-2 group-hover:text-neon-cyan transition-colors">
                        {challenge.name}
                      </h3>
                      <p className="text-gray-500 text-xs mb-3 line-clamp-2">
                        {challenge.description}
                      </p>

                      <div className="flex flex-wrap gap-1">
                        {challenge.skills.map((skill) => (
                          <span
                            key={skill}
                            className="px-2 py-0.5 bg-cyber-dark/50 rounded text-[10px] text-gray-400"
                          >
                            {skill}
                          </span>
                        ))}
                      </div>

                      <div className="mt-4 flex items-center gap-2 text-neon-cyan text-sm opacity-0 group-hover:opacity-100 transition-opacity">
                        <span className="font-mono">Start Mission</span>
                        <ChevronRight className="w-4 h-4" />
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

function IntroScreen({ onStart, onLeaderboard }: { onStart: () => void; onLeaderboard: () => void }) {
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    setTimeout(() => setLoaded(true), 100);
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden">
      <div className="scanline-effect" />

      <div className="absolute inset-0 hex-pattern opacity-30" />

      <div className="absolute top-1/4 left-1/2 -translate-x-1/2">
        <div className="relative">
          <Skull className="w-32 h-32 text-neon-cyan opacity-20 animate-pulse-slow" />
        </div>
      </div>

      <div className={`text-center z-10 transition-all duration-1000 ${loaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
        <div className="mb-8">
          <Shield className="w-20 h-20 mx-auto text-neon-cyan animate-glow" />
        </div>

        <h1 className="font-display text-6xl md:text-8xl font-bold tracking-wider mb-4">
          <span className="text-neon-cyan">CYBER</span>
          <span className="text-white">OPS</span>
        </h1>

        <p className="font-mono text-gray-400 text-lg mb-2 tracking-wide">
          SECURITY TRAINING SIMULATION
        </p>

        <p className="font-mono text-neon-green text-sm mb-12 typing-cursor">
          Initializing systems...
        </p>

        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <button onClick={onStart} className="cyber-button-primary px-12 py-4 text-lg">
            <Zap className="inline w-5 h-5 mr-2" />
            Enter System
          </button>
          <button onClick={onLeaderboard} className="cyber-button-success px-12 py-4 text-lg">
            <Trophy className="inline w-5 h-5 mr-2" />
            Leaderboard
          </button>
        </div>

        <div className="mt-16 grid grid-cols-3 gap-8 max-w-xl mx-auto text-center">
          <div>
            <div className="font-display text-3xl text-neon-cyan">5</div>
            <div className="text-xs text-gray-500 uppercase tracking-wider mt-1">Missions</div>
          </div>
          <div>
            <div className="font-display text-3xl text-neon-green">15+</div>
            <div className="text-xs text-gray-500 uppercase tracking-wider mt-1">Levels</div>
          </div>
          <div>
            <div className="font-display text-3xl text-neon-orange">SEC</div>
            <div className="text-xs text-gray-500 uppercase tracking-wider mt-1">Training</div>
          </div>
        </div>
      </div>

      <div className="absolute bottom-8 left-0 right-0 text-center">
        <p className="font-mono text-[10px] text-gray-600 uppercase tracking-widest">
          System Ready // Awaiting Operator
        </p>
      </div>
    </div>
  );
}

function RegisterScreen({ onRegister }: { onRegister: (username: string) => Promise<{ success: boolean; message?: string }> }) {
  const [username, setUsername] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    if (username.trim()) {
      setLoading(true);
      try {
        const result = await onRegister(username);
        if (!result.success) {
          setLoading(false);
          setErrorMsg(result.message || 'Registration failed. Please try a different callsign.');
        }
      } catch (err: any) {
        setLoading(false);
        setErrorMsg(err?.message || 'Registration failed. Please try again.');
      }
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="scanline-effect" />
      <div className="cyber-panel-glow p-8 w-full max-w-md">
        <div className="text-center mb-8">
          <Terminal className="w-12 h-12 mx-auto text-neon-cyan mb-4" />
          <h1 className="font-display text-3xl text-white tracking-wider mb-2">
            OPERATOR LOGIN
          </h1>
          <p className="text-gray-400 text-sm font-mono">
            Enter your callsign to begin
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-xs text-gray-400 uppercase tracking-wider mb-2 font-mono">
              Callsign
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="cyber-input text-lg"
              placeholder="Enter username..."
              maxLength={20}
              autoFocus
            />
          </div>

          <button
            type="submit"
            disabled={!username.trim() || loading}
            className="cyber-button-primary w-full py-4 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <span className="animate-spin">/</span>
                Connecting...
              </span>
            ) : (
              'Initialize Profile'
            )}
          </button>
        </form>

        {errorMsg && (
          <div className="mt-4 text-center text-sm text-red-400 font-mono">
            {errorMsg}
          </div>
        )}

        <p className="mt-6 text-center text-xs text-gray-500 font-mono">
          Your progress will be saved automatically
        </p>
      </div>
    </div>
  );
}

function Header({ player, onLeaderboard }: { player: Player | null; onLeaderboard: () => void }) {
  return (
    <header className="border-b border-cyber-border bg-cyber-panel/80 backdrop-blur-sm sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Shield className="w-8 h-8 text-neon-cyan" />
          <h1 className="font-display text-xl tracking-wider">
            <span className="text-neon-cyan">CYBER</span>
            <span className="text-white">OPS</span>
          </h1>
        </div>

        <div className="flex items-center gap-6">
          {player && (
            <div className="hidden sm:flex items-center gap-6 text-sm font-mono">
              <div className="flex items-center gap-2">
                <Trophy className="w-4 h-4 text-neon-orange" />
                <span className="text-neon-orange">{player.total_score.toLocaleString()}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-gray-500">Level</span>
                <span className="text-neon-cyan">{player.current_level}</span>
              </div>
            </div>
          )}

          <button
            onClick={onLeaderboard}
            className="flex items-center gap-2 text-sm text-gray-400 hover:text-neon-cyan transition-colors font-mono"
          >
            <Trophy className="w-4 h-4" />
            <span className="hidden md:inline">Leaderboard</span>
          </button>
        </div>
      </div>
    </header>
  );
}

export default App;
