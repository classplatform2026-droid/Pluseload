import { validateTargetUrl } from './validateUrl';

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
  intervalSeconds: number; // e.g. 300 for 5 minutes
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

export class CronManager {
  private tasks: Map<string, ScheduledTask> = new Map();
  private timer: NodeJS.Timeout | null = null;
  private isProcessing = false;

  constructor() {
    this.startLoop();
  }

  private startLoop() {
    if (this.timer) return;
    // Check every second for scheduled tasks that are due
    this.timer = setInterval(() => {
      this.tick();
    }, 1000);
  }

  private async tick() {
    if (this.isProcessing) return;
    this.isProcessing = true;
    const now = Date.now();

    const tasksToRun: ScheduledTask[] = [];
    for (const task of this.tasks.values()) {
      if (task.isActive && task.nextRunTime && now >= task.nextRunTime) {
        tasksToRun.push(task);
      }
    }

    for (const task of tasksToRun) {
      // Advance nextRunTime immediately so it doesn't get double-executed
      task.nextRunTime = Date.now() + task.intervalSeconds * 1000;
      this.executeHit(task).catch((err) => {
        console.error(`Scheduled hit error for task ${task.id}:`, err);
      });
    }

    this.isProcessing = false;
  }

  public async executeHit(task: ScheduledTask): Promise<CronHitLog> {
    const start = Date.now();
    const controller = new AbortController();
    const timeout = Math.min(30000, Math.max(1000, task.timeoutMs || 8000));
    const timeoutId = setTimeout(() => controller.abort('TIMEOUT'), timeout);

    let status = 0;
    let statusText = 'Error';
    let bytes = 0;
    let errorMsg: string | undefined;

    try {
      const headers: Record<string, string> = {
        'User-Agent': 'PulseLoad-ScheduledPinger/1.0',
        ...task.headers,
      };

      const options: RequestInit = {
        method: task.method,
        headers,
        signal: controller.signal,
      };

      if (['POST', 'PUT', 'PATCH'].includes(task.method) && task.body) {
        options.body = task.body;
      }

      const res = await fetch(task.url, options);
      clearTimeout(timeoutId);
      status = res.status;
      statusText = res.statusText || `${res.status}`;

      try {
        const text = await res.text();
        bytes = Buffer.byteLength(text, 'utf8');
      } catch {
        bytes = 0;
      }

      if (res.ok || (status >= 200 && status < 400)) {
        task.successRuns++;
      } else {
        task.failedRuns++;
        errorMsg = `HTTP ${status}: ${statusText}`;
      }
    } catch (err: any) {
      clearTimeout(timeoutId);
      task.failedRuns++;
      if (err === 'TIMEOUT' || err?.name === 'AbortError' || controller.signal.reason === 'TIMEOUT') {
        status = 408;
        statusText = 'Request Timeout';
        errorMsg = `Exceeded timeout of ${timeout}ms`;
      } else {
        status = 0;
        statusText = 'Connection Failed';
        errorMsg = err?.message || 'Network error';
      }
    }

    const latencyMs = Math.max(1, Date.now() - start);
    task.lastRunTime = Date.now();
    task.lastStatus = status;
    task.lastLatencyMs = latencyMs;
    task.totalRuns++;

    const log: CronHitLog = {
      id: `log_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      timestamp: Date.now(),
      status,
      statusText,
      latencyMs,
      bytes,
      error: errorMsg,
    };

    task.recentLogs.unshift(log);
    if (task.recentLogs.length > 50) {
      task.recentLogs.pop();
    }

    return log;
  }

  public getTasks(): ScheduledTask[] {
    return Array.from(this.tasks.values()).sort((a, b) => b.createdAt - a.createdAt);
  }

  public getTask(id: string): ScheduledTask | undefined {
    return this.tasks.get(id);
  }

  public createTask(data: {
    name?: string;
    url: string;
    method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'HEAD';
    intervalSeconds: number;
    headers?: Record<string, string>;
    body?: string;
    timeoutMs?: number;
    runImmediately?: boolean;
  }): ScheduledTask {
    const id = `cron_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const intervalSeconds = Math.max(10, Math.min(86400, Number(data.intervalSeconds) || 300));
    const timeoutMs = Math.max(1000, Math.min(30000, Number(data.timeoutMs) || 8000));
    const method = data.method || 'GET';
    const name = data.name?.trim() || `${method} ${data.url}`;

    const now = Date.now();
    const task: ScheduledTask = {
      id,
      name,
      url: data.url,
      method,
      intervalSeconds,
      headers: data.headers || {},
      body: data.body,
      timeoutMs,
      isActive: true,
      createdAt: now,
      nextRunTime: data.runImmediately ? now : now + intervalSeconds * 1000,
      totalRuns: 0,
      successRuns: 0,
      failedRuns: 0,
      recentLogs: [],
    };

    this.tasks.set(id, task);

    // If requested to run immediately, trigger first execution
    if (data.runImmediately) {
      setTimeout(() => {
        this.executeHit(task).catch(() => {});
        task.nextRunTime = Date.now() + intervalSeconds * 1000;
      }, 50);
    }

    return task;
  }

  public toggleTask(id: string, active?: boolean): ScheduledTask | null {
    const task = this.tasks.get(id);
    if (!task) return null;

    task.isActive = typeof active === 'boolean' ? active : !task.isActive;
    if (task.isActive) {
      task.nextRunTime = Date.now() + task.intervalSeconds * 1000;
    } else {
      task.nextRunTime = undefined;
    }

    return task;
  }

  public deleteTask(id: string): boolean {
    return this.tasks.delete(id);
  }

  public clearLogs(id: string): boolean {
    const task = this.tasks.get(id);
    if (!task) return false;
    task.recentLogs = [];
    return true;
  }
}

export const cronManager = new CronManager();
