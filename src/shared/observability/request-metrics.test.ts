import assert from 'node:assert/strict';
import test from 'node:test';

import { RequestMetricsStore } from './request-metrics';

test('RequestMetricsStore aggregates totals and route metrics', () => {
  const store = new RequestMetricsStore();

  store.record({
    method: 'GET',
    path: '/api/assets',
    statusCode: 200,
    durationMs: 12
  });
  store.record({
    method: 'POST',
    path: '/api/assets',
    statusCode: 409,
    durationMs: 21
  });

  const snapshot = store.getSnapshot();

  assert.equal(snapshot.totals.requests, 2);
  assert.equal(snapshot.totals.errors, 1);
  assert.equal(snapshot.statusCounts['2xx'], 1);
  assert.equal(snapshot.statusCounts['4xx'], 1);
  assert.equal(snapshot.routes.length, 2);
});
