# CyberOps: Interactive Cybersecurity Training Platform

## Project Overview

**CyberOps** is an interactive, gamified cybersecurity training platform designed to teach fundamental offensive security concepts through hands-on challenges. The platform simulates real-world cybersecurity scenarios in a sandbox environment, allowing users to practice attack techniques, develop critical thinking, and build practical hacking skills—all within a competitive, progress-tracked framework.

This project demonstrates how gamification can make security education engaging and accessible to beginners while maintaining technical depth for intermediate learners.

---

## Technical Stack

### Frontend
- **Framework**: React 18 with TypeScript
- **Build Tool**: Vite (next-generation frontend tooling)
- **Styling**: Tailwind CSS with custom cybersecurity theme
- **Icons**: Lucide React
- **State Management**: React Hooks (useState, useCallback, useContext)

### Backend & Database
- **Backend-as-a-Service**: Supabase (PostgreSQL)
- **Authentication**: Supabase Auth (username/password registration)
- **Database Schema**: Three core tables:
  - `players`: User profiles with scores and progress
  - `challenge_results`: Detailed mission attempt records
  - `leaderboard`: Real-time aggregated rankings

### Development
- **Package Manager**: npm
- **Linting**: ESLint
- **CSS Processing**: PostCSS
- **Type Checking**: TypeScript strict mode

### Deployment
- Environment variables stored in `.env` (Git-ignored for security)
- Configured for Vite static hosting (GitHub Pages, Netlify, Vercel)

---

## Feature Set

### Core Gameplay
- **5 Interactive Missions** with progressive difficulty
- **Real-time Scoring System** with points and bonuses
- **Hint System** with scoring penalties
- **Give Up Option** for missions that don't need perfect completion
- **How to Play Modal** on every mission with detailed instructions
- **Progress Tracking** across all missions

### Player Systems
- **Player Registration**: Create account or login (persistent via localStorage)
- **Player Stats Dashboard**: View current level, total score, challenges completed
- **Leaderboard**: Global rankings with top players
- **Level Progression**: Automatic level increase with performance

### Database Integration
- **Persistent Score Storage**: All mission results recorded to Supabase
- **Challenge History**: Detailed logs including time, hints used, and score breakdown
- **Real-time Leaderboard Updates**: Global rankings updated after each mission

---

## Mission Breakdown

### 1. **Password Cracker** (Beginner)
**Objective**: Crack hashed passwords using hash analysis and dictionary attacks.

**Technical Concepts Taught**:
- Hash functions (MD5, SHA-256 simplified implementations)
- Dictionary attacks and their limitations
- Brute force vs. rainbow table attacks
- Password security best practices

**Game Mechanics**:
- 3-5 challenges per session
- Display hash and hash algorithm type
- Player manually guesses password or uses **Dictionary Attack** button
- Dictionary attack tries common passwords; fails if password is not in the wordlist (~75% fail rate)
- **Hint System**: Reveals password length and starting character (costs 30 points)
- **Give Up Button**: Reveals correct password with no points awarded
- Scoring: 100 × difficulty level, minus penalty for hints

**Educational Value**: Players learn that strong passwords cannot be easily guessed even with common wordlists, and understanding hash functions is critical.

#### What is a Hash? (Beginner's Guide)

A **hash** is a one-way mathematical function that converts any input (like a password) into a fixed-length string of characters. Think of it like a fingerprint—you can't reverse the fingerprint to get the original person back, but two identical people would have identical fingerprints.

**Key Properties of Hashes**:
- **One-way**: You cannot reverse a hash to get the original password
- **Deterministic**: The same password always produces the same hash
- **Fast Computation**: Quick to calculate (important for security verification)
- **Avalanche Effect**: Changing even one character in the input completely changes the hash output
- **Fixed Length**: MD5 hashes are always 32 characters, SHA-256 hashes are always 64 characters

**Why Passwords Are Hashed**:
When you create an account, the website doesn't store your actual password. Instead, it stores the hash of your password. When you log in, it hashes what you typed and compares it to the stored hash. This way, even if the database is leaked, attackers don't immediately know your password.

**How to Crack Hashes**:

1. **Dictionary Attack** (Used in Password Cracker)
   - Try common passwords from a pre-made list
   - Hash each password and compare to the target hash
   - If a match is found → Password cracked!
   - Works well for weak/common passwords
   - Fails if password isn't in the dictionary (like "MyComplexPass2024!")

