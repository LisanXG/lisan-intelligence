/**
 * LISAN INTELLIGENCE — Hyperliquid Data Test Suite
 * 
 * Tests for Hyperliquid positioning indicators.
 */

import { describe, it, expect } from 'vitest';
import {
    FundingRateSignal,
    OIChangeSignal,
    BasisPremiumSignal,
    HLVolumeMomentumSignal,
    FundingVelocityBoost,
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

    it('expands max when basis and volume signals provided', () => {
        const fundingSignal = { value: 0, signal: 'neutral' as const, strength: 0 };
        const oiSignal = { value: 0, signal: 'neutral' as const, strength: 0 };
        const basisSignal = { value: 0.2, signal: 'bearish' as const, strength: 0.5 };
        const volumeSignal = { value: 2.0, signal: 'bullish' as const, strength: 0.3 };

        const result = calculatePositioningScore(fundingSignal, oiSignal, 6, 4, basisSignal, volumeSignal, 3, 3);
        expect(result.max).toBe(16); // 6 + 4 + 3 + 3
    });
});

// ============================================================================
// v4.1: BASIS PREMIUM SIGNAL TESTS
// ============================================================================

describe('BasisPremiumSignal', () => {
    it('returns bearish when perp trades above spot (crowded longs)', () => {
        // premium = 0.003 = 0.3% above spot
        const result = BasisPremiumSignal(0.003);
        expect(result.signal).toBe('bearish');
        expect(result.strength).toBeGreaterThan(0);
    });

    it('returns bullish when perp trades below spot (crowded shorts)', () => {
        // premium = -0.003 = 0.3% below spot
        const result = BasisPremiumSignal(-0.003);
        expect(result.signal).toBe('bullish');
        expect(result.strength).toBeGreaterThan(0);
    });

    it('returns neutral for small premium near equilibrium', () => {
        // premium = 0.0005 = 0.05% (within dead zone)
        const result = BasisPremiumSignal(0.0005);
        expect(result.signal).toBe('neutral');
        expect(result.strength).toBe(0);
    });

    it('strength caps at 1.0 for extreme premium', () => {
        // premium = 0.01 = 1% (extreme)
        const result = BasisPremiumSignal(0.01);
        expect(result.strength).toBeLessThanOrEqual(1);
    });

    it('stores premium as percentage in value', () => {
        const result = BasisPremiumSignal(0.005);
        expect(result.value).toBe(0.5); // 0.5%
    });
});

// ============================================================================
// v4.1: HL VOLUME MOMENTUM SIGNAL TESTS
// ============================================================================

describe('HLVolumeMomentumSignal', () => {
    it('returns bullish for volume surge with rising price', () => {
        // 2x volume + 3% price rise = conviction
        const result = HLVolumeMomentumSignal(2000000, 1000000, 3);
        expect(result.signal).toBe('bullish');
        expect(result.strength).toBeGreaterThan(0);
    });

    it('returns bearish for volume surge with falling price', () => {
        const result = HLVolumeMomentumSignal(2000000, 1000000, -3);
        expect(result.signal).toBe('bearish');
        expect(result.strength).toBeGreaterThan(0);
    });

    it('returns contrarian signal for low volume breakout', () => {
        // 0.3x volume + 3% price rise = fade the move
        const result = HLVolumeMomentumSignal(300000, 1000000, 3);
        expect(result.signal).toBe('bearish'); // Fade the rising price
        expect(result.strength).toBeLessThanOrEqual(0.5);
    });

    it('returns neutral when no significant price move', () => {
        const result = HLVolumeMomentumSignal(2000000, 1000000, 0.5);
        expect(result.signal).toBe('neutral');
    });

    it('returns neutral for zero volume', () => {
        const result = HLVolumeMomentumSignal(0, 1000000, 5);
        expect(result.signal).toBe('neutral');
    });

    it('stores volume ratio in value', () => {
        const result = HLVolumeMomentumSignal(2000000, 1000000, 3);
        expect(result.value).toBe(2); // 2x ratio
    });
});

// ============================================================================
// v4.1: FUNDING VELOCITY BOOST TESTS
// ============================================================================

describe('FundingVelocityBoost', () => {
    it('amplifies signal for rapid funding change', () => {
        // Funding jumped from 5% to 20% annualized = rapid acceleration
        const boost = FundingVelocityBoost(0.20, 0.05);
        expect(boost).toBeGreaterThan(1.0);
        expect(boost).toBeLessThanOrEqual(1.5);
    });

    it('dampens signal for stable funding', () => {
        // Funding barely changed: 5% to 5.5%
        const boost = FundingVelocityBoost(0.055, 0.05);
        expect(boost).toBe(0.8);
    });

    it('returns 1.0 for normal velocity', () => {
        // Moderate change: 5% to 10%
        const boost = FundingVelocityBoost(0.10, 0.05);
        expect(boost).toBe(1.0);
    });

    it('returns 1.0 when previous funding is zero', () => {
        const boost = FundingVelocityBoost(0.15, 0);
        expect(boost).toBe(1.0);
    });

    it('caps boost at 1.5', () => {
        // Extreme jump
        const boost = FundingVelocityBoost(0.50, 0.01);
        expect(boost).toBeLessThanOrEqual(1.5);
    });
});
