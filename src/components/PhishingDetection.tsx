import { useState, useEffect, useCallback } from 'react';
import { Mail, ArrowLeft, CheckCircle, XCircle, AlertTriangle, ExternalLink, Globe } from 'lucide-react';

interface PhishingIndicator {
  id: string;
  type: 'url' | 'sender' | 'content' | 'urgency' | 'request';
  description: string;
  isSelected: boolean;
}

interface PhishingChallenge {
  id: number;
  type: 'email' | 'website';
  content: {
    sender?: string;
    subject?: string;
    body: string;
    url?: string;
    links?: { text: string; href: string }[];
    indicators: string[];
  };
  isPhishing: boolean;
  explanation: string;
  level: number;
}

const CHALLENGES: PhishingChallenge[] = [
  {
    id: 1,
    type: 'email',
    content: {
      sender: 'support@amaz0n-security.com',
      subject: 'URGENT: Your account will be suspended!',
      body: 'Dear Customer,\n\nWe have detected unusual activity on your account. To prevent suspension, please verify your identity immediately by clicking the link below:\n\n[Verify Now]\n\nFailure to respond within 24 hours will result in permanent account closure.\n\nAmazon Security Team',
      links: [{ text: 'Verify Now', href: 'http://amaz0n-security.com/verify' }],
      indicators: ['amaz0n misspelling', 'urgency', 'suspicious domain', '24 hour deadline'],
    },
    isPhishing: true,
    explanation: 'This is a phishing attempt: The domain "amaz0n-security.com" uses a zero instead of "o", creates false urgency, and threatens account closure.',
    level: 1,
  },
  {
    id: 2,
    type: 'email',
    content: {
      sender: 'no-reply@github.com',
      subject: 'New sign-in to your account',
      body: 'Hi,\n\nWe noticed a new sign-in to your GitHub account from Chrome on Linux.\n\nLocation: San Francisco, CA, USA\nTime: June 15, 2024 at 2:30 PM PDT\n\nIf you made this sign-in, you can ignore this email. If you didn\'t, please secure your account.\n\nThanks,\nThe GitHub Team',
      indicators: ['legitimate domain', 'informative tone', 'no urgency', 'no suspicious links'],
    },
    isPhishing: false,
    explanation: 'This is a legitimate notification: The domain is correct, there is no urgency or threats, and the content is purely informational.',
    level: 1,
  },
  {
    id: 3,
    type: 'email',
    content: {
      sender: 'ceo@yourcompany-corp.net',
      subject: 'Quick favor needed',
      body: 'Hi,\n\nI\'m in a meeting and need you to purchase gift cards urgently for client appreciation. Get 5 x $200 Amazon gift cards and email me the codes.\n\nThis is confidential - don\'t discuss with anyone.\n\nThanks,\nCEO',
      indicators: ['urgency', 'unusual request', 'secrecy demand', 'gift card scam'],
    },
    isPhishing: true,
    explanation: 'CEO fraud/Business Email Compromise: Unusual urgency, request for gift cards, and demand for secrecy are classic red flags.',
    level: 2,
  },
  {
    id: 4,
    type: 'website',
    content: {
      url: 'www.bankofamerica.com.verify-account.xyz/login',
      body: 'Bank of America - Secure Login',
      links: [{ text: 'Login', href: 'http://b0fa-login.xyz/login' }],
      indicators: ['suspicious domain', 'subdomain trickery', 'brand impersonation'],
    },
    isPhishing: true,
    explanation: 'The domain "verify-account.xyz" is not legitimate. The real domain would be "bankofamerica.com" without additional suffixes.',
    level: 2,
  },
  {
    id: 5,
    type: 'email',
    content: {
      sender: 'noreply@accounts.google.com',
      subject: 'Security alert: New device signed in',
      body: 'We noticed a new device signed in to your Google Account.\n\nDevice: iPhone 13\nLocation: New York, NY\nTime: Today at 3:45 PM\n\nIf this was you, you don\'t need to do anything. If not, please review your account activity at myaccount.google.com/notifications.',
      indicators: ['legitimate domain', 'factual information', 'legitimate URLs', 'no threats'],
    },
    isPhishing: false,
    explanation: 'Legitimate Google notification using correct domain, factual tone, and directing to actual Google subdomain.',
    level: 3,
  },
];

