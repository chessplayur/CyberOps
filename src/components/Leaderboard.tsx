import { useState, useEffect } from 'react';
import { Trophy, ArrowLeft, Medal, Crown, TrendingUp } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface LeaderboardEntry {
  username: string;
  total_score: number;
  challenges_completed: number;
  current_level: number;
  rank: number;
}

interface Props {
  onClose: () => void;
}

export default function Leaderboard({ onClose }: Props) {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchLeaderboard();
  }, []);

  const fetchLeaderboard = async () => {
    const { data } = await supabase
      .from('leaderboard')
      .select('*')
      .order('total_score', { ascending: false });

    if (data) {
      setEntries(data.map((entry, index) => ({ ...entry, rank: index + 1 })));
    }
    setLoading(false);
  };

  const getRankColor = (rank: number) => {
    if (rank === 1) return 'text-yellow-400';
    if (rank === 2) return 'text-gray-300';
    if (rank === 3) return 'text-orange-400';
    return 'text-gray-500';
  };

  const getRankBg = (rank: number) => {
    if (rank === 1) return 'bg-yellow-400/10 border-yellow-400/30';
    if (rank === 2) return 'bg-gray-300/10 border-gray-300/30';
    if (rank === 3) return 'bg-orange-400/10 border-orange-400/30';
    return 'bg-cyber-panel border-cyber-border';
  };

  return (
    <div className="min-h-screen">
      <div className="scanline-effect" />
      <header className="border-b border-cyber-border bg-cyber-panel/80 backdrop-blur-sm sticky top-0 z-40">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <button onClick={onClose} className="flex items-center gap-2 text-gray-400 hover:text-neon-cyan transition-colors">
            <ArrowLeft className="w-5 h-5" />
            <span className="font-mono text-sm">Back to Hub</span>
          </button>
          <div className="flex items-center gap-2">
            <Trophy className="w-6 h-6 text-neon-orange" />
            <span className="font-display text-lg text-white">LEADERBOARD</span>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8">
        <div className="grid grid-cols-3 gap-4 mb-8">
          {entries.slice(0, 3).map((entry, index) => (
            <div
              key={entry.username}
              className={`cyber-panel p-4 text-center ${getRankBg(index + 1)} border rounded-lg ${index === 0 ? 'order-2 scale-110 z-10' : 'order-1'} ${index === 1 ? 'order-1' : ''} ${index === 2 ? 'order-3' : ''}`}
            >
              <div className="mb-2">
                {index === 0 ? <Crown className="w-8 h-8 mx-auto text-yellow-400" /> : <Medal className={`w-8 h-8 mx-auto ${getRankColor(index + 1)}`} />}
              </div>
              <div className={`font-display text-lg ${getRankColor(index + 1)}`}>
                #{index + 1}
              </div>
              <div className="font-mono text-white text-sm mt-1 truncate">
                {entry.username}
              </div>
              <div className="text-neon-orange font-display mt-2">
                {entry.total_score.toLocaleString()}
              </div>
              <div className="text-xs text-gray-500 mt-1">
                Lvl {entry.current_level} | {entry.challenges_completed} missions
              </div>
            </div>
          ))}
        </div>

        <div className="cyber-panel-glow rounded-lg overflow-hidden">
          <div className="grid grid-cols-5 gap-4 px-6 py-3 bg-cyber-dark/50 border-b border-cyber-border text-xs font-mono text-gray-400 uppercase tracking-wider">
            <div>Rank</div>
            <div className="col-span-2">Operator</div>
            <div className="text-right">Score</div>
            <div className="text-right">Missions</div>
          </div>

          {loading ? (
            <div className="p-8 text-center text-gray-500 font-mono">
              Loading leaderboard...
            </div>
          ) : entries.length === 0 ? (
            <div className="p-8 text-center text-gray-500 font-mono">
              No entries yet. Be the first to complete a challenge!
            </div>
          ) : (
            <div className="divide-y divide-cyber-border">
              {entries.slice(3).map((entry) => (
                <div
                  key={entry.username}
                  className="grid grid-cols-5 gap-4 px-6 py-3 items-center hover:bg-cyber-dark/30 transition-colors"
                >
                  <div className="text-gray-500 font-mono">#{entry.rank}</div>
                  <div className="col-span-2 flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-neon-cyan/20 flex items-center justify-center text-neon-cyan text-xs font-mono">
                      {entry.username.charAt(0).toUpperCase()}
                    </div>
                    <span className="font-mono text-white truncate">{entry.username}</span>
                  </div>
                  <div className="text-right font-mono text-neon-orange">{entry.total_score.toLocaleString()}</div>
                  <div className="text-right font-mono text-gray-400">{entry.challenges_completed}</div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="mt-8 p-4 cyber-panel rounded-lg">
          <div className="flex items-center gap-2 text-neon-cyan mb-2">
            <TrendingUp className="w-5 h-5" />
            <span className="font-mono text-sm">Your Stats</span>
          </div>
          <p className="text-gray-400 text-sm">
            Complete challenges to climb the ranks. Higher difficulty levels award more points.
          </p>
        </div>
      </main>
    </div>
  );
}
