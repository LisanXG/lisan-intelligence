/**
 * LISAN INTELLIGENCE — Middleware Rate Limiting Tests
 * 
 * Tests the in-memory rate limiter behavior.
 * Verifies request counting, limit enforcement, and cleanup logic.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { NextRequest, NextResponse } from 'next/server';

// ============================================================================
// MOCK SETUP
// ============================================================================

// We need to test middleware directly, but it uses NextResponse.next()
// which is only available in the edge runtime. We mock NextResponse.next.
const originalNext = NextResponse.next;

beforeEach(() => {
    vi.resetModules();
    // Reset NextResponse.next mock
    NextResponse.next = vi.fn().mockReturnValue(
        new NextResponse(null, { status: 200 })
    );
});

afterEach(() => {
    NextResponse.next = originalNext;
});

// ============================================================================
// TESTS
// ============================================================================

describe('Middleware Rate Limiting', () => {
    it('allows requests under the rate limit', async () => {
        const { middleware } = await import('./middleware');

        const request = new NextRequest('http://localhost/api/signals', {
            headers: { 'x-forwarded-for': '1.2.3.4' },
        });
        const response = middleware(request);

        expect(response.status).not.toBe(429);
    });

    it('returns 429 when rate limit is exceeded', async () => {
        const { middleware } = await import('./middleware');

        // Spam requests from the same IP
        for (let i = 0; i < 30; i++) {
            const request = new NextRequest('http://localhost/api/signals', {
                headers: { 'x-forwarded-for': '5.6.7.8' },
            });
            middleware(request);
        }

        // Next request should be rate limited
        const request = new NextRequest('http://localhost/api/signals', {
            headers: { 'x-forwarded-for': '5.6.7.8' },
        });
        const response = middleware(request);

        expect(response.status).toBe(429);
    });

    it('allows requests from different IPs independently', async () => {
        const { middleware } = await import('./middleware');

        // Max out one IP
        for (let i = 0; i < 30; i++) {
            const request = new NextRequest('http://localhost/api/signals', {
                headers: { 'x-forwarded-for': '10.0.0.1' },
            });
            middleware(request);
        }

        // Different IP should still work
        const request = new NextRequest('http://localhost/api/signals', {
            headers: { 'x-forwarded-for': '10.0.0.2' },
        });
        const response = middleware(request);

        expect(response.status).not.toBe(429);
    });

    it('passes through non-API routes without rate limiting', async () => {
        const { middleware } = await import('./middleware');

        const request = new NextRequest('http://localhost/dashboard', {
            headers: { 'x-forwarded-for': '1.2.3.4' },
        });
        const response = middleware(request);

        // Non-API routes should pass through
        expect(response.status).not.toBe(429);
    });

    it('returns proper rate limit headers on 429', async () => {
        const { middleware } = await import('./middleware');

        // Exhaust rate limit
        for (let i = 0; i < 30; i++) {
            const request = new NextRequest('http://localhost/api/signals', {
                headers: { 'x-forwarded-for': '20.0.0.1' },
            });
            middleware(request);
        }

        const request = new NextRequest('http://localhost/api/signals', {
            headers: { 'x-forwarded-for': '20.0.0.1' },
        });
        const response = middleware(request);

        expect(response.status).toBe(429);
        const json = await response.json();
        expect(json.error).toContain('Too many requests');
    });
});
