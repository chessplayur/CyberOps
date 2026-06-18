import { useState, useEffect, useCallback } from 'react';
import { Wifi, ArrowLeft, CheckCircle, XCircle, Server, Shield, Activity, Zap, Lightbulb } from 'lucide-react';
import HowToPlay from './HowToPlay';

interface Host {
  ip: string;
  ports: Port[];
  os?: string;
  vuln?: string;
  discovered: boolean;
}

interface Port {
  number: number;
  service: string;
  version: string;
  status: 'open' | 'closed' | 'filtered';
  vulnerable: boolean;
}

interface NetworkChallenge {
  id: number;
  targetName: string;
  network: string;
  hosts: Host[];
  task: string;
  targetIP: string;
  targetVuln: string;
  level: number;
}

const SERVICES: Record<number, { name: string; port: number }> = {
  21: { name: 'FTP', port: 21 },
  22: { name: 'SSH', port: 22 },
  23: { name: 'Telnet', port: 23 },
  25: { name: 'SMTP', port: 25 },
  53: { name: 'DNS', port: 53 },
  80: { name: 'HTTP', port: 80 },
  110: { name: 'POP3', port: 110 },
  143: { name: 'IMAP', port: 143 },
  443: { name: 'HTTPS', port: 443 },
  445: { name: 'SMB', port: 445 },
  3306: { name: 'MySQL', port: 3306 },
  3389: { name: 'RDP', port: 3389 },
  5432: { name: 'PostgreSQL', port: 5432 },
  8080: { name: 'HTTP-Proxy', port: 8080 },
};

function generateNetwork(level: number): NetworkChallenge {
  const hosts: Host[] = [];
  const baseIP = '192.168.1';
  const numHosts = 3 + level;

  const vulns = ['CVE-2021-44228 (Log4Shell)', 'CVE-2019-0708 (BlueKeep)', 'CVE-2021-34527 (PrintNightmare)'];

  const targetIP = `${baseIP}.${Math.floor(Math.random() * 200) + 2}`;
  const targetVuln = vulns[Math.floor(Math.random() * vulns.length)];

  for (let i = 0; i < numHosts; i++) {
    const ip = `${baseIP}.${i + 2}`;
    const numPorts = 3 + Math.floor(Math.random() * 5);
    const ports: Port[] = [];

    const portNumbers = Object.keys(SERVICES).map(Number);
    const shuffled = portNumbers.sort(() => Math.random() - 0.5);

    for (let j = 0; j < numPorts; j++) {
      const portNum = shuffled[j];
      ports.push({
        number: portNum,
        service: SERVICES[portNum].name,
        version: `v${Math.floor(Math.random() * 10)}.${Math.floor(Math.random() * 10)}.0`,
        status: 'open',
        vulnerable: ip === targetIP && (portNum === 80 || portNum === 443),
      });
    }

    hosts.push({
      ip,
      ports,
      os: ['Ubuntu 20.04', 'Windows Server 2019', 'CentOS 7', 'Debian 10'][Math.floor(Math.random() * 4)],
      vuln: ip === targetIP ? targetVuln : undefined,
      discovered: false,
    });
  }

  return {
    id: 1,
    targetName: 'Target Corporation',
    network: `${baseIP}.0/24`,
    hosts,
    task: `Find the vulnerable host and identify the CVE`,
    targetIP,
    targetVuln,
    level,
  };
}

interface Props {
  onComplete: (type: string, level: number, score: number, time: number, hints: number) => void;
  onBack: () => void;
  playerLevel: number;
}

