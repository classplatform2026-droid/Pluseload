export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

export interface HeaderItem {
  id: string;
  key: string;
  value: string;
  enabled: boolean;
}

export interface QueryParamItem {
  id: string;
  key: string;
  value: string;
  enabled: boolean;
}

export interface LoadTestConfig {
  id: string;
  name?: string;
  url: string;
  method: HttpMethod;
  headers: Record<string, string>;
  body?: string;
  concurrency: number; // 1 - 50
  totalRequests?: number; // optional limit
  durationSeconds: number; // 1 - 120s
  timeoutMs: number; // 100 - 30000ms
  delayBetweenRequestsMs?: number; // 0 - 5000ms
}

export interface TestResultLog {
  id: number;
  timeOffset: number; // ms from test start
  method: string;
  url: string;
  status: number;
  statusText: string;
  duration: number; // ms
  bytes: number;
  error?: string;
  workerId: number;
}

export interface LatencyPercentiles {
  min: number;
  max: number;
  avg: number;
  p50: number;
  p75: number;
  p90: number;
  p95: number;
  p99: number;
}

export interface TimeSeriesBucket {
  second: number;
  rps: number;
  avgLatency: number;
  p95Latency: number;
  successCount: number;
  errorCount: number;
}

export interface LoadTestSnapshot {
  id: string;
  name: string;
  config: LoadTestConfig;
  status: 'idle' | 'running' | 'completed' | 'stopped' | 'failed';
  errorMessage?: string;
  startTime: number;
  endTime?: number;
  elapsedMs: number;
  totalSent: number;
  totalCompleted: number;
  successful: number;
  failed: number;
  currentRps: number;
  avgRps: number;
  bytesReceived: number;
  latency: LatencyPercentiles;
  statusCodes: Record<string, number>;
  timeSeries: TimeSeriesBucket[];
  recentLogs: TestResultLog[];
  activeWorkers: number;
}

export interface SavedScenario {
  id: string;
  name: string;
  description?: string;
  config: Omit<LoadTestConfig, 'id'>;
  createdAt: number;
}

export interface PingResult {
  success: boolean;
  status: number;
  statusText: string;
  latency: number;
  bytes: number;
  headers?: Record<string, string>;
  preview?: string;
  error?: string;
}

export interface CronHitLog {
  id: string;
  timestamp: number;
  status: number;
  statusText: string;
  latencyMs: number;
  bytes: number;
  error?: string;
}

export interface ScheduledTask {
  id: string;
  name: string;
  url: string;
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'HEAD';
  intervalSeconds: number;
  headers: Record<string, string>;
  body?: string;
  timeoutMs: number;
  isActive: boolean;
  createdAt: number;
  lastRunTime?: number;
  nextRunTime?: number;
  totalRuns: number;
  successRuns: number;
  failedRuns: number;
  lastStatus?: number;
  lastLatencyMs?: number;
  recentLogs: CronHitLog[];
}


