import React from 'react';

interface Props {
  open: boolean;
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}

export default function HowToPlay({ open, title, onClose, children }: Props) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-auto bg-black/40">
      <div className="fixed inset-0 bg-black/70" onClick={onClose} />
      <div className="min-h-full flex items-center justify-center p-8">
        <div className="relative max-w-3xl w-full max-h-[calc(100vh-4rem)] overflow-auto">
          <div className="cyber-panel-glow p-6 rounded-lg">
            <div className="flex items-start justify-between mb-4 gap-4">
              <h2 className="font-display text-lg text-white">How to play — {title}</h2>
              <button onClick={onClose} className="text-gray-400 hover:text-neon-cyan">Close</button>
            </div>

            <div className="prose prose-invert text-sm text-gray-300">{children}</div>
          </div>
        </div>
      </div>
    </div>
  );
}
