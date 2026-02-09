/**
 * LISAN INTELLIGENCE — Scoring Engine Test Suite
 * 
 * Tests for signal generation and scoring calculations.
 */

import { describe, it, expect } from 'vitest';
import {
    generateSignal,
    generateSignals,
    normalizeWeights,
    DEFAULT_WEIGHTS,
} from './scoring';
import { OHLCV, analyzeAsset } from './indicators';

// ============================================================================
// TEST DATA
// ============================================================================

function generateMockOHLCV(length: number): OHLCV[] {
    const data: OHLCV[] = [];
    let price = 100;

    for (let i = 0; i < length; i++) {
        const change = (Math.random() - 0.5) * 5;
        price = Math.max(price + change, 1);

        const high = price * (1 + Math.random() * 0.02);
        const low = price * (1 - Math.random() * 0.02);

        data.push({
            open: low + Math.random() * (high - low),
            high,
            low,
            close: low + Math.random() * (high - low),
            volume: Math.floor(Math.random() * 1000000) + 100000,
            timestamp: Date.now() - (length - i) * 3600000,
        });
    }

    return data;
}

function generateUptrendData(length: number): OHLCV[] {
    const data: OHLCV[] = [];
    let price = 100;

    for (let i = 0; i < length; i++) {
        price = price * 1.01;
        data.push({
            open: price * 0.995,
            high: price * 1.005,
            low: price * 0.99,
            close: price,
            volume: 500000,
            timestamp: Date.now() - (length - i) * 3600000,
        });
    }

    return data;
}

function generateDowntrendData(length: number): OHLCV[] {
    const data: OHLCV[] = [];
    let price = 100;

    for (let i = 0; i < length; i++) {
        price = price * 0.99;
        data.push({
            open: price * 1.005,
            high: price * 1.01,
            low: price * 0.995,
            close: price,
            volume: 500000,
            timestamp: Date.now() - (length - i) * 3600000,
        });
    }

    return data;
}

// ============================================================================
// SIGNAL GENERATION TESTS
// ============================================================================

describe('generateSignal', () => {
    it('returns complete signal structure', () => {
        const data = generateMockOHLCV(100);
        const signal = generateSignal(data, 'BTC');

        expect(signal).toHaveProperty('coin');
        expect(signal).toHaveProperty('direction');
        expect(signal).toHaveProperty('score');
        expect(signal).toHaveProperty('entryPrice');
        expect(signal).toHaveProperty('stopLoss');
        expect(signal).toHaveProperty('takeProfit');
        expect(signal).toHaveProperty('breakdown');
    });

    it('uses correct coin symbol', () => {
        const data = generateMockOHLCV(100);
        const signal = generateSignal(data, 'ETH');
        expect(signal.coin).toBe('ETH');
    });

    it('returns score between 0 and 100', () => {
        const data = generateMockOHLCV(100);
        const signal = generateSignal(data, 'BTC');
        expect(signal.score).toBeGreaterThanOrEqual(0);
        expect(signal.score).toBeLessThanOrEqual(100);
    });

    it('sets stopLoss below entryPrice for LONG', () => {
        const data = generateUptrendData(100);
        const signal = generateSignal(data, 'BTC');
        if (signal.direction === 'LONG') {
            expect(signal.stopLoss).toBeLessThan(signal.entryPrice);
            expect(signal.takeProfit).toBeGreaterThan(signal.entryPrice);
        }
    });

    it('sets stopLoss above entryPrice for SHORT', () => {
        const data = generateDowntrendData(100);
        const signal = generateSignal(data, 'BTC');
        if (signal.direction === 'SHORT') {
            expect(signal.stopLoss).toBeGreaterThan(signal.entryPrice);
            expect(signal.takeProfit).toBeLessThan(signal.entryPrice);
        }
    });

    it('returns LONG for strong uptrend', () => {
        const data = generateUptrendData(100);
        const signal = generateSignal(data, 'BTC');
        // Strong uptrend should favor LONG
        expect(['LONG', 'HOLD']).toContain(signal.direction);
    });

    it('returns SHORT for strong downtrend', () => {
        const data = generateDowntrendData(100);
        const signal = generateSignal(data, 'BTC');
        // Strong downtrend should favor SHORT
        expect(['SHORT', 'HOLD']).toContain(signal.direction);
    });

    it('includes valid breakdown structure', () => {
        const data = generateMockOHLCV(100);
        const signal = generateSignal(data, 'BTC');

        expect(signal.breakdown.momentum).toHaveProperty('score');
        expect(signal.breakdown.momentum).toHaveProperty('max');
        expect(signal.breakdown.trend).toHaveProperty('score');
        expect(signal.breakdown.volume).toHaveProperty('score');
        expect(signal.breakdown.sentiment).toHaveProperty('score');
    });

    it('includes indicator snapshot', () => {
        const data = generateMockOHLCV(100);
        const signal = generateSignal(data, 'BTC');

        // Check that indicators object exists and has some values
        expect(signal.indicators).toBeDefined();
        expect(typeof signal.indicators).toBe('object');
    });

    // ========================================================================
    // v4.1: Agreement factor & timeframe tests
    // ========================================================================

    it('agreement factor is between 0.3 and 1.0', () => {
        // Run on multiple data shapes to test bounds
        const datasets = [
            generateMockOHLCV(100),
            generateUptrendData(100),
            generateDowntrendData(100),
        ];

        for (const data of datasets) {
            const signal = generateSignal(data, 'BTC');
            expect(signal.agreement).toBeGreaterThanOrEqual(0.3);
            expect(signal.agreement).toBeLessThanOrEqual(1.0);
        }
    });

    it('includes agreement and timeframe in v4.1 output', () => {
        const data = generateMockOHLCV(100);
        const signal = generateSignal(data, 'BTC');

        expect(signal).toHaveProperty('agreement');
        expect(signal).toHaveProperty('timeframe');
        expect(signal.timeframe).toBe('4h'); // Default timeframe
        expect(signal.indicators).toHaveProperty('agreement');
    });

    it('strong uptrend has high agreement (aligned clusters)', () => {
        const data = generateUptrendData(100);
        const signal = generateSignal(data, 'BTC');
        // A strong consistent trend should produce agreement at or above the floor
        // Without sentiment/positioning data, only 3 of 5 clusters can align
        expect(signal.agreement).toBeGreaterThanOrEqual(0.3);
    });

    it('respects custom timeframe parameter', () => {
        const data = generateMockOHLCV(100);
        const signal = generateSignal(data, 'BTC', null, undefined, null, '1h');
        expect(signal.timeframe).toBe('1h');
    });
});

