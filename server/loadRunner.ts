/**
 * PulseLoad - In-Memory Load Test Engine
 */

export interface LoadTestConfig {
  id: string;
  name?: string;
  url: string;
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  headers: Record<string, string>;
  body?: string;
  concurrency: number; // 1 - 50
  totalRequests?: number; // Optional limit (e.g. 100 - 10000)
  durationSeconds: number; // 1 - 120
  timeoutMs: number; // 100 - 30000
  delayBetweenRequestsMs?: number; // 0 - 5000
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

// Calculate percentiles from array of sorted numbers
function calculatePercentiles(latencies: number[]): LatencyPercentiles {
  if (latencies.length === 0) {
    return { min: 0, max: 0, avg: 0, p50: 0, p75: 0, p90: 0, p95: 0, p99: 0 };
  }

  const sorted = [...latencies].sort((a, b) => a - b);
  const len = sorted.length;
  const sum = sorted.reduce((acc, v) => acc + v, 0);

  const getP = (p: number) => {
    const idx = Math.min(Math.floor((p / 100) * len), len - 1);
    return Math.round(sorted[idx]);
  };

  return {
    min: Math.round(sorted[0]),
    max: Math.round(sorted[len - 1]),
    avg: Math.round(sum / len),
    p50: getP(50),
    p75: getP(75),
    p90: getP(90),
    p95: getP(95),
    p99: getP(99),
  };
}

export class LoadTestRunner {
  public id: string;
  public config: LoadTestConfig;
  public status: 'idle' | 'running' | 'completed' | 'stopped' | 'failed' = 'idle';
  public errorMessage?: string;
  public startTime = 0;
  public endTime = 0;

  private abortController: AbortController = new AbortController();
  private totalSent = 0;
  private totalCompleted = 0;
  private successful = 0;
  private failed = 0;
  private bytesReceived = 0;
  private latencies: number[] = [];
  private statusCodes: Record<string, number> = {};
  private recentLogs: TestResultLog[] = [];
  private logCounter = 0;
  private activeWorkers = 0;

  // Second-by-second aggregated buckets for smooth charts
  private secondBuckets: Map<
    number,
    {
      count: number;
      latencies: number[];
      success: number;
      errors: number;
    }
  > = new Map();

  private subscribers: Set<(snapshot: LoadTestSnapshot) => void> = new Set();
  private tickerInterval: NodeJS.Timeout | null = null;
  private isStopping = false;

  constructor(config: LoadTestConfig) {
    this.id = config.id;
    this.config = config;
  }

  public subscribe(cb: (snapshot: LoadTestSnapshot) => void): () => void {
    this.subscribers.add(cb);
    // Send immediate snapshot
    cb(this.getSnapshot());
    return () => {
      this.subscribers.delete(cb);
    };
  }

  private broadcast() {
    const snapshot = this.getSnapshot();
    for (const sub of this.subscribers) {
      try {
        sub(snapshot);
      } catch (err) {
        console.error('Error broadcasting to subscriber:', err);
      }
    }
  }

  public async start(): Promise<void> {
    if (this.status === 'running') return;

    this.status = 'running';
    this.startTime = Date.now();
    this.abortController = new AbortController();
    this.isStopping = false;

    // Start 200ms telemetry ticker to broadcast metrics & update RPS
    this.tickerInterval = setInterval(() => {
      this.broadcast();
    }, 200);

    const concurrency = Math.max(1, Math.min(50, this.config.concurrency || 5));
    const durationMs = Math.max(1, Math.min(120, this.config.durationSeconds || 10)) * 1000;
    const maxRequests = this.config.totalRequests && this.config.totalRequests > 0
      ? Math.min(10000, this.config.totalRequests)
      : Infinity;

    // Spawn virtual user worker tasks
    const workerPromises: Promise<void>[] = [];
    this.activeWorkers = concurrency;

    for (let w = 0; w < concurrency; w++) {
      workerPromises.push(this.runWorker(w, durationMs, maxRequests));
    }

    // Wait for all workers to finish or time out
    try {
      await Promise.all(workerPromises);
    } catch (e: any) {
      if ((this.status as string) !== 'stopped') {
        this.status = 'failed';
        this.errorMessage = e?.message || 'Load test execution failed';
      }
    } finally {
      if (this.tickerInterval) {
        clearInterval(this.tickerInterval);
        this.tickerInterval = null;
      }
      this.endTime = Date.now();
      this.activeWorkers = 0;
      if (this.status === 'running') {
        this.status = 'completed';
      }
      this.broadcast();
    }
  }

