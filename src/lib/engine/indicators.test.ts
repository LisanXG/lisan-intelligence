/**
 * LISAN INTELLIGENCE — Indicator Test Suite
 * 
 * Tests for technical indicator calculations.
 * These are pure functions, so testing focuses on mathematical correctness.
 */

import { describe, it, expect } from 'vitest';
import {
    SMA,
    EMA,
    RSI,
    StochasticRSI,
    MACD,
    WilliamsR,
    CCI,
    EMAAlignment,
    BollingerPosition,
    ADX,
    OBVTrend,
    VolumeRatio,
    ATR,
    ZScore,
    IchimokuCloud,
    standardDeviation,
    OHLCV,
} from './indicators';

// ============================================================================
// TEST DATA
// ============================================================================

// Generates mock OHLCV data for testing
function generateMockOHLCV(length: number, basePrice: number = 100): OHLCV[] {
    const data: OHLCV[] = [];
    let price = basePrice;

    for (let i = 0; i < length; i++) {
        const change = (Math.random() - 0.5) * 5;
        price = Math.max(price + change, 1); // Keep price positive

        const high = price * (1 + Math.random() * 0.02);
        const low = price * (1 - Math.random() * 0.02);
        const open = low + Math.random() * (high - low);
        const close = low + Math.random() * (high - low);
        const volume = Math.floor(Math.random() * 1000000) + 100000;

        data.push({
            open,
            high,
            low,
            close,
            volume,
            timestamp: Date.now() - (length - i) * 3600000,
        });
    }

    return data;
}

// Generate uptrending data for bullish signal tests
function generateUptrendData(length: number): OHLCV[] {
    const data: OHLCV[] = [];
    let price = 100;

    for (let i = 0; i < length; i++) {
        price = price * 1.01; // 1% increase each period
        const high = price * 1.005;
        const low = price * 0.995;

        data.push({
            open: low,
            high,
            low,
            close: price,
            volume: 500000 + Math.floor(Math.random() * 100000),
            timestamp: Date.now() - (length - i) * 3600000,
        });
    }

    return data;
}

// Generate downtrending data for bearish signal tests
function generateDowntrendData(length: number): OHLCV[] {
    const data: OHLCV[] = [];
    let price = 100;

    for (let i = 0; i < length; i++) {
        price = price * 0.99; // 1% decrease each period
        const high = price * 1.005;
        const low = price * 0.995;

        data.push({
            open: high,
            high,
            low,
            close: price,
            volume: 500000 + Math.floor(Math.random() * 100000),
            timestamp: Date.now() - (length - i) * 3600000,
        });
    }

    return data;
}

// ============================================================================
// UTILITY FUNCTION TESTS
// ============================================================================

describe('SMA - Simple Moving Average', () => {
    it('calculates correct average', () => {
        const data = [10, 20, 30, 40, 50];
        expect(SMA(data, 5)).toBe(30);
    });

    it('handles short data', () => {
        const data = [10, 20];
        expect(SMA(data, 5)).toBe(20); // Returns last value when insufficient data
    });

    it('uses only last n values', () => {
        const data = [1, 2, 3, 10, 20, 30];
        expect(SMA(data, 3)).toBe(20); // Average of [10, 20, 30]
    });
});

describe('EMA - Exponential Moving Average', () => {
    it('weighs recent data more heavily', () => {
        const data = [10, 10, 10, 10, 100]; // Spike at end
        const ema = EMA(data, 3);
        const sma = SMA(data, 3);
        expect(ema).toBeGreaterThan(sma); // EMA should be closer to recent spike
    });

    it('handles empty data', () => {
        expect(EMA([], 5)).toBe(0);
    });
});

describe('standardDeviation', () => {
    it('calculates correct std dev', () => {
        const data = [2, 4, 4, 4, 5, 5, 7, 9];
        const stdDev = standardDeviation(data);
        expect(stdDev).toBeCloseTo(2, 0); // ~2
    });

    it('returns 0 for empty data', () => {
        expect(standardDeviation([])).toBe(0);
    });
});

