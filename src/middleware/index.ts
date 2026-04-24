import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { rateLimit, getClientIP } from './rateLimit';
import type { RateLimitExceeded } from './rateLimit';

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
    errorResult.response.headers.forEach((value, key) => {
      headers.set(key, value);
    });
    return new NextResponse(errorResult.response.body, {
      status: 429,
      headers,
    });
  }
  
  const response = NextResponse.next();
  response.headers.set('X-RateLimit-Limit', String(result.total));
  response.headers.set('X-RateLimit-Remaining', String(result.remaining));
  response.headers.set('X-RateLimit-Reset', String(result.reset));
  
  return response;
}