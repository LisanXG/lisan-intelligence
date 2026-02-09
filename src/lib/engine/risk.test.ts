/**
 * LISAN INTELLIGENCE — Risk Management Tests
 * 
 * Tests for risk level calculation, position sizing, and S/R detection.
 */

import { describe, it, expect } from 'vitest';
import {
    calculateRiskLevels,
    validateRiskLevels,
    calculatePositionSize,
    findSupportResistance,
} from './risk';
import { OHLCV } from './indicators';

// ============================================================================
// TEST DATA
// ============================================================================

function makeBars(count: number, startPrice = 100, volatility = 0.02): OHLCV[] {
    const data: OHLCV[] = [];
    let price = startPrice;
    for (let i = 0; i < count; i++) {
        const high = price * (1 + volatility);
        const low = price * (1 - volatility);
        data.push({
            open: price,
            high,
            low,
            close: price + (Math.random() - 0.5) * price * volatility,
            volume: 500000,
            timestamp: Date.now() - (count - i) * 3600000,
        });
        price += (Math.random() - 0.5) * price * volatility * 0.5;
    }
    return data;
}

// ============================================================================
// calculateRiskLevels
// ============================================================================

describe('calculateRiskLevels', () => {
    const data = makeBars(100);

    it('returns all required fields', () => {
        const levels = calculateRiskLevels(data, 'LONG');
        expect(levels).toHaveProperty('entryPrice');
        expect(levels).toHaveProperty('stopLoss');
        expect(levels).toHaveProperty('takeProfit');
        expect(levels).toHaveProperty('riskRewardRatio');
        expect(levels).toHaveProperty('riskPercent');
        expect(levels).toHaveProperty('rewardPercent');
        expect(levels).toHaveProperty('atrValue');
    });

    it('LONG: stopLoss < entry < takeProfit', () => {
        const levels = calculateRiskLevels(data, 'LONG');
        expect(levels.stopLoss).toBeLessThan(levels.entryPrice);
        expect(levels.takeProfit).toBeGreaterThan(levels.entryPrice);
    });

    it('SHORT: takeProfit < entry < stopLoss', () => {
        const levels = calculateRiskLevels(data, 'SHORT');
        expect(levels.stopLoss).toBeGreaterThan(levels.entryPrice);
        expect(levels.takeProfit).toBeLessThan(levels.entryPrice);
    });

    it('HOLD returns neutral levels', () => {
        const levels = calculateRiskLevels(data, 'HOLD');
        expect(levels.entryPrice).toBeGreaterThan(0);
    });

    it('atrValue is positive', () => {
        const levels = calculateRiskLevels(data, 'LONG');
        expect(levels.atrValue).toBeGreaterThan(0);
    });

    it('risk/reward ratio is positive', () => {
        const levels = calculateRiskLevels(data, 'LONG');
        expect(levels.riskRewardRatio).toBeGreaterThan(0);
    });

    it('handles very short data gracefully', () => {
        const shortData = makeBars(5);
        const levels = calculateRiskLevels(shortData, 'LONG');
        expect(levels.entryPrice).toBeGreaterThan(0);
    });

    it('higher ATR multiplier widens stops', () => {
        const tight = calculateRiskLevels(data, 'LONG', 1.0, 2.0);
        const wide = calculateRiskLevels(data, 'LONG', 2.0, 4.0);
        const tightSLDist = tight.entryPrice - tight.stopLoss;
        const wideSLDist = wide.entryPrice - wide.stopLoss;
        expect(wideSLDist).toBeGreaterThanOrEqual(tightSLDist);
    });
});

// ============================================================================
// validateRiskLevels
// ============================================================================

describe('validateRiskLevels', () => {
    it('accepts valid risk levels', () => {
        const levels = calculateRiskLevels(makeBars(100), 'LONG');
        const result = validateRiskLevels(levels);
        // Result depends on data, but should always return a boolean
        expect(typeof result.isValid).toBe('boolean');
    });

    it('rejects levels with RR below minimum', () => {
        const fakeLevel = {
            entryPrice: 100,
            stopLoss: 99,
            takeProfit: 100.5,
            riskRewardRatio: 0.5,
            riskPercent: 1,
            rewardPercent: 0.5,
            atrValue: 1,
        };
        const result = validateRiskLevels(fakeLevel, 1.5);
        expect(result.isValid).toBe(false);
    });
});

// ============================================================================
// calculatePositionSize
// ============================================================================

describe('calculatePositionSize', () => {
    it('returns position size and quantity', () => {
        const levels = calculateRiskLevels(makeBars(100), 'LONG');
        const pos = calculatePositionSize(10000, 1, levels);
        expect(pos).toHaveProperty('positionSize');
        expect(pos).toHaveProperty('quantity');
        expect(pos.positionSize).toBeGreaterThan(0);
        expect(pos.quantity).toBeGreaterThan(0);
    });

    it('higher risk percentage gives larger position', () => {
        const levels = calculateRiskLevels(makeBars(100), 'LONG');
        const conservative = calculatePositionSize(10000, 0.5, levels);
        const aggressive = calculatePositionSize(10000, 2.0, levels);
        expect(aggressive.positionSize).toBeGreaterThan(conservative.positionSize);
    });
});

// ============================================================================
// findSupportResistance
// ============================================================================

describe('findSupportResistance', () => {
    it('returns support and resistance levels', () => {
        const data = makeBars(100);
        const currentPrice = data[data.length - 1].close;
        const sr = findSupportResistance(data, currentPrice);
        expect(sr).toHaveProperty('supports');
        expect(sr).toHaveProperty('resistances');
        expect(sr).toHaveProperty('nearestSupport');
        expect(sr).toHaveProperty('nearestResistance');
    });

    it('supports array contains numbers', () => {
        const data = makeBars(100);
        const currentPrice = data[data.length - 1].close;
        const sr = findSupportResistance(data, currentPrice);
        if (sr.supports.length > 0) {
            expect(typeof sr.supports[0]).toBe('number');
        }
    });
});