export default function NetworkScanner({ onComplete, onBack, playerLevel }: Props) {
  const [challenge, setChallenge] = useState<NetworkChallenge | null>(null);
  const [selectedHost, setSelectedHost] = useState<Host | null>(null);
  const [scanning, setScanning] = useState(false);
  const [scanLogs, setScanLogs] = useState<string[]>([]);
  const [score, setScore] = useState(0);
  const [startTime] = useState(Date.now());
  const [discoveredHosts, setDiscoveredHosts] = useState<string[]>([]);
  const [foundVuln, setFoundVuln] = useState(false);
  const [guess, setGuess] = useState('');
  const [showHelp, setShowHelp] = useState(false);

  useEffect(() => {
    setChallenge(generateNetwork(playerLevel));
  }, [playerLevel]);

  const addLog = useCallback((msg: string) => {
    setScanLogs((l) => [...l, `[${new Date().toLocaleTimeString()}] ${msg}`]);
  }, []);

  const scanNetwork = useCallback(() => {
    if (!challenge || scanning) return;

    setScanning(true);
    setScanLogs([]);
    addLog('Initializing network scan...');

    let hostIndex = 0;
    const interval = setInterval(() => {
      if (hostIndex >= challenge.hosts.length) {
        clearInterval(interval);
        setScanning(false);
        addLog('Scan complete. ' + discoveredHosts.length + ' hosts discovered.');
        return;
      }

      const host = challenge.hosts[hostIndex];
      host.discovered = true;
      setDiscoveredHosts((h) => [...h, host.ip]);
      addLog(`Host discovered: ${host.ip} (${host.ports.length} open ports)`);

      hostIndex++;
    }, 500);
  }, [challenge, scanning, addLog, discoveredHosts.length]);

  const scanHost = useCallback((host: Host) => {
    if (scanning) return;

    setSelectedHost(host);
    setScanning(true);
    addLog(`Starting detailed scan of ${host.ip}...`);

    setTimeout(() => {
      addLog(`Host: ${host.ip}`);
      addLog(`OS Detection: ${host.os || 'Unknown'}`);
      host.ports.forEach((port) => {
        addLog(`PORT ${port.number}: ${port.service} ${port.version} - ${port.status.toUpperCase()}`);
        if (port.vulnerable) {
          addLog(`[!] VULNERABILITY DETECTED on port ${port.number}`);
        }
      });
      if (host.vuln) {
        addLog(`[!] CRITICAL: ${host.vuln}`);
      }
      addLog('Host scan complete.');
      setScanning(false);
    }, 1000);
  }, [scanning, addLog]);

  const submitAnswer = useCallback(() => {
    if (!challenge) return;

    if (guess.toUpperCase().includes(challenge.targetIP.split('.')[3]) || guess.includes(challenge.targetVuln.split(' ')[0])) {
      const points = 200 * challenge.level;
      setScore((s) => s + points);
      setFoundVuln(true);
      addLog(`CORRECT! Vulnerability found on ${challenge.targetIP}`);
      addLog(`Earned ${points} points`);
    } else {
      addLog('Incorrect. Keep scanning...');
    }
    setGuess('');
  }, [challenge, guess, addLog]);

  const handleComplete = useCallback(() => {
    const elapsed = Math.floor((Date.now() - startTime) / 1000);
    onComplete('network', playerLevel, score, elapsed, 0);
  }, [onComplete, playerLevel, score, startTime]);

  if (!challenge) {
    return <div className="min-h-screen flex items-center justify-center text-neon-cyan font-mono">Loading...</div>;
  }

  if (foundVuln) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="scanline-effect" />
        <div className="cyber-panel-glow p-8 text-center max-w-md">
          <CheckCircle className="w-20 h-20 mx-auto text-neon-green mb-6" />
          <h2 className="font-display text-3xl text-neon-green mb-4">VULNERABILITY FOUND</h2>
          <p className="text-gray-400 font-mono mb-2">Network penetration successful</p>
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
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <button onClick={onBack} className="flex items-center gap-2 text-gray-400 hover:text-neon-cyan transition-colors">
            <ArrowLeft className="w-5 h-5" />
            <span className="font-mono text-sm">Exit Mission</span>
          </button>
          <div className="flex items-center gap-6">
            <button type="button" onClick={() => setShowHelp(true)} className="flex items-center gap-2 text-gray-400 hover:text-neon-cyan transition-colors">
              <Lightbulb className="w-5 h-5" />
              <span className="sr-only">How to play</span>
            </button>
            <span className="text-neon-cyan font-mono text-sm">
              {discoveredHosts.length}/{challenge.hosts.length} HOSTS
            </span>
            <span className="text-neon-orange font-display">{score} PTS</span>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-8">
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <Wifi className="w-6 h-6 text-neon-cyan" />
            <h1 className="font-display text-2xl text-white tracking-wider">NETWORK SCANNER</h1>
          </div>
          <p className="text-gray-400 font-mono text-sm">
            Scan the network, identify hosts, and find vulnerabilities
          </p>
        </div>

        <div className="cyber-panel p-4 mb-6">
          <div className="flex items-center gap-3">
            <Shield className="w-5 h-5 text-neon-orange" />
            <span className="text-neon-orange font-mono text-sm">MISSION:</span>
            <span className="text-white font-mono text-sm">{challenge.task}</span>
          </div>
          <div className="text-gray-500 text-xs font-mono mt-2">
            Network: {challenge.network} | Target: {challenge.targetName}
          </div>
        </div>

        <div className="grid lg:grid-cols-2 gap-6">
          <div>
            <div className="terminal-window">
              <div className="terminal-header">
                <div className="terminal-dot bg-neon-red" />
                <div className="terminal-dot bg-neon-orange" />
                <div className="terminal-dot bg-neon-green" />
                <span className="ml-4 text-xs text-gray-500 font-mono">nmap_terminal</span>
              </div>
              <div className="terminal-body h-64 overflow-auto font-mono text-xs">
                {scanLogs.map((log, i) => (
                  <div key={i} className={log.includes('VULNERABILITY') || log.includes('CRITICAL') ? 'text-neon-red' : log.includes('CORRECT') ? 'text-neon-green' : 'text-matrix-green'}>
                    {log}
                  </div>
                ))}
                {scanLogs.length === 0 && (
                  <div className="text-gray-500">Ready to scan. Click "Scan Network" to begin.</div>
                )}
              </div>
            </div>

            <div className="flex flex-wrap gap-3 mt-4">
              <button onClick={scanNetwork} disabled={scanning} className="cyber-button-primary flex items-center gap-2">
                <Activity className="w-4 h-4" />
                {scanning ? 'Scanning...' : 'Scan Network'}
              </button>
              <button onClick={() => scanHost(challenge.hosts.find((h) => h.ip === selectedHost?.ip) || challenge.hosts[0])} disabled={scanning || discoveredHosts.length === 0} className="cyber-button-success flex items-center gap-2">
                <Zap className="w-4 h-4" />
                Deep Scan Selected
              </button>
            </div>

            <div className="mt-6">
              <label className="block text-xs text-gray-400 uppercase tracking-wider mb-2 font-mono">
                Submit Vulnerability (IP or CVE)
              </label>
              <div className="flex gap-3">
                <input
                  type="text"
                  value={guess}
                  onChange={(e) => setGuess(e.target.value)}
                  className="cyber-input flex-1"
                  placeholder="e.g., 192.168.1.42 or CVE-2021-44228"
                />
                <button onClick={submitAnswer} disabled={!guess} className="cyber-button-danger">
                  Submit
                </button>
              </div>
            </div>
          </div>

          <div>
            <div className="text-xs text-gray-400 uppercase tracking-wider mb-3 font-mono flex items-center gap-2">
              <Server className="w-4 h-4" />
              Discovered Hosts
            </div>
            <div className="space-y-2 max-h-[400px] overflow-auto">
              {challenge.hosts.filter((h) => h.discovered).map((host) => (
                <button
                  key={host.ip}
                  onClick={() => setSelectedHost(host)}
                  className={`w-full text-left p-3 rounded border transition-all ${selectedHost?.ip === host.ip ? 'border-neon-cyan bg-neon-cyan/10' : 'border-cyber-border bg-cyber-dark/50 hover:border-neon-cyan/50'}`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-mono text-neon-cyan">{host.ip}</span>
                    <span className={`text-xs ${host.ports.some((p) => p.vulnerable) ? 'status-danger' : 'status-online'}`}>{host.ports.filter((p) => p.status === 'open').length} ports</span>
                  </div>
                  <div className="text-xs text-gray-500">{host.os}</div>
                  <div className="flex flex-wrap gap-1 mt-2">
                    {host.ports.slice(0, 5).map((port) => (
                      <span key={port.number} className={`px-2 py-0.5 rounded text-[10px] ${port.vulnerable ? 'bg-neon-red/20 text-neon-red' : 'bg-cyber-panel text-gray-400'}`}>
                        {port.number}/{port.service}
                      </span>
                    ))}
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      </main>
      <HowToPlay open={showHelp} onClose={() => setShowHelp(false)} title="Network Scanner">
        <h3 className="text-white">Goal</h3>
        <p>Discover hosts on the simulated network, inspect open ports, and identify which host is vulnerable.</p>
        <h4 className="mt-3">Quick tactics</h4>
        <ul>
          <li>Click <strong>Scan Network</strong> to discover hosts; then run <strong>Deep Scan Selected</strong> to inspect services.</li>
          <li>Look for services commonly vulnerable (HTTP/80, HTTPS/443) flagged by the scanner.</li>
          <li>Use logs to track host OS, open ports, and any CVE names mentioned.</li>
        </ul>
      </HowToPlay>
    </div>
  );
}
