import React from 'react';
import {
  Activity,
  History,
  BookmarkCheck,
  BookOpen,
  Settings,
  Layers,
  ChevronLeft,
  ChevronRight,
  X,
  Play,
  Square,
  ShieldCheck,
  Zap,
  Clock,
  AlertTriangle,
  Server,
} from 'lucide-react';
import { LoadTestSnapshot } from '../types';

interface SidebarProps {
  currentTab: 'runner' | 'history' | 'sandbox' | 'scenarios';
  setCurrentTab: (tab: 'runner' | 'history' | 'sandbox' | 'scenarios') => void;
  isRunning: boolean;
  onStartTest: () => void;
  onStopTest: () => void;
  onOpenSettings: () => void;
  historyCount: number;
  scenariosCount: number;
  snapshot: LoadTestSnapshot | null;
  isOpenMobile: boolean;
  setIsOpenMobile: (open: boolean) => void;
  isCollapsedDesktop: boolean;
  setIsCollapsedDesktop: (collapsed: boolean) => void;
  onQuickLoadSandbox?: (type: string) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentTab,
  setCurrentTab,
  isRunning,
  onStartTest,
  onStopTest,
  onOpenSettings,
  historyCount,
  scenariosCount,
  snapshot,
  isOpenMobile,
  setIsOpenMobile,
  isCollapsedDesktop,
  setIsCollapsedDesktop,
  onQuickLoadSandbox,
}) => {
  const navItems = [
    {
      id: 'runner' as const,
      label: 'Live Runner',
      description: 'Stress testing dashboard',
      icon: Activity,
      badge: isRunning ? 'LIVE' : null,
      badgeColor: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30 animate-pulse',
    },
    {
      id: 'history' as const,
      label: 'Test History',
      description: 'Prior runs & exports',
      icon: History,
      badge: historyCount > 0 ? String(historyCount) : null,
      badgeColor: 'bg-slate-800 text-slate-400 border-slate-700',
    },
    {
      id: 'scenarios' as const,
      label: 'Saved Presets',
      description: 'SLA load profiles',
      icon: BookmarkCheck,
      badge: scenariosCount > 0 ? String(scenariosCount) : null,
      badgeColor: 'bg-slate-800 text-slate-400 border-slate-700',
    },
    {
      id: 'sandbox' as const,
      label: 'Sandbox APIs',
      description: '5 zero-setup targets',
      icon: BookOpen,
      badge: '5 APIs',
      badgeColor: 'bg-cyan-950 text-cyan-400 border-cyan-800',
    },
  ];

  const quickSandboxes = [
    { id: 'fast', name: 'Fast 200 OK', icon: Zap, color: 'text-amber-400' },
    { id: 'delayed', name: 'Delayed 75ms', icon: Clock, color: 'text-cyan-400' },
    { id: 'flaky', name: 'Flaky Errors', icon: AlertTriangle, color: 'text-rose-400' },
  ];

  const sidebarContent = (
    <div className="flex flex-col h-full bg-[#0a0f1d] border-r border-slate-800/80 text-slate-300 select-none">
      {/* 1. Header / Brand Wordmark */}
      <div className="flex items-center justify-between px-4 py-4 border-b border-slate-800/80 min-h-[64px]">
        <div
          onClick={() => {
            setCurrentTab('runner');
            setIsOpenMobile(false);
          }}
          className="flex items-center gap-3 cursor-pointer group"
        >
          <div className="relative w-9 h-9 rounded-xl bg-gradient-to-tr from-cyan-600 via-cyan-500 to-emerald-400 p-[1px] shadow-lg shadow-cyan-950/50 shrink-0">
            <div className="w-full h-full bg-slate-950 rounded-[11px] flex items-center justify-center">
              <Activity className="w-5 h-5 text-cyan-400 group-hover:scale-110 transition-transform" />
            </div>
            {isRunning && (
              <span className="absolute -top-0.5 -right-0.5 flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
              </span>
            )}
          </div>
          {(!isCollapsedDesktop || isOpenMobile) && (
            <div className="flex flex-col">
              <span className="text-base font-extrabold tracking-tight text-white flex items-center gap-1.5">
                PulseLoad
                <span className="text-[10px] px-1.5 py-0.2 rounded font-mono font-medium bg-cyan-950 text-cyan-400 border border-cyan-800">
                  v1.2
                </span>
              </span>
              <span className="text-[11px] text-slate-400">HTTP Stress Testing Engine</span>
            </div>
          )}
        </div>

        {/* Mobile close button */}
        <button
          onClick={() => setIsOpenMobile(false)}
          className="lg:hidden p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800/60"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* 2. Quick Action Button (Start / Stop) */}
      <div className="p-3 border-b border-slate-800/60">
        {isRunning ? (
          <button
            onClick={() => {
              onStopTest();
              setIsOpenMobile(false);
            }}
            className="w-full h-10 px-3 flex items-center justify-center gap-2 bg-rose-950/90 hover:bg-rose-900 border border-rose-800 text-rose-200 font-bold text-xs rounded-xl shadow-md transition-all active:scale-[0.98] cursor-pointer"
          >
            <Square className="w-4 h-4 fill-rose-400 text-rose-400" />
            {(!isCollapsedDesktop || isOpenMobile) && <span>Stop Active Test</span>}
          </button>
        ) : (
          <button
            onClick={() => {
              onStartTest();
              setIsOpenMobile(false);
            }}
            className="w-full h-10 px-3 flex items-center justify-center gap-2 bg-gradient-to-r from-cyan-400 via-teal-400 to-emerald-400 hover:from-cyan-300 hover:to-emerald-300 text-slate-950 font-bold text-xs rounded-xl shadow-lg shadow-cyan-950/50 transition-all active:scale-[0.98] cursor-pointer"
          >
            <Play className="w-4 h-4 fill-slate-950 text-slate-950" />
            {(!isCollapsedDesktop || isOpenMobile) && <span>Start Load Test</span>}
          </button>
        )}
      </div>

      {/* 3. Navigation Links */}
      <div className="flex-1 overflow-y-auto px-3 py-3 space-y-1">
        {(!isCollapsedDesktop || isOpenMobile) && (
          <div className="px-2 pb-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400">
            Navigation
          </div>
        )}

        {navItems.map((item) => {
          const isActive = currentTab === item.id;
          const Icon = item.icon;
          return (
            <button
              key={item.id}
              onClick={() => {
                setCurrentTab(item.id);
                setIsOpenMobile(false);
              }}
              title={item.label}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all group cursor-pointer ${
                isActive
                  ? 'bg-cyan-500/10 text-cyan-300 border border-cyan-500/30 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-850/60 border border-transparent'
              }`}
            >
              <Icon
                className={`w-4 h-4 shrink-0 transition-colors ${
                  isActive ? 'text-cyan-400' : 'text-slate-400 group-hover:text-slate-200'
                }`}
              />
              {(!isCollapsedDesktop || isOpenMobile) && (
                <div className="flex-1 flex items-center justify-between text-left min-w-0">
                  <div className="truncate">
                    <span className="block truncate">{item.label}</span>
                    <span className="text-[10px] text-slate-400 block font-normal truncate">
                      {item.description}
                    </span>
                  </div>
                  {item.badge && (
                    <span
                      className={`text-[10px] font-mono px-2 py-0.5 rounded-full border shrink-0 ml-2 ${item.badgeColor}`}
                    >
                      {item.badge}
                    </span>
                  )}
                </div>
              )}
            </button>
          );
        })}

        {/* Quick Sandbox Targets shortcut */}
        {(!isCollapsedDesktop || isOpenMobile) && onQuickLoadSandbox && (
          <div className="pt-4 mt-3 border-t border-slate-800/60 space-y-1.5">
            <div className="px-2 text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center justify-between">
              <span>Quick Presets</span>
              <span className="text-cyan-400 font-mono">1-Click</span>
            </div>
            {quickSandboxes.map((s) => {
              const Icon = s.icon;
              return (
                <button
                  key={s.id}
                  onClick={() => {
                    onQuickLoadSandbox(s.id);
                    setCurrentTab('runner');
                    setIsOpenMobile(false);
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-slate-400 hover:text-slate-200 hover:bg-slate-850/50 rounded-lg transition-colors text-left font-mono cursor-pointer"
                >
                  <Icon className={`w-3.5 h-3.5 ${s.color} shrink-0`} />
                  <span className="truncate">{s.name}</span>
                </button>
              );
            })}
          </div>
        )}

        {/* Live Engine Status Mini-Widget */}
        {(!isCollapsedDesktop || isOpenMobile) && (
          <div className="pt-4 mt-3 border-t border-slate-800/60">
            <div className="p-3 bg-slate-950/80 border border-slate-800/80 rounded-xl space-y-2">
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-slate-400 font-medium">Engine Status</span>
                {isRunning ? (
                  <span className="flex items-center gap-1.5 text-emerald-400 font-bold font-mono text-[10px]">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                    ACTIVE
                  </span>
                ) : (
                  <span className="text-slate-400 font-mono text-[10px]">READY</span>
                )}
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs font-mono pt-1 border-t border-slate-900">
                <div>
                  <div className="text-[10px] text-slate-400">Workers</div>
                  <div className="text-white font-bold">
                    {isRunning ? snapshot?.activeWorkers || 0 : 0} VUs
                  </div>
                </div>
                <div>
                  <div className="text-[10px] text-slate-400">Throughput</div>
                  <div className="text-cyan-400 font-bold">
                    {isRunning ? (snapshot?.currentRps || 0).toFixed(1) : (snapshot?.avgRps || 0).toFixed(1)}/s
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-1.5 text-[10px] text-slate-400 pt-1 border-t border-slate-900">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span>SSRF Guardrails Active</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 4. Footer & Desktop Collapse Toggle */}
      <div className="p-3 border-t border-slate-800/80 space-y-2 bg-[#080d19]">
        <button
          onClick={() => {
            onOpenSettings();
            setIsOpenMobile(false);
          }}
          className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-slate-400 hover:text-slate-200 hover:bg-slate-800/50 rounded-xl transition-colors cursor-pointer"
        >
          <Settings className="w-4 h-4 text-slate-400 shrink-0" />
          {(!isCollapsedDesktop || isOpenMobile) && <span>Engine Settings</span>}
        </button>

        {/* Desktop collapse / expand button */}
        <div className="hidden lg:flex items-center justify-between pt-1 text-[11px] text-slate-400">
          {!isCollapsedDesktop && (
            <span className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
              Local Node.js
            </span>
          )}
          <button
            onClick={() => setIsCollapsedDesktop(!isCollapsedDesktop)}
            className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg transition-colors ml-auto"
            title={isCollapsedDesktop ? 'Expand Sidebar' : 'Collapse Sidebar'}
          >
            {isCollapsedDesktop ? (
              <ChevronRight className="w-4 h-4" />
            ) : (
              <ChevronLeft className="w-4 h-4" />
            )}
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Persistent Sidebar */}
      <aside
        className={`hidden lg:block shrink-0 sticky top-0 h-screen transition-all duration-300 z-30 ${
          isCollapsedDesktop ? 'w-20' : 'w-64'
        }`}
      >
        {sidebarContent}
      </aside>

      {/* Mobile Slide-Over Drawer Backdrop */}
      {isOpenMobile && (
        <div
          onClick={() => setIsOpenMobile(false)}
          className="lg:hidden fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm transition-opacity"
        />
      )}

      {/* Mobile Off-Canvas Drawer */}
      <aside
        className={`lg:hidden fixed inset-y-0 left-0 z-50 w-72 max-w-[85vw] transform transition-transform duration-300 ease-in-out ${
          isOpenMobile ? 'translate-x-0 shadow-2xl' : '-translate-x-full'
        }`}
      >
        {sidebarContent}
      </aside>
    </>
  );
};
