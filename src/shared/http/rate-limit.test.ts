import assert from 'node:assert/strict';
import test from 'node:test';

import { InMemoryRateLimiter } from './rate-limit';

test('InMemoryRateLimiter blocks requests above the configured limit', () => {
  const limiter = new InMemoryRateLimiter({
    windowMs: 60_000,
    maxRequests: 2
  });

  const first = limiter.consume('client-1');
  const second = limiter.consume('client-1');
  const third = limiter.consume('client-1');

  assert.equal(first.blocked, false);
  assert.equal(second.blocked, false);
  assert.equal(third.blocked, true);
  assert.equal(third.remaining, 0);
});
