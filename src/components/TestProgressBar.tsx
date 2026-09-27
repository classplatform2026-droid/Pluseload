import React from 'react';
import { Play, Square, CheckCircle2, AlertOctagon, Clock, Users, Download, FileText } from 'lucide-react';
import { LoadTestSnapshot } from '../types';

interface TestProgressBarProps {
  snapshot: LoadTestSnapshot | null;
  isRunning: boolean;
  onStop: () => void;
  onExportJson: () => void;
  onExportCsv: () => void;
  onOpenPdfReport?: () => void;
}

export const TestProgressBar: React.FC<TestProgressBarProps> = ({
  snapshot,
  isRunning,
  onStop,
  onExportJson,
  onExportCsv,
  onOpenPdfReport,
}) => {
  if (!snapshot && !isRunning) {
    return (
      <div className="bg-slate-900/40 border border-slate-800/80 rounded-xl px-4 py-3 flex items-center justify-between text-xs text-slate-400">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-slate-600"></div>
          <span>Engine Idle. Configure parameters above and click <strong>Launch Test</strong>.</span>
        </div>
        <span className="font-mono text-[11px] text-slate-400">Safety Guardrails: Active</span>
      </div>
    );
  }

  const elapsedSec = snapshot ? Math.floor(snapshot.elapsedMs / 1000) : 0;
  const targetDuration = snapshot?.config.durationSeconds || 10;
  const progressPercent = snapshot?.config.totalRequests
    ? Math.min(100, Math.round(((snapshot.totalCompleted || 0) / snapshot.config.totalRequests) * 100))
    : Math.min(100, Math.round((elapsedSec / targetDuration) * 100));

  const formatTime = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 shadow-xl space-y-3">
      {/* Status Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-3">
          {isRunning ? (
            <div className="flex items-center gap-2 text-emerald-400 text-xs font-semibold">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
              </span>
              <span>TEST IN PROGRESS</span>
            </div>
          ) : snapshot?.status === 'completed' ? (
            <div className="flex items-center gap-1.5 text-emerald-400 text-xs font-semibold">
              <CheckCircle2 className="w-4 h-4" />
              <span>TEST COMPLETED</span>
            </div>
          ) : snapshot?.status === 'stopped' ? (
            <div className="flex items-center gap-1.5 text-amber-400 text-xs font-semibold">
              <AlertOctagon className="w-4 h-4" />
              <span>TEST STOPPED BY USER</span>
            </div>
          ) : snapshot?.status === 'failed' ? (
            <div className="flex items-center gap-1.5 text-rose-400 text-xs font-semibold">
              <AlertOctagon className="w-4 h-4" />
              <span>TEST FAILED: {snapshot.errorMessage}</span>
            </div>
          ) : null}

          {/* Active stats badge */}
          <div className="hidden sm:flex items-center gap-3 text-xs text-slate-400 font-mono">
            <span className="flex items-center gap-1">
              <Clock className="w-3.5 h-3.5 text-slate-400" />
              {formatTime(elapsedSec)} / {formatTime(targetDuration)}
            </span>
            <span className="text-slate-600">·</span>
            <span className="flex items-center gap-1">
              <Users className="w-3.5 h-3.5 text-slate-400" />
              {isRunning ? snapshot?.activeWorkers : 0} / {snapshot?.config.concurrency} VUs
            </span>
          </div>
        </div>

        {/* Action / Export Buttons */}
        <div className="flex items-center gap-2">
          {isRunning ? (
            <button
              onClick={onStop}
              className="px-3 py-1 bg-rose-950 text-rose-300 border border-rose-800 rounded-md text-xs font-semibold flex items-center gap-1.5 hover:bg-rose-900 transition-colors"
            >
              <Square className="w-3 h-3 fill-rose-400" />
              <span>Abort</span>
            </button>
          ) : (
            <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 text-xs">
              {onOpenPdfReport && (
                <button
                  onClick={onOpenPdfReport}
                  className="px-2.5 py-1 bg-gradient-to-r from-cyan-950 to-slate-900 hover:from-cyan-900 hover:to-slate-800 text-cyan-300 font-semibold rounded border border-cyan-800/80 flex items-center gap-1 transition-all shadow-sm cursor-pointer"
                  title="Generate formatted Executive PDF / Print summary report"
                >
                  <FileText className="w-3.5 h-3.5 text-cyan-400" />
                  <span>PDF Report</span>
                </button>
              )}
              <button
                onClick={onExportJson}
                className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded border border-slate-700 flex items-center gap-1 transition-colors cursor-pointer"
                title="Export test metrics and request logs as JSON"
              >
                <Download className="w-3 h-3 text-cyan-400" />
                <span>JSON</span>
              </button>
              <button
                onClick={onExportCsv}
                className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded border border-slate-700 flex items-center gap-1 transition-colors cursor-pointer"
                title="Export request logs as CSV"
              >
                <Download className="w-3 h-3 text-emerald-400" />
                <span>CSV</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Progress Bar Container */}
      <div className="space-y-1">
        <div className="w-full bg-slate-950 h-2.5 rounded-full overflow-hidden border border-slate-800">
          <div
            className={`h-full transition-all duration-300 ${
              isRunning
                ? 'bg-gradient-to-r from-cyan-500 via-teal-400 to-emerald-400'
                : snapshot?.status === 'completed'
                ? 'bg-emerald-500'
                : 'bg-amber-500'
            }`}
            style={{ width: `${progressPercent}%` }}
          />
        </div>
        <div className="flex items-center justify-between text-[11px] font-mono text-slate-400">
          <span>{progressPercent}% Complete</span>
          <span>
            {snapshot?.totalCompleted || 0}
            {snapshot?.config.totalRequests ? ` / ${snapshot.config.totalRequests} reqs` : ' requests processed'}
          </span>
        </div>
      </div>
    </div>
  );
};
