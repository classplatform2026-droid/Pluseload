import React, { useState } from 'react';
import { History, Play, Trash2, Download, CheckCircle, AlertTriangle, Layers, Clock, ArrowRight, FileText } from 'lucide-react';
import { LoadTestSnapshot, LoadTestConfig } from '../types';

interface HistoryViewProps {
  history: LoadTestSnapshot[];
  onLoadConfig: (config: LoadTestConfig) => void;
  onClearHistory: () => void;
  onOpenPdfReport?: (run: LoadTestSnapshot) => void;
}

export const HistoryView: React.FC<HistoryViewProps> = ({
  history,
  onLoadConfig,
  onClearHistory,
  onOpenPdfReport,
}) => {
  const [selectedRun, setSelectedRun] = useState<LoadTestSnapshot | null>(history[0] || null);

  const exportSingleJson = (run: LoadTestSnapshot) => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(run, null, 2));
    const dlAnchor = document.createElement('a');
    dlAnchor.setAttribute('href', dataStr);
    dlAnchor.setAttribute('download', `pulseload-run-${run.id}.json`);
    dlAnchor.click();
  };

  const exportCsv = (run: LoadTestSnapshot) => {
    if (!run.recentLogs || run.recentLogs.length === 0) return;
    const headers = ['Req_ID', 'Time_Offset_ms', 'Method', 'URL', 'Status', 'Duration_ms', 'Bytes', 'Error'];
    const rows = run.recentLogs.map((l) => [
      l.id,
      l.timeOffset,
      l.method,
      `"${l.url.replace(/"/g, '""')}"`,
      l.status,
      l.duration,
      l.bytes,
      `"${(l.error || '').replace(/"/g, '""')}"`,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const dlAnchor = document.createElement('a');
    dlAnchor.setAttribute('href', encodeURI(csvContent));
    dlAnchor.setAttribute('download', `pulseload-run-${run.id}.csv`);
    dlAnchor.click();
  };

  return (
    <div className="space-y-4">
      {/* Top Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <History className="w-5 h-5 text-cyan-400" />
            <span>Test Execution History</span>
          </h2>
          <p className="text-xs text-slate-400">
            Compare past test runs, re-apply parameters, or download comprehensive audit reports.
          </p>
        </div>

        {history.length > 0 && (
          <button
            onClick={onClearHistory}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-rose-300 hover:text-rose-200 bg-rose-950/40 hover:bg-rose-950 border border-rose-900/60 rounded-lg transition-colors cursor-pointer"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Clear History</span>
          </button>
        )}
      </div>

      {history.length === 0 ? (
        <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-12 text-center space-y-3">
          <History className="w-10 h-10 text-slate-600 mx-auto" />
          <h3 className="text-sm font-semibold text-slate-300">No Historical Runs Recorded</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            Once you run a load test, summary metrics, status distributions, and logs will be retained here for comparison.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* History List sidebar */}
          <div className="space-y-2 lg:col-span-1 max-h-[600px] overflow-y-auto pr-1">
            {history.map((run) => {
              const isSelected = selectedRun?.id === run.id;
              const successRate =
                run.totalCompleted > 0
                  ? ((run.successful / run.totalCompleted) * 100).toFixed(1)
                  : '0';

              return (
                <div
                  key={run.id}
                  onClick={() => setSelectedRun(run)}
                  className={`p-3 rounded-xl border cursor-pointer transition-all ${
                    isSelected
                      ? 'bg-slate-800/90 border-cyan-500/80 shadow-md'
                      : 'bg-slate-900/60 hover:bg-slate-850 border-slate-800'
                  }`}
                >
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="font-mono font-bold text-slate-200">
                      {run.config.method}
                    </span>
                    <span className="text-[10px] text-slate-400 font-mono">
                      {new Date(run.startTime).toLocaleTimeString()}
                    </span>
                  </div>

                  <div className="text-xs font-mono text-cyan-300 truncate mb-2">
                    {run.config.url}
                  </div>

                  <div className="grid grid-cols-3 gap-1 text-[11px] font-mono text-slate-400 pt-1.5 border-t border-slate-800">
                    <div>
                      <div className="text-[10px] text-slate-400">Total</div>
                      <div className="font-bold text-white">{run.totalCompleted}</div>
                    </div>
                    <div>
                      <div className="text-[10px] text-slate-400">Avg</div>
                      <div className="font-bold text-white">{run.latency.avg}ms</div>
                    </div>
                    <div>
                      <div className="text-[10px] text-slate-400">Pass</div>
                      <div
                        className={`font-bold ${
                          parseFloat(successRate) >= 95 ? 'text-emerald-400' : 'text-rose-400'
                        }`}
                      >
                        {successRate}%
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Selected Run Details View */}
          {selectedRun && (
            <div className="lg:col-span-2 bg-slate-900/80 border border-slate-800 rounded-xl p-5 shadow-xl space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-cyan-950 text-cyan-300 border border-cyan-800">
                      {selectedRun.config.method}
                    </span>
                    <h3 className="text-sm font-bold text-white font-mono truncate max-w-md">
                      {selectedRun.config.url}
                    </h3>
                  </div>
                  <div className="text-xs text-slate-400 mt-1">
                    Executed on {new Date(selectedRun.startTime).toLocaleString()} · Duration: {(selectedRun.elapsedMs / 1000).toFixed(1)}s
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => onLoadConfig(selectedRun.config)}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-950 bg-cyan-400 hover:bg-cyan-300 rounded-lg transition-colors cursor-pointer"
                  >
                    <Play className="w-3.5 h-3.5 fill-slate-950" />
                    <span>Re-run Config</span>
                  </button>
                  {onOpenPdfReport && (
                    <button
                      onClick={() => onOpenPdfReport(selectedRun)}
                      className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-cyan-300 hover:text-white bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg transition-colors cursor-pointer"
                      title="Open Executive PDF Report"
                    >
                      <FileText className="w-3.5 h-3.5 text-cyan-400" />
                      <span>PDF</span>
                    </button>
                  )}
                  <button
                    onClick={() => exportSingleJson(selectedRun)}
                    className="p-1.5 text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg transition-colors cursor-pointer"
                    title="Export JSON"
                  >
                    <Download className="w-4 h-4 text-cyan-400" />
                  </button>
                  <button
                    onClick={() => exportCsv(selectedRun)}
                    className="p-1.5 text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg transition-colors cursor-pointer"
                    title="Export CSV"
                  >
                    <Download className="w-4 h-4 text-emerald-400" />
                  </button>
                </div>
              </div>

              {/* Metrics Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 font-mono">
                <div className="bg-slate-950 p-3 rounded-lg border border-slate-800">
                  <div className="text-[10px] text-slate-400 font-sans">Total Requests</div>
                  <div className="text-xl font-bold text-white mt-0.5">
                    {selectedRun.totalCompleted.toLocaleString()}
                  </div>
                  <div className="text-[11px] text-slate-400">
                    {selectedRun.successful} pass · {selectedRun.failed} fail
                  </div>
                </div>

                <div className="bg-slate-950 p-3 rounded-lg border border-slate-800">
                  <div className="text-[10px] text-slate-400 font-sans">Avg Latency</div>
                  <div className="text-xl font-bold text-amber-300 mt-0.5">
                    {selectedRun.latency.avg} ms
                  </div>
                  <div className="text-[11px] text-slate-400">
                    Min {selectedRun.latency.min}ms · Max {selectedRun.latency.max}ms
                  </div>
                </div>

                <div className="bg-slate-950 p-3 rounded-lg border border-slate-800">
                  <div className="text-[10px] text-slate-400 font-sans">P95 Latency</div>
                  <div className="text-xl font-bold text-purple-300 mt-0.5">
                    {selectedRun.latency.p95} ms
                  </div>
                  <div className="text-[11px] text-slate-400">
                    P90: {selectedRun.latency.p90}ms · P99: {selectedRun.latency.p99}ms
                  </div>
                </div>

                <div className="bg-slate-950 p-3 rounded-lg border border-slate-800">
                  <div className="text-[10px] text-slate-400 font-sans">Avg Throughput</div>
                  <div className="text-xl font-bold text-emerald-400 mt-0.5">
                    {selectedRun.avgRps} rps
                  </div>
                  <div className="text-[11px] text-slate-400">
                    {selectedRun.config.concurrency} Concurrent VUs
                  </div>
                </div>
              </div>

              {/* Status Code summary */}
              <div>
                <div className="text-xs font-semibold text-slate-300 mb-2">
                  Status Code Breakdown
                </div>
                <div className="flex flex-wrap gap-2 font-mono text-xs">
                  {Object.entries(selectedRun.statusCodes).map(([code, count]) => (
                    <div
                      key={code}
                      className="px-2.5 py-1 bg-slate-950 border border-slate-800 rounded-md flex items-center gap-2"
                    >
                      <span className="font-bold text-slate-200">{code}</span>
                      <span className="text-slate-400">{count} reqs</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Recent logs sample from this run */}
              {selectedRun.recentLogs && selectedRun.recentLogs.length > 0 && (
                <div className="space-y-1.5 pt-2 border-t border-slate-800">
                  <div className="text-xs font-semibold text-slate-300">
                    Sample Logged Requests ({selectedRun.recentLogs.length} total)
                  </div>
                  <div className="max-h-52 overflow-y-auto border border-slate-800 rounded-lg">
                    <table className="w-full text-left text-xs font-mono">
                      <thead className="bg-slate-950 text-slate-400 border-b border-slate-800">
                        <tr>
                          <th className="p-2">#</th>
                          <th className="p-2">Method</th>
                          <th className="p-2">Status</th>
                          <th className="p-2 text-right">Duration</th>
                          <th className="p-2 text-right">Size</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/60 bg-slate-950/40">
                        {selectedRun.recentLogs.slice(0, 15).map((l) => (
                          <tr key={l.id}>
                            <td className="p-2 text-slate-400">#{l.id}</td>
                            <td className="p-2 text-slate-300">{l.method}</td>
                            <td className="p-2">
                              <span className="font-bold text-emerald-400">{l.status}</span>
                            </td>
                            <td className="p-2 text-right text-slate-200">{l.duration}ms</td>
                            <td className="p-2 text-right text-slate-400">{(l.bytes / 1024).toFixed(1)} KB</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
