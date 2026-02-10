/**
 * LISAN INTELLIGENCE — Admin Route Test Suite
 * 
 * Tests authorization and destructive operation guards.
 * These routes require valid Supabase auth + ADMIN_EMAIL match.
 * Does NOT call real Supabase.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { NextRequest } from 'next/server';

// ============================================================================
// MOCK SETUP
// ============================================================================

const ORIGINAL_ENV = process.env;

// Mock logger
vi.mock('@/lib/logger', () => ({
    logger: {
        debug: vi.fn(),
        info: vi.fn(),
        warn: vi.fn(),
        error: vi.fn(),
        withContext: () => ({
            debug: vi.fn(),
            info: vi.fn(),
            warn: vi.fn(),
            error: vi.fn(),
        }),
    },
}));

// Mock supabaseServer
vi.mock('@/lib/supabaseServer', () => ({
    updateGlobalWeights: vi.fn().mockResolvedValue(true),
    supabaseServer: {
        from: vi.fn().mockReturnValue({
            delete: vi.fn().mockReturnValue({
                neq: vi.fn().mockResolvedValue({ data: null, error: null, count: 5 }),
            }),
        }),
    },
}));

// Track mock auth state
let mockUser: { email: string } | null = null;
let mockAuthError: Error | null = null;

// Mock @supabase/ssr
vi.mock('@supabase/ssr', () => ({
    createServerClient: vi.fn(() => ({
        auth: {
            getUser: vi.fn(async () => ({
                data: { user: mockUser },
                error: mockAuthError,
            })),
        },
    })),
}));

// Mock next/headers cookies
vi.mock('next/headers', () => ({
    cookies: vi.fn(async () => ({
        getAll: vi.fn().mockReturnValue([]),
        set: vi.fn(),
    })),
}));

// ============================================================================
// TESTS
// ============================================================================

describe('Admin Route Authorization', () => {
    beforeEach(() => {
        vi.resetModules();
        process.env = {
            ...ORIGINAL_ENV,
            NEXT_PUBLIC_ADMIN_EMAIL: 'admin@test.com',
            NEXT_PUBLIC_SUPABASE_URL: 'https://test.supabase.co',
            NEXT_PUBLIC_SUPABASE_ANON_KEY: 'test-anon-key',
        };
        mockUser = null;
        mockAuthError = null;
    });

    afterEach(() => {
        process.env = ORIGINAL_ENV;
    });

    describe('Reset Weights Route', () => {
        it('returns 401 when user is not authenticated', async () => {
            mockUser = null;
            mockAuthError = new Error('Not authenticated');

            const { POST } = await import('@/app/api/admin/reset-weights/route');
            const request = new NextRequest('http://localhost/api/admin/reset-weights', {
                method: 'POST',
            });
            const response = await POST(request);

            expect(response.status).toBe(401);
            const json = await response.json();
            expect(json.error).toBe('Unauthorized');
        });

        it('returns 403 when user is not admin', async () => {
            mockUser = { email: 'nonadmin@test.com' };
            mockAuthError = null;

            const { POST } = await import('@/app/api/admin/reset-weights/route');
            const request = new NextRequest('http://localhost/api/admin/reset-weights', {
                method: 'POST',
            });
            const response = await POST(request);

            expect(response.status).toBe(403);
            const json = await response.json();
            expect(json.error).toBe('Forbidden');
        });

        it('returns 200 and resets weights when admin is authenticated', async () => {
            mockUser = { email: 'admin@test.com' };
            mockAuthError = null;

            const { POST } = await import('@/app/api/admin/reset-weights/route');
            const request = new NextRequest('http://localhost/api/admin/reset-weights', {
                method: 'POST',
            });
            const response = await POST(request);

            expect(response.status).toBe(200);
            const json = await response.json();
            expect(json.success).toBe(true);
            expect(json).toHaveProperty('weights');
        });
    });

    describe('Clear Signals Route', () => {
        it('returns 401 when user is not authenticated', async () => {
            mockUser = null;
            mockAuthError = new Error('Not authenticated');

            const { POST } = await import('@/app/api/admin/clear-signals/route');
            const request = new NextRequest('http://localhost/api/admin/clear-signals', {
                method: 'POST',
            });
            const response = await POST(request);

            expect(response.status).toBe(401);
        });

        it('returns 403 when user is not admin', async () => {
            mockUser = { email: 'nonadmin@test.com' };
            mockAuthError = null;

            const { POST } = await import('@/app/api/admin/clear-signals/route');
            const request = new NextRequest('http://localhost/api/admin/clear-signals', {
                method: 'POST',
            });
            const response = await POST(request);

            expect(response.status).toBe(403);
        });

        it('returns 200 and clears signals when admin is authenticated', async () => {
            mockUser = { email: 'admin@test.com' };
            mockAuthError = null;

            const { POST } = await import('@/app/api/admin/clear-signals/route');
            const request = new NextRequest('http://localhost/api/admin/clear-signals', {
                method: 'POST',
            });
            const response = await POST(request);

            expect(response.status).toBe(200);
            const json = await response.json();
            expect(json.success).toBe(true);
        });
    });
});
