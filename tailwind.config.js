/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        cyber: {
          dark: '#0a0e14',
          darker: '#050709',
          panel: '#0d1117',
          border: '#1f2937',
          grid: '#0f172a',
          terminal: '#0c1018',
        },
        neon: {
          cyan: '#00f0ff',
          cyanDark: '#00a8b3',
          green: '#00ff88',
          greenDark: '#00b35f',
          orange: '#ff8c00',
          orangeDark: '#b35900',
          red: '#ff2a6d',
          redDark: '#b31d4d',
          purple: '#b026ff',
          purpleDark: '#7a1ab3',
        },
        matrix: {
          green: '#00ff41',
          dark: '#003b00',
        },
      },
      fontFamily: {
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
        display: ['Orbitron', 'sans-serif'],
      },
      boxShadow: {
        'neon-cyan': '0 0 10px #00f0ff, 0 0 20px #00f0ff, 0 0 30px #00f0ff',
        'neon-green': '0 0 10px #00ff88, 0 0 20px #00ff88, 0 0 30px #00ff88',
        'neon-red': '0 0 10px #ff2a6d, 0 0 20px #ff2a6d',
        'neon-orange': '0 0 10px #ff8c00, 0 0 20px #ff8c00',
        'panel': '0 0 30px rgba(0, 240, 255, 0.1), inset 0 0 30px rgba(0, 0, 0, 0.5)',
        'terminal': '0 0 60px rgba(0, 240, 255, 0.05), inset 0 1px 0 rgba(255,255,255,0.05)',
      },
      animation: {
        'glow': 'glow 2s ease-in-out infinite alternate',
        'scan': 'scan 4s linear infinite',
        'typing': 'typing 0.5s steps(30, end)',
        'blink': 'blink 1s step-end infinite',
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'matrix': 'matrix 20s linear infinite',
        'glitch': 'glitch 0.3s cubic-bezier(.25, .46, .45, .94) both infinite',
        'scanline': 'scanline 6s linear infinite',
      },
      keyframes: {
        glow: {
          '0%': { boxShadow: '0 0 5px #00f0ff, 0 0 10px #00f0ff, 0 0 15px #00f0ff' },
          '100%': { boxShadow: '0 0 10px #00f0ff, 0 0 20px #00f0ff, 0 0 30px #00f0ff' },
        },
        scan: {
          '0%': { transform: 'translateY(-100%)' },
          '100%': { transform: 'translateY(100%)' },
        },
        typing: {
          'from': { width: '0' },
          'to': { width: '100%' },
        },
        blink: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0' },
        },
        matrix: {
          '0%': { backgroundPosition: '0% 0%' },
          '100%': { backgroundPosition: '0% 100%' },
        },
        glitch: {
          '0%': { transform: 'translate(0)' },
          '20%': { transform: 'translate(-2px, 2px)' },
          '40%': { transform: 'translate(-2px, -2px)' },
          '60%': { transform: 'translate(2px, 2px)' },
          '80%': { transform: 'translate(2px, -2px)' },
          '100%': { transform: 'translate(0)' },
        },
        scanline: {
          '0%': { transform: 'translateY(-100vh)' },
          '100%': { transform: 'translateY(100vh)' },
        },
      },
      backgroundImage: {
        'grid-pattern': 'linear-gradient(rgba(0, 240, 255, 0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(0, 240, 255, 0.03) 1px, transparent 1px)',
        'matrix-pattern': 'linear-gradient(180deg, transparent 0%, rgba(0, 255, 65, 0.02) 50%, transparent 100%)',
      },
    },
  },
  plugins: [],
};