  public stop(): void {
    if (this.status !== 'running' || this.isStopping) return;
    this.isStopping = true;
    this.status = 'stopped';
    this.abortController.abort();
    if (this.tickerInterval) {
      clearInterval(this.tickerInterval);
      this.tickerInterval = null;
    }
    this.endTime = Date.now();
    this.activeWorkers = 0;
    this.broadcast();
  }

  private async runWorker(workerId: number, durationMs: number, maxRequests: number): Promise<void> {
    const delay = this.config.delayBetweenRequestsMs || 0;

    while (
      this.status === 'running' &&
      !this.abortController.signal.aborted &&
      Date.now() - this.startTime < durationMs &&
      this.totalSent < maxRequests
    ) {
      // Claim request slot
      this.totalSent++;
      const currentReqIndex = ++this.logCounter;

      await this.executeSingleRequest(workerId, currentReqIndex);

      if (delay > 0 && !this.abortController.signal.aborted) {
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
    this.activeWorkers = Math.max(0, this.activeWorkers - 1);
  }

  private async executeSingleRequest(workerId: number, reqIndex: number): Promise<void> {
    const reqStart = Date.now();
    const timeOffset = reqStart - this.startTime;
    const secondBucketKey = Math.floor(timeOffset / 1000);

    const timeoutMs = Math.max(100, Math.min(30000, this.config.timeoutMs || 5000));
    const reqAbort = new AbortController();
    const timeoutTimer = setTimeout(() => {
      reqAbort.abort('TIMEOUT');
    }, timeoutMs);

    // Link parent abort
    const onParentAbort = () => reqAbort.abort('STOPPED');
    this.abortController.signal.addEventListener('abort', onParentAbort, { once: true });

    let status = 0;
    let statusText = 'Error';
    let bytes = 0;
    let errorMsg: string | undefined;

    try {
      const headers = { ...this.config.headers };
      if (!headers['User-Agent'] && !headers['user-agent']) {
        headers['User-Agent'] = 'PulseLoad/1.0 (Stress Testing Agent)';
      }

      const fetchOptions: RequestInit = {
        method: this.config.method,
        headers,
        signal: reqAbort.signal,
      };

      if (
        ['POST', 'PUT', 'PATCH'].includes(this.config.method) &&
        this.config.body !== undefined &&
        this.config.body !== ''
      ) {
        fetchOptions.body = this.config.body;
      }

      const res = await fetch(this.config.url, fetchOptions);
      status = res.status;
      statusText = res.statusText || `${res.status}`;

      const resText = await res.text();
      bytes = Buffer.byteLength(resText, 'utf8');

      // Record success vs fail
      if (res.ok || (status >= 200 && status < 400)) {
        this.successful++;
      } else {
        this.failed++;
        errorMsg = `HTTP ${status}: ${statusText}`;
      }
    } catch (err: any) {
      this.failed++;
      if (err?.name === 'AbortError' || err === 'TIMEOUT' || reqAbort.signal.reason === 'TIMEOUT') {
        status = 408;
        statusText = 'Request Timeout';
        errorMsg = `Timeout exceeded (${timeoutMs}ms)`;
      } else if (err === 'STOPPED' || this.abortController.signal.aborted) {
        status = 499;
        statusText = 'Client Closed Request';
        errorMsg = 'Test stopped by user';
      } else {
        status = 0;
        statusText = 'Network Error';
        errorMsg = err?.message || 'Connection failed';
      }
    } finally {
      clearTimeout(timeoutTimer);
      this.abortController.signal.removeEventListener('abort', onParentAbort);

      const reqDuration = Math.max(1, Date.now() - reqStart);
      this.totalCompleted++;
      this.bytesReceived += bytes;
      this.latencies.push(reqDuration);

      // Status code count
      const codeKey = status > 0 ? String(status) : 'Network Err';
      this.statusCodes[codeKey] = (this.statusCodes[codeKey] || 0) + 1;

      // Second bucket update
      let bucket = this.secondBuckets.get(secondBucketKey);
      if (!bucket) {
        bucket = { count: 0, latencies: [], success: 0, errors: 0 };
        this.secondBuckets.set(secondBucketKey, bucket);
      }
      bucket.count++;
      bucket.latencies.push(reqDuration);
      if (status >= 200 && status < 400) {
        bucket.success++;
      } else {
        bucket.errors++;
      }

      // Keep recent logs capped at 100 entries (prepend newest)
      const logEntry: TestResultLog = {
        id: reqIndex,
        timeOffset,
        method: this.config.method,
        url: this.config.url,
        status,
        statusText,
        duration: reqDuration,
        bytes,
        error: errorMsg,
        workerId,
      };

      this.recentLogs.unshift(logEntry);
      if (this.recentLogs.length > 100) {
        this.recentLogs.pop();
      }
    }
  }

  public getSnapshot(): LoadTestSnapshot {
    const now = this.endTime > 0 ? this.endTime : (this.startTime > 0 ? Date.now() : 0);
    const elapsedMs = this.startTime > 0 ? Math.max(0, now - this.startTime) : 0;
    const elapsedSeconds = Math.max(0.1, elapsedMs / 1000);

    const avgRps = Math.round((this.totalCompleted / elapsedSeconds) * 10) / 10;

    // Calculate current RPS from the last second bucket
    const currentSecondKey = Math.floor(elapsedMs / 1000);
    const lastBucket = this.secondBuckets.get(currentSecondKey) || this.secondBuckets.get(currentSecondKey - 1);
    const currentRps = this.status === 'running' && lastBucket ? lastBucket.count : (this.status === 'running' ? avgRps : 0);

    // Calculate percentiles
    const latencyStats = calculatePercentiles(this.latencies);

    // Build ordered time series
    const timeSeries: TimeSeriesBucket[] = [];
    const maxSec = Math.ceil(elapsedSeconds);
    for (let s = 0; s <= maxSec; s++) {
      const b = this.secondBuckets.get(s);
      if (b) {
        const sorted = [...b.latencies].sort((a, b) => a - b);
        const p95Idx = Math.min(Math.floor(0.95 * sorted.length), sorted.length - 1);
        const p95 = sorted.length > 0 ? Math.round(sorted[p95Idx]) : 0;
        const avg = sorted.length > 0 ? Math.round(sorted.reduce((acc, v) => acc + v, 0) / sorted.length) : 0;
        timeSeries.push({
          second: s,
          rps: b.count,
          avgLatency: avg,
          p95Latency: p95,
          successCount: b.success,
          errorCount: b.errors,
        });
      } else if (s < maxSec) {
        timeSeries.push({
          second: s,
          rps: 0,
          avgLatency: 0,
          p95Latency: 0,
          successCount: 0,
          errorCount: 0,
        });
      }
    }

    return {
      id: this.id,
      name: this.config.name || `Load Test - ${this.config.method} ${this.config.url}`,
      config: this.config,
      status: this.status,
      errorMessage: this.errorMessage,
      startTime: this.startTime,
      endTime: this.endTime > 0 ? this.endTime : undefined,
      elapsedMs,
      totalSent: this.totalSent,
      totalCompleted: this.totalCompleted,
      successful: this.successful,
      failed: this.failed,
      currentRps,
      avgRps,
      bytesReceived: this.bytesReceived,
      latency: latencyStats,
      statusCodes: { ...this.statusCodes },
      timeSeries,
      recentLogs: [...this.recentLogs],
      activeWorkers: this.activeWorkers,
    };
  }
}
