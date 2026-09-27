import React, { useState } from 'react';
import { Activity, Gauge, BarChart3, TrendingUp } from 'lucide-react';
import { TimeSeriesBucket, LatencyPercentiles } from '../types';

interface ChartsProps {
  timeSeries: TimeSeriesBucket[];
  latency: LatencyPercentiles;
  isRunning: boolean;
}

export const Charts: React.FC<ChartsProps> = ({ timeSeries, latency, isRunning }) => {
  const [hoveredPoint, setHoveredPoint] = useState<{
    bucket: TimeSeriesBucket;
    x: number;
    y: number;
    chart: 'latency' | 'throughput';
  } | null>(null);

  // SVG dimensions
  const svgWidth = 600;
  const svgHeight = 180;
  const padding = { top: 20, right: 20, bottom: 25, left: 45 };
  const innerWidth = svgWidth - padding.left - padding.right;
  const innerHeight = svgHeight - padding.top - padding.bottom;

  // 1. Prepare data for Latency Chart (Avg Latency & P95)
  const maxSec = Math.max(timeSeries.length - 1, 5);
  const maxLatencyVal = Math.max(
    ...timeSeries.map((d) => Math.max(d.avgLatency, d.p95Latency)),
    100
  );

  const getX = (sec: number) => padding.left + (sec / maxSec) * innerWidth;
  const getYLatency = (val: number) =>
    padding.top + innerHeight - (val / maxLatencyVal) * innerHeight;

  // Build path for Latency
  const avgPathPoints = timeSeries.map((d) => `${getX(d.second)},${getYLatency(d.avgLatency)}`);
  const p95PathPoints = timeSeries.map((d) => `${getX(d.second)},${getYLatency(d.p95Latency)}`);

  const avgPathString = avgPathPoints.length > 0 ? `M ${avgPathPoints.join(' L ')}` : '';
  const p95PathString = p95PathPoints.length > 0 ? `M ${p95PathPoints.join(' L ')}` : '';

  // Area under avg latency
  const avgAreaString =
    avgPathPoints.length > 0
      ? `${avgPathString} L ${getX(timeSeries[timeSeries.length - 1].second)},${padding.top + innerHeight} L ${padding.left},${padding.top + innerHeight} Z`
      : '';

  // 2. Prepare data for Throughput Chart (Success RPS vs Error RPS)
  const maxRpsVal = Math.max(...timeSeries.map((d) => d.rps), 10);
  const getYRps = (val: number) =>
    padding.top + innerHeight - (val / maxRpsVal) * innerHeight;

  const rpsPathPoints = timeSeries.map((d) => `${getX(d.second)},${getYRps(d.rps)}`);
  const rpsPathString = rpsPathPoints.length > 0 ? `M ${rpsPathPoints.join(' L ')}` : '';
  const rpsAreaString =
    rpsPathPoints.length > 0
      ? `${rpsPathString} L ${getX(timeSeries[timeSeries.length - 1].second)},${padding.top + innerHeight} L ${padding.left},${padding.top + innerHeight} Z`
      : '';

  // Percentile bars
  const maxPercentileVal = Math.max(latency.max, 50);
  const percentilesList = [
    { label: 'Min', val: latency.min, color: 'bg-emerald-500' },
    { label: 'P50 (Median)', val: latency.p50, color: 'bg-cyan-500' },
    { label: 'P75', val: latency.p75, color: 'bg-blue-500' },
    { label: 'P90', val: latency.p90, color: 'bg-indigo-500' },
    { label: 'P95', val: latency.p95, color: 'bg-purple-500' },
    { label: 'P99', val: latency.p99, color: 'bg-amber-500' },
    { label: 'Max', val: latency.max, color: 'bg-rose-500' },
  ];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      {/* Chart 1: Latency Over Time (Avg & P95) */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4 shadow-xl flex flex-col justify-between relative">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-200">
            <Activity className="w-4 h-4 text-cyan-400" />
            <span>Response Time Timeline (ms)</span>
          </div>
          <div className="flex items-center gap-3 text-[11px] font-mono">
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-0.5 bg-cyan-400 rounded-full"></span>
              <span className="text-slate-400">Avg</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-0.5 bg-purple-400 rounded-full"></span>
              <span className="text-slate-400">P95</span>
            </div>
          </div>
        </div>

        {/* SVG Canvas */}
        <div className="relative w-full overflow-hidden">
          <svg
            viewBox={`0 0 ${svgWidth} ${svgHeight}`}
            className="w-full h-auto select-none"
            onMouseLeave={() => setHoveredPoint(null)}
          >
            <defs>
              <linearGradient id="latencyGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#06b6d4" stopOpacity="0.25" />
                <stop offset="100%" stopColor="#06b6d4" stopOpacity="0.0" />
              </linearGradient>
            </defs>

            {/* Grid lines */}
            {[0, 0.25, 0.5, 0.75, 1].map((pct, i) => {
              const y = padding.top + innerHeight * (1 - pct);
              const val = Math.round(maxLatencyVal * pct);
              return (
                <g key={i}>
                  <line
                    x1={padding.left}
                    y1={y}
                    x2={svgWidth - padding.right}
                    y2={y}
                    stroke="#1e293b"
                    strokeDasharray="2 3"
                  />
                  <text
                    x={padding.left - 8}
                    y={y + 3}
                    textAnchor="end"
                    fill="#64748b"
                    fontSize="10"
                    fontFamily="monospace"
                  >
                    {val}ms
                  </text>
                </g>
              );
            })}

            {/* Area & Lines */}
            {avgAreaString && <path d={avgAreaString} fill="url(#latencyGradient)" />}
            {avgPathString && (
              <path
                d={avgPathString}
                fill="none"
                stroke="#22d3ee"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            )}
            {p95PathString && (
              <path
                d={p95PathString}
                fill="none"
                stroke="#c084fc"
                strokeWidth="2"
                strokeDasharray="4 2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            )}

            {/* Hover Points & Interactivity */}
            {timeSeries.map((d, i) => {
              const cx = getX(d.second);
              const cyAvg = getYLatency(d.avgLatency);
              return (
                <g key={i}>
                  <circle
                    cx={cx}
                    cy={cyAvg}
                    r={hoveredPoint?.bucket.second === d.second && hoveredPoint?.chart === 'latency' ? 5 : 2}
                    fill="#22d3ee"
                    className="transition-all cursor-pointer"
                  />
                  {/* Invisible wide hit target */}
                  <rect
                    x={cx - 10}
                    y={padding.top}
                    width={20}
                    height={innerHeight}
                    fill="transparent"
                    className="cursor-pointer"
                    onMouseEnter={(e) => {
                      const rect = e.currentTarget.getBoundingClientRect();
                      setHoveredPoint({
                        bucket: d,
                        x: cx,
                        y: cyAvg,
                        chart: 'latency',
                      });
                    }}
                  />
                </g>
              );
            })}
          </svg>

          {/* Interactive Tooltip */}
          {hoveredPoint && hoveredPoint.chart === 'latency' && (
            <div
              className="absolute pointer-events-none bg-slate-950/95 border border-slate-700 rounded-lg p-2 text-xs font-mono shadow-xl z-20"
              style={{
                left: `${(hoveredPoint.x / svgWidth) * 100}%`,
                top: `${(hoveredPoint.y / svgHeight) * 100}%`,
                transform: 'translate(-50%, -120%)',
              }}
            >
              <div className="text-[10px] text-slate-400 font-semibold mb-0.5">
                Time: {hoveredPoint.bucket.second}s
              </div>
              <div className="text-cyan-400">Avg: {hoveredPoint.bucket.avgLatency}ms</div>
              <div className="text-purple-400">P95: {hoveredPoint.bucket.p95Latency}ms</div>
              <div className="text-slate-400 text-[10px]">Requests: {hoveredPoint.bucket.rps}</div>
            </div>
          )}
        </div>
      </div>

      {/* Chart 2: Throughput & Success Timeline (req/s) */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4 shadow-xl flex flex-col justify-between relative">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-200">
            <Gauge className="w-4 h-4 text-emerald-400" />
            <span>Throughput & Requests/Sec</span>
          </div>
          <div className="flex items-center gap-3 text-[11px] font-mono">
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-0.5 bg-emerald-400 rounded-full"></span>
              <span className="text-slate-400">RPS Volume</span>
            </div>
          </div>
        </div>

        {/* SVG Canvas */}
        <div className="relative w-full overflow-hidden">
          <svg
            viewBox={`0 0 ${svgWidth} ${svgHeight}`}
            className="w-full h-auto select-none"
            onMouseLeave={() => setHoveredPoint(null)}
          >
            <defs>
              <linearGradient id="rpsGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#10b981" stopOpacity="0.3" />
                <stop offset="100%" stopColor="#10b981" stopOpacity="0.0" />
              </linearGradient>
            </defs>

            {/* Grid lines */}
            {[0, 0.25, 0.5, 0.75, 1].map((pct, i) => {
              const y = padding.top + innerHeight * (1 - pct);
              const val = Math.round(maxRpsVal * pct);
              return (
                <g key={i}>
                  <line
                    x1={padding.left}
                    y1={y}
                    x2={svgWidth - padding.right}
                    y2={y}
                    stroke="#1e293b"
                    strokeDasharray="2 3"
                  />
                  <text
                    x={padding.left - 8}
                    y={y + 3}
                    textAnchor="end"
                    fill="#64748b"
                    fontSize="10"
                    fontFamily="monospace"
                  >
                    {val}/s
                  </text>
                </g>
              );
            })}

            {/* Area & Lines */}
            {rpsAreaString && <path d={rpsAreaString} fill="url(#rpsGradient)" />}
            {rpsPathString && (
              <path
                d={rpsPathString}
                fill="none"
                stroke="#10b981"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            )}

            {/* Interactive Points */}
            {timeSeries.map((d, i) => {
              const cx = getX(d.second);
              const cy = getYRps(d.rps);
              return (
                <g key={i}>
                  <circle
                    cx={cx}
                    cy={cy}
                    r={hoveredPoint?.bucket.second === d.second && hoveredPoint?.chart === 'throughput' ? 5 : 2}
                    fill="#10b981"
                    className="transition-all cursor-pointer"
                  />
                  <rect
                    x={cx - 10}
                    y={padding.top}
                    width={20}
                    height={innerHeight}
                    fill="transparent"
                    className="cursor-pointer"
                    onMouseEnter={() => {
                      setHoveredPoint({
                        bucket: d,
                        x: cx,
                        y: cy,
                        chart: 'throughput',
                      });
                    }}
                  />
                </g>
              );
            })}
          </svg>

          {/* Interactive Tooltip */}
          {hoveredPoint && hoveredPoint.chart === 'throughput' && (
            <div
              className="absolute pointer-events-none bg-slate-950/95 border border-slate-700 rounded-lg p-2 text-xs font-mono shadow-xl z-20"
              style={{
                left: `${(hoveredPoint.x / svgWidth) * 100}%`,
                top: `${(hoveredPoint.y / svgHeight) * 100}%`,
                transform: 'translate(-50%, -120%)',
              }}
            >
              <div className="text-[10px] text-slate-400 font-semibold mb-0.5">
                Time: {hoveredPoint.bucket.second}s
              </div>
              <div className="text-emerald-400 font-bold">{hoveredPoint.bucket.rps} req/sec</div>
              <div className="text-slate-300 text-[10px]">
                {hoveredPoint.bucket.successCount} success · {hoveredPoint.bucket.errorCount} fail
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Latency Percentile Distribution Ladder */}
      <div className="lg:col-span-2 bg-slate-900/80 border border-slate-800 rounded-xl p-4 shadow-xl">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-200">
            <BarChart3 className="w-4 h-4 text-purple-400" />
            <span>Response Time Percentile Distribution (Latency Ladder)</span>
          </div>
          <span className="text-[11px] font-mono text-slate-400">
            Calculated across all completed requests
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
          {percentilesList.map((p) => {
            const barPct = maxPercentileVal > 0 ? Math.min(100, (p.val / maxPercentileVal) * 100) : 0;
            return (
              <div
                key={p.label}
                className="bg-slate-950/70 border border-slate-800/80 rounded-lg p-2.5 flex flex-col justify-between"
              >
                <div className="text-[11px] text-slate-400 font-medium mb-1 truncate">{p.label}</div>
                <div className="text-lg font-bold font-mono text-white tabular-nums my-0.5">
                  {p.val} <span className="text-xs font-normal text-slate-400">ms</span>
                </div>
                <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden mt-1">
                  <div
                    className={`h-full ${p.color} transition-all duration-300`}
                    style={{ width: `${Math.max(4, barPct)}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
