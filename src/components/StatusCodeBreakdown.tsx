import React, { useState } from 'react';
import { PieChart, CheckCircle, AlertTriangle, XCircle, Clock, ShieldAlert } from 'lucide-react';

interface StatusCodeBreakdownProps {
  statusCodes: Record<string, number>;
  totalCompleted: number;
}

export const StatusCodeBreakdown: React.FC<StatusCodeBreakdownProps> = ({
  statusCodes,
  totalCompleted,
}) => {
  const [hoveredCode, setHoveredCode] = useState<string | null>(null);

  const codes = Object.entries(statusCodes).sort((a, b) => b[1] - a[1]);

  const getCodeMeta = (code: string) => {
    const num = parseInt(code, 10);
    if (code === 'Network Err') {
      return {
        category: 'Network Error',
        color: '#ef4444', // Red-500
        bgClass: 'bg-red-500',
        textColor: 'text-red-400',
        badgeColor: 'bg-red-950/70 border-red-800 text-red-300',
        icon: ShieldAlert,
        name: 'Connection Failed',
      };
    }
    if (num === 408) {
      return {
        category: 'Timeout',
        color: '#f59e0b', // Amber-500
        bgClass: 'bg-amber-500',
        textColor: 'text-amber-400',
        badgeColor: 'bg-amber-950/70 border-amber-800 text-amber-300',
        icon: Clock,
        name: 'Request Timeout',
      };
    }
    if (num >= 200 && num < 300) {
      return {
        category: '2xx Success',
        color: '#10b981', // Emerald-500
        bgClass: 'bg-emerald-500',
        textColor: 'text-emerald-400',
        badgeColor: 'bg-emerald-950/70 border-emerald-800 text-emerald-300',
        icon: CheckCircle,
        name: num === 200 ? 'OK' : num === 201 ? 'Created' : 'Accepted',
      };
    }
    if (num >= 300 && num < 400) {
      return {
        category: '3xx Redirect',
        color: '#3b82f6', // Blue-500
        bgClass: 'bg-blue-500',
        textColor: 'text-blue-400',
        badgeColor: 'bg-blue-950/70 border-blue-800 text-blue-300',
        icon: CheckCircle,
        name: 'Redirect',
      };
    }
    if (num >= 400 && num < 500) {
      return {
        category: '4xx Client Error',
        color: '#f97316', // Orange-500
        bgClass: 'bg-orange-500',
        textColor: 'text-orange-400',
        badgeColor: 'bg-orange-950/70 border-orange-800 text-orange-300',
        icon: AlertTriangle,
        name: num === 400 ? 'Bad Request' : num === 401 ? 'Unauthorized' : num === 404 ? 'Not Found' : 'Client Error',
      };
    }
    return {
      category: '5xx Server Error',
      color: '#f43f5e', // Rose-500
      bgClass: 'bg-rose-500',
      textColor: 'text-rose-400',
      badgeColor: 'bg-rose-950/70 border-rose-800 text-rose-300',
      icon: XCircle,
      name: num === 500 ? 'Internal Error' : num === 502 ? 'Bad Gateway' : num === 503 ? 'Service Unavailable' : 'Server Error',
    };
  };

  // SVG Circle / Donut Calculations
  const radius = 64;
  const strokeWidth = 18;
  const hoveredStrokeWidth = 22;
  const circumference = 2 * Math.PI * radius; // ~402.12

  // Compute segments offsets
  let cumulativeOffset = 0;
  const segments = codes.map(([code, count]) => {
    const meta = getCodeMeta(code);
    const pct = totalCompleted > 0 ? (count / totalCompleted) * 100 : 0;
    const strokeDash = (pct / 100) * circumference;
    const currentOffset = cumulativeOffset;
    cumulativeOffset += strokeDash;
    return {
      code,
      count,
      pct,
      meta,
      strokeDash,
      strokeOffset: currentOffset,
    };
  });

  // Dominant code or hovered code info for inside the circle
  const activeSegment = hoveredCode
    ? segments.find((s) => s.code === hoveredCode)
    : segments[0] || null;

  return (
    <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4 sm:p-5 shadow-xl space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
        <div className="flex items-center gap-2 text-xs font-semibold text-slate-200">
          <PieChart className="w-4 h-4 text-cyan-400" />
          <span>HTTP Status Code Breakdown</span>
        </div>
        <div className="flex items-center gap-2 text-[11px] font-mono text-slate-400">
          <span>{codes.length} distinct response states</span>
          <span>·</span>
          <span className="text-slate-200 font-bold">{totalCompleted.toLocaleString()} total</span>
        </div>
      </div>

      {totalCompleted === 0 ? (
        <div className="p-8 text-center text-xs text-slate-400 border border-dashed border-slate-800 rounded-lg">
          No requests processed yet. Launch a test to view circular status distribution.
        </div>
      ) : (
        <div className="flex flex-col lg:flex-row items-center gap-6 pt-1">
          {/* 1. Circle / Donut Chart */}
          <div className="relative flex items-center justify-center shrink-0">
            <svg
              className="w-48 h-48 sm:w-52 sm:h-52 transform -rotate-90 drop-shadow-lg"
              viewBox="0 0 160 160"
            >
              {/* Background circle track */}
              <circle
                cx="80"
                cy="80"
                r={radius}
                fill="transparent"
                stroke="#1e293b"
                strokeWidth={strokeWidth}
              />

              {/* Status Code Arcs */}
              {segments.map((seg) => {
                const isHovered = hoveredCode === seg.code;
                return (
                  <circle
                    key={seg.code}
                    cx="80"
                    cy="80"
                    r={radius}
                    fill="transparent"
                    stroke={seg.meta.color}
                    strokeWidth={isHovered ? hoveredStrokeWidth : strokeWidth}
                    strokeDasharray={`${seg.strokeDash} ${circumference}`}
                    strokeDashoffset={-seg.strokeOffset}
                    className="transition-all duration-300 cursor-pointer"
                    onMouseEnter={() => setHoveredCode(seg.code)}
                    onMouseLeave={() => setHoveredCode(null)}
                    style={{
                      filter: isHovered ? `drop-shadow(0 0 6px ${seg.meta.color})` : 'none',
                    }}
                  />
                );
              })}
            </svg>

            {/* Donut Center Display */}
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center px-4">
              {activeSegment ? (
                <>
                  <span
                    className="text-xs font-mono font-bold px-2 py-0.5 rounded-full border shadow-sm mb-0.5"
                    style={{
                      borderColor: activeSegment.meta.color,
                      color: activeSegment.meta.color,
                      backgroundColor: `${activeSegment.meta.color}15`,
                    }}
                  >
                    {activeSegment.code}
                  </span>
                  <span className="text-xl sm:text-2xl font-extrabold font-mono text-white tabular-nums">
                    {activeSegment.pct.toFixed(1)}%
                  </span>
                  <span className="text-[10px] text-slate-400 font-medium truncate max-w-[100px]">
                    {activeSegment.count.toLocaleString()} reqs
                  </span>
                </>
              ) : (
                <>
                  <span className="text-xs text-slate-400 font-medium">Total</span>
                  <span className="text-xl font-bold font-mono text-white">
                    {totalCompleted.toLocaleString()}
                  </span>
                </>
              )}
            </div>
          </div>

          {/* 2. Detailed Breakdown Grid & Badges */}
          <div className="flex-1 w-full space-y-2.5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {segments.map((seg) => {
                const isHovered = hoveredCode === seg.code;
                const Icon = seg.meta.icon;
                return (
                  <div
                    key={seg.code}
                    onMouseEnter={() => setHoveredCode(seg.code)}
                    onMouseLeave={() => setHoveredCode(null)}
                    className={`p-2.5 rounded-xl border transition-all cursor-pointer ${
                      isHovered
                        ? 'bg-slate-800/90 border-cyan-500/60 shadow-lg scale-[1.01]'
                        : 'bg-slate-950/70 border-slate-800/80 hover:bg-slate-900/90 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        {/* Colored indicator pill */}
                        <span
                          className="w-2.5 h-2.5 rounded-full shrink-0 shadow-sm"
                          style={{ backgroundColor: seg.meta.color }}
                        />
                        <span
                          className={`text-xs font-mono font-bold px-1.5 py-0.5 rounded border shrink-0 ${seg.meta.badgeColor}`}
                        >
                          {seg.code}
                        </span>
                        <div className="truncate">
                          <div className="text-xs font-semibold text-slate-200 truncate flex items-center gap-1">
                            <Icon className={`w-3.5 h-3.5 ${seg.meta.textColor} shrink-0`} />
                            <span>{seg.meta.name}</span>
                          </div>
                          <div className="text-[10px] text-slate-400 truncate">{seg.meta.category}</div>
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <div className="text-xs font-mono font-bold text-white tabular-nums">
                          {seg.count.toLocaleString()}
                        </div>
                        <div className="text-[10px] font-mono text-cyan-400 font-semibold">
                          {seg.pct.toFixed(1)}%
                        </div>
                      </div>
                    </div>

                    {/* Mini proportional bar for quick visual comparison */}
                    <div className="w-full h-1 bg-slate-800/90 rounded-full mt-2 overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-300"
                        style={{
                          width: `${seg.pct}%`,
                          backgroundColor: seg.meta.color,
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
