/**
 * LISAN INTELLIGENCE — Hyperliquid Data Test Suite
 * 
 * Tests for Hyperliquid positioning indicators.
 */

import { describe, it, expect } from 'vitest';
import {
    FundingRateSignal,
    OIChangeSignal,
    calculatePositioningScore,
} from './hyperliquidData';

// ============================================================================
// FUNDING RATE SIGNAL TESTS
// ============================================================================

describe('FundingRateSignal', () => {
    it('returns bearish for very high positive funding (crowded longs)', () => {
        // 50% annualized funding = very crowded longs
        const result = FundingRateSignal(0.50);
        expect(result.signal).toBe('bearish');
        expect(result.strength).toBeGreaterThan(0.3);
    });

    it('returns bearish for moderately high positive funding', () => {
        // 25% annualized funding = moderately crowded
        const result = FundingRateSignal(0.25);
        expect(result.signal).toBe('bearish');
        expect(result.strength).toBeGreaterThan(0);
    });

    it('returns neutral for moderate funding', () => {
        // 5% annualized funding = normal range
        const result = FundingRateSignal(0.05);
        expect(result.signal).toBe('neutral');
        expect(result.strength).toBe(0);
    });

    it('returns bullish for negative funding (crowded shorts)', () => {
        // -15% annualized funding = crowded shorts
        const result = FundingRateSignal(-0.15);
        expect(result.signal).toBe('bullish');
        expect(result.strength).toBeGreaterThan(0);
    });

    it('returns strong bullish for very negative funding', () => {
        // -30% annualized funding = very crowded shorts
        const result = FundingRateSignal(-0.30);
        expect(result.signal).toBe('bullish');
        expect(result.strength).toBeGreaterThan(0.5);
    });

    it('stores annualized funding as percentage in value', () => {
        const result = FundingRateSignal(0.50);
        expect(result.value).toBe(50); // 50%
    });
});

// ============================================================================
// OI CHANGE SIGNAL TESTS
// ============================================================================

describe('OIChangeSignal', () => {
    it('returns bullish for rising OI with rising price (new longs)', () => {
        // 10% OI increase + 5% price increase = bullish continuation
        const result = OIChangeSignal(1100, 1000, 5);
        expect(result.signal).toBe('bullish');
        expect(result.strength).toBeGreaterThan(0);
    });

    it('returns bearish for rising OI with falling price (new shorts)', () => {
        // 10% OI increase + 5% price decrease = bearish continuation
        const result = OIChangeSignal(1100, 1000, -5);
        expect(result.signal).toBe('bearish');
        expect(result.strength).toBeGreaterThan(0);
    });

    it('returns bullish for falling OI with rising price (short squeeze)', () => {
        // 10% OI decrease + 5% price increase = short squeeze
        const result = OIChangeSignal(900, 1000, 5);
        expect(result.signal).toBe('bullish');
        // Lower strength for potential reversal
        expect(result.strength).toBeLessThanOrEqual(0.6);
    });

    it('returns bearish for falling OI with falling price (long liquidations)', () => {
        // 10% OI decrease + 5% price decrease = long liquidations
        const result = OIChangeSignal(900, 1000, -5);
        expect(result.signal).toBe('bearish');
        expect(result.strength).toBeGreaterThan(0);
    });

    it('returns neutral for insignificant OI change', () => {
        // 2% OI change = not significant enough
        const result = OIChangeSignal(1020, 1000, 5);
        expect(result.signal).toBe('neutral');
        expect(result.strength).toBe(0);
    });

    it('returns neutral for insignificant price move', () => {
        // 10% OI change but only 0.5% price move = not significant
        const result = OIChangeSignal(1100, 1000, 0.5);
        expect(result.signal).toBe('neutral');
        expect(result.strength).toBe(0);
    });

    it('returns neutral when prevOI is zero', () => {
        const result = OIChangeSignal(1000, 0, 5);
        expect(result.signal).toBe('neutral');
        expect(result.strength).toBe(0);
    });

    it('stores OI change as percentage in value', () => {
        // 10% OI increase
        const result = OIChangeSignal(1100, 1000, 5);
        expect(result.value).toBe(10); // 10%
    });
});

// ============================================================================
// POSITIONING SCORE TESTS
// ============================================================================

describe('calculatePositioningScore', () => {
    it('returns zero score when both signals are neutral', () => {
        const fundingSignal = { value: 0, signal: 'neutral' as const, strength: 0 };
        const oiSignal = { value: 0, signal: 'neutral' as const, strength: 0 };

        const result = calculatePositioningScore(fundingSignal, oiSignal, 6, 4);
        expect(result.score).toBe(0);
        expect(result.direction).toBe(0);
        expect(result.max).toBe(10);
    });

    it('returns positive direction for bullish signals', () => {
        const fundingSignal = { value: -15, signal: 'bullish' as const, strength: 0.5 };
        const oiSignal = { value: 10, signal: 'bullish' as const, strength: 0.3 };

        const result = calculatePositioningScore(fundingSignal, oiSignal, 6, 4);
        expect(result.direction).toBeGreaterThan(0);
        expect(result.score).toBeGreaterThan(0);
    });

    it('returns negative direction for bearish signals', () => {
        const fundingSignal = { value: 50, signal: 'bearish' as const, strength: 0.5 };
        const oiSignal = { value: -10, signal: 'bearish' as const, strength: 0.3 };

        const result = calculatePositioningScore(fundingSignal, oiSignal, 6, 4);
        expect(result.direction).toBeLessThan(0);
        expect(result.score).toBeGreaterThan(0);
    });

    it('respects custom weights', () => {
        const fundingSignal = { value: 50, signal: 'bearish' as const, strength: 1 };
        const oiSignal = { value: 0, signal: 'neutral' as const, strength: 0 };

        const resultLowWeight = calculatePositioningScore(fundingSignal, oiSignal, 3, 2);
        const resultHighWeight = calculatePositioningScore(fundingSignal, oiSignal, 12, 8);

        expect(resultHighWeight.score).toBeGreaterThan(resultLowWeight.score);
    });
});
