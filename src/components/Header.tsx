import React from 'react';
import { Menu, Play, Square, Settings, Activity, Clock, ShieldCheck } from 'lucide-react';
import { LoadTestSnapshot } from '../types';

interface HeaderProps {
  currentTab: 'runner' | 'history' | 'sandbox' | 'scenarios';
  isRunning: boolean;
  onStartTest: () => void;
  onStopTest: () => void;
  onOpenSettings: () => void;
  onToggleMobileSidebar: () => void;
  snapshot: LoadTestSnapshot | null;
}

export const Header: React.FC<HeaderProps> = ({
  currentTab,
  isRunning,
  onStartTest,
  onStopTest,
  onOpenSettings,
  onToggleMobileSidebar,
  snapshot,
}) => {
  const getTabTitle = () => {
    switch (currentTab) {
      case 'runner':
        return 'Live Runner & Telemetry';
      case 'history':
        return 'Test Execution History';
      case 'scenarios':
        return 'Saved Presets & SLA Profiles';
      case 'sandbox':
        return 'Built-in Target Sandbox APIs';
    }
  };

  const elapsedSec = snapshot ? Math.floor(snapshot.elapsedMs / 1000) : 0;
  const targetDuration = snapshot?.config.durationSeconds || 10;

  return (
    <header className="sticky top-0 z-20 w-full border-b border-slate-800/80 bg-[#090d16]/95 backdrop-blur-md px-3 sm:px-6 py-2.5 flex items-center justify-between">
      {/* Left: Mobile Hamburger & Page Title / Breadcrumb */}
      <div className="flex items-center gap-2.5 sm:gap-4 min-w-0">
        <button
          onClick={onToggleMobileSidebar}
          className="lg:hidden p-2 text-slate-300 hover:text-white bg-slate-900 border border-slate-800 rounded-lg active:scale-95 transition-all"
          aria-label="Open Navigation Sidebar"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="flex flex-col min-w-0">
          <div className="flex items-center gap-2">
            <h1 className="text-sm sm:text-base font-bold text-white truncate">
              {getTabTitle()}
            </h1>
            {isRunning && (
              <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/40 text-emerald-400 text-[10px] font-mono font-bold animate-pulse">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                <span className="hidden xs:inline">RUNNING</span>
              </span>
            )}
          </div>
          <span className="text-[11px] text-slate-400 hidden sm:block truncate">
            {isRunning
              ? `Processing test: ${snapshot?.config.method} ${snapshot?.config.url}`
              : 'Configurable concurrent HTTP benchmark agent'}
          </span>
        </div>
      </div>

      {/* Right: Live mini metrics & Action Buttons */}
      <div className="flex items-center gap-2 sm:gap-3 shrink-0">
        {isRunning && (
          <div className="hidden md:flex items-center gap-3 px-3 py-1 bg-slate-900/90 border border-slate-800 rounded-lg text-xs font-mono">
            <span className="text-slate-400 flex items-center gap-1">
              <Clock className="w-3.5 h-3.5 text-slate-400" />
              {elapsedSec}s / {targetDuration}s
            </span>
            <span className="text-slate-700">|</span>
            <span className="text-cyan-400 font-bold">
              {(snapshot?.currentRps || 0).toFixed(1)} req/s
            </span>
          </div>
        )}

        {isRunning ? (
          <button
            onClick={onStopTest}
            className="flex items-center gap-1.5 px-3 sm:px-4 py-1.5 text-xs font-bold text-rose-200 bg-rose-950/90 hover:bg-rose-900 border border-rose-800 rounded-lg shadow-sm transition-all active:scale-95 cursor-pointer"
          >
            <Square className="w-3.5 h-3.5 fill-rose-400 text-rose-400 shrink-0" />
            <span>Stop</span>
          </button>
        ) : (
          <button
            onClick={onStartTest}
            className="flex items-center gap-1.5 px-3 sm:px-4 py-1.5 text-xs font-bold text-slate-950 bg-gradient-to-r from-cyan-400 to-emerald-400 hover:from-cyan-300 hover:to-emerald-300 rounded-lg shadow-md shadow-cyan-950/60 transition-all active:scale-95 cursor-pointer"
          >
            <Play className="w-3.5 h-3.5 fill-slate-950 text-slate-950 shrink-0" />
            <span className="hidden sm:inline">Launch Test</span>
            <span className="sm:hidden">Start</span>
          </button>
        )}

        <button
          onClick={onOpenSettings}
          title="App Settings & Guardrails"
          className="p-1.5 sm:p-2 text-slate-400 hover:text-slate-200 hover:bg-slate-900 border border-slate-800 rounded-lg transition-colors cursor-pointer"
        >
          <Settings className="w-4 h-4" />
        </button>
      </div>
    </header>
  );
};
