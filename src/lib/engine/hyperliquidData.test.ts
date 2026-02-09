/**
 * LISAN INTELLIGENCE — HyperliquidData Tests
 * 
 * Tests for the pure indicator functions (no API calls).
 * fetchHyperliquidMarketContext is not tested here because it hits external APIs.
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
// FundingRateSignal (Contrarian)
// ============================================================================

describe('FundingRateSignal', () => {
    it('high positive funding is bearish (crowded longs)', () => {
        const result = FundingRateSignal(50); // 50% annualized
        expect(result.signal).toBe('bearish');
    });

    it('high negative funding is bullish (crowded shorts)', () => {
        const result = FundingRateSignal(-50);
        expect(result.signal).toBe('bullish');
    });

    it('neutral funding is neutral', () => {
        const result = FundingRateSignal(0);
        expect(result.signal).toBe('neutral');
    });

    it('strength is between 0 and 1', () => {
        const result = FundingRateSignal(30);
        expect(result.strength).toBeGreaterThanOrEqual(0);
        expect(result.strength).toBeLessThanOrEqual(1);
    });
});

// ============================================================================
// OIChangeSignal
// ============================================================================

describe('OIChangeSignal', () => {
    it('rising OI + rising price = bullish continuation', () => {
        const result = OIChangeSignal(110, 100, 5);
        expect(result.signal).toBe('bullish');
    });

    it('rising OI + falling price = bearish continuation', () => {
        const result = OIChangeSignal(110, 100, -5);
        expect(result.signal).toBe('bearish');
    });

    it('handles zero previous OI gracefully', () => {
        const result = OIChangeSignal(100, 0, 5);
        expect(result).toBeDefined();
        expect(result).toHaveProperty('value');
    });

    it('equal OI produces neutral or weak signal', () => {
        const result = OIChangeSignal(100, 100, 0);
        expect(result.strength).toBeLessThanOrEqual(0.5);
    });
});

// ============================================================================
// BasisPremiumSignal (Contrarian)
// ============================================================================

describe('BasisPremiumSignal', () => {
    it('positive premium (mark > index) is bearish', () => {
        const result = BasisPremiumSignal(0.005); // 0.5% premium
        expect(result.signal).toBe('bearish');
    });

    it('negative premium (mark < index) is bullish', () => {
        const result = BasisPremiumSignal(-0.005);
        expect(result.signal).toBe('bullish');
    });

    it('zero premium is neutral', () => {
        const result = BasisPremiumSignal(0);
        expect(result.signal).toBe('neutral');
    });
});

// ============================================================================
// HLVolumeMomentumSignal
// ============================================================================

describe('HLVolumeMomentumSignal', () => {
    it('high volume + positive price = bullish', () => {
        const result = HLVolumeMomentumSignal(2000000, 1000000, 5);
        expect(result.signal).toBe('bullish');
    });

    it('high volume + negative price = bearish', () => {
        const result = HLVolumeMomentumSignal(2000000, 1000000, -5);
        expect(result.signal).toBe('bearish');
    });

    it('low volume produces weaker signal', () => {
        const high = HLVolumeMomentumSignal(2000000, 1000000, 5);
        const low = HLVolumeMomentumSignal(500000, 1000000, 5);
        expect(high.strength).toBeGreaterThanOrEqual(low.strength);
    });
});

// ============================================================================
// FundingVelocityBoost
// ============================================================================

describe('FundingVelocityBoost', () => {
    it('returns a multiplier >= 1.0', () => {
        const result = FundingVelocityBoost(30, 10);
        expect(result).toBeGreaterThanOrEqual(1.0);
    });

    it('stable funding returns ~1.0', () => {
        const result = FundingVelocityBoost(10, 10);
        expect(result).toBeCloseTo(1.0, 1);
    });

    it('accelerating funding increases multiplier', () => {
        const stable = FundingVelocityBoost(10, 10);
        const accelerating = FundingVelocityBoost(50, 10);
        expect(accelerating).toBeGreaterThanOrEqual(stable);
    });
});

// ============================================================================
// calculatePositioningScore
// ============================================================================

describe('calculatePositioningScore', () => {
    const bullishSignal = { value: 70, signal: 'bullish' as const, strength: 0.8 };
    const bearishSignal = { value: 30, signal: 'bearish' as const, strength: 0.7 };
    const neutralSignal = { value: 50, signal: 'neutral' as const, strength: 0 };

    it('returns score, max, and direction', () => {
        const result = calculatePositioningScore(bullishSignal, neutralSignal);
        expect(result).toHaveProperty('score');
        expect(result).toHaveProperty('max');
        expect(result).toHaveProperty('direction');
    });

    it('all bullish signals produce positive direction', () => {
        const result = calculatePositioningScore(bullishSignal, bullishSignal);
        expect(result.direction).toBeGreaterThanOrEqual(0);
    });

    it('max reflects total weight', () => {
        const result = calculatePositioningScore(bullishSignal, neutralSignal, 6, 4);
        expect(result.max).toBe(10); // 6 + 4
    });

    it('v4.1 HL indicators expand max', () => {
        const result = calculatePositioningScore(
            bullishSignal, neutralSignal, 6, 4,
            bullishSignal, bullishSignal, 3, 3
        );
        expect(result.max).toBe(16); // 6 + 4 + 3 + 3
    });
});