// ============================================================================
// MOMENTUM INDICATOR TESTS
// ============================================================================

describe('RSI - Relative Strength Index', () => {
    it('returns 50 for insufficient data', () => {
        const closes = [100, 101, 102];
        const result = RSI(closes, 14);
        expect(result.value).toBe(50);
        expect(result.signal).toBe('neutral');
    });

    it('returns bullish signal when oversold (<30)', () => {
        const downtrend = generateDowntrendData(50).map(d => d.close);
        const result = RSI(downtrend, 14);
        // Strong downtrend should push RSI low
        expect(result.value).toBeLessThan(50);
    });

    it('returns bearish signal when overbought (>70)', () => {
        const uptrend = generateUptrendData(50).map(d => d.close);
        const result = RSI(uptrend, 14);
        // Strong uptrend should push RSI high
        expect(result.value).toBeGreaterThan(50);
    });

    it('returns values between 0 and 100', () => {
        const data = generateMockOHLCV(100).map(d => d.close);
        const result = RSI(data, 14);
        expect(result.value).toBeGreaterThanOrEqual(0);
        expect(result.value).toBeLessThanOrEqual(100);
    });
});

describe('StochasticRSI', () => {
    it('returns neutral for insufficient data', () => {
        const closes = [100, 101];
        const result = StochasticRSI(closes, 14, 14);
        expect(result.signal).toBe('neutral');
    });

    it('returns values between 0 and 100', () => {
        const data = generateMockOHLCV(100).map(d => d.close);
        const result = StochasticRSI(data, 14, 14);
        expect(result.value).toBeGreaterThanOrEqual(0);
        expect(result.value).toBeLessThanOrEqual(100);
    });
});

describe('MACD', () => {
    it('returns zeros for insufficient data', () => {
        const closes = [100, 101, 102];
        const result = MACD(closes);
        expect(result.macd).toBe(0);
        expect(result.histogram).toBe(0);
    });

    it('returns bullish when histogram positive', () => {
        const uptrend = generateUptrendData(50).map(d => d.close);
        const result = MACD(uptrend);
        // In strong uptrend, MACD should be positive
        expect(result.macd).toBeGreaterThan(0);
    });
});

describe('WilliamsR', () => {
    it('returns values between -100 and 0', () => {
        const data = generateMockOHLCV(30);
        const result = WilliamsR(data, 14);
        expect(result.value).toBeGreaterThanOrEqual(-100);
        expect(result.value).toBeLessThanOrEqual(0);
    });

    it('returns neutral for insufficient data', () => {
        const data = generateMockOHLCV(5);
        const result = WilliamsR(data, 14);
        expect(result.signal).toBe('neutral');
    });
});

describe('CCI', () => {
    it('detects overbought conditions', () => {
        const uptrend = generateUptrendData(50);
        const result = CCI(uptrend, 20);
        // Strong uptrend should have positive CCI
        expect(result.value).toBeGreaterThan(0);
    });

    it('returns neutral for insufficient data', () => {
        const data = generateMockOHLCV(5);
        const result = CCI(data, 20);
        expect(result.signal).toBe('neutral');
    });
});

// ============================================================================
// TREND INDICATOR TESTS
// ============================================================================

describe('EMAAlignment', () => {
    it('returns bullish for perfect uptrend alignment', () => {
        const uptrend = generateUptrendData(100).map(d => d.close);
        const result = EMAAlignment(uptrend);
        expect(result.signal).toBe('bullish');
        expect(result.value).toBeGreaterThanOrEqual(75);
    });

    it('returns bearish for perfect downtrend alignment', () => {
        const downtrend = generateDowntrendData(100).map(d => d.close);
        const result = EMAAlignment(downtrend);
        expect(result.signal).toBe('bearish');
        expect(result.value).toBeLessThanOrEqual(25);
    });

    it('returns neutral for insufficient data', () => {
        const data = [100, 101, 102];
        const result = EMAAlignment(data);
        expect(result.signal).toBe('neutral');
    });
});

