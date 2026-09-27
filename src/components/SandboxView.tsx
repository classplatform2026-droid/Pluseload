import React from 'react';
import { BookOpen, Zap, Clock, AlertTriangle, ArrowRight, Play, Server, Layers } from 'lucide-react';
import { HttpMethod } from '../types';

interface SandboxViewProps {
  onSelectSandbox: (config: {
    url: string;
    method: HttpMethod;
    concurrency: number;
    durationSeconds: number;
    headers?: Record<string, string>;
    body?: string;
  }) => void;
}

interface SandboxItem {
  id: string;
  title: string;
  method: HttpMethod;
  path: string;
  description: string;
  recommendedConcurrency: number;
  recommendedDuration: number;
  headers?: Record<string, string>;
  body?: string;
  icon: any;
  iconColor: string;
  badgeColor: string;
}

export const SandboxView: React.FC<SandboxViewProps> = ({ onSelectSandbox }) => {
  const origin = window.location.origin;

  const sandboxes: SandboxItem[] = [
    {
      id: 'fast',
      title: 'High-Throughput Fast 200 OK',
      method: 'GET' as HttpMethod,
      path: '/api/sandbox/fast-200',
      description:
        'Returns 200 OK instantly with sub-5ms latency. Best for measuring maximum raw concurrency and requests-per-second throughput without server bottlenecks.',
      recommendedConcurrency: 25,
      recommendedDuration: 10,
      icon: Zap,
      iconColor: 'text-amber-400',
      badgeColor: 'bg-emerald-950 text-emerald-300 border-emerald-800',
    },
    {
      id: 'delayed',
      title: 'Simulated Latency (Configurable Delay)',
      method: 'GET' as HttpMethod,
      path: '/api/sandbox/delayed?ms=80',
      description:
        'Introduces an artificial 80ms server processing delay. Demonstrates how virtual user queues behave under realistic database or external API wait times.',
      recommendedConcurrency: 15,
      recommendedDuration: 10,
      icon: Clock,
      iconColor: 'text-cyan-400',
      badgeColor: 'bg-emerald-950 text-emerald-300 border-emerald-800',
    },
    {
      id: 'flaky',
      title: 'Chaos & Error Resilience (Flaky 20%)',
      method: 'GET' as HttpMethod,
      path: '/api/sandbox/flaky?rate=0.2',
      description:
        'Randomly injects 500 Internal Server Errors at a 20% rate. Perfect for inspecting failure telemetry, error distributions, and status code visualizations.',
      recommendedConcurrency: 10,
      recommendedDuration: 10,
      icon: AlertTriangle,
      iconColor: 'text-rose-400',
      badgeColor: 'bg-amber-950 text-amber-300 border-amber-800',
    },
    {
      id: 'echo',
      title: 'Echo Inspection (Headers & Body)',
      method: 'POST' as HttpMethod,
      path: '/api/sandbox/echo',
      description:
        'Receives custom authorization headers, query params, and JSON bodies, and echoes them back in the payload. Great for verifying payload transmission.',
      recommendedConcurrency: 5,
      recommendedDuration: 10,
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer test-token-123' },
      body: JSON.stringify({ message: 'Hello from PulseLoad Stress Runner', timestamp: Date.now() }, null, 2),
      icon: Server,
      iconColor: 'text-blue-400',
      badgeColor: 'bg-blue-950 text-blue-300 border-blue-800',
    },
    {
      id: 'items',
      title: 'Stateful REST API Items Collection',
      method: 'POST' as HttpMethod,
      path: '/api/sandbox/items',
      description:
        'Simulates an in-memory CRUD microservice. Creates item entities with auto-generated IDs and prices, returning 201 Created.',
      recommendedConcurrency: 8,
      recommendedDuration: 10,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Benchmark Item Unit', price: 149.95, category: 'Hardware' }, null, 2),
      icon: Layers,
      iconColor: 'text-purple-400',
      badgeColor: 'bg-blue-950 text-blue-300 border-blue-800',
    },
  ];

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-bold text-white flex items-center gap-2">
          <BookOpen className="w-5 h-5 text-cyan-400" />
          <span>Built-in Target Sandbox APIs</span>
        </h2>
        <p className="text-xs text-slate-400">
          Zero-configuration local targets for testing load, latency, error spikes, and concurrency safely right inside your browser.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {sandboxes.map((s) => {
          const Icon = s.icon;
          const fullUrl = `${origin}${s.path}`;

          return (
            <div
              key={s.id}
              className="bg-slate-900/80 border border-slate-800 rounded-xl p-5 shadow-xl flex flex-col justify-between space-y-4"
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Icon className={`w-4 h-4 ${s.iconColor}`} />
                    <h3 className="text-sm font-bold text-white">{s.title}</h3>
                  </div>
                  <span
                    className={`text-xs font-mono font-bold px-2 py-0.5 rounded border ${s.badgeColor}`}
                  >
                    {s.method}
                  </span>
                </div>

                <div className="p-2 bg-slate-950 border border-slate-800 rounded-lg text-xs font-mono text-cyan-300 truncate">
                  {fullUrl}
                </div>

                <p className="text-xs text-slate-400 leading-relaxed">{s.description}</p>
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-slate-800/80">
                <div className="text-[11px] font-mono text-slate-400">
                  Recommended: <span className="text-slate-200">{s.recommendedConcurrency} VUs</span> ·{' '}
                  <span className="text-slate-200">{s.recommendedDuration}s</span>
                </div>

                <button
                  onClick={() =>
                    onSelectSandbox({
                      url: fullUrl,
                      method: s.method,
                      concurrency: s.recommendedConcurrency,
                      durationSeconds: s.recommendedDuration,
                      headers: s.headers,
                      body: s.body,
                    })
                  }
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-cyan-400 hover:text-cyan-300 text-xs font-semibold rounded-lg border border-slate-700 transition-colors cursor-pointer"
                >
                  <span>Load into Runner</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
