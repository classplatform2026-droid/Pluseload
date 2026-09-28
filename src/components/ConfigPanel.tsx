import React, { useState } from 'react';
import {
  Play,
  Square,
  Zap,
  Sliders,
  Code2,
  ListPlus,
  Plus,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  RotateCw,
  Info,
} from 'lucide-react';
import { HttpMethod, HeaderItem, PingResult } from '../types';

interface ConfigPanelProps {
  url: string;
  setUrl: (url: string) => void;
  method: HttpMethod;
  setMethod: (method: HttpMethod) => void;
  concurrency: number;
  setConcurrency: (c: number) => void;
  durationSeconds: number;
  setDurationSeconds: (d: number) => void;
  timeoutMs: number;
  setTimeoutMs: (t: number) => void;
  totalRequests: number | undefined;
  setTotalRequests: (r: number | undefined) => void;
  delayMs: number;
  setDelayMs: (d: number) => void;
  headers: HeaderItem[];
  setHeaders: React.Dispatch<React.SetStateAction<HeaderItem[]>>;
  body: string;
  setBody: (b: string) => void;
  isRunning: boolean;
  onStartTest: () => void;
  onStopTest: () => void;
  onSaveScenario: () => void;
}

const METHODS: HttpMethod[] = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'];

export const ConfigPanel: React.FC<ConfigPanelProps> = ({
  url,
  setUrl,
  method,
  setMethod,
  concurrency,
  setConcurrency,
  durationSeconds,
  setDurationSeconds,
  timeoutMs,
  setTimeoutMs,
  totalRequests,
  setTotalRequests,
  delayMs,
  setDelayMs,
  headers,
  setHeaders,
  body,
  setBody,
  isRunning,
  onStartTest,
  onStopTest,
  onSaveScenario,
}) => {
  const [activeTab, setActiveTab] = useState<'headers' | 'body' | 'limits'>('headers');
  const [pingResult, setPingResult] = useState<PingResult | null>(null);
  const [isPinging, setIsPinging] = useState(false);
  const [limitRequests, setLimitRequests] = useState(totalRequests !== undefined);

  // Method badge colors
  const getMethodBadge = (m: HttpMethod) => {
    switch (m) {
      case 'GET':
        return 'text-emerald-400 bg-emerald-950/60 border-emerald-800';
      case 'POST':
        return 'text-blue-400 bg-blue-950/60 border-blue-800';
      case 'PUT':
        return 'text-amber-400 bg-amber-950/60 border-amber-800';
      case 'PATCH':
        return 'text-purple-400 bg-purple-950/60 border-purple-800';
      case 'DELETE':
        return 'text-rose-400 bg-rose-950/60 border-rose-800';
    }
  };

  const handlePing = async () => {
    if (!url) return;
    setIsPinging(true);
    setPingResult(null);

    const activeHeaders: Record<string, string> = {};
    headers.forEach((h) => {
      if (h.enabled && h.key.trim()) {
        activeHeaders[h.key.trim()] = h.value;
      }
    });

    try {
      const res = await fetch('/api/load-test/ping', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url,
          method,
          headers: activeHeaders,
          body: ['POST', 'PUT', 'PATCH'].includes(method) ? body : undefined,
        }),
      });
      const data = await res.json();
      setPingResult(data);
    } catch (err: any) {
      setPingResult({
        success: false,
        status: 0,
        statusText: 'Error',
        latency: 0,
        bytes: 0,
        error: err?.message || 'Ping failed',
      });
    } finally {
      setIsPinging(false);
    }
  };

  const addHeader = () => {
    setHeaders((prev) => [
      ...prev,
      { id: Math.random().toString(36).substring(2, 9), key: '', value: '', enabled: true },
    ]);
  };

  const updateHeader = (id: string, field: 'key' | 'value' | 'enabled', val: any) => {
    setHeaders((prev) =>
      prev.map((h) => (h.id === id ? { ...h, [field]: val } : h))
    );
  };

  const removeHeader = (id: string) => {
    setHeaders((prev) => prev.filter((h) => h.id !== id));
  };

  const formatJsonBody = () => {
    try {
      const parsed = JSON.parse(body);
      setBody(JSON.stringify(parsed, null, 2));
    } catch {
      // ignore if invalid
    }
  };

  return (
    <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4 md:p-5 shadow-xl backdrop-blur-sm space-y-4">
      {/* Top row: Target URL, Method selector & Action Button */}
      <div className="flex flex-col sm:flex-row items-stretch gap-2.5">
        {/* Method selector */}
        <div className="relative shrink-0">
          <select
            value={method}
            onChange={(e) => setMethod(e.target.value as HttpMethod)}
            disabled={isRunning}
            className={`w-full sm:w-28 md:w-32 h-11 px-3 text-xs font-mono font-bold rounded-lg border appearance-none cursor-pointer focus:outline-none focus:ring-1 focus:ring-cyan-500 transition-colors ${getMethodBadge(
              method
            )}`}
          >
            {METHODS.map((m) => (
              <option key={m} value={m} className="bg-slate-900 text-slate-100 font-sans">
                {m}
              </option>
            ))}
          </select>
        </div>

        {/* URL Input */}
        <div className="relative flex-1 flex items-center min-w-0">
          <input
            type="text"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            disabled={isRunning}
            placeholder="https://api.yourdomain.com/v1/resource"
            className="w-full h-11 px-3 sm:px-4 text-xs md:text-sm font-mono text-slate-100 bg-slate-950 border border-slate-700/80 rounded-lg placeholder-slate-500 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
          />
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={handlePing}
            disabled={isPinging || !url || isRunning}
            title="Single-request health ping to verify target endpoint"
            className="flex-1 sm:flex-none h-11 px-3.5 text-xs font-medium text-slate-300 bg-slate-800 hover:bg-slate-750 border border-slate-700 rounded-lg flex items-center justify-center gap-1.5 transition-colors disabled:opacity-50 cursor-pointer"
          >
            <RotateCw className={`w-3.5 h-3.5 ${isPinging ? 'animate-spin text-cyan-400' : 'text-slate-400'}`} />
            <span>Ping</span>
          </button>

          {isRunning ? (
            <button
              type="button"
              onClick={onStopTest}
              className="flex-1 sm:flex-none h-11 px-5 sm:px-6 text-xs md:text-sm font-bold text-rose-200 bg-rose-900/90 hover:bg-rose-800 border border-rose-700 rounded-lg shadow-lg shadow-rose-950/50 flex items-center justify-center gap-2 transition-all active:scale-95 cursor-pointer"
            >
              <Square className="w-4 h-4 fill-rose-300" />
              <span>Stop</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={onStartTest}
              disabled={!url}
              className="flex-1 sm:flex-none h-11 px-5 sm:px-6 text-xs md:text-sm font-bold text-slate-950 bg-gradient-to-r from-cyan-400 via-teal-400 to-emerald-400 hover:from-cyan-300 hover:to-emerald-300 rounded-lg shadow-lg shadow-cyan-950/60 flex items-center justify-center gap-2 transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
            >
              <Play className="w-4 h-4 fill-slate-950 text-slate-950" />
              <span>Launch</span>
            </button>
          )}
        </div>
      </div>

      {/* Ping Feedback Banner */}
      {pingResult && (
        <div
          className={`p-3 rounded-lg border text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2 transition-all ${
            pingResult.success && pingResult.status >= 200 && pingResult.status < 400
              ? 'bg-emerald-950/40 border-emerald-800/80 text-emerald-300'
              : 'bg-rose-950/40 border-rose-800/80 text-rose-300'
          }`}
        >
          <div className="flex items-start sm:items-center gap-2">
            {pingResult.success && pingResult.status >= 200 && pingResult.status < 400 ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5 sm:mt-0" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5 sm:mt-0" />
            )}
            <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
              <span className="font-semibold">
                Status: {pingResult.status || 'Network Error'} ({pingResult.statusText})
              </span>
              <span className="text-slate-600 hidden sm:inline">·</span>
              <span className="font-mono">Latency: {pingResult.latency}ms</span>
              <span className="text-slate-600 hidden sm:inline">·</span>
              <span className="font-mono">Size: {(pingResult.bytes / 1024).toFixed(2)} KB</span>
              {pingResult.error && <span className="font-medium text-rose-300">({pingResult.error})</span>}
            </div>
          </div>
          <button
            onClick={() => setPingResult(null)}
            className="self-end sm:self-center text-slate-400 hover:text-slate-200 text-xs px-2 py-0.5"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Parameter Control Grid (Concurrency, Duration, Timeout, Total Requests, Interval) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2.5 sm:gap-3 pt-2 border-t border-slate-800/70">
        {/* 1. Concurrency */}
        <div className="p-3 rounded-lg bg-slate-950/60 border border-slate-800 flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-1.5">
            <span className="font-medium">Concurrent Users</span>
            <span className="font-mono text-cyan-400 font-bold">{concurrency} VUs</span>
          </div>
          <input
            type="range"
            min={1}
            max={50}
            value={concurrency}
            disabled={isRunning}
            onChange={(e) => setConcurrency(parseInt(e.target.value, 10))}
            className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-400"
          />
          <div className="flex justify-between text-[10px] text-slate-400 font-mono mt-1">
            <span>1 VU</span>
            <span>25</span>
            <span>50 max</span>
          </div>
        </div>

        {/* 2. Duration */}
        <div className="p-3 rounded-lg bg-slate-950/60 border border-slate-800 flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-1.5">
            <span className="font-medium">Test Duration</span>
            <span className="font-mono text-cyan-400 font-bold">{durationSeconds}s</span>
          </div>
          <input
            type="range"
            min={3}
            max={120}
            step={1}
            value={durationSeconds}
            disabled={isRunning}
            onChange={(e) => setDurationSeconds(parseInt(e.target.value, 10))}
            className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-400"
          />
          <div className="flex justify-between text-[10px] text-slate-400 font-mono mt-1">
            <span>3s</span>
            <span>60s</span>
            <span>120s max</span>
          </div>
        </div>

        {/* 3. Timeout */}
        <div className="p-3 rounded-lg bg-slate-950/60 border border-slate-800 flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-1.5">
            <span className="font-medium">Req Timeout</span>
            <span className="font-mono text-cyan-400 font-bold">{(timeoutMs / 1000).toFixed(1)}s</span>
          </div>
          <select
            value={timeoutMs}
            disabled={isRunning}
            onChange={(e) => setTimeoutMs(parseInt(e.target.value, 10))}
            className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs font-mono text-slate-200 focus:outline-none"
          >
            <option value={500}>500 ms (Fast fail)</option>
            <option value={1000}>1,000 ms (1s)</option>
            <option value={3000}>3,000 ms (3s)</option>
            <option value={5000}>5,000 ms (5s default)</option>
            <option value={10000}>10,000 ms (10s)</option>
            <option value={20000}>20,000 ms (20s)</option>
          </select>
          <span className="text-[10px] text-slate-400 mt-1">Max wait per request</span>
        </div>

        {/* 4. Total Requests (Optional Cap) */}
        <div className="p-3 rounded-lg bg-slate-950/60 border border-slate-800 flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-1.5">
            <span className="font-medium">Request Cap</span>
            <label className="flex items-center gap-1 cursor-pointer">
              <input
                type="checkbox"
                checked={limitRequests}
                disabled={isRunning}
                onChange={(e) => {
                  setLimitRequests(e.target.checked);
                  setTotalRequests(e.target.checked ? 500 : undefined);
                }}
                className="w-3 h-3 rounded accent-cyan-400 cursor-pointer"
              />
              <span className="text-[10px] text-slate-400">Limit</span>
            </label>
          </div>
          <input
            type="number"
            min={10}
            max={10000}
            step={50}
            disabled={!limitRequests || isRunning}
            value={totalRequests || 500}
            onChange={(e) => setTotalRequests(parseInt(e.target.value, 10) || 100)}
            className={`w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs font-mono text-slate-200 focus:outline-none ${
              !limitRequests ? 'opacity-40 cursor-not-allowed' : ''
            }`}
          />
          <span className="text-[10px] text-slate-400 mt-1">
            {limitRequests ? 'Stops after request count' : 'Duration-based run'}
          </span>
        </div>

        {/* 5. Request Delay / Throttle */}
        <div className="p-3 rounded-lg bg-slate-950/60 border border-slate-800 flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-1.5">
            <span className="font-medium">Worker Delay</span>
            <span className="font-mono text-cyan-400 font-bold">{delayMs}ms</span>
          </div>
          <select
            value={delayMs}
            disabled={isRunning}
            onChange={(e) => setDelayMs(parseInt(e.target.value, 10))}
            className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs font-mono text-slate-200 focus:outline-none"
          >
            <option value={0}>0 ms (Full speed / blast)</option>
            <option value={20}>20 ms pacing</option>
            <option value={50}>50 ms</option>
            <option value={100}>100 ms</option>
            <option value={250}>250 ms</option>
            <option value={500}>500 ms</option>
          </select>
          <span className="text-[10px] text-slate-400 mt-1">Pacing interval per user</span>
        </div>
      </div>

      {/* Tabs: Headers, Body (JSON), Presets/Save */}
      <div className="pt-2 border-t border-slate-800">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-1 p-1 bg-slate-950 rounded-lg border border-slate-800/80">
            <button
              type="button"
              onClick={() => setActiveTab('headers')}
              className={`flex items-center gap-1.5 px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                activeTab === 'headers'
                  ? 'bg-slate-800 text-cyan-400 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <ListPlus className="w-3.5 h-3.5" />
              <span>Headers ({headers.filter((h) => h.enabled && h.key).length})</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('body')}
              className={`flex items-center gap-1.5 px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                activeTab === 'body'
                  ? 'bg-slate-800 text-cyan-400 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Code2 className="w-3.5 h-3.5" />
              <span>JSON Body {['POST', 'PUT', 'PATCH'].includes(method) ? '(Active)' : '(Inactive)'}</span>
            </button>
          </div>

          <button
            type="button"
            onClick={onSaveScenario}
            className="flex items-center gap-1 text-xs text-slate-400 hover:text-cyan-300 transition-colors"
          >
            <Sliders className="w-3.5 h-3.5" />
            <span>Save Scenario</span>
          </button>
        </div>

        {/* Tab 1: Headers */}
        {activeTab === 'headers' && (
          <div className="space-y-2">
            <div className="max-h-48 overflow-y-auto space-y-1.5 pr-1">
              {headers.map((header) => (
                <div key={header.id} className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={header.enabled}
                    onChange={(e) => updateHeader(header.id, 'enabled', e.target.checked)}
                    disabled={isRunning}
                    className="w-3.5 h-3.5 rounded accent-cyan-400 cursor-pointer"
                  />
                  <input
                    type="text"
                    value={header.key}
                    placeholder="Header key (e.g. Authorization)"
                    disabled={isRunning}
                    onChange={(e) => updateHeader(header.id, 'key', e.target.value)}
                    className="flex-1 bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-xs font-mono text-slate-200 focus:outline-none focus:border-cyan-500"
                  />
                  <input
                    type="text"
                    value={header.value}
                    placeholder="Value (e.g. Bearer token...)"
                    disabled={isRunning}
                    onChange={(e) => updateHeader(header.id, 'value', e.target.value)}
                    className="flex-1 bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-xs font-mono text-slate-200 focus:outline-none focus:border-cyan-500"
                  />
                  <button
                    type="button"
                    onClick={() => removeHeader(header.id)}
                    disabled={isRunning}
                    className="p-1.5 text-slate-500 hover:text-rose-400 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>

            <div className="flex items-center justify-between pt-1">
              <button
                type="button"
                onClick={addHeader}
                disabled={isRunning}
                className="flex items-center gap-1 text-xs text-cyan-400 hover:text-cyan-300 font-medium cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Custom Header</span>
              </button>

              <div className="flex items-center gap-2 text-xs">
                <span className="text-slate-400">Add Preset:</span>
                <button
                  type="button"
                  onClick={() =>
                    setHeaders((prev) => [
                      ...prev,
                      { id: Math.random().toString(), key: 'Content-Type', value: 'application/json', enabled: true },
                    ])
                  }
                  className="text-slate-400 hover:text-slate-200 underline underline-offset-2"
                >
                  Content-Type: JSON
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setHeaders((prev) => [
                      ...prev,
                      { id: Math.random().toString(), key: 'Authorization', value: 'Bearer YOUR_TOKEN', enabled: true },
                    ])
                  }
                  className="text-slate-400 hover:text-slate-200 underline underline-offset-2"
                >
                  Bearer Auth
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: Body (JSON) */}
        {activeTab === 'body' && (
          <div className="space-y-2">
            {!['POST', 'PUT', 'PATCH'].includes(method) && (
              <div className="p-2 rounded bg-amber-950/30 border border-amber-800/40 text-amber-300 text-xs flex items-center gap-2">
                <Info className="w-4 h-4 shrink-0 text-amber-400" />
                <span>Notice: Current method is {method}. Request bodies are typically sent with POST, PUT, or PATCH.</span>
              </div>
            )}
            <div className="relative">
              <textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                disabled={isRunning}
                rows={5}
                placeholder='{\n  "key": "value"\n}'
                className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-xs font-mono text-slate-200 focus:outline-none focus:border-cyan-500 selection:bg-cyan-500/20"
              />
              <div className="absolute top-2 right-2 flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={formatJsonBody}
                  className="px-2 py-1 text-[11px] font-mono bg-slate-800 hover:bg-slate-700 text-slate-300 rounded border border-slate-700 transition-colors"
                >
                  Prettify JSON
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
