import { useEffect, useState } from 'react';
import { Trophy, Target, Zap, Star, Award } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface PlayerResult {
  challenge_type: string;
  max_score: number;
  count: number;
}

interface Player {
  id: string;
  username: string;
  total_score: number;
  challenges_completed: number;
  current_level: number;
}

interface Props {
  player: Player;
}

const CHALLENGE_INFO: Record<string, { name: string; color: string }> = {
  password: { name: 'Password Cracker', color: 'neon-red' },
  sql: { name: 'SQL Injection', color: 'neon-orange' },
  network: { name: 'Network Scanner', color: 'neon-cyan' },
  cipher: { name: 'Cipher Decoder', color: 'neon-purple' },
  phishing: { name: 'Phishing Detection', color: 'neon-green' },
};

export default function PlayerStats({ player }: Props) {
  const [results, setResults] = useState<PlayerResult[]>([]);
  const [rank, setRank] = useState<number | null>(null);

  useEffect(() => {
    fetchStats();
  }, [player.id]);

  const fetchStats = async () => {
    const { data: resultsData } = await supabase
      .from('challenge_results')
      .select('challenge_type, score')
      .eq('player_id', player.id);

    if (resultsData) {
      const grouped = resultsData.reduce((acc, r) => {
        if (!acc[r.challenge_type]) {
          acc[r.challenge_type] = { max_score: 0, count: 0 };
        }
        acc[r.challenge_type].max_score = Math.max(acc[r.challenge_type].max_score, r.score);
        acc[r.challenge_type].count++;
        return acc;
      }, {} as Record<string, { max_score: number; count: number }>);

      setResults(
        Object.entries(grouped).map(([type, data]) => ({
          challenge_type: type,
          max_score: data.max_score,
          count: data.count,
        }))
      );
    }

    const { data: leaderboardData } = await supabase
      .from('leaderboard')
      .select('*')
      .order('total_score', { ascending: false });

    if (leaderboardData) {
      const playerRank = leaderboardData.findIndex((e) => e.username === player.username);
      setRank(playerRank !== -1 ? playerRank + 1 : null);
    }
  };

  const completedTypes = results.length;
  const totalTypes = Object.keys(CHALLENGE_INFO).length;

  return (
    <div className="space-y-4">
      <div className="cyber-panel-glow p-5">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 rounded-lg bg-neon-cyan/20 flex items-center justify-center text-neon-cyan text-xl font-display font-bold">
            {player.username.charAt(0).toUpperCase()}
          </div>
          <div>
            <div className="font-display text-lg text-white">{player.username}</div>
            <div className="text-xs text-gray-500 font-mono">
              Level {player.current_level} Operator
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="bg-cyber-dark/50 rounded-lg p-3 border border-cyber-border">
            <div className="flex items-center gap-2 mb-1">
              <Trophy className="w-4 h-4 text-neon-orange" />
              <span className="text-xs text-gray-400 font-mono">Score</span>
            </div>
            <div className="font-display text-2xl text-neon-orange">
              {player.total_score.toLocaleString()}
            </div>
          </div>
          <div className="bg-cyber-dark/50 rounded-lg p-3 border border-cyber-border">
            <div className="flex items-center gap-2 mb-1">
              <Target className="w-4 h-4 text-neon-cyan" />
              <span className="text-xs text-gray-400 font-mono">Missions</span>
            </div>
            <div className="font-display text-2xl text-neon-cyan">
              {player.challenges_completed}
            </div>
          </div>
        </div>

        {rank && (
          <div className="mt-4 flex items-center gap-2 text-sm">
            <Award className="w-4 h-4 text-neon-green" />
            <span className="text-gray-400 font-mono">Global Rank:</span>
            <span className="text-neon-green font-display">#{rank}</span>
          </div>
        )}
      </div>

      <div className="cyber-panel p-4">
        <div className="flex items-center gap-2 mb-3">
          <Star className="w-4 h-4 text-neon-purple" />
          <span className="text-xs text-gray-400 uppercase tracking-wider font-mono">Progress</span>
        </div>
        <div className="flex items-center gap-2 mb-2">
          <span className="text-white font-mono text-sm">{completedTypes}/{totalTypes} Unlocked</span>
        </div>
        <div className="progress-bar">
          <div
            className="progress-fill"
            style={{ width: `${(completedTypes / totalTypes) * 100}%` }}
          />
        </div>
      </div>

      {results.length > 0 && (
        <div className="cyber-panel p-4">
          <div className="flex items-center gap-2 mb-3">
            <Zap className="w-4 h-4 text-neon-orange" />
            <span className="text-xs text-gray-400 uppercase tracking-wider font-mono">Mission Records</span>
          </div>
          <div className="space-y-2">
            {results.map((result) => {
              const info = CHALLENGE_INFO[result.challenge_type] || { name: result.challenge_type, color: 'neon-cyan' };
              return (
                <div key={result.challenge_type} className="flex items-center justify-between py-1">
                  <span className="text-gray-400 text-xs font-mono">{info.name}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-neon-orange text-xs font-mono">{result.max_score}</span>
                    <span className="text-gray-600 text-[10px] px-1.5 py-0.5 bg-cyber-dark rounded">
                      x{result.count}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
