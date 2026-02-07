/**
 * LISAN INTELLIGENCE — Cron Route Test Suite
 * 
 * Tests for cron API route handlers.
 * Tests authorization, error handling, and response structure.
 * Does NOT call real external APIs.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { NextRequest } from 'next/server';

// ============================================================================
// MOCK SETUP
// ============================================================================

// Mock environment variables
const ORIGINAL_ENV = process.env;

// Mock logger to prevent console noise
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

// Mock Supabase server functions
vi.mock('@/lib/supabaseServer', () => ({
    getAllPendingSignals: vi.fn().mockResolvedValue([]),
    updateSignalOutcomeServer: vi.fn().mockResolvedValue(null),
    getAllUserIds: vi.fn().mockResolvedValue([]),
    getUserPendingSignals: vi.fn().mockResolvedValue([]),
    addSignalServer: vi.fn().mockResolvedValue(null),
    addGlobalSignal: vi.fn().mockResolvedValue(null),
    getGlobalWeights: vi.fn().mockResolvedValue(null),
    updateGlobalWeights: vi.fn().mockResolvedValue(true),
    getLastLearnedSignalId: vi.fn().mockResolvedValue(null),
    findUnprocessedLossStreak: vi.fn().mockResolvedValue({ count: 0, signalIds: [], streakEndTime: null }),
    findUnprocessedWinStreak: vi.fn().mockResolvedValue({ count: 0, signalIds: [], streakEndTime: null }),
    getRecentlyClosedCoins: vi.fn().mockResolvedValue([]),
    getMarketSnapshots: vi.fn().mockResolvedValue(new Map()),
    upsertMarketSnapshot: vi.fn().mockResolvedValue(null),
    getCacheValue: vi.fn().mockResolvedValue(null),
    setCacheValue: vi.fn().mockResolvedValue(null),
    // Phase 4: Context-aware learning mocks
    getTrailingWinRate: vi.fn().mockResolvedValue({ winRate: 70, wins: 7, losses: 3, total: 10 }),
    getDirectionalStats: vi.fn().mockResolvedValue({
        long: { wins: 5, losses: 2, winRate: 71.4 },
        short: { wins: 4, losses: 3, winRate: 57.1 },
    }),
    getTradesSinceIndicatorLoss: vi.fn().mockResolvedValue(10),
    supabaseServer: {
        from: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            order: vi.fn().mockReturnThis(),
            limit: vi.fn().mockReturnThis(),
            insert: vi.fn().mockResolvedValue({ data: null, error: null }),
        }),
    },
}));

// Mock engine/prices module (live price fetching)
vi.mock('@/lib/engine/prices', () => ({
    fetchCurrentPrices: vi.fn().mockResolvedValue(new Map()),
}));

// Mock engine/hyperliquidData module
vi.mock('@/lib/engine/hyperliquidData', () => ({
    fetchHyperliquidMarketContext: vi.fn().mockResolvedValue({ assets: new Map(), avgFunding: 0 }),
}));

// Mock engine/regime module
vi.mock('@/lib/engine/regime', () => ({
    detectMarketRegime: vi.fn().mockReturnValue({ regime: 'NEUTRAL', confidence: 0.5 }),
    MarketRegime: { NEUTRAL: 'NEUTRAL', BULLISH: 'BULLISH', BEARISH: 'BEARISH' },
}));

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

// ============================================================================
// TEST UTILITIES
// ============================================================================

/**
 * Create a proper NextRequest with nextUrl.searchParams
 */
function createNextRequest(url: string): NextRequest {
    return new NextRequest(url);
}

// ============================================================================
// AUTHORIZATION TESTS
// ============================================================================

describe('Cron Route Authorization', () => {
    beforeEach(() => {
        vi.resetModules();
        process.env = { ...ORIGINAL_ENV, CRON_SECRET: 'test-secret-123' };
        mockFetch.mockReset();
    });

    afterEach(() => {
        process.env = ORIGINAL_ENV;
    });

    describe('Monitor Route', () => {
        it('returns 401 when secret is missing', async () => {
            const { GET } = await import('@/app/api/cron/monitor/route');
            const request = createNextRequest('http://localhost/api/cron/monitor');
            const response = await GET(request);

            expect(response.status).toBe(401);
            const json = await response.json();
            expect(json.error).toBe('Unauthorized');
        });

        it('returns 401 when secret is wrong', async () => {
            const { GET } = await import('@/app/api/cron/monitor/route');
            const request = createNextRequest('http://localhost/api/cron/monitor?secret=wrong');
            const response = await GET(request);

            expect(response.status).toBe(401);
        });

        it('returns 200 when secret is correct', async () => {
            mockFetch.mockResolvedValue({
                ok: true,
                json: async () => [{ universe: [] }, []],
            });

            const { GET } = await import('@/app/api/cron/monitor/route');
            const request = createNextRequest('http://localhost/api/cron/monitor?secret=test-secret-123');
            const response = await GET(request);

            expect(response.status).toBe(200);
            const json = await response.json();
            expect(json.success).toBe(true);
        });
    });

    describe('Generate Route', () => {
        it('returns 401 when secret is missing', async () => {
            const { GET } = await import('@/app/api/cron/generate/route');
            const request = createNextRequest('http://localhost/api/cron/generate');
            const response = await GET(request);

            expect(response.status).toBe(401);
        });

        it('returns 401 when CRON_SECRET env is not set', async () => {
            process.env.CRON_SECRET = '';
            vi.resetModules();

            const { GET } = await import('@/app/api/cron/generate/route');
            const request = createNextRequest('http://localhost/api/cron/generate?secret=test-secret-123');
            const response = await GET(request);

            expect(response.status).toBe(401);
        });
    });

    describe('Learn Route', () => {
        it('returns 401 when secret is missing', async () => {
            const { GET } = await import('@/app/api/cron/learn/route');
            const request = createNextRequest('http://localhost/api/cron/learn');
            const response = await GET(request);

            expect(response.status).toBe(401);
        });

        it('returns 401 when secret is wrong', async () => {
            const { GET } = await import('@/app/api/cron/learn/route');
            const request = createNextRequest('http://localhost/api/cron/learn?secret=wrong');
            const response = await GET(request);

            expect(response.status).toBe(401);
        });
    });
});

