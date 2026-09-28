import React, { useState, useEffect, useRef } from 'react';
import { Sidebar } from './components/Sidebar';
import { Header } from './components/Header';
import { ConfigPanel } from './components/ConfigPanel';
import { TelemetryCards } from './components/TelemetryCards';
import { TestProgressBar } from './components/TestProgressBar';
import { Charts } from './components/Charts';
import { StatusCodeBreakdown } from './components/StatusCodeBreakdown';
import { RequestLogs } from './components/RequestLogs';
import { HistoryView } from './components/HistoryView';
import { ScenariosView } from './components/ScenariosView';
import { SettingsModal } from './components/SettingsModal';
import { PdfReportModal } from './components/PdfReportModal';
import {
  HttpMethod,
  HeaderItem,
  LoadTestSnapshot,
  LoadTestConfig,
  SavedScenario,
} from './types';

export default function App() {
  const [currentTab, setCurrentTab] = useState<'runner' | 'history' | 'scenarios'>('runner');
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [isCollapsedDesktop, setIsCollapsedDesktop] = useState(false);
  const [isPdfModalOpen, setIsPdfModalOpen] = useState(false);
  const [pdfReportSnapshot, setPdfReportSnapshot] = useState<LoadTestSnapshot | null>(null);

  // Config parameters
  const [url, setUrl] = useState('');
  const [method, setMethod] = useState<HttpMethod>('GET');
  const [concurrency, setConcurrency] = useState<number>(10);
  const [durationSeconds, setDurationSeconds] = useState<number>(10);
  const [timeoutMs, setTimeoutMs] = useState<number>(5000);
  const [totalRequests, setTotalRequests] = useState<number | undefined>(undefined);
  const [delayMs, setDelayMs] = useState<number>(0);
  const [headers, setHeaders] = useState<HeaderItem[]>([
    { id: '1', key: 'Accept', value: 'application/json, */*', enabled: true },
  ]);
  const [body, setBody] = useState<string>('');

  // Runtime State
  const [activeTestId, setActiveTestId] = useState<string | null>(null);
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [snapshot, setSnapshot] = useState<LoadTestSnapshot | null>(null);
  const [history, setHistory] = useState<LoadTestSnapshot[]>([]);
  const [scenarios, setScenarios] = useState<SavedScenario[]>([]);

  // Settings
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [maxConcurrency, setMaxConcurrency] = useState(50);
  const [defaultTimeout, setDefaultTimeout] = useState(5000);
  const [userAgent, setUserAgent] = useState('PulseLoad/1.0 (Stress Testing Agent)');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage((cur) => (cur === msg ? null : cur));
    }, 5000);
  };

  const eventSourceRef = useRef<EventSource | null>(null);
  const pollingRef = useRef<NodeJS.Timeout | null>(null);

  // Load saved configurations and history on first load
  useEffect(() => {
    // Load saved scenarios from localStorage
    const saved = localStorage.getItem('pulseload_scenarios');
    if (saved) {
      try {
        setScenarios(JSON.parse(saved));
      } catch {
        // ignore
      }
    }

    // Fetch initial history from server
    fetchHistory();
  }, []);

  const fetchHistory = async () => {
    try {
      const res = await fetch('/api/load-test/history');
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.history)) {
          setHistory(data.history);
        }
      }
    } catch {
      // ignore
    }
  };

  const cleanupStreams = () => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }
  };

  useEffect(() => {
    return () => cleanupStreams();
  }, []);

  // 1. Launch a load test
  const handleStartTest = async () => {
    if (!url.trim()) return;
    cleanupStreams();

    const activeHeaders: Record<string, string> = {};
    headers.forEach((h) => {
      if (h.enabled && h.key.trim()) {
        activeHeaders[h.key.trim()] = h.value;
      }
    });
    if (userAgent) {
      activeHeaders['User-Agent'] = userAgent;
    }

    try {
      const res = await fetch('/api/load-test/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url,
          method,
          concurrency: Math.min(maxConcurrency, concurrency),
          durationSeconds,
          timeoutMs: timeoutMs || defaultTimeout,
          totalRequests,
          delayBetweenRequestsMs: delayMs,
          headers: activeHeaders,
          body: ['POST', 'PUT', 'PATCH'].includes(method) ? body : undefined,
        }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        showToast(`Failed to start load test: ${errData.error || 'Server error'}`);
        return;
      }

      const data = await res.json();
      setActiveTestId(data.testId);
      setSnapshot(data.snapshot);
      setIsRunning(true);
      setCurrentTab('runner');

      // Connect SSE
      const sse = new EventSource(`/api/load-test/stream/${data.testId}`);
      eventSourceRef.current = sse;

      sse.onmessage = (event) => {
        try {
          const snap: LoadTestSnapshot = JSON.parse(event.data);
          setSnapshot(snap);

          if (['completed', 'stopped', 'failed'].includes(snap.status)) {
            setIsRunning(false);
            cleanupStreams();
            fetchHistory();
          }
        } catch (e) {
          console.error('SSE parse error:', e);
        }
      };

      sse.onerror = () => {
        // SSE connection dropped; fallback to polling
        cleanupStreams();
        pollingRef.current = setInterval(async () => {
          try {
            const pRes = await fetch(`/api/load-test/status/${data.testId}`);
            if (pRes.ok) {
              const snap: LoadTestSnapshot = await pRes.json();
              setSnapshot(snap);
              if (['completed', 'stopped', 'failed'].includes(snap.status)) {
                setIsRunning(false);
                cleanupStreams();
                fetchHistory();
              }
            }
          } catch {
            // ignore
          }
        }, 500);
      };
    } catch (err: any) {
      showToast(`Network error starting test: ${err?.message || 'Check server connection'}`);
    }
  };

  // 2. Stop an active test
  const handleStopTest = async () => {
    if (!activeTestId) return;
    try {
      const res = await fetch(`/api/load-test/stop/${activeTestId}`, { method: 'POST' });
      if (res.ok) {
        const data = await res.json();
        setSnapshot(data.snapshot);
      }
    } catch (err) {
      console.error('Error stopping test:', err);
    } finally {
      setIsRunning(false);
      cleanupStreams();
      fetchHistory();
    }
  };

  // Export JSON Report
  const handleExportJson = () => {
    if (!snapshot) return;
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(snapshot, null, 2));
    const dlAnchor = document.createElement('a');
    dlAnchor.setAttribute('href', dataStr);
    dlAnchor.setAttribute('download', `pulseload-report-${snapshot.id}.json`);
    dlAnchor.click();
  };

  // Export CSV Logs
  const handleExportCsv = () => {
    if (!snapshot || !snapshot.recentLogs || snapshot.recentLogs.length === 0) return;
    const headersLine = ['Req_ID', 'Time_Offset_ms', 'Method', 'URL', 'Status', 'Duration_ms', 'Bytes', 'Error'];
    const rows = snapshot.recentLogs.map((l) => [
      l.id,
      l.timeOffset,
      l.method,
      `"${l.url.replace(/"/g, '""')}"`,
      l.status,
      l.duration,
      l.bytes,
      `"${(l.error || '').replace(/"/g, '""')}"`,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headersLine.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const dlAnchor = document.createElement('a');
    dlAnchor.setAttribute('href', encodeURI(csvContent));
    dlAnchor.setAttribute('download', `pulseload-logs-${snapshot.id}.csv`);
    dlAnchor.click();
  };

  // Open Executive PDF / Print Report
  const handleOpenPdfReport = (snap?: LoadTestSnapshot) => {
    const targetSnap = snap || snapshot;
    if (!targetSnap) {
      showToast('No test results available to generate PDF report.');
      return;
    }
    setPdfReportSnapshot(targetSnap);
    setIsPdfModalOpen(true);
  };

  // Load a scenario or historical config into the runner
  const handleLoadConfig = (config: Omit<LoadTestConfig, 'id'> | LoadTestConfig) => {
    setUrl(config.url);
    setMethod(config.method);
    setConcurrency(config.concurrency);
    setDurationSeconds(config.durationSeconds);
    setTimeoutMs(config.timeoutMs);
    setTotalRequests(config.totalRequests);
    setDelayMs(config.delayBetweenRequestsMs || 0);

    if (config.headers) {
      const items: HeaderItem[] = Object.entries(config.headers).map(([k, v], idx) => ({
        id: String(idx + 1),
        key: k,
        value: v,
        enabled: true,
      }));
      setHeaders(items.length > 0 ? items : [{ id: '1', key: 'Accept', value: 'application/json', enabled: true }]);
    }
    if (config.body) {
      setBody(config.body);
    }
    setCurrentTab('runner');
  };

  // Save current runner configuration as a named scenario
  const handleSaveScenario = (name: string, description?: string) => {
    const activeHeaders: Record<string, string> = {};
    headers.forEach((h) => {
      if (h.enabled && h.key.trim()) {
        activeHeaders[h.key.trim()] = h.value;
      }
    });

    const newScenario: SavedScenario = {
      id: `scen_${Date.now()}`,
      name,
      description,
      createdAt: Date.now(),
      config: {
        url,
        method,
        headers: activeHeaders,
        body: ['POST', 'PUT', 'PATCH'].includes(method) ? body : undefined,
        concurrency,
        durationSeconds,
        timeoutMs,
        totalRequests,
        delayBetweenRequestsMs: delayMs,
      },
    };

    const updated = [newScenario, ...scenarios];
    setScenarios(updated);
    localStorage.setItem('pulseload_scenarios', JSON.stringify(updated));
  };

  const handleDeleteScenario = (id: string) => {
    const updated = scenarios.filter((s) => s.id !== id);
    setScenarios(updated);
    localStorage.setItem('pulseload_scenarios', JSON.stringify(updated));
  };

  const handleClearHistory = () => {
    setHistory([]);
  };

  return (
    <div className="min-h-screen bg-[#090d16] text-slate-100 flex flex-row font-sans selection:bg-cyan-500/30 selection:text-cyan-200">
      {/* Responsive Sidebar (Desktop persistent + Mobile slide-over) */}
      <Sidebar
        currentTab={currentTab}
        setCurrentTab={setCurrentTab}
        isRunning={isRunning}
        onStartTest={handleStartTest}
        onStopTest={handleStopTest}
        onOpenSettings={() => setIsSettingsOpen(true)}
        historyCount={history.length}
        scenariosCount={scenarios.length}
        snapshot={snapshot}
        isOpenMobile={isMobileSidebarOpen}
        setIsOpenMobile={setIsMobileSidebarOpen}
        isCollapsedDesktop={isCollapsedDesktop}
        setIsCollapsedDesktop={setIsCollapsedDesktop}
      />

      {/* Main Content Area with Fixed Top Navbar */}
      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-y-auto">
        {/* Top Header Fixed at top */}
        <Header
          currentTab={currentTab}
          isRunning={isRunning}
          onStartTest={handleStartTest}
          onStopTest={handleStopTest}
          onOpenSettings={() => setIsSettingsOpen(true)}
          onToggleMobileSidebar={() => setIsMobileSidebarOpen(true)}
          snapshot={snapshot}
        />

        {/* Viewport Content */}
        <main className="flex-1 w-full max-w-7xl mx-auto p-3 sm:p-5 lg:p-6 space-y-4 sm:space-y-5">
          {currentTab === 'runner' && (
            <div className="space-y-4 sm:space-y-5 animate-in fade-in duration-200">
              {/* 1. Request Configuration Panel */}
              <ConfigPanel
                url={url}
                setUrl={setUrl}
                method={method}
                setMethod={setMethod}
                concurrency={concurrency}
                setConcurrency={setConcurrency}
                durationSeconds={durationSeconds}
                setDurationSeconds={setDurationSeconds}
                timeoutMs={timeoutMs}
                setTimeoutMs={setTimeoutMs}
                totalRequests={totalRequests}
                setTotalRequests={setTotalRequests}
                delayMs={delayMs}
                setDelayMs={setDelayMs}
                headers={headers}
                setHeaders={setHeaders}
                body={body}
                setBody={setBody}
                isRunning={isRunning}
                onStartTest={handleStartTest}
                onStopTest={handleStopTest}
                onSaveScenario={() => setCurrentTab('scenarios')}
              />

              {/* 2. Real-time Progress Bar & Status */}
              <TestProgressBar
                snapshot={snapshot}
                isRunning={isRunning}
                onStop={handleStopTest}
                onExportJson={handleExportJson}
                onExportCsv={handleExportCsv}
                onOpenPdfReport={() => handleOpenPdfReport(snapshot || undefined)}
              />

              {/* 3. Executive Telemetry Cards */}
              <TelemetryCards snapshot={snapshot} isRunning={isRunning} />

              {/* 4. Telemetry Charts (Response Time & Success Rate) */}
              <Charts
                timeSeries={snapshot?.timeSeries || []}
                latency={snapshot?.latency || { min: 0, max: 0, avg: 0, p50: 0, p75: 0, p90: 0, p95: 0, p99: 0 }}
                isRunning={isRunning}
              />

              {/* 5. HTTP Status Code Breakdown */}
              <StatusCodeBreakdown
                statusCodes={snapshot?.statusCodes || {}}
                totalCompleted={snapshot?.totalCompleted || 0}
              />

              {/* 6. Recent Request Logs & Drilldown Modal */}
              <RequestLogs logs={snapshot?.recentLogs || []} />
            </div>
          )}

          {currentTab === 'history' && (
            <div className="animate-in fade-in duration-200">
              <HistoryView
                history={history}
                onLoadConfig={handleLoadConfig}
                onClearHistory={handleClearHistory}
                onOpenPdfReport={(run) => handleOpenPdfReport(run)}
              />
            </div>
          )}

          {currentTab === 'scenarios' && (
            <div className="animate-in fade-in duration-200">
              <ScenariosView
                scenarios={scenarios}
                onLoadScenario={handleLoadConfig}
                onDeleteScenario={handleDeleteScenario}
                onSaveCurrentAsScenario={handleSaveScenario}
              />
            </div>
          )}
        </main>

        {/* Minimal Footer adhering to anti-slop */}
        <footer className="border-t border-slate-900 bg-slate-950/80 px-4 sm:px-6 py-3.5 text-xs text-slate-400 flex flex-col sm:flex-row items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-300">PulseLoad</span>
            <span>·</span>
            <span>Real-time HTTP Load Testing & Observability</span>
          </div>
          <div className="flex items-center gap-4 text-slate-400 text-[11px] font-mono">
            <span>Worker Limit: {maxConcurrency} VUs</span>
            <span>·</span>
            <span>SSE Telemetry</span>
            <span>·</span>
            <span>Node.js Engine</span>
          </div>
        </footer>
      </div>

      {/* Toast Notification Banner */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 max-w-md bg-slate-900 border border-rose-500/80 text-rose-200 px-4 py-3 rounded-xl shadow-2xl flex items-center justify-between gap-3 text-xs font-mono animate-in slide-in-from-bottom duration-200">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-rose-400 animate-ping"></span>
            <span>{toastMessage}</span>
          </div>
          <button
            onClick={() => setToastMessage(null)}
            className="text-slate-400 hover:text-white px-1.5 py-0.5"
          >
            ✕
          </button>
        </div>
      )}

      {/* Settings Modal */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        maxConcurrency={maxConcurrency}
        setMaxConcurrency={setMaxConcurrency}
        defaultTimeout={defaultTimeout}
        setDefaultTimeout={setDefaultTimeout}
        userAgent={userAgent}
        setUserAgent={setUserAgent}
        onResetDefaults={() => {
          setMaxConcurrency(50);
          setDefaultTimeout(5000);
          setUserAgent('PulseLoad/1.0 (Stress Testing Agent)');
        }}
      />

      {/* Executive PDF / Print Report Modal */}
      <PdfReportModal
        isOpen={isPdfModalOpen}
        onClose={() => setIsPdfModalOpen(false)}
        snapshot={pdfReportSnapshot}
      />
    </div>
  );
}