interface Props {
  onComplete: (type: string, level: number, score: number, time: number, hints: number) => void;
  onBack: () => void;
  playerLevel: number;
}

export default function PhishingDetection({ onComplete, onBack, playerLevel }: Props) {
  const [challenges, setChallenges] = useState<PhishingChallenge[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [verdict, setVerdict] = useState<'phishing' | 'legitimate' | null>(null);
  const [indications, setIndications] = useState<string[]>([]);
  const [score, setScore] = useState(0);
  const [startTime] = useState(Date.now());
  const [completed, setCompleted] = useState<number[]>([]);
  const [showAnswer, setShowAnswer] = useState(false);

  useEffect(() => {
    const relevant = CHALLENGES.filter((c) => c.level <= playerLevel + 2);
    setChallenges(relevant.slice(0, Math.min(5, relevant.length)));
  }, [playerLevel]);

  const currentChallenge = challenges[currentIndex];
  const allDone = completed.length === challenges.length && challenges.length > 0;

  const submitVerdict = useCallback(() => {
    if (!currentChallenge || verdict === null) return;

    const isCorrect = verdict === 'phishing' ? currentChallenge.isPhishing : !currentChallenge.isPhishing;
    const points = isCorrect ? 100 * currentChallenge.level : 25;

    setScore((s) => s + points);
    setShowAnswer(true);

    setTimeout(() => {
      setCompleted((c) => [...c, currentIndex]);
      if (currentIndex < challenges.length - 1) {
        setCurrentIndex((i) => i + 1);
        setVerdict(null);
        setIndications([]);
        setShowAnswer(false);
      }
    }, 3000);
  }, [currentChallenge, verdict, currentIndex, challenges.length, indications]);

  const handleComplete = useCallback(() => {
    const elapsed = Math.floor((Date.now() - startTime) / 1000);
    onComplete('phishing', playerLevel, score, elapsed, 0);
  }, [onComplete, playerLevel, score, startTime]);

  const toggleIndication = (indicator: string) => {
    setIndications((prev) => (prev.includes(indicator) ? prev.filter((i) => i !== indicator) : [...prev, indicator]));
  };

  if (challenges.length === 0) {
    return <div className="min-h-screen flex items-center justify-center text-neon-cyan font-mono">Loading...</div>;
  }

  if (allDone) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="scanline-effect" />
        <div className="cyber-panel-glow p-8 text-center max-w-md">
          <CheckCircle className="w-20 h-20 mx-auto text-neon-green mb-6" />
          <h2 className="font-display text-3xl text-neon-green mb-4">ANALYSIS COMPLETE</h2>
          <p className="text-gray-400 font-mono mb-2">All threats identified</p>
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
            <span className="text-neon-green font-mono text-sm">
              {completed.length}/{challenges.length} ANALYZED
            </span>
            <span className="text-neon-orange font-display">{score} PTS</span>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-8">
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <Mail className="w-6 h-6 text-neon-green" />
            <h1 className="font-display text-2xl text-white tracking-wider">PHISHING DETECTION</h1>
          </div>
          <p className="text-gray-400 font-mono text-sm">
            Analyze emails and websites to identify phishing attempts
          </p>
        </div>

        <div className="cyber-panel p-6 mb-6">
          <div className="flex items-center gap-3 mb-4">
            {currentChallenge.type === 'email' ? <Mail className="w-5 h-5 text-neon-orange" /> : <Globe className="w-5 h-5 text-neon-orange" />}
            <span className="text-neon-orange font-mono text-sm uppercase tracking-wider">
              {currentChallenge.type === 'email' ? 'Email Analysis' : 'Website Analysis'} - Level {currentChallenge.level}
            </span>
          </div>

          {currentChallenge.type === 'email' && currentChallenge.content.sender && (
            <div className="mb-4">
              <div className="text-xs text-gray-400 mb-1">From:</div>
              <div className="bg-cyber-dark/50 rounded p-2 font-mono text-neon-cyan border border-cyber-border">
                {currentChallenge.content.sender}
              </div>
            </div>
          )}

          {currentChallenge.type === 'email' && currentChallenge.content.subject && (
            <div className="mb-4">
              <div className="text-xs text-gray-400 mb-1">Subject:</div>
              <div className="bg-cyber-dark/50 rounded p-2 font-mono text-white border border-cyber-border">
                {currentChallenge.content.subject}
              </div>
            </div>
          )}

          {currentChallenge.type === 'website' && currentChallenge.content.url && (
            <div className="mb-4">
              <div className="text-xs text-gray-400 mb-1">URL:</div>
              <div className="bg-cyber-dark/50 rounded p-2 font-mono text-neon-red border border-cyber-border break-all">
                {currentChallenge.content.url}
              </div>
            </div>
          )}

          <div className="mb-4">
            <div className="text-xs text-gray-400 mb-1">{currentChallenge.type === 'email' ? 'Message Body:' : 'Page Title:'}</div>
            <div className="bg-cyber-dark/50 rounded p-3 font-mono text-sm text-gray-300 border border-cyber-border whitespace-pre-wrap">
              {currentChallenge.content.body}
            </div>
          </div>

          {currentChallenge.content.links && (
            <div>
              <div className="text-xs text-gray-400 mb-1">Links Found:</div>
              {currentChallenge.content.links.map((link, i) => (
                <div key={i} className="flex items-center gap-2 bg-cyber-dark/50 rounded p-2 mb-1 border border-cyber-border">
                  <ExternalLink className="w-4 h-4 text-neon-orange" />
                  <span className="font-mono text-neon-green">{link.text}</span>
                  <span className="text-gray-500">&rarr;</span>
                  <span className="font-mono text-xs text-neon-red">{link.href}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {showAnswer && (
          <div className={`mb-6 p-4 rounded-lg border ${currentChallenge.isPhishing ? 'bg-neon-red/10 border-neon-red/30' : 'bg-neon-green/10 border-neon-green/30'}`}>
            <div className="flex items-center gap-2 mb-2">
              {currentChallenge.isPhishing ? <AlertTriangle className="w-5 h-5 text-neon-red" /> : <CheckCircle className="w-5 h-5 text-neon-green" />}
              <span className={`font-mono ${currentChallenge.isPhishing ? 'text-neon-red' : 'text-neon-green'}`}>
                {currentChallenge.isPhishing ? 'PHISHING DETECTED' : 'LEGITIMATE'}
              </span>
            </div>
            <p className="text-gray-400 text-sm">{currentChallenge.explanation}</p>
          </div>
        )}

        {!showAnswer && (
          <div className="cyber-panel p-6">
            <div className="text-xs text-gray-400 uppercase tracking-wider mb-4 font-mono">Select Indicators (Optional)</div>
            <div className="flex flex-wrap gap-2 mb-6">
              {['Suspicious URL/Domain', 'Urgency/Pressure', 'Generic Greeting', 'Request for Sensitive Data', 'Spelling Errors', 'Unusual Sender', 'Brand Impersonation', 'Too Good to Be True'].map((indicator) => (
                <button
                  key={indicator}
                  onClick={() => toggleIndication(indicator)}
                  className={`px-3 py-1.5 rounded text-xs font-mono border transition-all ${indications.includes(indicator) ? 'bg-neon-cyan/20 border-neon-cyan text-neon-cyan' : 'bg-cyber-dark border-cyber-border text-gray-400 hover:border-neon-cyan/50'}`}
                >
                  {indicator}
                </button>
              ))}
            </div>

            <div className="flex gap-4">
              <button onClick={() => setVerdict('phishing')} className={`flex-1 py-4 rounded-lg border font-mono font-semibold transition-all ${verdict === 'phishing' ? 'bg-neon-red/20 border-neon-red text-neon-red' : 'border-cyber-border text-gray-400 hover:border-neon-red/50 hover:text-neon-red'}`}>
                <AlertTriangle className="inline w-5 h-5 mr-2" />
                PHISHING
              </button>
              <button onClick={() => setVerdict('legitimate')} className={`flex-1 py-4 rounded-lg border font-mono font-semibold transition-all ${verdict === 'legitimate' ? 'bg-neon-green/20 border-neon-green text-neon-green' : 'border-cyber-border text-gray-400 hover:border-neon-green/50 hover:text-neon-green'}`}>
                <CheckCircle className="inline w-5 h-5 mr-2" />
                LEGITIMATE
              </button>
            </div>

            <button onClick={submitVerdict} disabled={verdict === null} className="cyber-button-primary w-full mt-4 py-3">
              Submit Analysis
            </button>
          </div>
        )}
      </main>
    </div>
  );
}
