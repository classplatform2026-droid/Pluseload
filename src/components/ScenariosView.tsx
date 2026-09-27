import React, { useState } from 'react';
import {
  BookmarkCheck,
  Play,
  Trash2,
  Plus,
  Zap,
  Activity,
  ShieldAlert,
  Clock,
  ArrowRight,
  Sliders,
  Check,
  Flame,
  CheckCircle2,
} from 'lucide-react';
import { LoadTestConfig, SavedScenario } from '../types';

interface ScenariosViewProps {
  scenarios: SavedScenario[];
  onLoadScenario: (config: Omit<LoadTestConfig, 'id'>) => void;
  onDeleteScenario: (id: string) => void;
  onSaveCurrentAsScenario: (name: string, description?: string) => void;
}

export const ScenariosView: React.FC<ScenariosViewProps> = ({
  scenarios,
  onLoadScenario,
  onDeleteScenario,
  onSaveCurrentAsScenario,
}) => {
  const [newScenarioName, setNewScenarioName] = useState('');
  const [newScenarioDesc, setNewScenarioDesc] = useState('');
  const [showSaveForm, setShowSaveForm] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Curated Industry Load Profiles
  const defaultPresets = [
    {
      name: 'Baseline Smoke Test',
      description: 'Quick sanity check with 2 virtual users for 5 seconds to verify endpoint health without stressing the system.',
      concurrency: 2,
      duration: 5,
      type: 'Smoke Test',
      icon: Activity,
      color: 'text-emerald-400',
      badgeBg: 'bg-emerald-950/80 text-emerald-300 border-emerald-800',
    },
    {
      name: 'Standard Capacity Test',
      description: 'Simulates typical day-to-day production load with 15 concurrent virtual users for 20 seconds to establish baseline latency.',
      concurrency: 15,
      duration: 20,
      type: 'Load Test',
      icon: Sliders,
      color: 'text-cyan-400',
      badgeBg: 'bg-cyan-950/80 text-cyan-300 border-cyan-800',
    },
    {
      name: 'High Concurrency Spike Test',
      description: 'Sudden surge of 40 concurrent virtual users for 15 seconds to reveal queue buildup, thread pool starvation, and timeouts.',
      concurrency: 40,
      duration: 15,
      type: 'Spike Test',
      icon: Zap,
      color: 'text-amber-400',
      badgeBg: 'bg-amber-950/80 text-amber-300 border-amber-800',
    },
    {
      name: 'Sustained Endurance Soak Test',
      description: 'Moderate steady-state traffic for 60 seconds to detect latency degradation, memory leaks, and connection pool exhaustion.',
      concurrency: 8,
      duration: 60,
      type: 'Endurance Test',
      icon: Clock,
      color: 'text-purple-400',
      badgeBg: 'bg-purple-950/80 text-purple-300 border-purple-800',
    },
    {
      name: 'Stress & Saturation Test',
      description: 'Heavy sustained load with 25 virtual users for 30 seconds to find the saturation knee and maximum throughput ceiling.',
      concurrency: 25,
      duration: 30,
      type: 'Stress Test',
      icon: Flame,
      color: 'text-rose-400',
      badgeBg: 'bg-rose-950/80 text-rose-300 border-rose-800',
    },
  ];

  const handleSaveSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newScenarioName.trim()) return;

    onSaveCurrentAsScenario(newScenarioName.trim(), newScenarioDesc.trim() || undefined);
    setNewScenarioName('');
    setNewScenarioDesc('');
    setShowSaveForm(false);
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3000);
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-xl">
        <div>
          <div className="flex items-center gap-2 text-cyan-400 font-bold text-xs uppercase tracking-wider mb-1">
            <BookmarkCheck className="w-4 h-4" />
            <span>Load Profiles & Saved Presets</span>
          </div>
          <h2 className="text-xl font-black text-white tracking-tight">
            Curated Presets & SLA Test Profiles
          </h2>
          <p className="text-xs text-slate-400 mt-1 max-w-2xl">
            Choose from industry-standard benchmarking profiles (Smoke, Spike, Capacity, Endurance) or save your current custom runner settings for 1-click repetition.
          </p>
        </div>

        <button
          onClick={() => setShowSaveForm(!showSaveForm)}
          className="flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-cyan-500 to-emerald-500 hover:from-cyan-400 hover:to-emerald-400 text-slate-950 text-xs font-bold rounded-xl shadow-md transition-all active:scale-95 cursor-pointer self-start md:self-auto shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>Save Current Config</span>
        </button>
      </div>

      {/* Success Notification */}
      {saveSuccess && (
        <div className="p-3.5 bg-emerald-950/70 border border-emerald-800 rounded-xl flex items-center gap-2 text-xs text-emerald-300 animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>Current test configuration saved successfully to your custom presets list!</span>
        </div>
      )}

      {/* Save Current Config Drawer */}
      {showSaveForm && (
        <form
          onSubmit={handleSaveSubmit}
          className="p-5 bg-slate-900 border border-cyan-500/50 rounded-2xl shadow-xl space-y-4 animate-in fade-in"
        >
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <BookmarkCheck className="w-4 h-4 text-cyan-400" />
              <span>Save Current Runner Settings as Custom Preset</span>
            </h3>
            <button
              type="button"
              onClick={() => setShowSaveForm(false)}
              className="text-xs text-slate-400 hover:text-white"
            >
              Cancel
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Preset Name <span className="text-rose-400">*</span>
              </label>
              <input
                type="text"
                required
                value={newScenarioName}
                onChange={(e) => setNewScenarioName(e.target.value)}
                placeholder="e.g., Payment Gateway Stress Test"
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Description (Optional)
              </label>
              <input
                type="text"
                value={newScenarioDesc}
                onChange={(e) => setNewScenarioDesc(e.target.value)}
                placeholder="e.g., Target: 20 VUs with auth token and custom payload"
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setShowSaveForm(false)}
              className="px-3 py-1.5 text-xs text-slate-400 hover:text-white bg-slate-800 rounded-lg transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-1.5 text-xs font-bold text-slate-950 bg-cyan-400 hover:bg-cyan-300 rounded-lg shadow transition-colors cursor-pointer"
            >
              Save Preset
            </button>
          </div>
        </form>
      )}

      {/* 1. Curated Standard Load Profiles */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold uppercase text-slate-400 tracking-wider flex items-center gap-2">
            <span>Standard Load & SLA Profiles</span>
            <span className="text-[10px] font-normal text-slate-500">
              (Click "Apply Profile" to load concurrency and duration)
            </span>
          </h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
          {defaultPresets.map((preset, idx) => {
            const Icon = preset.icon;
            return (
              <div
                key={idx}
                className="bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-xl p-4 flex flex-col justify-between transition-all hover:bg-slate-900/90 shadow-md group"
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span
                      className={`text-[10px] font-mono font-bold uppercase px-2 py-0.5 rounded border ${preset.badgeBg}`}
                    >
                      {preset.type}
                    </span>
                    <Icon className={`w-4 h-4 ${preset.color}`} />
                  </div>

                  <h4 className="text-sm font-bold text-white mb-1 group-hover:text-cyan-300 transition-colors">
                    {preset.name}
                  </h4>
                  <p className="text-xs text-slate-400 line-clamp-3 mb-4 leading-relaxed">
                    {preset.description}
                  </p>
                </div>

                <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs font-mono text-slate-300">
                    <span className="font-bold text-cyan-400">{preset.concurrency} VUs</span>
                    <span className="text-slate-600">·</span>
                    <span className="font-bold text-emerald-400">{preset.duration}s</span>
                  </div>

                  <button
                    onClick={() => {
                      onLoadScenario({
                        url: '',
                        method: 'GET',
                        concurrency: preset.concurrency,
                        durationSeconds: preset.duration,
                        timeoutMs: 5000,
                        headers: {},
                      });
                    }}
                    className="flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-cyan-300 hover:text-white bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg transition-colors cursor-pointer"
                  >
                    <span>Apply Profile</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 2. User Saved Custom Presets */}
      <div className="space-y-3 pt-4 border-t border-slate-800/80">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold uppercase text-slate-400 tracking-wider">
            Your Custom Presets ({scenarios.length})
          </h3>
        </div>

        {scenarios.length === 0 ? (
          <div className="p-8 text-center bg-slate-900/40 border border-dashed border-slate-800 rounded-2xl space-y-2">
            <BookmarkCheck className="w-8 h-8 text-slate-600 mx-auto" />
            <h4 className="text-sm font-semibold text-slate-300">No Custom Presets Saved Yet</h4>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              Configure target parameters on the Load Test Runner and click "Save Current Config" above to store your frequently tested endpoints.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            {scenarios.map((sc) => (
              <div
                key={sc.id}
                className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col justify-between transition-all hover:border-slate-700 shadow-md"
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                      {sc.config.method}
                    </span>
                    <button
                      onClick={() => onDeleteScenario(sc.id)}
                      className="p-1.5 text-slate-500 hover:text-rose-400 rounded-lg hover:bg-slate-800 transition-colors"
                      title="Delete preset"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <h4 className="text-sm font-bold text-white mb-1">{sc.name}</h4>
                  {sc.description && (
                    <p className="text-xs text-slate-400 mb-2 line-clamp-2">{sc.description}</p>
                  )}

                  <div className="text-xs font-mono text-cyan-300 break-all mb-3 bg-slate-950 p-2 rounded border border-slate-800/80">
                    {sc.config.url || '(Empty URL - Settings only)'}
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs font-mono text-slate-400">
                    <span>{sc.config.concurrency} VUs</span>
                    <span>·</span>
                    <span>{sc.config.durationSeconds}s</span>
                    <span>·</span>
                    <span>{sc.config.timeoutMs}ms</span>
                  </div>

                  <button
                    onClick={() => onLoadScenario(sc.config)}
                    className="flex items-center gap-1 px-3 py-1.5 text-xs font-bold text-slate-950 bg-gradient-to-r from-cyan-400 to-emerald-400 hover:from-cyan-300 hover:to-emerald-300 rounded-lg shadow transition-all active:scale-95 cursor-pointer"
                  >
                    <Play className="w-3 h-3 fill-slate-950" />
                    <span>Load Config</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