2. **Brute Force Attack** (Not implemented in this game, but real attackers use it)
   - Try every possible character combination
   - Very slow but eventually finds any password
   - Modern computers can try billions per second

3. **Rainbow Tables** (Advanced technique)
   - Pre-computed hashes of billions of passwords
   - Massive storage but extremely fast lookups
   - Why salted hashes exist (adds randomness to prevent rainbow tables)

**Hash Formats Explained**:
- **MD5 Example**: `password` → `5f4dcc3b5aa765d61d8327deb882cf99`
  - 32 characters (hex digits 0-9, a-f)
  - Deprecated for security (too fast to brute force)
  - Still commonly found in legacy systems

- **SHA-256 Example**: `password` → `5e884898da28047151d0e56f8dc62927515d3feb12e37f305ab01431d3375c1e`
  - 64 characters (hex digits)
  - More secure but still vulnerable to dictionary attacks
  - Modern standard for password hashing (though bcrypt/Argon2 are better)

**Strategies for Winning Password Cracker**:
1. **Use the Hint**: Reveals password length and first letter—narrows down possibilities significantly
2. **Try Dictionary Attack First**: ~25% of challenges are common passwords—you might get lucky
3. **Manual Guessing**: Think about common patterns:
   - Common words + numbers (e.g., `Dragon2025`, `Admin123`)
   - l33t speak variations (e.g., `P@ssw0rd`, `L3tm31n`)
   - Seasonal words (e.g., `Winter2024`, `Holiday21`)
   - Pop culture references (e.g., `Batman`, `StarWars`)
4. **Give Up Strategically**: If stuck after hint and attack fail, give up to move to next challenge
5. **Learn from Failures**: Each revealed password teaches you common patterns attackers exploit

**Real-World Context**:
This mission mirrors why companies enforce strong password policies. Weak passwords can be cracked in seconds. Strong passwords (16+ characters, mixed case, numbers, symbols, no dictionary words) are exponentially harder to crack and may take years even with massive computing power.

---

### 2. **SQL Injection** (Intermediate)
**Objective**: Craft malicious SQL queries to extract hidden database data.

**Technical Concepts Taught**:
- SQL injection fundamentals
- Boolean-based SQL injection (`' OR '1'='1`)
- UNION SELECT attacks for data extraction
- Stacked queries and database vulnerabilities
- How improper input sanitization leads to breaches

**Game Mechanics**:
- 3 progressive challenges
- Display vulnerable SQL context (table name, target column, mission prompt)
- Player inputs raw SQL query attempting injection
- Validation checks for common injection patterns
- Success reveals extracted data and points awarded
- **Give Up Button**: Shows correct injection payload
- Scoring: 150 × difficulty level

**Real-World Application**: This mission directly mirrors CVEs in legacy systems still in production. Players understand the criticality of input validation.

---

### 3. **Network Scanner** (Intermediate)
**Objective**: Scan simulated networks, identify hosts, discover vulnerabilities, and find the compromised server.

**Technical Concepts Taught**:
- Network topology and IP addressing (192.168.x.x simulated networks)
- Port scanning and service enumeration
- Common vulnerable services (HTTP/80, HTTPS/443, SSH/22, etc.)
- CVE identification and severity assessment
- Network reconnaissance techniques

**Game Mechanics**:
- Simulated /24 network with 3-8 hosts
- Two-stage scanning process:
  - **Scan Network**: Discovers hosts and open ports
  - **Deep Scan Selected**: Reveals OS, services, versions, and CVE details
- Players manually identify the vulnerable host or CVE
- Real-time terminal log displays attack progress
- **Give Up Button**: Reveals target IP and CVE
- Scoring: 200 × difficulty level

**Challenges Include**:
- CVE-2021-44228 (Log4Shell)
- CVE-2019-0708 (BlueKeep)
- CVE-2021-34527 (PrintNightmare)

---

### 4. **Cipher Decoder** (Advanced)
**Objective**: Decrypt classical ciphers using cryptographic analysis.

**Technical Concepts Taught**:
- Caesar cipher and shift analysis
- Vigenère cipher and polyalphabetic substitution
- Substitution ciphers and frequency analysis
- Classical cryptography vs. modern encryption
- Why modern encryption is fundamentally more secure

