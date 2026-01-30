/**
 * LISAN INTELLIGENCE — Technical Indicator Library
 * 
 * Comprehensive quantitative analysis functions for crypto market scoring.
 * All indicators are calculated from price/volume data arrays.
 */

// ============================================================================
// TYPES
// ============================================================================

export interface OHLCV {
    open: number;
    high: number;
    low: number;
    close: number;
    volume: number;
    timestamp: number;
}

export interface IndicatorResult {
    value: number;
    signal: 'bullish' | 'bearish' | 'neutral';
    strength: number; // 0-1 confidence
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Calculate Simple Moving Average
 */
export function SMA(data: number[], period: number): number {
    if (data.length < period) return data[data.length - 1] || 0;
    const slice = data.slice(-period);
    return slice.reduce((sum, val) => sum + val, 0) / period;
}

/**
 * Calculate Exponential Moving Average
 */
export function EMA(data: number[], period: number): number {
    if (data.length === 0) return 0;
    if (data.length < period) return SMA(data, data.length);

    const multiplier = 2 / (period + 1);
    let ema = SMA(data.slice(0, period), period);

    for (let i = period; i < data.length; i++) {
        ema = (data[i] - ema) * multiplier + ema;
    }

    return ema;
}

/**
 * Calculate EMA series (returns array of EMA values)
 */
export function EMASeries(data: number[], period: number): number[] {
    if (data.length === 0) return [];

    const multiplier = 2 / (period + 1);
    const result: number[] = [];
    let ema = data[0];

    for (let i = 0; i < data.length; i++) {
        if (i < period) {
            ema = SMA(data.slice(0, i + 1), i + 1);
        } else {
            ema = (data[i] - ema) * multiplier + ema;
        }
        result.push(ema);
    }

    return result;
}

/**
 * Calculate Standard Deviation
 */
export function standardDeviation(data: number[]): number {
    if (data.length === 0) return 0;
    const mean = data.reduce((sum, val) => sum + val, 0) / data.length;
    const squaredDiffs = data.map(val => Math.pow(val - mean, 2));
    return Math.sqrt(squaredDiffs.reduce((sum, val) => sum + val, 0) / data.length);
}

// ============================================================================
// MOMENTUM INDICATORS
// ============================================================================

/**
 * Relative Strength Index (RSI)
 * Measures momentum and overbought/oversold conditions
 * 
 * @param closes - Array of closing prices
 * @param period - RSI period (default 14)
 * @returns IndicatorResult with RSI value (0-100)
 */
export function RSI(closes: number[], period: number = 14): IndicatorResult {
    if (closes.length < period + 1) {
        return { value: 50, signal: 'neutral', strength: 0 };
    }

    let gains = 0;
    let losses = 0;

    // Calculate initial average gain/loss
    for (let i = 1; i <= period; i++) {
        const change = closes[i] - closes[i - 1];
        if (change > 0) gains += change;
        else losses += Math.abs(change);
    }

    let avgGain = gains / period;
    let avgLoss = losses / period;

    // Calculate subsequent values using smoothed method
    for (let i = period + 1; i < closes.length; i++) {
        const change = closes[i] - closes[i - 1];
        const gain = change > 0 ? change : 0;
        const loss = change < 0 ? Math.abs(change) : 0;

        avgGain = (avgGain * (period - 1) + gain) / period;
        avgLoss = (avgLoss * (period - 1) + loss) / period;
    }

    const rs = avgLoss === 0 ? 100 : avgGain / avgLoss;
    const rsi = 100 - (100 / (1 + rs));

    // Determine signal
    let signal: 'bullish' | 'bearish' | 'neutral' = 'neutral';
    let strength = 0;

    if (rsi < 30) {
        signal = 'bullish'; // Oversold = potential buy
        strength = (30 - rsi) / 30;
    } else if (rsi > 70) {
        signal = 'bearish'; // Overbought = potential sell
        strength = (rsi - 70) / 30;
    } else {
        strength = 0.5 - Math.abs(50 - rsi) / 50;
    }

    return { value: rsi, signal, strength: Math.min(1, strength) };
}

/**
 * Stochastic RSI
 * RSI-based oscillator, more sensitive than standard RSI
 * 
 * @param closes - Array of closing prices
 * @param rsiPeriod - RSI period (default 14)
 * @param stochPeriod - Stochastic period (default 14)
 */
export function StochasticRSI(
    closes: number[],
    rsiPeriod: number = 14,
    stochPeriod: number = 14
): IndicatorResult {
    if (closes.length < rsiPeriod + stochPeriod) {
        return { value: 50, signal: 'neutral', strength: 0 };
    }

    // Calculate RSI series
    const rsiValues: number[] = [];
    for (let i = rsiPeriod; i <= closes.length; i++) {
        const slice = closes.slice(0, i);
        rsiValues.push(RSI(slice, rsiPeriod).value);
    }

    if (rsiValues.length < stochPeriod) {
        return { value: 50, signal: 'neutral', strength: 0 };
    }

    // Calculate Stochastic of RSI
    const recentRSI = rsiValues.slice(-stochPeriod);
    const currentRSI = recentRSI[recentRSI.length - 1];
    const lowestRSI = Math.min(...recentRSI);
    const highestRSI = Math.max(...recentRSI);

    const range = highestRSI - lowestRSI;
    const stochRSI = range === 0 ? 50 : ((currentRSI - lowestRSI) / range) * 100;

    let signal: 'bullish' | 'bearish' | 'neutral' = 'neutral';
    let strength = 0;

    if (stochRSI < 20) {
        signal = 'bullish';
        strength = (20 - stochRSI) / 20;
    } else if (stochRSI > 80) {
        signal = 'bearish';
        strength = (stochRSI - 80) / 20;
    }

    return { value: stochRSI, signal, strength };
}

/**
 * Williams %R
 * Momentum oscillator showing level of close relative to high-low range
 * 
 * @param data - OHLCV data array
 * @param period - Lookback period (default 14)
 */
export function WilliamsR(data: OHLCV[], period: number = 14): IndicatorResult {
    if (data.length < period) {
        return { value: -50, signal: 'neutral', strength: 0 };
    }

    const recent = data.slice(-period);
    const highestHigh = Math.max(...recent.map(d => d.high));
    const lowestLow = Math.min(...recent.map(d => d.low));
    const currentClose = data[data.length - 1].close;

    const range = highestHigh - lowestLow;
    const willR = range === 0 ? -50 : ((highestHigh - currentClose) / range) * -100;

    let signal: 'bullish' | 'bearish' | 'neutral' = 'neutral';
    let strength = 0;

    if (willR < -80) {
        signal = 'bullish'; // Oversold
        strength = (-80 - willR) / 20;
    } else if (willR > -20) {
        signal = 'bearish'; // Overbought
        strength = (willR + 20) / 20;
    }

    return { value: willR, signal, strength };
}

/**
 * MACD (Moving Average Convergence Divergence)
 * Trend-following momentum indicator
 * 
 * @param closes - Array of closing prices
 * @param fastPeriod - Fast EMA period (default 12)
 * @param slowPeriod - Slow EMA period (default 26)
 * @param signalPeriod - Signal line period (default 9)
 */
export function MACD(
    closes: number[],
    fastPeriod: number = 12,
    slowPeriod: number = 26,
    signalPeriod: number = 9
): { macd: number; signal: number; histogram: number; result: IndicatorResult } {
    if (closes.length < slowPeriod + signalPeriod) {
        return {
            macd: 0,
            signal: 0,
            histogram: 0,
            result: { value: 0, signal: 'neutral', strength: 0 }
        };
    }

    const fastEMA = EMA(closes, fastPeriod);
    const slowEMA = EMA(closes, slowPeriod);
    const macdLine = fastEMA - slowEMA;

    // Calculate MACD series for signal line
    const macdSeries: number[] = [];
    for (let i = slowPeriod; i <= closes.length; i++) {
        const slice = closes.slice(0, i);
        const fast = EMA(slice, fastPeriod);
        const slow = EMA(slice, slowPeriod);
        macdSeries.push(fast - slow);
    }

    const signalLine = EMA(macdSeries, signalPeriod);
    const histogram = macdLine - signalLine;

    let indicatorSignal: 'bullish' | 'bearish' | 'neutral' = 'neutral';
    let strength = 0;

    if (histogram > 0 && macdLine > 0) {
        indicatorSignal = 'bullish';
        strength = Math.min(1, Math.abs(histogram) / Math.abs(macdLine) || 0);
    } else if (histogram < 0 && macdLine < 0) {
        indicatorSignal = 'bearish';
        strength = Math.min(1, Math.abs(histogram) / Math.abs(macdLine) || 0);
    }

    return {
        macd: macdLine,
        signal: signalLine,
        histogram,
        result: { value: histogram, signal: indicatorSignal, strength }
    };
}

/**
 * Commodity Channel Index (CCI)
 * Measures variation from statistical mean
 * 
 * @param data - OHLCV data array
 * @param period - CCI period (default 20)
 */
export function CCI(data: OHLCV[], period: number = 20): IndicatorResult {
    if (data.length < period) {
        return { value: 0, signal: 'neutral', strength: 0 };
    }

    const recent = data.slice(-period);

    // Calculate typical prices
    const typicalPrices = recent.map(d => (d.high + d.low + d.close) / 3);

    // SMA of typical prices
    const smaTP = typicalPrices.reduce((sum, val) => sum + val, 0) / period;

    // Mean deviation
    const meanDeviation = typicalPrices.reduce((sum, val) => sum + Math.abs(val - smaTP), 0) / period;

    const currentTP = typicalPrices[typicalPrices.length - 1];
    const cci = meanDeviation === 0 ? 0 : (currentTP - smaTP) / (0.015 * meanDeviation);

    let signal: 'bullish' | 'bearish' | 'neutral' = 'neutral';
    let strength = 0;

    if (cci < -100) {
        signal = 'bullish'; // Oversold
        strength = Math.min(1, Math.abs(cci + 100) / 100);
    } else if (cci > 100) {
        signal = 'bearish'; // Overbought
        strength = Math.min(1, (cci - 100) / 100);
    }

    return { value: cci, signal, strength };
}

// ============================================================================
// TREND INDICATORS
// ============================================================================

/**
 * EMA Alignment Score
 * Measures trend strength by checking EMA stack alignment
 * 
 * @param closes - Array of closing prices
 * @returns Alignment score and trend direction
 */
export function EMAAlignment(closes: number[]): IndicatorResult {
    if (closes.length < 50) {
        return { value: 0, signal: 'neutral', strength: 0 };
    }

    const ema7 = EMA(closes, 7);
    const ema21 = EMA(closes, 21);
    const ema50 = EMA(closes, 50);
    const currentPrice = closes[closes.length - 1];

    let score = 0;

    // Perfect bullish alignment: Price > EMA7 > EMA21 > EMA50
    if (currentPrice > ema7) score += 25;
    if (ema7 > ema21) score += 25;
    if (ema21 > ema50) score += 25;
    if (currentPrice > ema50) score += 25;

    // Bearish alignment inverts score
    const bullishScore = score;
    const bearishScore = 100 - score;

    let signal: 'bullish' | 'bearish' | 'neutral' = 'neutral';
    if (bullishScore >= 75) signal = 'bullish';
    else if (bearishScore >= 75) signal = 'bearish';

    return {
        value: bullishScore,
        signal,
        strength: Math.abs(bullishScore - 50) / 50
    };
}

/**
 * Bollinger Band Position
 * Shows where price is within Bollinger Bands
 * 
 * @param closes - Array of closing prices
 * @param period - SMA period (default 20)
 * @param stdDev - Standard deviation multiplier (default 2)
 */
export function BollingerPosition(
    closes: number[],
    period: number = 20,
    stdDevMult: number = 2
): { upper: number; middle: number; lower: number; position: number; result: IndicatorResult } {
    if (closes.length < period) {
        return {
            upper: 0, middle: 0, lower: 0, position: 0.5,
            result: { value: 50, signal: 'neutral', strength: 0 }
        };
    }

    const recentCloses = closes.slice(-period);
    const middle = SMA(recentCloses, period);
    const stdDev = standardDeviation(recentCloses);
    const upper = middle + (stdDevMult * stdDev);
    const lower = middle - (stdDevMult * stdDev);

    const currentPrice = closes[closes.length - 1];
    const range = upper - lower;
    const position = range === 0 ? 0.5 : (currentPrice - lower) / range;

    let signal: 'bullish' | 'bearish' | 'neutral' = 'neutral';
    let strength = 0;

    // Near lower band = potential buy, near upper = potential sell
    if (position < 0.2) {
        signal = 'bullish'; // Near lower band, oversold
        strength = (0.2 - position) / 0.2;
    } else if (position > 0.8) {
        signal = 'bearish'; // Near upper band, overbought
        strength = (position - 0.8) / 0.2;
    }

    return {
        upper,
        middle,
        lower,
        position,
        result: { value: position * 100, signal, strength }
    };
}

/**
 * VWAP Approximation
 * Volume-Weighted Average Price (approximated from available data)
 * 
 * @param data - OHLCV data array
 * @param period - Period to calculate over
 */
export function VWAPApprox(data: OHLCV[], period?: number): number {
    const slice = period ? data.slice(-period) : data;
    if (slice.length === 0) return 0;

    let cumulativeTPV = 0;
    let cumulativeVolume = 0;

    for (const candle of slice) {
        const typicalPrice = (candle.high + candle.low + candle.close) / 3;
        cumulativeTPV += typicalPrice * candle.volume;
        cumulativeVolume += candle.volume;
    }

    return cumulativeVolume === 0 ? slice[slice.length - 1].close : cumulativeTPV / cumulativeVolume;
}

/**
 * Ichimoku Cloud
 * All-in-one trend detection system
 * 
 * @param data - OHLCV data array
 */
export function IchimokuCloud(data: OHLCV[]): {
    tenkan: number;
    kijun: number;
    senkouA: number;
    senkouB: number;
    chikou: number;
    result: IndicatorResult;
} {
    const tenkanPeriod = 9;
    const kijunPeriod = 26;
    const senkouBPeriod = 52;

    if (data.length < senkouBPeriod) {
        return {
            tenkan: 0, kijun: 0, senkouA: 0, senkouB: 0, chikou: 0,
            result: { value: 0, signal: 'neutral', strength: 0 }
        };
    }

    // Helper: (highest high + lowest low) / 2
    const midPoint = (slice: OHLCV[]) => {
        const highs = slice.map(d => d.high);
        const lows = slice.map(d => d.low);
        return (Math.max(...highs) + Math.min(...lows)) / 2;
    };

    // Tenkan-sen (Conversion Line): 9-period mid
    const tenkan = midPoint(data.slice(-tenkanPeriod));

    // Kijun-sen (Base Line): 26-period mid
    const kijun = midPoint(data.slice(-kijunPeriod));

    // Senkou Span A: (Tenkan + Kijun) / 2
    const senkouA = (tenkan + kijun) / 2;

    // Senkou Span B: 52-period mid
    const senkouB = midPoint(data.slice(-senkouBPeriod));

    // Chikou Span: Current close (would be plotted 26 periods back)
    const chikou = data[data.length - 1].close;
    const currentPrice = data[data.length - 1].close;

    // Signal logic
    let score = 0;

    // Price above cloud
    const cloudTop = Math.max(senkouA, senkouB);
    const cloudBottom = Math.min(senkouA, senkouB);

    if (currentPrice > cloudTop) score += 30;
    else if (currentPrice < cloudBottom) score -= 30;

    // Tenkan above Kijun (bullish cross)
    if (tenkan > kijun) score += 25;
    else if (tenkan < kijun) score -= 25;

    // Cloud color (Senkou A above B = bullish)
    if (senkouA > senkouB) score += 20;
    else if (senkouA < senkouB) score -= 20;

    // Chikou above price from 26 periods ago
    if (data.length >= 26) {
        const price26Ago = data[data.length - 26].close;
        if (chikou > price26Ago) score += 25;
        else if (chikou < price26Ago) score -= 25;
    }

    let signal: 'bullish' | 'bearish' | 'neutral' = 'neutral';
    if (score >= 50) signal = 'bullish';
    else if (score <= -50) signal = 'bearish';

    return {
        tenkan,
        kijun,
        senkouA,
        senkouB,
        chikou,
        result: {
            value: score,
            signal,
            strength: Math.min(1, Math.abs(score) / 100)
        }
    };
}

/**
 * Average Directional Index (ADX)
 * Measures trend strength (not direction)
 * 
 * @param data - OHLCV data array
 * @param period - ADX period (default 14)
 */
export function ADX(data: OHLCV[], period: number = 14): {
    adx: number;
    plusDI: number;
    minusDI: number;
    result: IndicatorResult;
} {
    if (data.length < period * 2) {
        return {
            adx: 0, plusDI: 0, minusDI: 0,
            result: { value: 0, signal: 'neutral', strength: 0 }
        };
    }

    // Calculate True Range and Directional Movement
    const trs: number[] = [];
    const plusDMs: number[] = [];
    const minusDMs: number[] = [];

    for (let i = 1; i < data.length; i++) {
        const high = data[i].high;
        const low = data[i].low;
        const prevHigh = data[i - 1].high;
        const prevLow = data[i - 1].low;
        const prevClose = data[i - 1].close;

        // True Range
        const tr = Math.max(
            high - low,
            Math.abs(high - prevClose),
            Math.abs(low - prevClose)
        );
        trs.push(tr);

        // Directional Movement
        const upMove = high - prevHigh;
        const downMove = prevLow - low;

        plusDMs.push(upMove > downMove && upMove > 0 ? upMove : 0);
        minusDMs.push(downMove > upMove && downMove > 0 ? downMove : 0);
    }

    // Smoothed averages
    const smoothedTR = EMA(trs, period);
    const smoothedPlusDM = EMA(plusDMs, period);
    const smoothedMinusDM = EMA(minusDMs, period);

    // Directional Indicators
    const plusDI = smoothedTR === 0 ? 0 : (smoothedPlusDM / smoothedTR) * 100;
    const minusDI = smoothedTR === 0 ? 0 : (smoothedMinusDM / smoothedTR) * 100;

    // DX (Directional Index)
    const diSum = plusDI + minusDI;
    const dx = diSum === 0 ? 0 : (Math.abs(plusDI - minusDI) / diSum) * 100;

    // ADX is smoothed DX (we approximate with current DX)
    const adx = dx;

    // Signal: ADX measures trend strength, not direction
    // plusDI > minusDI = bullish trend, minusDI > plusDI = bearish
    let signal: 'bullish' | 'bearish' | 'neutral' = 'neutral';
    let strength = 0;

    if (adx > 25) {
        // Strong trend
        signal = plusDI > minusDI ? 'bullish' : 'bearish';
        strength = Math.min(1, (adx - 25) / 50);
    }

    return {
        adx,
        plusDI,
        minusDI,
        result: { value: adx, signal, strength }
    };
}

// ============================================================================
// VOLUME INDICATORS
// ============================================================================

/**
 * On-Balance Volume (OBV) Trend
 * Measures buying/selling pressure via volume flow
 * 
 * @param data - OHLCV data array
 * @param trendPeriod - Period to measure OBV trend (default 7)
 */
export function OBVTrend(data: OHLCV[], trendPeriod: number = 7): IndicatorResult {
    if (data.length < 2) {
        return { value: 0, signal: 'neutral', strength: 0 };
    }

    // Calculate OBV series
    const obvSeries: number[] = [0];
    for (let i = 1; i < data.length; i++) {
        const prev = obvSeries[i - 1];
        if (data[i].close > data[i - 1].close) {
            obvSeries.push(prev + data[i].volume);
        } else if (data[i].close < data[i - 1].close) {
            obvSeries.push(prev - data[i].volume);
        } else {
            obvSeries.push(prev);
        }
    }

    // Calculate OBV trend
    if (obvSeries.length < trendPeriod) {
        return { value: 0, signal: 'neutral', strength: 0 };
    }

    const recentOBV = obvSeries.slice(-trendPeriod);
    const obvChange = recentOBV[recentOBV.length - 1] - recentOBV[0];
    const avgVolume = data.slice(-trendPeriod).reduce((sum, d) => sum + d.volume, 0) / trendPeriod;

    // Normalize OBV change relative to average volume
    const normalizedChange = avgVolume === 0 ? 0 : obvChange / avgVolume;

    let signal: 'bullish' | 'bearish' | 'neutral' = 'neutral';
    if (normalizedChange > 0.5) signal = 'bullish';
    else if (normalizedChange < -0.5) signal = 'bearish';

    return {
        value: normalizedChange,
        signal,
        strength: Math.min(1, Math.abs(normalizedChange))
    };
}

/**
 * Volume Ratio
 * Current volume compared to average
 * 
 * @param data - OHLCV data array
 * @param avgPeriod - Period for average volume (default 20)
 */
export function VolumeRatio(data: OHLCV[], avgPeriod: number = 20): IndicatorResult {
    if (data.length < avgPeriod) {
        return { value: 1, signal: 'neutral', strength: 0 };
    }

    const avgVolume = data.slice(-avgPeriod, -1).reduce((sum, d) => sum + d.volume, 0) / (avgPeriod - 1);
    const currentVolume = data[data.length - 1].volume;
    const ratio = avgVolume === 0 ? 1 : currentVolume / avgVolume;

    // High volume confirms moves
    let signal: 'bullish' | 'bearish' | 'neutral' = 'neutral';
    let strength = 0;

    if (ratio > 1.5) {
        const priceChange = data[data.length - 1].close - data[data.length - 2].close;
        signal = priceChange > 0 ? 'bullish' : 'bearish';
        strength = Math.min(1, (ratio - 1) / 2);
    }

    return { value: ratio, signal, strength };
}

// ============================================================================
// VOLATILITY & RISK INDICATORS
// ============================================================================

/**
 * Average True Range (ATR)
 * Measures market volatility
 * 
 * @param data - OHLCV data array
 * @param period - ATR period (default 14)
 */
export function ATR(data: OHLCV[], period: number = 14): number {
    if (data.length < period + 1) return 0;

    const trueRanges: number[] = [];

    for (let i = 1; i < data.length; i++) {
        const high = data[i].high;
        const low = data[i].low;
        const prevClose = data[i - 1].close;

        const tr = Math.max(
            high - low,
            Math.abs(high - prevClose),
            Math.abs(low - prevClose)
        );
        trueRanges.push(tr);
    }

    return EMA(trueRanges, period);
}

/**
 * Z-Score
 * Measures how many standard deviations price is from mean
 * Used for mean-reversion signals
 * 
 * @param closes - Array of closing prices
 * @param period - Lookback period (default 20)
 */
export function ZScore(closes: number[], period: number = 20): IndicatorResult {
    if (closes.length < period) {
        return { value: 0, signal: 'neutral', strength: 0 };
    }

    const recentCloses = closes.slice(-period);
    const mean = recentCloses.reduce((sum, val) => sum + val, 0) / period;
    const stdDev = standardDeviation(recentCloses);
    const currentPrice = closes[closes.length - 1];

    const zScore = stdDev === 0 ? 0 : (currentPrice - mean) / stdDev;

    let signal: 'bullish' | 'bearish' | 'neutral' = 'neutral';
    let strength = 0;

    // Extreme Z-Scores suggest mean reversion
    if (zScore < -2) {
        signal = 'bullish'; // Very oversold, expect reversion up
        strength = Math.min(1, Math.abs(zScore) / 3);
    } else if (zScore > 2) {
        signal = 'bearish'; // Very overbought, expect reversion down
        strength = Math.min(1, Math.abs(zScore) / 3);
    }

    return { value: zScore, signal, strength };
}

// ============================================================================
// COMPOSITE ANALYSIS
// ============================================================================

/**
 * Calculate all indicators for a given dataset
 * Returns comprehensive analysis
 */
export function analyzeAsset(data: OHLCV[]): {
    momentum: {
        rsi: IndicatorResult;
        stochRSI: IndicatorResult;
        williamsR: IndicatorResult;
        cci: IndicatorResult;
        macd: { macd: number; signal: number; histogram: number; result: IndicatorResult };
    };
    trend: {
        emaAlignment: IndicatorResult;
        bollingerPosition: ReturnType<typeof BollingerPosition>;
        ichimoku: ReturnType<typeof IchimokuCloud>;
        adx: ReturnType<typeof ADX>;
        vwap: number;
    };
    volume: {
        obvTrend: IndicatorResult;
        volumeRatio: IndicatorResult;
    };
    volatility: {
        atr: number;
        zScore: IndicatorResult;
    };
} {
    const closes = data.map(d => d.close);

    return {
        momentum: {
            rsi: RSI(closes),
            stochRSI: StochasticRSI(closes),
            williamsR: WilliamsR(data),
            cci: CCI(data),
            macd: MACD(closes),
        },
        trend: {
            emaAlignment: EMAAlignment(closes),
            bollingerPosition: BollingerPosition(closes),
            ichimoku: IchimokuCloud(data),
            adx: ADX(data),
            vwap: VWAPApprox(data),
        },
        volume: {
            obvTrend: OBVTrend(data),
            volumeRatio: VolumeRatio(data),
        },
        volatility: {
            atr: ATR(data),
            zScore: ZScore(closes),
        },
    };
}