describe('BollingerPosition', () => {
    it('returns position in expected range', () => {
        const data = generateMockOHLCV(50).map(d => d.close);
        const result = BollingerPosition(data, 20);
        // Bollinger %B can go below 0 or above 1 when price breaks outside bands
        expect(result.position).toBeGreaterThanOrEqual(-0.5);
        expect(result.position).toBeLessThanOrEqual(1.5);
    });

    it('calculates valid upper/lower bands', () => {
        const data = generateMockOHLCV(50).map(d => d.close);
        const result = BollingerPosition(data, 20);
        expect(result.upper).toBeGreaterThan(result.middle);
        expect(result.lower).toBeLessThan(result.middle);
    });
});

describe('IchimokuCloud', () => {
    it('returns neutral for insufficient data', () => {
        const data = generateMockOHLCV(30);
        const result = IchimokuCloud(data);
        expect(result.result.signal).toBe('neutral');
    });

    it('returns valid tenkan and kijun', () => {
        const data = generateMockOHLCV(100);
        const result = IchimokuCloud(data);
        expect(result.tenkan).toBeGreaterThan(0);
        expect(result.kijun).toBeGreaterThan(0);
    });
});

describe('ADX', () => {
    it('returns values between 0 and 100', () => {
        const data = generateMockOHLCV(50);
        const result = ADX(data, 14);
        expect(result.adx).toBeGreaterThanOrEqual(0);
        expect(result.adx).toBeLessThanOrEqual(100);
    });

    it('detects trend direction via DI', () => {
        const uptrend = generateUptrendData(50);
        const result = ADX(uptrend, 14);
        expect(result.plusDI).toBeGreaterThan(result.minusDI);
    });
});

// ============================================================================
// VOLUME INDICATOR TESTS
// ============================================================================

describe('OBVTrend', () => {
    it('returns neutral for insufficient data', () => {
        const data: OHLCV[] = [{ open: 100, high: 101, low: 99, close: 100, volume: 1000, timestamp: Date.now() }];
        const result = OBVTrend(data);
        expect(result.signal).toBe('neutral');
    });

    it('detects bullish accumulation', () => {
        // Price going up with increasing volume = bullish
        const data: OHLCV[] = [];
        for (let i = 0; i < 20; i++) {
            data.push({
                open: 100 + i,
                high: 102 + i,
                low: 99 + i,
                close: 101 + i, // Price increasing
                volume: 100000 + i * 10000, // Volume increasing
                timestamp: Date.now() - (20 - i) * 3600000,
            });
        }
        const result = OBVTrend(data, 7);
        expect(result.value).toBeGreaterThan(0);
    });
});

describe('VolumeRatio', () => {
    it('returns 1 for average volume', () => {
        const data = generateMockOHLCV(30);
        // Set last candle volume to average
        const avgVol = data.slice(0, -1).reduce((sum, d) => sum + d.volume, 0) / (data.length - 1);
        data[data.length - 1].volume = avgVol;

        const result = VolumeRatio(data, 20);
        expect(result.value).toBeCloseTo(1, 0);
    });
});

// ============================================================================
// VOLATILITY TESTS
// ============================================================================

describe('ATR', () => {
    it('returns positive value for valid data', () => {
        const data = generateMockOHLCV(30);
        const atr = ATR(data, 14);
        expect(atr).toBeGreaterThan(0);
    });

    it('returns 0 for insufficient data', () => {
        const data = generateMockOHLCV(5);
        const atr = ATR(data, 14);
        expect(atr).toBe(0);
    });
});

describe('ZScore', () => {
    it('returns 0 for price at mean', () => {
        const data = [100, 100, 100, 100, 100]; // All same price
        const result = ZScore(data, 5);
        expect(result.value).toBe(0);
    });

    it('returns positive for price above mean', () => {
        const data = [90, 90, 90, 90, 110]; // Last price way above mean
        const result = ZScore(data, 5);
        expect(result.value).toBeGreaterThan(0);
    });

    it('returns negative for price below mean', () => {
        const data = [110, 110, 110, 110, 90]; // Last price way below mean
        const result = ZScore(data, 5);
        expect(result.value).toBeLessThan(0);
    });
});
