import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

interface RateLimitOptions {
  interval: number;
  uniqueTokenPerInterval: number;
}

interface RateLimitSuccess {
  success: true;
  remaining: number;
  reset: number;
  total: number;
}

interface RateLimitExceeded {
  success: false;
  response: Response;
}

type RateLimitResult = RateLimitSuccess | RateLimitExceeded;

const CLEANUP_INTERVAL = 5 * 60 * 1000;

declare global {
  var rateLimitMemoryStore: Map<string, RateLimitEntry> | undefined;
  var rateLimitLastCleanup: number | undefined;
}

if (!global.rateLimitMemoryStore) {
  global.rateLimitMemoryStore = new Map();
}

if (!global.rateLimitLastCleanup) {
  global.rateLimitLastCleanup = Date.now();
}

function cleanOldEntries(): void {
  const now = Date.now();
  if (now - (global.rateLimitLastCleanup ?? 0) < CLEANUP_INTERVAL) {
    return;
  }
  global.rateLimitLastCleanup = now;
  const store = global.rateLimitMemoryStore;
  if (!store) return;
  
  const keysToDelete: string[] = [];
  store.forEach((entry, key) => {
    if (entry.resetTime < now) {
      keysToDelete.push(key);
    }
  });
  keysToDelete.forEach((key) => store.delete(key));
}

function rateLimit(options: RateLimitOptions) {
  return async (token: string): Promise<RateLimitResult> => {
    const { interval, uniqueTokenPerInterval } = options;
    const now = Date.now();
    const key = `ratelimit_${token}`;
    
    cleanOldEntries();
    
    const store = global.rateLimitMemoryStore;
    if (!store) {
      return {
        success: true,
        remaining: uniqueTokenPerInterval,
        reset: now + interval,
        total: uniqueTokenPerInterval,
      };
    }
    
    let entry = store.get(key);
    
    if (!entry || entry.resetTime < now) {
      entry = { count: 0, resetTime: now + interval };
      store.set(key, entry);
    }
    
    entry.count++;
    
    const remaining = Math.max(0, uniqueTokenPerInterval - entry.count);
    const reset = entry.resetTime;
    
    if (entry.count > uniqueTokenPerInterval) {
      const retryAfter = Math.ceil((reset - now) / 1000);
      return {
        success: false,
        response: new Response(
          JSON.stringify({
            error: 'Too Many Requests',
            message: 'Rate limit exceeded. Please try again later.',
            retryAfter,
          }),
          {
            status: 429,
            headers: {
              'Content-Type': 'application/json',
              'Retry-After': String(retryAfter),
              'X-RateLimit-Limit': String(uniqueTokenPerInterval),
              'X-RateLimit-Remaining': '0',
              'X-RateLimit-Reset': String(reset),
            },
          }
        ),
      };
    }
    
    return {
      success: true,
      remaining,
      reset,
      total: uniqueTokenPerInterval,
    };
  };
}

function getClientIP(request: Request | NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for');
  const realIP = request.headers.get('x-real-ip');
  
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  
  if (realIP) {
    return realIP;
  }
  
  return 'unknown';
}

const RATE_LIMIT_CONFIGS = {
  auth: { interval: 60 * 1000, uniqueTokenPerInterval: 5 },
  search: { interval: 60 * 1000, uniqueTokenPerInterval: 30 },
  write: { interval: 60 * 1000, uniqueTokenPerInterval: 60 },
  read: { interval: 60 * 1000, uniqueTokenPerInterval: 120 },
} as const;

type RouteType = keyof typeof RATE_LIMIT_CONFIGS;

function getRouteType(path: string, method: string): RouteType | null {
  if (
    path.includes('/api/auth/login') ||
    path.includes('/api/auth/register') ||
    path.includes('/api/auth/[...nextauth]')
  ) {
    return 'auth';
  }
  
  if (path.startsWith('/api/search')) {
    return 'search';
  }
  
  if (path.startsWith('/api/')) {
    const writeMethods = ['POST', 'PUT', 'PATCH', 'DELETE'];
    if (writeMethods.includes(method)) {
      return 'write';
    }
    return 'read';
  }
  
  return null;
}

export const config = {
  matcher: [
    '/api/auth/:path*',
    '/api/search/:path*',
    '/api/:path*',
  ],
};

export default async function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname;
  const method = request.method;
  const routeType = getRouteType(path, method);
  
  if (!routeType) {
    return NextResponse.next();
  }
  
  const clientIP = getClientIP(request);
  const limiter = rateLimit(RATE_LIMIT_CONFIGS[routeType]);
  const result = await limiter(clientIP);
  
  if (!result.success) {
    const headers = new Headers();
    const errorResult = result as RateLimitExceeded;
    errorResult.response.headers.forEach((value: string, key: string) => {
      headers.set(key, value)
    })
    return NextResponse.json(
      { error: 'Too Many Requests', message: 'Rate limit exceeded. Please try again later.' },
      { status: 429, headers }
    )
  }
  
  const response = NextResponse.next();
  response.headers.set('X-RateLimit-Limit', String(result.total));
  response.headers.set('X-RateLimit-Remaining', String(result.remaining));
  response.headers.set('X-RateLimit-Reset', String(result.reset));
  
  return response;
}