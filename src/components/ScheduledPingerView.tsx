import React, { useState, useEffect } from 'react';
import {
  Clock,
  Play,
  Pause,
  Trash2,
  RefreshCw,
  Plus,
  CheckCircle2,
  AlertCircle,
  Zap,
  Globe,
  Send,
  ChevronUp,
  X,
} from 'lucide-react';
import { ScheduledTask, HttpMethod } from '../types';

interface ScheduledPingerViewProps {
  onShowToast: (msg: string) => void;
}

export const ScheduledPingerView: React.FC<ScheduledPingerViewProps> = ({ onShowToast }) => {
  const [tasks, setTasks] = useState<ScheduledTask[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [now, setNow] = useState(Date.now());

  // Form inputs
  const [name, setName] = useState('');
  const [url, setUrl] = useState('');
  const [method, setMethod] = useState<HttpMethod>('GET');
  const [intervalMinutes, setIntervalMinutes] = useState<number>(5);
  const [customSeconds, setCustomSeconds] = useState<number | ''>('');
  const [useCustomSeconds, setUseCustomSeconds] = useState(false);
  const [headersText, setHeadersText] = useState('');
  const [bodyText, setBodyText] = useState('');
  const [runImmediately, setRunImmediately] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Selected task for detailed log view
  const [selectedTask, setSelectedTask] = useState<ScheduledTask | null>(null);

  // Quick URL ping test state
  const [isTestingUrl, setIsTestingUrl] = useState(false);
  const [testResult, setTestResult] = useState<{
    status: number;
    latency: number;
    success: boolean;
    error?: string;
  } | null>(null);

  // Live timer tick every second for real-time countdowns
  useEffect(() => {
    const timer = setInterval(() => {
      setNow(Date.now());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Poll tasks every 3 seconds to keep stats and recent logs fresh
  useEffect(() => {
    fetchTasks();
    const poller = setInterval(fetchTasks, 3000);
    return () => clearInterval(poller);
  }, []);

  const fetchTasks = async () => {
    try {
      const res = await fetch('/api/cron/tasks');
      if (res.ok) {
        const data = await res.json();
        setTasks(data.tasks || []);
        // update selected task if open
        if (selectedTask) {
          const updated = (data.tasks as ScheduledTask[]).find((t) => t.id === selectedTask.id);
          if (updated) setSelectedTask(updated);
        }
      }
    } catch {
      // ignore
    } finally {
      setIsLoading(false);
    }
  };

  const handleTestUrl = async () => {
    if (!url.trim()) {
      onShowToast('Please enter a target URL to test');
      return;
    }
    setIsTestingUrl(true);
    setTestResult(null);

    const parsedHeaders: Record<string, string> = {};
    if (headersText.trim()) {
      headersText.split('\n').forEach((line) => {
        const parts = line.split(':');
        if (parts.length >= 2) {
          const k = parts[0].trim();
          const v = parts.slice(1).join(':').trim();
          if (k) parsedHeaders[k] = v;
        }
      });
    }

    try {
      const res = await fetch('/api/load-test/ping', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: url.trim(),
          method,
          headers: parsedHeaders,
          body: ['POST', 'PUT', 'PATCH'].includes(method) ? bodyText : undefined,
        }),
      });
      const data = await res.json();
      setTestResult({
        status: data.status,
        latency: data.latency,
        success: data.success,
        error: data.error,
      });
    } catch (err: any) {
      setTestResult({
        status: 0,
        latency: 0,
        success: false,
        error: err?.message || 'Connection test failed',
      });
    } finally {
      setIsTestingUrl(false);
    }
  };

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim()) {
      onShowToast('Please enter a valid target URL');
      return;
    }

    const intervalSec = useCustomSeconds && Number(customSeconds) > 0 ? Number(customSeconds) : intervalMinutes * 60;
    if (intervalSec < 10) {
      onShowToast('Interval must be at least 10 seconds');
      return;
    }

    const parsedHeaders: Record<string, string> = {};
    if (headersText.trim()) {
      headersText.split('\n').forEach((line) => {
        const parts = line.split(':');
        if (parts.length >= 2) {
          const k = parts[0].trim();
          const v = parts.slice(1).join(':').trim();
          if (k) parsedHeaders[k] = v;
        }
      });
    }

    setIsSubmitting(true);
    try {
      const res = await fetch('/api/cron/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim() || `${method} ${url}`,
          url: url.trim(),
          method,
          intervalSeconds: intervalSec,
          headers: parsedHeaders,
          body: ['POST', 'PUT', 'PATCH'].includes(method) ? bodyText : undefined,
          runImmediately,
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        onShowToast(`Failed to create monitor: ${err.error || 'Invalid configuration'}`);
        return;
      }

      onShowToast(`Scheduled monitor active: hitting every ${intervalSec >= 60 ? `${Math.round(intervalSec / 60)} minute(s)` : `${intervalSec}s`}`);
      // Reset form
      setName('');
      setUrl('');
      setHeadersText('');
      setBodyText('');
      setTestResult(null);
      setIsFormOpen(false);
      await fetchTasks();
    } catch (err: any) {
      onShowToast(`Error: ${err?.message || 'Failed to create'}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggle = async (id: string) => {
    try {
      const res = await fetch(`/api/cron/tasks/${id}/toggle`, { method: 'POST' });
      if (res.ok) {
        fetchTasks();
      }
    } catch {
      onShowToast('Failed to toggle status');
    }
  };

  const handleRunNow = async (id: string) => {
    try {
      onShowToast('Triggering hit now...');
      const res = await fetch(`/api/cron/tasks/${id}/run-now`, { method: 'POST' });
      if (res.ok) {
        const data = await res.json();
        onShowToast(`Hit executed: HTTP ${data.log?.status || 'Done'} (${data.log?.latencyMs || 0}ms)`);
        fetchTasks();
      }
    } catch {
      onShowToast('Failed to trigger hit');
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this scheduled monitor?')) return;
    try {
      const res = await fetch(`/api/cron/tasks/${id}`, { method: 'DELETE' });
      if (res.ok) {
        onShowToast('Scheduled monitor deleted');
        if (selectedTask?.id === id) setSelectedTask(null);
        fetchTasks();
      }
    } catch {
      onShowToast('Failed to delete monitor');
    }
  };

  const handleClearLogs = async (id: string) => {
    try {
      const res = await fetch(`/api/cron/tasks/${id}/clear-logs`, { method: 'POST' });
      if (res.ok) {
        onShowToast('Execution logs cleared');
        fetchTasks();
      }
    } catch {
      onShowToast('Failed to clear logs');
    }
  };

  // Helper formatting countdown
  const formatCountdown = (nextRunTime?: number, isActive?: boolean) => {
    if (!isActive || !nextRunTime) return 'Paused';
    const diff = Math.max(0, Math.floor((nextRunTime - now) / 1000));
    if (diff === 0) return 'Hitting now...';
    if (diff < 60) return `${diff}s`;
    const m = Math.floor(diff / 60);
    const s = diff % 60;
    return `${m}m ${s}s`;
  };

  const formatInterval = (sec: number) => {
    if (sec < 60) return `${sec} seconds`;
    if (sec % 3600 === 0) return `${sec / 3600} hr`;
    if (sec % 60 === 0) return `${sec / 60} mins`;
    return `${Math.floor(sec / 60)}m ${sec % 60}s`;
  };

  // Overview stats
  const totalTasks = tasks.length;
  const activeTasks = tasks.filter((t) => t.isActive).length;
  const totalHits = tasks.reduce((sum, t) => sum + t.totalRuns, 0);
  const totalSuccess = tasks.reduce((sum, t) => sum + t.successRuns, 0);
  const overallSuccessRate = totalHits > 0 ? Math.round((totalSuccess / totalHits) * 100) : 100;

  return (
    <div className="space-y-6">
      {/* Top Banner / Explanation Card */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-cyan-950/60 via-slate-900 to-indigo-950/60 border border-cyan-500/20 p-5 sm:p-6 shadow-xl shadow-cyan-950/20">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1.5 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 text-xs font-semibold">
              <Clock className="w-3.5 h-3.5" />
              <span>Continuous Interval Pinger & Uptime Monitor</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight">
              Continuous Periodic Hit & Keep-Alive Engine
            </h2>
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
              Hit any target URL at specified intervals (e.g. every 5 minutes, 1 minute, 30 minutes) continuously from the server background. Ideal for preventing server sleep (Keep-Alive), uptime health checks, and webhook verification.
            </p>
          </div>

          <div className="flex items-center gap-2 sm:self-center shrink-0">
            <button
              onClick={() => setIsFormOpen(!isFormOpen)}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-cyan-400 via-teal-400 to-emerald-400 hover:from-cyan-300 hover:to-emerald-300 text-slate-950 font-bold text-xs shadow-lg shadow-cyan-900/40 transition-all active:scale-95 cursor-pointer"
            >
              {isFormOpen ? <ChevronUp className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
              <span>{isFormOpen ? 'Hide Form' : 'Add New Schedule'}</span>
            </button>
          </div>
        </div>

        {/* Quick KPI stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-5 pt-5 border-t border-slate-800/80">
          <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-3">
            <div className="text-[11px] text-slate-400 font-medium">Active Monitors</div>
            <div className="text-xl font-bold font-mono text-cyan-400 flex items-center gap-2 mt-0.5">
              <span>{activeTasks}</span>
              <span className="text-xs font-normal text-slate-400">/ {totalTasks}</span>
            </div>
          </div>
          <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-3">
            <div className="text-[11px] text-slate-400 font-medium">Total Hits Sent</div>
            <div className="text-xl font-bold font-mono text-emerald-400 mt-0.5">
              {totalHits.toLocaleString()}
            </div>
          </div>
          <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-3">
            <div className="text-[11px] text-slate-400 font-medium">Success Rate</div>
            <div className="text-xl font-bold font-mono text-teal-300 mt-0.5">
              {overallSuccessRate}%
            </div>
          </div>
          <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-3">
            <div className="text-[11px] text-slate-400 font-medium">Engine Mode</div>
            <div className="text-xs font-bold text-emerald-400 flex items-center gap-1.5 mt-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              Server-Side Runner
            </div>
          </div>
        </div>
      </div>

      {/* Creation Form Modal/Accordion */}
      {isFormOpen && (
        <form
          onSubmit={handleCreateTask}
          className="rounded-2xl bg-[#0d1424] border border-cyan-500/30 p-5 sm:p-6 space-y-5 shadow-2xl transition-all"
        >
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <div className="flex items-center gap-2">
              <Zap className="w-5 h-5 text-cyan-400" />
              <h3 className="font-bold text-sm sm:text-base text-white">
                Configure Scheduled Pinger
              </h3>
            </div>
            <button
              type="button"
              onClick={() => setIsFormOpen(false)}
              className="p-1 text-slate-400 hover:text-white rounded-lg cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Monitor Name */}
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                Monitor Name (Optional)
              </label>
              <input
                type="text"
                placeholder="e.g. Backend Keep-Alive / Production Ping"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 focus:border-cyan-500 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 outline-none"
              />
            </div>

            {/* HTTP Method */}
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                HTTP Method
              </label>
              <div className="grid grid-cols-5 gap-1.5">
                {(['GET', 'POST', 'HEAD', 'PUT', 'PATCH'] as HttpMethod[]).map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setMethod(m)}
                    className={`py-2 text-xs font-bold rounded-lg border transition-all cursor-pointer ${
                      method === m
                        ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500 shadow-sm'
                        : 'bg-slate-950 text-slate-400 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    {m}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Target URL with Test Button */}
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">
              Target URL (Endpoint) <span className="text-rose-400">*</span>
            </label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Globe className="absolute left-3 top-2.5 w-4 h-4 text-slate-500" />
                <input
                  type="url"
                  required
                  placeholder="https://your-api.com/health or https://myapp.onrender.com"
                  value={url}
                  onChange={(e) => {
                    setUrl(e.target.value);
                    setTestResult(null);
                  }}
                  className="w-full bg-slate-950 border border-slate-800 focus:border-cyan-500 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 outline-none font-mono"
                />
              </div>
              <button
                type="button"
                onClick={handleTestUrl}
                disabled={isTestingUrl || !url.trim()}
                className="px-3.5 py-2 bg-slate-800 hover:bg-slate-750 disabled:opacity-50 text-slate-200 border border-slate-700 rounded-xl text-xs font-semibold flex items-center gap-1.5 shrink-0 transition-all cursor-pointer"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isTestingUrl ? 'animate-spin' : ''}`} />
                <span>{isTestingUrl ? 'Testing...' : 'Test URL'}</span>
              </button>
            </div>

            {/* Test result alert */}
            {testResult && (
              <div
                className={`mt-2 p-2.5 rounded-xl border text-xs flex items-center justify-between ${
                  testResult.success
                    ? 'bg-emerald-950/40 border-emerald-800/80 text-emerald-300'
                    : 'bg-rose-950/40 border-rose-800/80 text-rose-300'
                }`}
              >
                <div className="flex items-center gap-2">
                  {testResult.success ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-rose-400" />
                  )}
                  <span>
                    Status: <strong>{testResult.status}</strong> —{' '}
                    {testResult.success ? 'Endpoint responded successfully' : testResult.error}
                  </span>
                </div>
                <span className="font-mono font-bold text-[11px]">{testResult.latency}ms</span>
              </div>
            )}
          </div>

          {/* Hit Interval Selector */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-medium text-slate-300 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-cyan-400" />
                Execution Interval (Frequency)
              </label>
              <button
                type="button"
                onClick={() => setUseCustomSeconds(!useCustomSeconds)}
                className="text-[11px] text-cyan-400 hover:text-cyan-300 underline cursor-pointer"
              >
                {useCustomSeconds ? 'Use Minute Presets' : 'Custom Seconds / Minutes'}
              </button>
            </div>

            {!useCustomSeconds ? (
              <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                {[
                  { label: '30s', val: 0.5, desc: '30 seconds' },
                  { label: '1m', val: 1, desc: '1 minute' },
                  { label: '2m', val: 2, desc: '2 minutes' },
                  { label: '5m', val: 5, desc: '5 minutes (Default)' },
                  { label: '10m', val: 10, desc: '10 minutes' },
                  { label: '30m', val: 30, desc: '30 minutes' },
                ].map((item) => (
                  <button
                    key={item.label}
                    type="button"
                    onClick={() => setIntervalMinutes(item.val)}
                    className={`p-2.5 rounded-xl border text-center transition-all cursor-pointer ${
                      intervalMinutes === item.val
                        ? 'bg-cyan-500/20 border-cyan-400 text-cyan-300 font-bold shadow-sm'
                        : 'bg-slate-950 border-slate-800 text-slate-300 hover:border-slate-700'
                    }`}
                  >
                    <div className="text-sm font-bold font-mono">{item.label}</div>
                    <div className="text-[10px] text-slate-400 mt-0.5">{item.desc}</div>
                  </button>
                ))}
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min="10"
                  max="86400"
                  required
                  placeholder="e.g. 300 (in seconds)"
                  value={customSeconds}
                  onChange={(e) => setCustomSeconds(e.target.value === '' ? '' : Number(e.target.value))}
                  className="w-48 bg-slate-950 border border-slate-800 focus:border-cyan-500 rounded-xl px-3 py-2 text-xs text-white outline-none font-mono"
                />
                <span className="text-xs text-slate-400">
                  seconds interval (e.g. 300s = 5 minutes, 60s = 1 min)
                </span>
              </div>
            )}
          </div>

          {/* Optional Headers & Body */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Custom Headers (Optional, 1 per line)
              </label>
              <textarea
                rows={2}
                placeholder="Authorization: Bearer token&#10;x-custom-key: value"
                value={headersText}
                onChange={(e) => setHeadersText(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 focus:border-cyan-500 rounded-xl p-2.5 text-xs text-white placeholder-slate-500 outline-none font-mono"
              />
            </div>

            {['POST', 'PUT', 'PATCH'].includes(method) && (
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Request JSON Body (Optional)
                </label>
                <textarea
                  rows={2}
                  placeholder='{"event": "ping", "source": "loadtst"}'
                  value={bodyText}
                  onChange={(e) => setBodyText(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 focus:border-cyan-500 rounded-xl p-2.5 text-xs text-white placeholder-slate-500 outline-none font-mono"
                />
              </div>
            )}
          </div>

          {/* Submit Actions */}
          <div className="flex items-center justify-between pt-3 border-t border-slate-800">
            <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
              <input
                type="checkbox"
                checked={runImmediately}
                onChange={(e) => setRunImmediately(e.target.checked)}
                className="rounded border-slate-800 text-cyan-500 focus:ring-cyan-500/20"
              />
              <span>Trigger initial hit immediately upon creation</span>
            </label>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setIsFormOpen(false)}
                className="px-4 py-2 text-xs font-medium text-slate-400 hover:text-slate-200 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting || !url.trim()}
                className="flex items-center gap-2 px-5 py-2 rounded-xl bg-gradient-to-r from-cyan-400 to-emerald-400 hover:from-cyan-300 hover:to-emerald-300 text-slate-950 font-bold text-xs shadow-md transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
              >
                <Send className="w-3.5 h-3.5" />
                <span>{isSubmitting ? 'Saving...' : 'Start Schedule'}</span>
              </button>
            </div>
          </div>
        </form>
      )}

      {/* Scheduled Monitors List */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h3 className="font-extrabold text-sm sm:text-base text-white tracking-tight">
              Active Periodic Monitors
            </h3>
            <span className="px-2 py-0.5 rounded-full bg-slate-800 border border-slate-700 text-slate-300 font-mono text-[11px]">
              {tasks.length}
            </span>
          </div>

          <button
            onClick={fetchTasks}
            className="p-1.5 text-slate-400 hover:text-slate-200 bg-slate-900 border border-slate-800 rounded-lg text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
            title="Refresh monitor status"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Refresh</span>
          </button>
        </div>

        {isLoading ? (
          <div className="p-12 text-center text-slate-400 bg-slate-900/30 border border-slate-800 rounded-2xl">
            <RefreshCw className="w-6 h-6 animate-spin mx-auto text-cyan-400 mb-2" />
            <p className="text-xs">Loading monitors...</p>
          </div>
        ) : tasks.length === 0 ? (
          <div className="p-10 sm:p-14 text-center rounded-2xl border border-dashed border-slate-800 bg-slate-950/50 space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center mx-auto text-cyan-400">
              <Clock className="w-6 h-6" />
            </div>
            <h4 className="text-base font-bold text-white">No Scheduled Monitors Created Yet</h4>
            <p className="text-xs text-slate-400 max-w-md mx-auto">
              To automatically hit any URL every 5 minutes or at custom intervals, click the <strong>"Add New Schedule"</strong> button above.
            </p>
            <button
              onClick={() => setIsFormOpen(true)}
              className="mt-2 inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 hover:bg-cyan-500/30 font-bold text-xs transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Create First Schedule</span>
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3.5">
            {tasks.map((task) => {
              const successRate =
                task.totalRuns > 0 ? Math.round((task.successRuns / task.totalRuns) * 100) : 100;
              const countdown = formatCountdown(task.nextRunTime, task.isActive);

              return (
                <div
                  key={task.id}
                  className={`rounded-2xl border transition-all p-4 sm:p-5 ${
                    task.isActive
                      ? 'bg-slate-900/90 border-slate-800/90 hover:border-slate-700 shadow-md'
                      : 'bg-slate-950/60 border-slate-800/40 opacity-75'
                  }`}
                >
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                    {/* Left: Info, URL, Badges */}
                    <div className="space-y-2 min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        {/* Active / Paused Pill */}
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold font-mono border ${
                            task.isActive
                              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                              : 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                          }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              task.isActive ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'
                            }`}
                          ></span>
                          {task.isActive ? 'ACTIVE' : 'PAUSED'}
                        </span>

                        {/* Interval Badge */}
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-cyan-950/80 border border-cyan-800 text-cyan-300">
                          <Clock className="w-3 h-3 text-cyan-400" />
                          <span>Every {formatInterval(task.intervalSeconds)}</span>
                        </span>

                        {/* Method */}
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-bold font-mono bg-slate-800 text-slate-200 border border-slate-700">
                          {task.method}
                        </span>

                        <h4 className="font-bold text-sm text-white truncate">{task.name}</h4>
                      </div>

                      {/* URL Display */}
                      <div className="flex items-center gap-1.5 text-xs text-slate-300 font-mono truncate">
                        <span className="truncate">{task.url}</span>
                      </div>

                      {/* Mini Telemetry row */}
                      <div className="flex flex-wrap items-center gap-4 text-xs font-mono pt-1 text-slate-400">
                        <div>
                          <span>Total Hits: </span>
                          <strong className="text-white">{task.totalRuns}</strong>
                        </div>
                        <div>
                          <span>Success Rate: </span>
                          <strong className={successRate >= 90 ? 'text-emerald-400' : 'text-amber-400'}>
                            {successRate}%
                          </strong>{' '}
                          <span className="text-[10px] text-slate-500">
                            ({task.successRuns}/{task.totalRuns})
                          </span>
                        </div>
                        {task.lastStatus !== undefined && (
                          <div className="flex items-center gap-1">
                            <span>Last Response: </span>
                            <span
                              className={`px-1.5 py-0.2 rounded text-[10px] font-bold ${
                                task.lastStatus >= 200 && task.lastStatus < 400
                                  ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                                  : 'bg-rose-950 text-rose-300 border border-rose-800'
                              }`}
                            >
                              HTTP {task.lastStatus}
                            </span>
                            {task.lastLatencyMs && (
                              <span className="text-slate-400">({task.lastLatencyMs}ms)</span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Right: Live Countdown & Action Buttons */}
                    <div className="flex items-center justify-between sm:justify-end gap-3 pt-3 lg:pt-0 border-t lg:border-t-0 border-slate-800/80">
                      {/* Live Countdown Box */}
                      <div className="bg-slate-950 px-3 py-2 rounded-xl border border-slate-800 text-center min-w-[110px]">
                        <div className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">
                          Next Hit In
                        </div>
                        <div
                          className={`text-sm font-bold font-mono mt-0.5 ${
                            task.isActive ? 'text-cyan-400' : 'text-slate-500'
                          }`}
                        >
                          {countdown}
                        </div>
                      </div>

                      {/* Action buttons */}
                      <div className="flex items-center gap-1.5">
                        {/* Run Now Trigger */}
                        <button
                          onClick={() => handleRunNow(task.id)}
                          title="Hit target endpoint immediately"
                          className="px-2.5 py-2 bg-cyan-950/80 hover:bg-cyan-900 border border-cyan-800 text-cyan-300 text-xs font-bold rounded-xl flex items-center gap-1 transition-all active:scale-95 cursor-pointer"
                        >
                          <Zap className="w-3.5 h-3.5 fill-cyan-400" />
                          <span className="hidden sm:inline">Hit Now</span>
                        </button>

                        {/* Pause / Resume */}
                        <button
                          onClick={() => handleToggle(task.id)}
                          title={task.isActive ? 'Pause Monitor' : 'Resume Monitor'}
                          className="p-2 bg-slate-800 hover:bg-slate-750 text-slate-200 border border-slate-700 rounded-xl transition-all cursor-pointer"
                        >
                          {task.isActive ? (
                            <Pause className="w-4 h-4 text-amber-400" />
                          ) : (
                            <Play className="w-4 h-4 text-emerald-400 fill-emerald-400" />
                          )}
                        </button>

                        {/* View Logs */}
                        <button
                          onClick={() => setSelectedTask(task)}
                          title="View execution logs"
                          className="px-2.5 py-2 bg-slate-800 hover:bg-slate-750 text-slate-300 border border-slate-700 rounded-xl text-xs font-semibold flex items-center gap-1 transition-all cursor-pointer"
                        >
                          <span>Logs ({task.recentLogs.length})</span>
                        </button>

                        {/* Delete */}
                        <button
                          onClick={() => handleDelete(task.id)}
                          title="Delete monitor"
                          className="p-2 text-rose-400 hover:text-rose-200 hover:bg-rose-950/60 border border-slate-800 hover:border-rose-900 rounded-xl transition-all cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Execution Logs Modal / Drawer */}
      {selectedTask && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/80 backdrop-blur-sm">
          <div className="w-full max-w-3xl bg-[#0b101d] border border-slate-800 rounded-2xl shadow-2xl flex flex-col max-h-[85vh] overflow-hidden">
            {/* Modal Header */}
            <div className="p-4 sm:p-5 border-b border-slate-800 flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold font-mono bg-cyan-950 border border-cyan-800 text-cyan-400">
                    {selectedTask.method}
                  </span>
                  <h3 className="font-bold text-sm sm:text-base text-white">
                    {selectedTask.name} — Execution Logs
                  </h3>
                </div>
                <p className="text-xs text-slate-400 font-mono truncate mt-0.5">
                  {selectedTask.url}
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleClearLogs(selectedTask.id)}
                  className="px-2.5 py-1 text-xs text-slate-400 hover:text-rose-300 hover:bg-rose-950/30 rounded-lg transition-colors cursor-pointer"
                >
                  Clear Logs
                </button>
                <button
                  onClick={() => setSelectedTask(null)}
                  className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Modal Body / Table of Logs */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-5">
              {selectedTask.recentLogs.length === 0 ? (
                <div className="text-center py-10 text-slate-400 text-xs">
                  No execution logs recorded yet. Click 'Hit Now' or wait for the next scheduled interval.
                </div>
              ) : (
                <div className="space-y-2">
                  {selectedTask.recentLogs.map((log) => {
                    const isSuccess = log.status >= 200 && log.status < 400;
                    return (
                      <div
                        key={log.id}
                        className={`p-3 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs font-mono ${
                          isSuccess
                            ? 'bg-slate-950/80 border-slate-800'
                            : 'bg-rose-950/20 border-rose-900/60'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <span
                            className={`px-2 py-0.5 rounded font-bold text-[10px] ${
                              isSuccess
                                ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                                : 'bg-rose-950 text-rose-400 border border-rose-800'
                            }`}
                          >
                            HTTP {log.status || 'ERR'}
                          </span>
                          <span className="text-slate-300">
                            {new Date(log.timestamp).toLocaleTimeString()}
                          </span>
                          {log.error && (
                            <span className="text-rose-400 font-normal truncate max-w-xs">
                              {log.error}
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-4 text-slate-400 text-[11px]">
                          <span>
                            Latency: <strong className="text-white">{log.latencyMs}ms</strong>
                          </span>
                          <span>
                            Payload: <strong className="text-slate-300">{log.bytes} B</strong>
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-3 bg-slate-950 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
              <span>Retains up to 50 most recent execution logs in memory.</span>
              <button
                onClick={() => setSelectedTask(null)}
                className="px-4 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-white font-semibold text-xs cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
