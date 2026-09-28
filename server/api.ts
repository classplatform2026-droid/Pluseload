import express, { Request, Response } from 'express';
import { LoadTestConfig, LoadTestRunner, LoadTestSnapshot } from './loadRunner';

export const apiRouter = express.Router();

// In-memory registry of active and completed test runners
const runners = new Map<string, LoadTestRunner>();
const history: LoadTestSnapshot[] = [];

// SSRF & Safety Validation
function validateTargetUrl(rawUrl: string): { valid: boolean; error?: string; url?: string } {
  try {
    const parsed = new URL(rawUrl);
    if (!['http:', 'https:'].includes(parsed.protocol)) {
      return { valid: false, error: 'Protocol must be http: or https:' };
    }
    const hostname = parsed.hostname.toLowerCase();

    // Block cloud metadata services
    if (
      hostname === '169.254.169.254' ||
      hostname === 'metadata.google.internal' ||
      hostname === '100.100.100.200'
    ) {
      return { valid: false, error: 'Target URL is a protected cloud metadata address' };
    }

    return { valid: true, url: parsed.toString() };
  } catch {
    return { valid: false, error: 'Invalid URL format' };
  }
}

// 1. Start a new load test
apiRouter.post('/load-test/start', (req: Request, res: Response) => {
  const body = req.body || {};
  const validation = validateTargetUrl(body.url);

  if (!validation.valid || !validation.url) {
    return res.status(400).json({ error: validation.error || 'Invalid target URL' });
  }

  const concurrency = Math.min(50, Math.max(1, parseInt(body.concurrency, 10) || 5));
  const durationSeconds = Math.min(120, Math.max(1, parseInt(body.durationSeconds, 10) || 10));
  const timeoutMs = Math.min(30000, Math.max(100, parseInt(body.timeoutMs, 10) || 5000));
  const totalRequests = body.totalRequests ? Math.min(10000, Math.max(1, parseInt(body.totalRequests, 10))) : undefined;
  const delayBetweenRequestsMs = Math.min(5000, Math.max(0, parseInt(body.delayBetweenRequestsMs, 10) || 0));

  const validMethods = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'];
  const method = validMethods.includes(body.method) ? body.method : 'GET';

  const testId = `test_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

  const config: LoadTestConfig = {
    id: testId,
    name: body.name || `${method} ${validation.url}`,
    url: validation.url,
    method,
    headers: typeof body.headers === 'object' && body.headers !== null ? body.headers : {},
    body: typeof body.body === 'string' ? body.body : undefined,
    concurrency,
    totalRequests,
    durationSeconds,
    timeoutMs,
    delayBetweenRequestsMs,
  };

  const runner = new LoadTestRunner(config);
  runners.set(testId, runner);

  // Kick off asynchronously in background
  runner.start().then(() => {
    // When finished, save to history
    const finalSnapshot = runner.getSnapshot();
    history.unshift(finalSnapshot);
    if (history.length > 30) history.pop();
  });

  return res.json({
    testId,
    status: 'started',
    config,
    snapshot: runner.getSnapshot(),
  });
});

// 2. Stop an active test
apiRouter.post('/load-test/stop/:testId', (req: Request, res: Response) => {
  const runner = runners.get(req.params.testId);
  if (!runner) {
    return res.status(404).json({ error: 'Load test not found' });
  }

  runner.stop();
  return res.json({
    testId: runner.id,
    status: runner.status,
    snapshot: runner.getSnapshot(),
  });
});

// 3. Get single snapshot
apiRouter.get('/load-test/status/:testId', (req: Request, res: Response) => {
  const runner = runners.get(req.params.testId);
  if (!runner) {
    const historical = history.find((h) => h.id === req.params.testId);
    if (historical) {
      return res.json(historical);
    }
    return res.status(404).json({ error: 'Load test not found' });
  }

  return res.json(runner.getSnapshot());
});

// 4. Server-Sent Events (SSE) Stream for real-time telemetry
apiRouter.get('/load-test/stream/:testId', (req: Request, res: Response) => {
  const runner = runners.get(req.params.testId);
  if (!runner) {
    return res.status(404).json({ error: 'Load test runner not found' });
  }

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders?.();

  const unsubscribe = runner.subscribe((snapshot) => {
    res.write(`data: ${JSON.stringify(snapshot)}\n\n`);
    if (['completed', 'stopped', 'failed'].includes(snapshot.status)) {
      setTimeout(() => {
        try {
          res.end();
        } catch {
          // ignore
        }
      }, 1000);
    }
  });

  req.on('close', () => {
    unsubscribe();
  });
});

// 5. Test history
apiRouter.get('/load-test/history', (_req: Request, res: Response) => {
  return res.json({
    history: history.slice(0, 30),
  });
});

// 6. Quick Health Check / Ping target
apiRouter.post('/load-test/ping', async (req: Request, res: Response) => {
  const { url, method = 'GET', headers = {}, body } = req.body || {};
  const validation = validateTargetUrl(url);

  if (!validation.valid || !validation.url) {
    return res.status(400).json({ error: validation.error || 'Invalid target URL' });
  }

  const start = Date.now();
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10000);

  try {
    const fetchOptions: RequestInit = {
      method,
      headers: {
        'User-Agent': 'PulseLoad-Ping/1.0',
        ...headers,
      },
      signal: controller.signal,
    };
    if (['POST', 'PUT', 'PATCH'].includes(method) && body) {
      fetchOptions.body = body;
    }

    const response = await fetch(validation.url, fetchOptions);
    clearTimeout(timeoutId);
    const latency = Date.now() - start;
    const resText = await response.text();
    const bytes = Buffer.byteLength(resText, 'utf8');

    const responseHeaders: Record<string, string> = {};
    response.headers.forEach((v, k) => {
      responseHeaders[k] = v;
    });

    return res.json({
      success: true,
      status: response.status,
      statusText: response.statusText,
      latency,
      bytes,
      headers: responseHeaders,
      preview: resText.length > 1000 ? resText.slice(0, 1000) + '... (truncated)' : resText,
    });
  } catch (err: any) {
    clearTimeout(timeoutId);
    return res.json({
      success: false,
      status: 0,
      statusText: 'Network / Connection Error',
      latency: Date.now() - start,
      bytes: 0,
      error: err?.message || 'Failed to ping target',
    });
  }
});

// 404 handler for undefined API routes
apiRouter.use((_req: Request, res: Response) => {
  return res.status(404).json({ error: 'Endpoint not found' });
});

