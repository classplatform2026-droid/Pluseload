import React, { useState } from 'react';
import { Terminal, Search, ExternalLink, Filter } from 'lucide-react';
import { TestResultLog } from '../types';
import { LogDetailModal } from './LogDetailModal';

interface RequestLogsProps {
  logs: TestResultLog[];
}

export const RequestLogs: React.FC<RequestLogsProps> = ({ logs }) => {
  const [filter, setFilter] = useState<'all' | '2xx' | '4xx' | '5xx' | 'err'>('all');
  const [search, setSearch] = useState('');
  const [selectedLog, setSelectedLog] = useState<TestResultLog | null>(null);

  const filteredLogs = logs.filter((log) => {
    // Status filter
    if (filter === '2xx' && (log.status < 200 || log.status >= 300)) return false;
    if (filter === '4xx' && (log.status < 400 || log.status >= 500)) return false;
    if (filter === '5xx' && (log.status < 500 || log.status >= 600)) return false;
    if (filter === 'err' && log.status >= 200 && log.status < 400) return false;

    // Search filter
    if (search.trim()) {
      const q = search.toLowerCase();
      return (
        log.url.toLowerCase().includes(q) ||
        log.method.toLowerCase().includes(q) ||
        String(log.status).includes(q) ||
        (log.error && log.error.toLowerCase().includes(q))
      );
    }
    return true;
  });

  const getStatusBadge = (status: number) => {
    if (status >= 200 && status < 300) {
      return 'bg-emerald-950/60 text-emerald-400 border-emerald-800';
    }
    if (status >= 300 && status < 400) {
      return 'bg-blue-950/60 text-blue-400 border-blue-800';
    }
    if (status >= 400 && status < 500) {
      return 'bg-amber-950/60 text-amber-400 border-amber-800';
    }
    return 'bg-rose-950/60 text-rose-400 border-rose-800';
  };

  const getLatencyColor = (ms: number) => {
    if (ms < 50) return 'text-emerald-400';
    if (ms < 150) return 'text-cyan-400';
    if (ms < 400) return 'text-amber-400';
    return 'text-rose-400';
  };

  return (
    <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4 shadow-xl space-y-3">
      {/* Title & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
        <div className="flex items-center gap-2 text-xs font-semibold text-slate-200">
          <Terminal className="w-4 h-4 text-cyan-400" />
          <span>Real-time Request Stream</span>
          <span className="text-[11px] font-mono text-slate-400">
            (Showing latest {filteredLogs.length} of {logs.length})
          </span>
        </div>

        {/* Filter Buttons & Search */}
        <div className="flex items-center gap-2">
          {/* Segmented status filter */}
          <div className="flex items-center p-0.5 bg-slate-950 rounded-lg border border-slate-800 text-[11px] font-medium">
            <button
              onClick={() => setFilter('all')}
              className={`px-2 py-0.5 rounded transition-colors ${
                filter === 'all' ? 'bg-slate-800 text-cyan-300' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              All
            </button>
            <button
              onClick={() => setFilter('2xx')}
              className={`px-2 py-0.5 rounded transition-colors ${
                filter === '2xx' ? 'bg-slate-800 text-emerald-400' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              2xx
            </button>
            <button
              onClick={() => setFilter('4xx')}
              className={`px-2 py-0.5 rounded transition-colors ${
                filter === '4xx' ? 'bg-slate-800 text-amber-400' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              4xx
            </button>
            <button
              onClick={() => setFilter('5xx')}
              className={`px-2 py-0.5 rounded transition-colors ${
                filter === '5xx' ? 'bg-slate-800 text-rose-400' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              5xx
            </button>
            <button
              onClick={() => setFilter('err')}
              className={`px-2 py-0.5 rounded transition-colors ${
                filter === 'err' ? 'bg-slate-800 text-rose-300' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Errors
            </button>
          </div>

          {/* Search box */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search logs..."
              className="w-32 sm:w-44 bg-slate-950 border border-slate-800 rounded-lg pl-8 pr-2 py-1 text-xs text-slate-200 focus:outline-none focus:border-cyan-500 font-mono"
            />
          </div>
        </div>
      </div>

      {/* Table Content */}
      <div className="overflow-x-auto border border-slate-800/80 rounded-lg">
        <table className="w-full min-w-[640px] text-left text-xs font-mono">
          <thead className="bg-slate-950 text-slate-400 border-b border-slate-800 select-none">
            <tr>
              <th className="py-2 px-3 font-medium">Req #</th>
              <th className="py-2 px-3 font-medium">Offset</th>
              <th className="py-2 px-3 font-medium">Method</th>
              <th className="py-2 px-3 font-medium">Status</th>
              <th className="py-2 px-3 font-medium text-right">Latency</th>
              <th className="py-2 px-3 font-medium text-right">Size</th>
              <th className="py-2 px-3 font-medium text-center">User</th>
              <th className="py-2 px-3 font-medium text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/50 bg-slate-900/40">
            {filteredLogs.length === 0 ? (
              <tr>
                <td colSpan={8} className="py-8 text-center text-slate-500 font-sans">
                  {logs.length === 0
                    ? 'No requests recorded yet. Start a load test to stream live results.'
                    : 'No requests match your current filters.'}
                </td>
              </tr>
            ) : (
              filteredLogs.slice(0, 50).map((log) => (
                <tr
                  key={log.id}
                  onClick={() => setSelectedLog(log)}
                  className="hover:bg-slate-800/60 cursor-pointer transition-colors group"
                >
                  <td className="py-2 px-3 text-slate-400 tabular-nums">#{log.id}</td>
                  <td className="py-2 px-3 text-slate-400 tabular-nums">
                    +{(log.timeOffset / 1000).toFixed(2)}s
                  </td>
                  <td className="py-2 px-3 font-bold text-slate-300">{log.method}</td>
                  <td className="py-2 px-3">
                    <span
                      className={`px-1.5 py-0.5 rounded border text-[11px] font-bold ${getStatusBadge(
                        log.status
                      )}`}
                    >
                      {log.status || 'ERR'} {log.statusText}
                    </span>
                  </td>
                  <td
                    className={`py-2 px-3 text-right font-bold tabular-nums ${getLatencyColor(
                      log.duration
                    )}`}
                  >
                    {log.duration} ms
                  </td>
                  <td className="py-2 px-3 text-right text-slate-300 tabular-nums">
                    {(log.bytes / 1024).toFixed(1)} KB
                  </td>
                  <td className="py-2 px-3 text-center text-slate-400">VU #{log.workerId + 1}</td>
                  <td className="py-2 px-3 text-right">
                    <span className="text-slate-400 group-hover:text-cyan-400 text-[11px] inline-flex items-center gap-1">
                      <span>View</span>
                      <ExternalLink className="w-3 h-3" />
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Detail Modal */}
      {selectedLog && <LogDetailModal log={selectedLog} onClose={() => setSelectedLog(null)} />}
    </div>
  );
};