**Game Mechanics**:
- 3-5 challenges with 4 cipher types
- Display ciphertext and cipher type
- Player guesses plaintext or uses **Get Hint**
- Hints reveal cipher key/shift amount (costs 40 points)
- **Give Up Button**: Shows plaintext
- Scoring: 120 × difficulty level, minus hint penalty
- Real-time feedback with success/failure animation

**Cipher Types**:
- **Caesar**: Simple shift cipher (ROT-N)
- **Vigenère**: Keyword-based polyalphabetic cipher
- **Substitution**: Fixed letter mapping (e.g., QWERTY keyboard)
- **Reverse**: Text written backwards

---

### 5. **Phishing Detection** (Beginner)
**Objective**: Analyze emails and websites to identify phishing attempts and social engineering tactics.

**Technical Concepts Taught**:
- Domain spoofing and typosquatting
- Email header analysis
- URL inspection and brand impersonation
- Urgency and psychological manipulation tactics
- CEO fraud and business email compromise (BEC)
- Link analysis and suspicious indicators

**Game Mechanics**:
- 5 progressively complex email/website challenges
- Display sender, subject, body, links, and indicators
- Player selects **PHISHING** or **LEGITIMATE** verdict
- Optional: Select red-flag indicators (optional UI annotation)
- Immediate feedback with explanation
- **Give Up Button**: Shows correct answer
- Scoring: 100 × difficulty level for correct guesses
- 25 points for incorrect guesses (learning reward)

**Real-World Scenarios**:
- Misspelled domain: `amaz0n-security.com` (zero instead of 'o')
- CEO fraud: Urgent requests for gift cards with secrecy demands
- Legitimate notifications: Proper grammar, legitimate domains, informational tone
- Brand impersonation: Fake Bank of America login pages
- LinkedIn/GitHub compromise: Legitimate service notifications

---

## Extra Features

### Leaderboard System
- **Global Rankings**: Real-time sorted list of top players
- **Sort Metrics**: Total score, challenges completed, current level
- **Refresh Rate**: Updates after each mission completion
- **Display**: Top 10 players with rank, username, score, challenges

**Implementation**: Aggregated from Supabase with real-time updates via triggers.

### Player Progress Tracking
- **Player Dashboard**: 
  - Current username and ID
  - Total score accumulated
  - Number of challenges completed
  - Current player level (auto-increments with performance)
  - Visual progress bar

- **Per-Mission Metrics**:
  - Time taken (in seconds)
  - Points earned
  - Hints used (tracked separately)
  - Difficulty level

- **Session Persistence**: Player data stored in localStorage for fast load, backed up to Supabase for permanence

### UI/UX Enhancements
- **Cyberpunk Aesthetic**: Dark theme with neon cyan, green, orange, purple, and red accents
- **Terminal Aesthetics**: Monospace fonts, scanline effects, glowing borders
- **Responsive Design**: Works on mobile and desktop (Tailwind responsive grid)
- **Sticky Headers**: Mission information always visible
- **Animations**: Smooth transitions, feedback animations for success/failure
- **Modal System**: Help modals on every mission with keyboard-friendly closures

### How to Play Modals
Every mission includes an interactive **How to Play** modal with:
- **Overview**: What the mission teaches
- **Objectives**: What players need to accomplish
- **Tips & Tactics**: Practical guidance and shortcuts
- **Examples**: Step-by-step walkthroughs or example payloads
- **Scoring Breakdown**: How points are calculated

---

## Data Schema

### Players Table
```sql
id          UUID PRIMARY KEY
username    VARCHAR UNIQUE NOT NULL
total_score INTEGER DEFAULT 0
challenges_completed INTEGER DEFAULT 0
current_level INTEGER DEFAULT 1
created_at TIMESTAMP DEFAULT NOW()
```

### Challenge Results Table
```sql
id                UUID PRIMARY KEY
player_id         UUID FOREIGN KEY (players.id)
challenge_type    VARCHAR (password|sql|network|cipher|phishing)
challenge_level   INTEGER
score             INTEGER
time_seconds      INTEGER
hints_used        INTEGER
completed_at      TIMESTAMP DEFAULT NOW()
```

