type RequestMetricInput = {
  method: string;
  path: string;
  statusCode: number;
  durationMs: number;
};

type RouteMetric = {
  requests: number;
  errors: number;
  totalDurationMs: number;
  maxDurationMs: number;
};

function normalizePath(path: string) {
  return path
    .replace(/\?.*$/, '')
    .replace(/[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}/gi, ':id')
    .replace(/\/\d+/g, '/:id');
}

export class RequestMetricsStore {
  private readonly startedAt = Date.now();
  private totalRequests = 0;
  private totalErrors = 0;
  private totalDurationMs = 0;
  private readonly statusCounts = new Map<string, number>();
  private readonly routeMetrics = new Map<string, RouteMetric>();

  record(input: RequestMetricInput) {
    this.totalRequests += 1;
    this.totalDurationMs += input.durationMs;

    if (input.statusCode >= 400) {
      this.totalErrors += 1;
    }

    const statusFamily = `${Math.floor(input.statusCode / 100)}xx`;
    this.statusCounts.set(statusFamily, (this.statusCounts.get(statusFamily) ?? 0) + 1);

    const routeKey = `${input.method} ${normalizePath(input.path)}`;
    const routeMetric = this.routeMetrics.get(routeKey) ?? {
      requests: 0,
      errors: 0,
      totalDurationMs: 0,
      maxDurationMs: 0
    };

    routeMetric.requests += 1;
    routeMetric.totalDurationMs += input.durationMs;
    routeMetric.maxDurationMs = Math.max(routeMetric.maxDurationMs, input.durationMs);

    if (input.statusCode >= 400) {
      routeMetric.errors += 1;
    }

    this.routeMetrics.set(routeKey, routeMetric);
  }

  getSnapshot() {
    const uptimeSeconds = Math.floor((Date.now() - this.startedAt) / 1000);
    const averageResponseMs =
      this.totalRequests > 0 ? Number((this.totalDurationMs / this.totalRequests).toFixed(2)) : 0;

    return {
      uptimeSeconds,
      totals: {
        requests: this.totalRequests,
        errors: this.totalErrors,
        averageResponseMs
      },
      statusCounts: Object.fromEntries(this.statusCounts.entries()),
      routes: Array.from(this.routeMetrics.entries())
        .sort((left, right) => right[1].requests - left[1].requests)
        .slice(0, 20)
        .map(([route, metric]) => ({
          route,
          requests: metric.requests,
          errors: metric.errors,
          averageResponseMs: Number((metric.totalDurationMs / metric.requests).toFixed(2)),
          maxResponseMs: metric.maxDurationMs
        }))
    };
  }

  renderPrometheus() {
    const snapshot = this.getSnapshot();
    const lines = [
      '# HELP fluxo_http_requests_total Total HTTP requests handled',
      '# TYPE fluxo_http_requests_total counter',
      `fluxo_http_requests_total ${snapshot.totals.requests}`,
      '# HELP fluxo_http_errors_total Total HTTP requests with status >= 400',
      '# TYPE fluxo_http_errors_total counter',
      `fluxo_http_errors_total ${snapshot.totals.errors}`,
      '# HELP fluxo_http_average_response_ms Average HTTP response time in milliseconds',
      '# TYPE fluxo_http_average_response_ms gauge',
      `fluxo_http_average_response_ms ${snapshot.totals.averageResponseMs}`,
      '# HELP fluxo_process_uptime_seconds Process uptime in seconds',
      '# TYPE fluxo_process_uptime_seconds gauge',
      `fluxo_process_uptime_seconds ${snapshot.uptimeSeconds}`
    ];

    for (const [statusFamily, count] of Object.entries(snapshot.statusCounts)) {
      lines.push(`fluxo_http_status_family_total{family="${statusFamily}"} ${count}`);
    }

    return `${lines.join('\n')}\n`;
  }
}
