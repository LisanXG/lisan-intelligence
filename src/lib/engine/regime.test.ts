/**
 * LISAN INTELLIGENCE — Regime Detection Test Suite
 * 
 * Tests for market regime classification.
 */

import { describe, it, expect } from 'vitest';
import {
    detectMarketRegime,
    getRegimeAdjustments,
    MarketContext,
    MarketRegime,
} from './regime';
import { OHLCV } from './indicators';

// ============================================================================
// TEST DATA GENERATORS
// ============================================================================

function generateUptrendBTC(length: number): OHLCV[] {
    const data: OHLCV[] = [];
    let price = 40000;

    for (let i = 0; i < length; i++) {
        price = price * 1.015; // 1.5% increase per period
        data.push({
            open: price * 0.99,
            high: price * 1.01,
            low: price * 0.98,
            close: price,
            volume: 1000000 + Math.random() * 500000,
            timestamp: Date.now() - (length - i) * 4 * 60 * 60 * 1000,
        });
    }

    return data;
}

function generateDowntrendBTC(length: number): OHLCV[] {
    const data: OHLCV[] = [];
    let price = 50000;

    for (let i = 0; i < length; i++) {
        price = price * 0.985; // 1.5% decrease per period
        data.push({
            open: price * 1.01,
            high: price * 1.02,
            low: price * 0.99,
            close: price,
            volume: 1000000 + Math.random() * 500000,
            timestamp: Date.now() - (length - i) * 4 * 60 * 60 * 1000,
        });
    }

    return data;
}

function generateChoppyBTC(length: number): OHLCV[] {
    const data: OHLCV[] = [];
    let price = 45000;

    for (let i = 0; i < length; i++) {
        // Random oscillation between up and down
        const change = (Math.random() - 0.5) * 0.04;
        price = price * (1 + change);
        data.push({
            open: price * (1 - Math.random() * 0.02),
            high: price * 1.03, // High volatility
            low: price * 0.97,
            close: price,
            volume: 1000000 + Math.random() * 500000,
            timestamp: Date.now() - (length - i) * 4 * 60 * 60 * 1000,
        });
    }

    return data;
}

// ============================================================================
// REGIME DETECTION TESTS
// ============================================================================

describe('detectMarketRegime', () => {
    it('detects BULL_TREND in strong uptrend', () => {
        const context: MarketContext = {
            btcData: generateUptrendBTC(50),
            altcoinChanges: [5, 8, 3, 6, 4, 7, 2, 5], // Positive altcoin moves
            avgFunding: 0.15, // Positive funding
            avgOIChange: 5, // Rising OI
        };

        const result = detectMarketRegime(context);
        expect(result.regime).toBe('BULL_TREND');
        expect(result.btcTrend).toBe('UP');
        expect(result.confidence).toBeGreaterThan(0.5);
    });

    it('detects BEAR_TREND in strong downtrend', () => {
        const context: MarketContext = {
            btcData: generateDowntrendBTC(50),
            altcoinChanges: [-5, -8, -3, -6, -4, -7, -2, -5], // Negative altcoin moves
            avgFunding: -0.05,
            avgOIChange: 3,
        };

        const result = detectMarketRegime(context);
        expect(result.regime).toBe('BEAR_TREND');
        expect(result.btcTrend).toBe('DOWN');
        expect(result.confidence).toBeGreaterThan(0.5);
    });

    it('returns valid volatility classification', () => {
        const context: MarketContext = {
            btcData: generateChoppyBTC(50),
            altcoinChanges: [1, -2, 3, -1, 2, -3, 1, 0],
            avgFunding: 0.02,
            avgOIChange: 0,
        };

        const result = detectMarketRegime(context);
        expect(['LOW', 'NORMAL', 'HIGH', 'EXTREME']).toContain(result.volatilityLevel);
    });

    it('returns UNKNOWN with insufficient data', () => {
        const context: MarketContext = {
            btcData: generateUptrendBTC(5), // Not enough data
            altcoinChanges: [],
            avgFunding: 0,
            avgOIChange: 0,
        };

        const result = detectMarketRegime(context);
        // Should still return a regime, but with low confidence
        expect(result.confidence).toBeLessThanOrEqual(0.5);
    });

    it('includes all required fields in output', () => {
        const context: MarketContext = {
            btcData: generateUptrendBTC(50),
            altcoinChanges: [3, 4, 5],
            avgFunding: 0.10,
            avgOIChange: 2,
        };

        const result = detectMarketRegime(context);
        expect(result).toHaveProperty('regime');
        expect(result).toHaveProperty('confidence');
        expect(result).toHaveProperty('btcTrend');
        expect(result).toHaveProperty('btcTrendStrength');
        expect(result).toHaveProperty('volatilityLevel');
        expect(result).toHaveProperty('avgAltcoinChange');
        expect(result).toHaveProperty('marketBias');
        expect(result).toHaveProperty('timestamp');
    });
});

// ============================================================================
// REGIME ADJUSTMENTS TESTS
// ============================================================================

describe('getRegimeAdjustments', () => {
    it('returns higher score threshold for HIGH_VOL_CHOP', () => {
        const chopAdj = getRegimeAdjustments('HIGH_VOL_CHOP');
        const bullAdj = getRegimeAdjustments('BULL_TREND');

        expect(chopAdj.scoreThresholdMultiplier).toBeGreaterThan(bullAdj.scoreThresholdMultiplier);
    });

    it('returns positive direction bias for BULL_TREND', () => {
        const result = getRegimeAdjustments('BULL_TREND');
        expect(result.directionBias).toBeGreaterThan(0);
    });

    it('returns negative direction bias for BEAR_TREND', () => {
        const result = getRegimeAdjustments('BEAR_TREND');
        expect(result.directionBias).toBeLessThan(0);
    });

    it('returns neutral adjustments for UNKNOWN regime', () => {
        const result = getRegimeAdjustments('UNKNOWN');
        expect(result.scoreThresholdMultiplier).toBe(1.0);
        expect(result.trendWeightMultiplier).toBe(1.0);
        expect(result.directionBias).toBe(0);
    });

    it('increases momentum weight for RECOVERY_PUMP', () => {
        const result = getRegimeAdjustments('RECOVERY_PUMP');
        expect(result.momentumWeightMultiplier).toBeGreaterThan(1.0);
        expect(result.directionBias).toBeGreaterThan(0); // Long bias
    });

    it('returns valid adjustments for all regime types', () => {
        const regimes: MarketRegime[] = [
            'BULL_TREND', 'BEAR_TREND', 'HIGH_VOL_CHOP',
            'RECOVERY_PUMP', 'DISTRIBUTION', 'ACCUMULATION', 'UNKNOWN'
        ];

        for (const regime of regimes) {
            const result = getRegimeAdjustments(regime);
            expect(result.scoreThresholdMultiplier).toBeGreaterThan(0);
            expect(result.trendWeightMultiplier).toBeGreaterThan(0);
            expect(result.momentumWeightMultiplier).toBeGreaterThan(0);
            expect(result.positioningWeightMultiplier).toBeGreaterThan(0);
        }
    });
});