### Leaderboard View
```sql
-- Real-time aggregation
SELECT 
  p.id, p.username, p.total_score, p.challenges_completed,
  RANK() OVER (ORDER BY p.total_score DESC) AS rank
FROM players p
ORDER BY rank
LIMIT 10;
```

---

## Game Balance & Difficulty Progression

### Difficulty Scaling
- **Beginner (Level 1-2)**: Password Cracker, Phishing Detection
- **Intermediate (Level 3-4)**: SQL Injection, Network Scanner
- **Advanced (Level 5+)**: Cipher Decoder with advanced cipher types

### Scoring System
- **Base Points**: 100-200 × difficulty level per mission
- **Hint Penalty**: -30 to -40 points per hint
- **Time Bonus**: None (encourages learning over speed)
- **Give Up**: No points, but mission marked complete (educational value)

### Challenge Generation
- **Randomized Challenges**: No two attempts are identical
- **Progressive Passwords**: 25% common dictionary, 75% non-dictionary
- **Network Topology**: Random host counts, ports, OS, and CVEs
- **Cipher Varieties**: Random cipher type per challenge
- **Phishing Variations**: Realistic email and website scenarios

---

## Security Considerations

### For the Player
- **Sandbox Environment**: All challenges are simulated; no real attacks
- **Legal Compliance**: Teaches attack techniques only in controlled educational context
- **Responsible Disclosure**: Missions emphasize why attacks matter and how to defend

### For the Platform
- **Supabase Security**:
  - Row-level security (RLS) on player data
  - Environment variables for API keys (`.env` file)
  - No sensitive data in localStorage (only player ID and username)
  - Passwords hashed server-side if custom auth used

- **OWASP Compliance**:
  - No SQL injection in backend queries (parameterized)
  - Input validation on all mission checks
  - CSRF protection via Supabase
  - XSS prevention with React's built-in escaping

---

## Installation & Running Locally

### Prerequisites
```bash
Node.js 16+ and npm 8+
Supabase account with project created
```

### Setup
```bash
# Clone repository
git clone https://github.com/yourusername/cyberops.git
cd cyberops

# Install dependencies
npm install

# Create .env file
echo "VITE_SUPABASE_URL=your_supabase_url" > .env
echo "VITE_SUPABASE_ANON_KEY=your_supabase_anon_key" >> .env

# Run database migration (in Supabase SQL Editor)
# Copy contents of supabase/migrations/20260618134749_001_game_schema.sql and execute

# Start development server
npm run dev

# Open http://localhost:5173
```

### Building for Production
```bash
npm run build
npm run preview
```

---

## Future Enhancements

- **Achievements/Badges**: Virtual badges for milestone completions
- **Two-Factor Authentication**: Optional 2FA for security-conscious players
- **Teams/Clans**: Multiplayer leaderboards and team challenges
- **Advanced Missions**: Wireless cracking, reverse engineering, privilege escalation
- **Custom Challenge Creator**: Allow educators to build custom missions
- **Mobile App**: React Native version for iOS/Android
- **Offline Mode**: Download challenges for offline practice
- **AI Coaching**: Smart hints based on player performance

---

## Educational Impact

**CyberOps** addresses critical gaps in cybersecurity education:
1. **Hands-On Learning**: Theory + practice, not just lectures
2. **Immediate Feedback**: Learn through iteration and mistakes
3. **Gamification**: Intrinsic motivation through competition and progression
4. **Accessibility**: No setup required—play in browser
5. **Real-World Relevance**: Teach actual attack techniques used by threat actors

Ideal for:
- University cybersecurity courses
- Corporate security training programs
- CTF (Capture The Flag) competitions
- Self-paced learning for security enthusiasts

---

## Conclusion

**CyberOps** demonstrates that cybersecurity education doesn't have to be intimidating or dull. By combining real technical challenges with engaging game mechanics, intuitive UI, and persistent progress tracking, we create a platform where learners are motivated to develop practical offensive security skills. This project showcases modern web development (React/Vite), backend integration (Supabase), database design, and educational psychology—all in service of teaching cybersecurity responsibly.

**Total Features**: 5 missions, real-time leaderboards, persistent player stats, adaptive difficulty, 40+ individual challenges per session, and responsive design across all devices.

---

## Team & Attribution
Developed as a cybersecurity training platform for the modern era during the 2026 Cipherhacks Competetion. 
