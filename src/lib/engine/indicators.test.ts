/**
 * LISAN INTELLIGENCE — Indicator Function Tests
 * 
 * Tests for the individual technical indicator calculations,
 * with particular focus on the optimized StochasticRSI (F12).
 */

import { describe, it, expect } from 'vitest';
import { RSI, StochasticRSI, MACD, EMA, SMA, ATR, WilliamsR, CCI, BollingerPosition, OBVTrend } from './indicators';
import type { OHLCV } from './indicators';

// ============================================================================
// HELPERS
// ============================================================================

function makePrices(count: number, start = 100, trend = 0): number[] {
    const prices: number[] = [];
    let price = start;
    for (let i = 0; i < count; i++) {
        price += trend + (Math.random() - 0.5) * 2;
        prices.push(Math.max(price, 1));
    }
    return prices;
}

function makeOHLCV(count: number, startPrice = 100, trend = 0): OHLCV[] {
    const data: OHLCV[] = [];
    let price = startPrice;
    for (let i = 0; i < count; i++) {
        price += trend + (Math.random() - 0.5) * 2;
        price = Math.max(price, 1);
        const high = price * 1.01;
        const low = price * 0.99;
        data.push({
            open: price * 0.998,
            high,
            low,
            close: price,
            volume: 500000 + Math.floor(Math.random() * 100000),
            timestamp: Date.now() - (count - i) * 3600000,
        });
    }
    return data;
}

// ============================================================================
// RSI
// ============================================================================

describe('RSI', () => {
    it('returns neutral for insufficient data', () => {
        const result = RSI([100, 101, 102], 14);
        expect(result.signal).toBe('neutral');
        expect(result.value).toBe(50);
    });

    it('RSI is between 0 and 100', () => {
        const prices = makePrices(100);
        const result = RSI(prices);
        expect(result.value).toBeGreaterThanOrEqual(0);
        expect(result.value).toBeLessThanOrEqual(100);
    });

    it('uptrend produces RSI > 50', () => {
        const prices = makePrices(100, 100, 1);
        const result = RSI(prices);
        expect(result.value).toBeGreaterThan(50);
    });

    it('downtrend produces RSI < 50', () => {
        const prices = makePrices(100, 200, -1);
        const result = RSI(prices);
        expect(result.value).toBeLessThan(50);
    });
});

// ============================================================================
// StochasticRSI — F12 regression tests
// ============================================================================

describe('StochasticRSI', () => {
    it('returns neutral for insufficient data', () => {
        const result = StochasticRSI([100, 101, 102], 14, 14);
        expect(result.signal).toBe('neutral');
        expect(result.value).toBe(50);
    });

    it('value is between 0 and 100', () => {
        const prices = makePrices(100);
        const result = StochasticRSI(prices);
        expect(result.value).toBeGreaterThanOrEqual(0);
        expect(result.value).toBeLessThanOrEqual(100);
    });

    it('strength is between 0 and 1', () => {
        const prices = makePrices(100);
        const result = StochasticRSI(prices);
        expect(result.strength).toBeGreaterThanOrEqual(0);
        expect(result.strength).toBeLessThanOrEqual(1);
    });

    it('signal is one of bullish/bearish/neutral', () => {
        const prices = makePrices(100);
        const result = StochasticRSI(prices);
        expect(['bullish', 'bearish', 'neutral']).toContain(result.signal);
    });

    it('produces consistent results with same input', () => {
        const prices = [100, 102, 101, 103, 105, 104, 106, 108, 107, 109,
            111, 110, 112, 114, 113, 115, 117, 116, 118, 120,
            119, 121, 123, 122, 124, 126, 125, 127, 129, 128,
            130, 129, 128, 127, 126, 125, 124, 123, 122, 121,
            120, 119, 118, 117, 116, 115, 114, 113, 112, 111];
        const r1 = StochasticRSI(prices);
        const r2 = StochasticRSI(prices);
        expect(r1.value).toBe(r2.value);
        expect(r1.signal).toBe(r2.signal);
    });
});

// ============================================================================
// EMA & SMA
// ============================================================================

describe('EMA', () => {
    it('returns a number for valid input', () => {
        const prices = makePrices(30);
        const result = EMA(prices, 14);
        expect(typeof result).toBe('number');
    });

    it('follows trend direction', () => {
        const upPrices = makePrices(50, 100, 2);
        const ema = EMA(upPrices, 14);
        expect(ema).toBeGreaterThan(upPrices[0]);
    });
});

describe('SMA', () => {
    it('returns correct average', () => {
        const prices = [10, 20, 30, 40, 50];
        const result = SMA(prices, 5);
        expect(result).toBe(30);
    });
});

// ============================================================================
// MACD
// ============================================================================

describe('MACD', () => {
    it('returns complete structure', () => {
        const prices = makePrices(50);
        const result = MACD(prices);
        expect(result).toHaveProperty('macd');
        expect(result).toHaveProperty('signal');
        expect(result).toHaveProperty('histogram');
    });
});

// ============================================================================
// ATR
// ============================================================================

describe('ATR', () => {
    it('ATR is positive for valid data', () => {
        const data = makeOHLCV(30);
        const atr = ATR(data, 14);
        expect(atr).toBeGreaterThan(0);
    });

    it('higher volatility produces higher ATR', () => {
        const calm = makeOHLCV(30, 100, 0);
        const volatile: OHLCV[] = [];
        let price = 100;
        for (let i = 0; i < 30; i++) {
            price += (Math.random() - 0.5) * 20;
            price = Math.max(price, 1);
            volatile.push({
                open: price,
                high: price * 1.05,
                low: price * 0.95,
                close: price,
                volume: 500000,
                timestamp: Date.now() - (30 - i) * 3600000,
            });
        }
        const atrCalm = ATR(calm, 14);
        const atrVolatile = ATR(volatile, 14);
        expect(atrVolatile).toBeGreaterThan(atrCalm);
    });
});

// ============================================================================
// WilliamsR & CCI & Bollinger
// ============================================================================

describe('WilliamsR', () => {
    it('returns value between -100 and 0', () => {
        const data = makeOHLCV(30);
        const result = WilliamsR(data);
        expect(result.value).toBeGreaterThanOrEqual(-100);
        expect(result.value).toBeLessThanOrEqual(0);
    });
});

describe('CCI', () => {
    it('returns a numeric value', () => {
        const data = makeOHLCV(30);
        const result = CCI(data);
        expect(typeof result.value).toBe('number');
    });
});

describe('BollingerPosition', () => {
    it('returns valid structure', () => {
        const prices = makePrices(30);
        const result = BollingerPosition(prices);
        expect(result).toHaveProperty('upper');
        expect(result).toHaveProperty('middle');
        expect(result).toHaveProperty('lower');
    });
});

// ============================================================================
// OBV
// ============================================================================

describe('OBVTrend', () => {
    it('returns a signal', () => {
        const data = makeOHLCV(30);
        const result = OBVTrend(data);
        expect(['bullish', 'bearish', 'neutral']).toContain(result.signal);
    });
});
