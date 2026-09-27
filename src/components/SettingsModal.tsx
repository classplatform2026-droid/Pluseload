import React, { useState } from 'react';
import { X, ShieldCheck, Sliders, Database, Info, RotateCcw } from 'lucide-react';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  maxConcurrency: number;
  setMaxConcurrency: (c: number) => void;
  defaultTimeout: number;
  setDefaultTimeout: (t: number) => void;
  userAgent: string;
  setUserAgent: (ua: string) => void;
  onResetDefaults: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  maxConcurrency,
  setMaxConcurrency,
  defaultTimeout,
  setDefaultTimeout,
  userAgent,
  setUserAgent,
  onResetDefaults,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="bg-slate-900 border border-slate-800 rounded-xl max-w-md w-full p-5 shadow-2xl space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <Sliders className="w-4 h-4 text-cyan-400" />
            <span className="text-sm font-bold text-white">Engine & Safety Settings</span>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="space-y-4 text-xs">
          {/* Concurrency Ceiling */}
          <div className="space-y-1.5">
            <label className="text-slate-300 font-medium flex items-center justify-between">
              <span>Maximum Allowed Concurrency</span>
              <span className="font-mono text-cyan-400 font-bold">{maxConcurrency} VUs</span>
            </label>
            <input
              type="range"
              min={5}
              max={50}
              value={maxConcurrency}
              onChange={(e) => setMaxConcurrency(parseInt(e.target.value, 10))}
              className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-400"
            />
            <p className="text-[11px] text-slate-400">
              Caps virtual users per test to protect against local network saturation.
            </p>
          </div>

          {/* Default Timeout */}
          <div className="space-y-1.5">
            <label className="text-slate-300 font-medium">Default Request Timeout</label>
            <select
              value={defaultTimeout}
              onChange={(e) => setDefaultTimeout(parseInt(e.target.value, 10))}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-xs font-mono text-slate-200 focus:outline-none"
            >
              <option value={1000}>1,000 ms (1s)</option>
              <option value={3000}>3,000 ms (3s)</option>
              <option value={5000}>5,000 ms (5s default)</option>
              <option value={10000}>10,000 ms (10s)</option>
              <option value={20000}>20,000 ms (20s)</option>
            </select>
          </div>

          {/* Custom User Agent */}
          <div className="space-y-1.5">
            <label className="text-slate-300 font-medium">HTTP User-Agent Identifier</label>
            <input
              type="text"
              value={userAgent}
              onChange={(e) => setUserAgent(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-xs font-mono text-slate-200 focus:outline-none focus:border-cyan-500"
            />
            <p className="text-[11px] text-slate-400">
              Identifies stress test traffic to target server firewalls and observability pipelines.
            </p>
          </div>

          {/* Safety & SSRF Guardrails Notice */}
          <div className="p-3 bg-slate-950 rounded-lg border border-slate-800 space-y-1 text-[11px]">
            <div className="flex items-center gap-1.5 text-emerald-400 font-semibold">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Built-in Safety Protections</span>
            </div>
            <p className="text-slate-400 leading-relaxed">
              • Target URL validation blocks cloud metadata services (169.254.169.254).
              <br />
              • Request timeout enforcement prevents zombie connections.
              <br />
              • Real-time cancellation via AbortController instantly cuts socket connections.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between pt-2 border-t border-slate-800">
          <button
            onClick={onResetDefaults}
            className="flex items-center gap-1 text-slate-400 hover:text-slate-200 text-xs transition-colors"
          >
            <RotateCcw className="w-3 h-3" />
            <span>Reset Defaults</span>
          </button>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs rounded-lg transition-colors cursor-pointer"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
