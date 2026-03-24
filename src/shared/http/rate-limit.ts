import { createHash } from 'node:crypto';
import { type NextFunction, type Request, type Response } from 'express';

import { readAccessKeyFromHeaders } from '../access/access-key';
import { HttpError } from '../http-error';

type RateLimitBucket = {
  count: number;
  resetAt: number;
};

type RateLimitOptions = {
  windowMs: number;
  maxRequests: number;
};

function hashIdentifier(value: string) {
  return createHash('sha256').update(value).digest('hex').slice(0, 24);
}

function getClientIdentifier(req: Request) {
  const accessKey = readAccessKeyFromHeaders(req.headers);

  if (accessKey) {
    return `key:${hashIdentifier(accessKey)}`;
  }

  return `ip:${req.ip || req.socket.remoteAddress || 'unknown'}`;
}

export class InMemoryRateLimiter {
  private readonly buckets = new Map<string, RateLimitBucket>();

  constructor(private readonly options: RateLimitOptions) {}

  consume(identifier: string) {
    const now = Date.now();
    const existing = this.buckets.get(identifier);

    if (!existing || existing.resetAt <= now) {
      const bucket = {
        count: 1,
        resetAt: now + this.options.windowMs
      };

      this.buckets.set(identifier, bucket);
      return {
        limit: this.options.maxRequests,
        remaining: Math.max(this.options.maxRequests - bucket.count, 0),
        resetAt: bucket.resetAt,
        blocked: false
      };
    }

    existing.count += 1;

    return {
      limit: this.options.maxRequests,
      remaining: Math.max(this.options.maxRequests - existing.count, 0),
      resetAt: existing.resetAt,
      blocked: existing.count > this.options.maxRequests
    };
  }

  snapshot() {
    const now = Date.now();
    let activeBuckets = 0;

    for (const bucket of this.buckets.values()) {
      if (bucket.resetAt > now) {
        activeBuckets += 1;
      }
    }

    return {
      activeBuckets,
      windowMs: this.options.windowMs,
      maxRequests: this.options.maxRequests
    };
  }
}

export function createRateLimitMiddleware(
  rateLimiter: InMemoryRateLimiter,
  shouldApply: (req: Request) => boolean = () => true
) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!shouldApply(req)) {
      next();
      return;
    }

    const result = rateLimiter.consume(getClientIdentifier(req));
    const resetInSeconds = Math.max(Math.ceil((result.resetAt - Date.now()) / 1000), 0);

    res.setHeader('x-ratelimit-limit', String(result.limit));
    res.setHeader('x-ratelimit-remaining', String(result.remaining));
    res.setHeader('x-ratelimit-reset', String(result.resetAt));

    if (result.blocked) {
      res.setHeader('retry-after', String(resetInSeconds));
      next(
        new HttpError(429, 'Rate limit exceeded', {
          retryAfterSeconds: resetInSeconds
        })
      );
      return;
    }

    next();
  };
}