// ============================================================================
// RESPONSE STRUCTURE TESTS
// ============================================================================

describe('Cron Route Response Structure', () => {
    beforeEach(() => {
        vi.resetModules();
        process.env = { ...ORIGINAL_ENV, CRON_SECRET: 'test-secret-123' };
        mockFetch.mockReset();

        // Default successful fetch mock
        mockFetch.mockResolvedValue({
            ok: true,
            json: async () => [{ universe: [] }, []],
        });
    });

    afterEach(() => {
        process.env = ORIGINAL_ENV;
    });

    describe('Monitor Route', () => {
        it('includes required fields in response', async () => {
            const { GET } = await import('@/app/api/cron/monitor/route');
            const request = createNextRequest('http://localhost/api/cron/monitor?secret=test-secret-123');
            const response = await GET(request);
            const json = await response.json();

            expect(json).toHaveProperty('success');
            expect(json).toHaveProperty('monitored');
            expect(json).toHaveProperty('updated');
            expect(json).toHaveProperty('duration');
            expect(typeof json.duration).toBe('number');
        });
    });

    describe('Generate Route', () => {
        it('includes required fields when all coins have pending signals', async () => {
            // Mock that all coins have pending signals
            const { getAllPendingSignals, getRecentlyClosedCoins } = await import('@/lib/supabaseServer');
            (getAllPendingSignals as ReturnType<typeof vi.fn>).mockResolvedValue([
                { coin: 'BTC' }, { coin: 'ETH' }, { coin: 'SOL' }
            ]);
            // All 20 CURATED_ASSETS minus the 3 pending above = 17 in cooldown
            (getRecentlyClosedCoins as ReturnType<typeof vi.fn>).mockResolvedValue([
                'AVAX', 'LINK', 'TON', 'XRP', 'ADA', 'DOT', 'POL',
                'UNI', 'ATOM', 'LTC', 'NEAR', 'ARB', 'OP', 'APT',
                'SUI', 'HYPE', 'INJ'
            ]);

            const { GET } = await import('@/app/api/cron/generate/route');
            const request = createNextRequest('http://localhost/api/cron/generate?secret=test-secret-123');
            const response = await GET(request);
            const json = await response.json();

            expect(json.success).toBe(true);
            expect(json).toHaveProperty('duration');
        });
    });

    describe('Learn Route', () => {
        it('includes required fields when no learning triggered', async () => {
            const { GET } = await import('@/app/api/cron/learn/route');
            const request = createNextRequest('http://localhost/api/cron/learn?secret=test-secret-123');
            const response = await GET(request);
            const json = await response.json();

            expect(json.success).toBe(true);
            expect(json).toHaveProperty('learningTriggered');
            expect(json.learningTriggered).toBe(false);
            expect(json).toHaveProperty('duration');
        });
    });
});

// ============================================================================
// ERROR HANDLING TESTS
// ============================================================================

describe('Cron Route Error Handling', () => {
    beforeEach(() => {
        vi.resetModules();
        process.env = { ...ORIGINAL_ENV, CRON_SECRET: 'test-secret-123' };
        mockFetch.mockReset();
    });

    afterEach(() => {
        process.env = ORIGINAL_ENV;
    });

    describe('Monitor Route', () => {
        it('handles fetch errors gracefully', async () => {
            mockFetch.mockRejectedValue(new Error('Network error'));

            const { GET } = await import('@/app/api/cron/monitor/route');
            const request = createNextRequest('http://localhost/api/cron/monitor?secret=test-secret-123');
            const response = await GET(request);

            // Should still return 200 with empty prices, not 500
            expect(response.status).toBe(200);
            const json = await response.json();
            expect(json.success).toBe(true);
        });
    });

    describe('Generate Route', () => {
        it('handles external API failures gracefully', async () => {
            mockFetch.mockRejectedValue(new Error('API failure'));

            const { GET } = await import('@/app/api/cron/generate/route');
            const request = createNextRequest('http://localhost/api/cron/generate?secret=test-secret-123');
            const response = await GET(request);

            // Route handles gracefully — internal helpers catch errors and return empty data
            // So the route completes normally with 200 and skips coins with insufficient data
            expect(response.status).toBe(200);
            const json = await response.json();
            expect(json.success).toBe(true);
            expect(json).toHaveProperty('duration');
        });
    });
});
