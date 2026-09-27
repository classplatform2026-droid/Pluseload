import React, { useState } from 'react';
import { X, Copy, Check, Clock, Server, AlertCircle } from 'lucide-react';
import { TestResultLog } from '../types';

interface LogDetailModalProps {
  log: TestResultLog | null;
  onClose: () => void;
}

export const LogDetailModal: React.FC<LogDetailModalProps> = ({ log, onClose }) => {
  const [copied, setCopied] = useState(false);

  if (!log) return null;

  const copyCurl = () => {
    const curl = `curl -X ${log.method} "${log.url}"`;
    navigator.clipboard.writeText(curl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const getStatusBadge = (status: number) => {
    if (status >= 200 && status < 300) {
      return 'bg-emerald-950/80 border-emerald-800 text-emerald-300';
    }
    if (status >= 400 && status < 500) {
      return 'bg-amber-950/80 border-amber-800 text-amber-300';
    }
    return 'bg-rose-950/80 border-rose-800 text-rose-300';
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="bg-slate-900 border border-slate-800 rounded-xl max-w-lg w-full p-5 shadow-2xl space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <span className={`text-xs font-mono font-bold px-2 py-0.5 rounded border ${getStatusBadge(log.status)}`}>
              {log.status || '0'} {log.statusText}
            </span>
            <span className="text-sm font-semibold text-white">Request #{log.id} Details</span>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Core Metadata Grid */}
        <div className="grid grid-cols-2 gap-2 text-xs font-mono">
          <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-800">
            <div className="text-[10px] text-slate-500 font-sans uppercase">Method & URL</div>
            <div className="text-cyan-400 font-bold truncate mt-0.5">
              {log.method} {log.url}
            </div>
          </div>

          <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-800">
            <div className="text-[10px] text-slate-500 font-sans uppercase">Response Duration</div>
            <div className="text-white font-bold mt-0.5 flex items-center gap-1">
              <Clock className="w-3 h-3 text-amber-400" />
              {log.duration} ms
            </div>
          </div>

          <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-800">
            <div className="text-[10px] text-slate-500 font-sans uppercase">Payload Size</div>
            <div className="text-white font-bold mt-0.5">
              {(log.bytes / 1024).toFixed(2)} KB ({log.bytes} bytes)
            </div>
          </div>

          <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-800">
            <div className="text-[10px] text-slate-500 font-sans uppercase">Worker & Timing</div>
            <div className="text-slate-300 mt-0.5">
              VU #{log.workerId + 1} · +{(log.timeOffset / 1000).toFixed(2)}s
            </div>
          </div>
        </div>

        {/* Error Info if any */}
        {log.error && (
          <div className="p-3 bg-rose-950/40 border border-rose-800/80 rounded-lg text-xs space-y-1">
            <div className="flex items-center gap-1.5 text-rose-400 font-semibold">
              <AlertCircle className="w-3.5 h-3.5" />
              <span>Failure Diagnosis</span>
            </div>
            <div className="text-rose-300 font-mono break-all">{log.error}</div>
          </div>
        )}

        {/* Curl Command Box */}
        <div className="space-y-1">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Reproduction cURL:</span>
            <button
              onClick={copyCurl}
              className="flex items-center gap-1 text-[11px] text-cyan-400 hover:text-cyan-300 transition-colors"
            >
              {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
              <span>{copied ? 'Copied!' : 'Copy cURL'}</span>
            </button>
          </div>
          <pre className="p-2.5 bg-slate-950 border border-slate-800 rounded-lg text-[11px] font-mono text-slate-300 overflow-x-auto whitespace-pre-wrap">
            curl -X {log.method} "{log.url}"
          </pre>
        </div>

        {/* Footer */}
        <div className="flex justify-end pt-2">
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-lg transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
