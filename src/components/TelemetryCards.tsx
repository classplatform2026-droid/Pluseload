import React from 'react';
import {
  Activity,
  CheckCircle,
  Clock,
  Gauge,
  Layers,
  ArrowDownToLine,
} from 'lucide-react';
import { LoadTestSnapshot } from '../types';

interface TelemetryCardsProps {
  snapshot: LoadTestSnapshot | null;
  isRunning: boolean;
}

export const TelemetryCards: React.FC<TelemetryCardsProps> = ({ snapshot, isRunning }) => {
  const total = snapshot?.totalCompleted || 0;
  const successful = snapshot?.successful || 0;
  const failed = snapshot?.failed || 0;
  const successRate = total > 0 ? ((successful / total) * 100).toFixed(1) : '100.0';

  const avgLatency = snapshot?.latency.avg || 0;
  const p95Latency = snapshot?.latency.p95 || 0;
  const minLatency = snapshot?.latency.min || 0;
  const maxLatency = snapshot?.latency.max || 0;
  const p90Latency = snapshot?.latency.p90 || 0;
  const p99Latency = snapshot?.latency.p99 || 0;

  const currentRps = snapshot?.currentRps || 0;
  const avgRps = snapshot?.avgRps || 0;

  const bytes = snapshot?.bytesReceived || 0;
  const formattedBytes =
    bytes > 1024 * 1024
      ? `${(bytes / (1024 * 1024)).toFixed(2)} MB`
      : `${(bytes / 1024).toFixed(1)} KB`;

  // Color logic for success rate
  const successRateNum = parseFloat(successRate);
  const successColorClass =
    total === 0
      ? 'text-slate-300'
      : successRateNum >= 98
      ? 'text-emerald-400'
      : successRateNum >= 90
      ? 'text-amber-400'
      : 'text-rose-400';

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-2.5 sm:gap-3">
      {/* 1. Total Requests */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-3 sm:p-3.5 shadow-md flex flex-col justify-between">
        <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
          <span className="font-medium text-[11px] sm:text-xs truncate">Total Requests</span>
          <Layers className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
        </div>
        <div className="text-xl sm:text-2xl font-bold font-mono tracking-tight text-white tabular-nums my-0.5 truncate">
          {total.toLocaleString()}
        </div>
        <div className="text-[10px] sm:text-[11px] text-slate-400 truncate">
          <span>Sent: {snapshot?.totalSent || 0}</span>
          <span className="mx-1">·</span>
          <span>Done: {total}</span>
        </div>
      </div>

      {/* 2. Success Rate */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-3 sm:p-3.5 shadow-md flex flex-col justify-between">
        <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
          <span className="font-medium text-[11px] sm:text-xs truncate">Success Rate</span>
          <CheckCircle className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
        </div>
        <div className={`text-xl sm:text-2xl font-bold font-mono tracking-tight tabular-nums my-0.5 truncate ${successColorClass}`}>
          {successRate}%
        </div>
        <div className="text-[10px] sm:text-[11px] text-slate-400 truncate font-mono">
          <span className="text-emerald-400">{successful} pass</span>
          <span className="mx-1">·</span>
          <span className={failed > 0 ? 'text-rose-400 font-semibold' : 'text-slate-400'}>
            {failed} fail
          </span>
        </div>
      </div>

      {/* 3. Average Latency */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-3 sm:p-3.5 shadow-md flex flex-col justify-between">
        <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
          <span className="font-medium text-[11px] sm:text-xs truncate">Avg Latency</span>
          <Clock className="w-3.5 h-3.5 text-amber-400 shrink-0" />
        </div>
        <div className="text-xl sm:text-2xl font-bold font-mono tracking-tight text-white tabular-nums my-0.5 truncate">
          {avgLatency} <span className="text-xs font-normal text-slate-400">ms</span>
        </div>
        <div className="text-[10px] sm:text-[11px] text-slate-400 truncate font-mono">
          <span>Min: {minLatency}ms</span>
          <span className="mx-1">·</span>
          <span>Max: {maxLatency}ms</span>
        </div>
      </div>

      {/* 4. P95 Latency */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-3 sm:p-3.5 shadow-md flex flex-col justify-between">
        <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
          <span className="font-medium text-[11px] sm:text-xs truncate">P95 Latency</span>
          <Activity className="w-3.5 h-3.5 text-purple-400 shrink-0" />
        </div>
        <div className="text-xl sm:text-2xl font-bold font-mono tracking-tight text-cyan-300 tabular-nums my-0.5 truncate">
          {p95Latency} <span className="text-xs font-normal text-slate-400">ms</span>
        </div>
        <div className="text-[10px] sm:text-[11px] text-slate-400 truncate font-mono">
          <span>P90: {p90Latency}ms</span>
          <span className="mx-1">·</span>
          <span>P99: {p99Latency}ms</span>
        </div>
      </div>

      {/* 5. Requests Per Second */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-3 sm:p-3.5 shadow-md flex flex-col justify-between">
        <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
          <span className="font-medium text-[11px] sm:text-xs truncate">Requests/Sec</span>
          <Gauge className="w-3.5 h-3.5 text-blue-400 shrink-0" />
        </div>
        <div className="text-xl sm:text-2xl font-bold font-mono tracking-tight text-emerald-300 tabular-nums my-0.5 truncate">
          {isRunning ? currentRps.toFixed(1) : avgRps.toFixed(1)}
        </div>
        <div className="text-[10px] sm:text-[11px] text-slate-400 truncate font-mono">
          <span>Avg: {avgRps.toFixed(1)} rps</span>
        </div>
      </div>

      {/* 6. Total Bytes Received */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-3 sm:p-3.5 shadow-md flex flex-col justify-between">
        <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
          <span className="font-medium text-[11px] sm:text-xs truncate">Data Received</span>
          <ArrowDownToLine className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
        </div>
        <div className="text-xl sm:text-2xl font-bold font-mono tracking-tight text-white tabular-nums my-0.5 truncate">
          {formattedBytes}
        </div>
        <div className="text-[11px] text-slate-400 truncate font-mono">
          {snapshot?.elapsedMs ? `${Math.round(bytes / (snapshot.elapsedMs / 1000) / 1024)} KB/s` : '0 KB/s'}
        </div>
      </div>
    </div>
  );
};
