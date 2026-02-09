/**
 * Next.js Middleware — Rate Limiting
 * 
 * Simple in-memory rate limiting for public API routes.
 * Protects against abuse without external dependencies.
 */

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// ============================================================================
// RATE LIMIT CONFIG
// ============================================================================

interface RateLimitConfig {
    windowMs: number;    // Time window in milliseconds
    maxRequests: number; // Max requests per window
}

const RATE_LIMITS: Record<string, RateLimitConfig> = {
    '/api/market': { windowMs: 60000, maxRequests: 60 },      // 60/min
    '/api/fear-greed': { windowMs: 60000, maxRequests: 30 },  // 30/min
    '/api/hyperliquid': { windowMs: 60000, maxRequests: 60 }, // 60/min
    '/api/signals': { windowMs: 60000, maxRequests: 30 },     // 30/min
    '/api/proof-stats': { windowMs: 60000, maxRequests: 20 }, // 20/min
};

// In-memory store for rate limiting
// Note: This resets on deployment/restart - acceptable for simple protection
const requestCounts = new Map<string, { count: number; resetTime: number }>();

// ============================================================================
// RATE LIMITER
// ============================================================================

function getRateLimitKey(ip: string, path: string): string {
    return `${ip}:${path}`;
}

// F5 FIX: Counter for periodic cleanup of expired entries
let requestCounter = 0;
const CLEANUP_INTERVAL = 100; // Prune every 100th request
const MAX_ENTRIES = 10000;    // Hard cap to prevent runaway growth

function cleanupExpiredEntries() {
    const now = Date.now();
    for (const [key, entry] of requestCounts.entries()) {
        if (now > entry.resetTime) {
            requestCounts.delete(key);
        }
    }
}

function isRateLimited(ip: string, path: string, config: RateLimitConfig): boolean {
    const key = getRateLimitKey(ip, path);
    const now = Date.now();

    // Periodic cleanup: prune expired entries every N requests or if map is too large
    requestCounter++;
    if (requestCounter >= CLEANUP_INTERVAL || requestCounts.size > MAX_ENTRIES) {
        cleanupExpiredEntries();
        requestCounter = 0;
    }

    const current = requestCounts.get(key);

    if (!current || now > current.resetTime) {
        // New window
        requestCounts.set(key, { count: 1, resetTime: now + config.windowMs });
        return false;
    }

    if (current.count >= config.maxRequests) {
        return true;
    }

    current.count++;
    return false;
}
// ============================================================================
// MIDDLEWARE
// ============================================================================

export function middleware(request: NextRequest) {
    const { pathname } = request.nextUrl;

    // Only rate limit configured API routes
    const config = RATE_LIMITS[pathname];
    if (!config) {
        return NextResponse.next();
    }

    // Get client IP
    const forwarded = request.headers.get('x-forwarded-for');
    const ip = forwarded?.split(',')[0]?.trim() ||
        request.headers.get('x-real-ip') ||
        'unknown';

    if (isRateLimited(ip, pathname, config)) {
        return new NextResponse(
            JSON.stringify({
                error: 'Too many requests',
                retryAfter: Math.ceil(config.windowMs / 1000)
            }),
            {
                status: 429,
                headers: {
                    'Content-Type': 'application/json',
                    'Retry-After': String(Math.ceil(config.windowMs / 1000)),
                },
            }
        );
    }

    return NextResponse.next();
}

// ============================================================================
// CONFIG
// ============================================================================

export const config = {
    matcher: [
        '/api/market',
        '/api/fear-greed',
        '/api/hyperliquid',
        '/api/signals',
        '/api/proof-stats',
    ],
};
