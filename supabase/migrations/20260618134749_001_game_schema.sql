-- CyberOps Game Schema

-- Players table
CREATE TABLE players (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username TEXT UNIQUE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  total_score INTEGER DEFAULT 0,
  challenges_completed INTEGER DEFAULT 0,
  current_level INTEGER DEFAULT 1
);

ALTER TABLE players ENABLE ROW LEVEL SECURITY;

CREATE POLICY "players_public_read" ON players FOR SELECT
  TO authenticated, anon USING (true);
CREATE POLICY "players_insert" ON players FOR INSERT
  TO authenticated, anon WITH CHECK (true);
CREATE POLICY "players_update" ON players FOR UPDATE
  TO authenticated, anon USING (true) WITH CHECK (true);

-- Challenge results
CREATE TABLE challenge_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id UUID REFERENCES players(id) ON DELETE CASCADE,
  challenge_type TEXT NOT NULL,
  challenge_level INTEGER NOT NULL,
  score INTEGER NOT NULL,
  time_seconds INTEGER NOT NULL,
  completed_at TIMESTAMPTZ DEFAULT NOW(),
  hints_used INTEGER DEFAULT 0
);

ALTER TABLE challenge_results ENABLE ROW LEVEL SECURITY;

CREATE POLICY "results_public_read" ON challenge_results FOR SELECT
  TO authenticated, anon USING (true);
CREATE POLICY "results_insert" ON challenge_results FOR INSERT
  TO authenticated, anon WITH CHECK (true);

-- Leaderboard view
CREATE VIEW leaderboard AS
SELECT 
  p.username,
  p.total_score,
  p.challenges_completed,
  p.current_level,
  RANK() OVER (ORDER BY p.total_score DESC, p.challenges_completed DESC) as rank
FROM players p
ORDER BY p.total_score DESC, p.challenges_completed DESC
LIMIT 100;