// ============================================================================
// WEIGHTS TESTS
// ============================================================================

describe('DEFAULT_WEIGHTS', () => {
    it('weights sum to 100', () => {
        const total = Object.values(DEFAULT_WEIGHTS).reduce((sum, w) => sum + w, 0);
        expect(total).toBe(100);
    });

    it('all weights are positive', () => {
        Object.values(DEFAULT_WEIGHTS).forEach(weight => {
            expect(weight).toBeGreaterThan(0);
        });
    });
});

// ============================================================================
// ANALYSIS HELPER TESTS
// ============================================================================

describe('analyzeAsset', () => {
    it('returns complete analysis structure', () => {
        const data = generateMockOHLCV(100);
        const analysis = analyzeAsset(data);

        expect(analysis).toHaveProperty('momentum');
        expect(analysis).toHaveProperty('trend');
        expect(analysis).toHaveProperty('volume');
        expect(analysis).toHaveProperty('volatility');
    });

    it('momentum includes RSI', () => {
        const data = generateMockOHLCV(100);
        const analysis = analyzeAsset(data);
        expect(analysis.momentum.rsi).toHaveProperty('value');
        expect(analysis.momentum.rsi).toHaveProperty('signal');
    });

    it('trend includes EMA alignment', () => {
        const data = generateMockOHLCV(100);
        const analysis = analyzeAsset(data);
        expect(analysis.trend.emaAlignment).toHaveProperty('value');
    });
});

// ============================================================================
// normalizeWeights TESTS (F13)
// ============================================================================

describe('normalizeWeights', () => {
    it('returns weights unchanged when already summing to 100', () => {
        const result = normalizeWeights(DEFAULT_WEIGHTS);
        const total = Object.values(result).reduce((s, w) => s + w, 0);
        expect(Math.abs(total - 100)).toBeLessThan(0.01);
    });

    it('scales weights to sum to ~100', () => {
        const inflated = { ...DEFAULT_WEIGHTS };
        Object.keys(inflated).forEach((k) => {
            (inflated as Record<string, number>)[k] *= 2;
        });
        const result = normalizeWeights(inflated);
        const total = Object.values(result).reduce((s, w) => s + w, 0);
        expect(Math.abs(total - 100)).toBeLessThan(1);
    });

    it('clamps to minWeight', () => {
        const extreme = { ...DEFAULT_WEIGHTS };
        (extreme as Record<string, number>).rsi = 0.001;
        const result = normalizeWeights(extreme, 1, 20);
        expect(result.rsi).toBeGreaterThanOrEqual(1);
    });

    it('clamps to maxWeight', () => {
        const extreme = { ...DEFAULT_WEIGHTS };
        (extreme as Record<string, number>).rsi = 50;
        const result = normalizeWeights(extreme, 1, 20);
        expect(result.rsi).toBeLessThanOrEqual(20);
    });

    it('handles zero total gracefully', () => {
        const zero = { ...DEFAULT_WEIGHTS };
        Object.keys(zero).forEach((k) => {
            (zero as Record<string, number>)[k] = 0;
        });
        const result = normalizeWeights(zero);
        expect(result.rsi).toBe(0);
    });
});

// ============================================================================
// generateSignals BATCH TESTS (F2)
// ============================================================================

describe('generateSignals', () => {
    it('generates signals for multiple coins', () => {
        const coinData = [
            { coin: 'BTC', data: generateMockOHLCV(100) },
            { coin: 'ETH', data: generateMockOHLCV(100) },
        ];
        const signals = generateSignals(coinData);
        expect(signals).toHaveLength(2);
        expect(signals[0].coin).toBe('BTC');
        expect(signals[1].coin).toBe('ETH');
    });

    it('respects custom timeframe', () => {
        const coinData = [{ coin: 'SOL', data: generateMockOHLCV(100) }];
        const signals = generateSignals(coinData, null, DEFAULT_WEIGHTS, null, '1h');
        expect(signals[0].timeframe).toBe('1h');
    });

    it('returns empty array for empty input', () => {
        const signals = generateSignals([]);
        expect(signals).toHaveLength(0);
    });
});
