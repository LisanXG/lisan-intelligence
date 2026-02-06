/**
 * LISAN INTELLIGENCE — Scoring Engine
 * 
 * Aggregates indicator signals into a final score and direction.
 * Outputs LONG, SHORT, or HOLD with confidence score 0-100.
 */

import { OHLCV, analyzeAsset, IndicatorResult } from './indicators';
import { calculateRiskLevels, RiskLevels, SignalDirection } from './risk';
import {
    HyperliquidAssetContext,
    FundingRateSignal,
    OIChangeSignal,
    calculatePositioningScore,
} from './hyperliquidData';

// ============================================================================
// TYPES
// ============================================================================

export interface IndicatorWeights {
    // Momentum (25 points total)
    rsi: number;
    stochRSI: number;
    macd: number;
    williamsR: number;
    cci: number;

    // Trend (25 points total)
    emaAlignment: number;
    ichimoku: number;
    adx: number;
    bollinger: number;

    // Volume (16 points total - reduced from 20)
    obvTrend: number;
    volumeRatio: number;

    // Volatility (16 points - reduced from 22)
    zScore: number;

    // Sentiment (8 points)
    fearGreed: number;

    // Positioning (10 points - NEW: Hyperliquid institutional data)
    fundingRate: number;
    oiChange: number;
}

/**
 * Optional Hyperliquid context for enhanced signals
 */
export interface HyperliquidContext {
    fundingRate: number;        // 1hr funding rate
    annualizedFunding: number;  // fundingRate * 8760
    openInterest: number;       // Current OI
    prevOpenInterest?: number;  // Previous OI for change calculation
    priceChange?: number;       // Price change percentage for OI signal
}

export interface SignalOutput {
    coin: string;
    direction: SignalDirection;
    score: number;           // 0-100 confidence

    // Risk levels
    entryPrice: number;
    stopLoss: number;
    takeProfit: number;
    riskRewardRatio: number;

    // Breakdown
    breakdown: {
        momentum: { score: number; max: number };
        trend: { score: number; max: number };
        volume: { score: number; max: number };
        sentiment: { score: number; max: number };
        positioning: { score: number; max: number }; // NEW
    };

    // Raw indicator values (for learning)
    indicators: Record<string, number>;

    timestamp: Date;
}

// ============================================================================
// DEFAULT WEIGHTS (100 points total)
// ============================================================================

export const DEFAULT_WEIGHTS: IndicatorWeights = {
    // Momentum: 25 points
    rsi: 6,
    stochRSI: 5,
    macd: 6,
    williamsR: 4,
    cci: 4,

    // Trend: 25 points
    emaAlignment: 7,
    ichimoku: 8,
    adx: 6,
    bollinger: 4,

    // Volume: 16 points (reduced from 20)
    obvTrend: 10,
    volumeRatio: 6,

    // Volatility: 16 points (reduced from 22)
    zScore: 16,

    // Sentiment: 8 points
    fearGreed: 8,

    // Positioning: 10 points (NEW)
    fundingRate: 6,
    oiChange: 4,
};

// ============================================================================
// SCORING FUNCTIONS
// ============================================================================

/**
 * Convert indicator result to directional score
 * Returns positive for bullish, negative for bearish
 * 
 * @param result - Indicator result with signal and strength
 * @param weight - Max points for this indicator
 */
function indicatorToScore(result: IndicatorResult, weight: number): number {
    const { signal, strength } = result;
    const points = weight * strength;

    if (signal === 'bullish') return points;
    if (signal === 'bearish') return -points;
    return 0; // neutral
}

/**
 * Calculate momentum score (RSI, StochRSI, MACD, Williams%R, CCI)
 */
function calculateMomentumScore(
    analysis: ReturnType<typeof analyzeAsset>,
    weights: IndicatorWeights
): { score: number; max: number; direction: number } {
    const max = weights.rsi + weights.stochRSI + weights.macd + weights.williamsR + weights.cci;

    const rsiScore = indicatorToScore(analysis.momentum.rsi, weights.rsi);
    const stochScore = indicatorToScore(analysis.momentum.stochRSI, weights.stochRSI);
    const macdScore = indicatorToScore(analysis.momentum.macd.result, weights.macd);
    const williamsScore = indicatorToScore(analysis.momentum.williamsR, weights.williamsR);
    const cciScore = indicatorToScore(analysis.momentum.cci, weights.cci);

    const direction = rsiScore + stochScore + macdScore + williamsScore + cciScore;
    const score = Math.abs(direction);

    return { score: Math.min(score, max), max, direction };
}

/**
 * Calculate trend score (EMA, Ichimoku, ADX, Bollinger)
 */
function calculateTrendScore(
    analysis: ReturnType<typeof analyzeAsset>,
    weights: IndicatorWeights
): { score: number; max: number; direction: number } {
    const max = weights.emaAlignment + weights.ichimoku + weights.adx + weights.bollinger;

    const emaScore = indicatorToScore(analysis.trend.emaAlignment, weights.emaAlignment);
    const ichimokuScore = indicatorToScore(analysis.trend.ichimoku.result, weights.ichimoku);
    const adxScore = indicatorToScore(analysis.trend.adx.result, weights.adx);
    const bollingerScore = indicatorToScore(analysis.trend.bollingerPosition.result, weights.bollinger);

    const direction = emaScore + ichimokuScore + adxScore + bollingerScore;
    const score = Math.abs(direction);

    return { score: Math.min(score, max), max, direction };
}

/**
 * Calculate volume score (OBV, Volume Ratio)
 */
function calculateVolumeScore(
    analysis: ReturnType<typeof analyzeAsset>,
    weights: IndicatorWeights
): { score: number; max: number; direction: number } {
    const max = weights.obvTrend + weights.volumeRatio;

    const obvScore = indicatorToScore(analysis.volume.obvTrend, weights.obvTrend);
    const volumeScore = indicatorToScore(analysis.volume.volumeRatio, weights.volumeRatio);

    const direction = obvScore + volumeScore;
    const score = Math.abs(direction);

    return { score: Math.min(score, max), max, direction };
}

/**
 * Calculate sentiment score (Fear & Greed)
 * Uses external data if available
 */
function calculateSentimentScore(
    fearGreedIndex: number | null,
    weights: IndicatorWeights
): { score: number; max: number; direction: number } {
    const max = weights.fearGreed;

    if (fearGreedIndex === null) {
        return { score: 0, max, direction: 0 };
    }

    // Fear & Greed: 0-100
    // Contrarian: fear = bullish, greed = bearish
    // Scale across full range, not just extremes
    // 0-25: Strong bullish (extreme fear)
    // 25-50: Mild bullish (fear)
    // 50: Neutral
    // 50-75: Mild bearish (greed)
    // 75-100: Strong bearish (extreme greed)

    let direction = 0;
    let strength = 0;

    if (fearGreedIndex < 50) {
        // Below 50 = contrarian bullish (fear in market)
        strength = (50 - fearGreedIndex) / 50; // 0 at 50, 1 at 0
        direction = max * strength;
    } else if (fearGreedIndex > 50) {
        // Above 50 = contrarian bearish (greed in market)
        strength = (fearGreedIndex - 50) / 50; // 0 at 50, 1 at 100
        direction = -max * strength;
    }

    return { score: Math.abs(direction), max, direction };
}

// ============================================================================
// MAIN SCORING ENGINE
// ============================================================================

/**
 * Generate a complete signal for a coin
 * 
 * @param data - OHLCV price data
 * @param coin - Coin symbol (e.g., "BTC")
 * @param fearGreedIndex - Optional Fear & Greed index value
 * @param weights - Optional custom weights
 * @param hlContext - Optional Hyperliquid context for positioning data
 */
export function generateSignal(
    data: OHLCV[],
    coin: string,
    fearGreedIndex: number | null = null,
    weights: IndicatorWeights = DEFAULT_WEIGHTS,
    hlContext: HyperliquidContext | null = null
): SignalOutput {
    // Run all indicators
    const analysis = analyzeAsset(data);

    // Calculate category scores
    const momentum = calculateMomentumScore(analysis, weights);
    const trend = calculateTrendScore(analysis, weights);
    const volume = calculateVolumeScore(analysis, weights);
    const sentiment = calculateSentimentScore(fearGreedIndex, weights);

    // Calculate positioning score from Hyperliquid data (NEW)
    let positioning = { score: 0, max: weights.fundingRate + weights.oiChange, direction: 0 };
    let fundingRateValue = 0;
    let oiChangeValue = 0;

    if (hlContext) {
        const fundingSignal = FundingRateSignal(hlContext.annualizedFunding);
        fundingRateValue = fundingSignal.value;

        let oiSignal: IndicatorResult = { value: 0, signal: 'neutral', strength: 0 };
        if (hlContext.prevOpenInterest !== undefined && hlContext.priceChange !== undefined) {
            oiSignal = OIChangeSignal(
                hlContext.openInterest,
                hlContext.prevOpenInterest,
                hlContext.priceChange
            );
            oiChangeValue = oiSignal.value;
        }

        positioning = calculatePositioningScore(
            fundingSignal,
            oiSignal,
            weights.fundingRate,
            weights.oiChange
        );
    }

    // Total directional bias (positive = bullish, negative = bearish)
    const totalDirection = momentum.direction + trend.direction + volume.direction +
        sentiment.direction + positioning.direction;

    // Total confidence score (0-100)
    const totalMax = momentum.max + trend.max + volume.max + sentiment.max + positioning.max;
    const rawScore = momentum.score + trend.score + volume.score + sentiment.score + positioning.score;
    const score = Math.round((rawScore / totalMax) * 100);

    // Determine direction based on consensus
    let direction: SignalDirection = 'HOLD';

    // Need significant bias and minimum score to trigger signal
    // Tuned for reasonable signal distribution (not too many HOLD)
    const directionThreshold = totalMax * 0.10; // 10% of max in one direction
    const scoreThreshold = 50; // Minimum 50/100 confidence (raised from 35 to filter low-conviction signals)

    if (totalDirection > directionThreshold && score >= scoreThreshold) {
        direction = 'LONG';
    } else if (totalDirection < -directionThreshold && score >= scoreThreshold) {
        direction = 'SHORT';
    }

    // Calculate risk levels
    const riskLevels = calculateRiskLevels(data, direction);

    // Extract raw indicator values for learning
    const indicators: Record<string, number> = {
        rsi: analysis.momentum.rsi.value,
        stochRSI: analysis.momentum.stochRSI.value,
        macd: analysis.momentum.macd.histogram,
        williamsR: analysis.momentum.williamsR.value,
        cci: analysis.momentum.cci.value,
        emaAlignment: analysis.trend.emaAlignment.value,
        ichimoku: analysis.trend.ichimoku.result.value,
        adx: analysis.trend.adx.adx,
        plusDI: analysis.trend.adx.plusDI,
        minusDI: analysis.trend.adx.minusDI,
        bollinger: analysis.trend.bollingerPosition.position,
        obvTrend: analysis.volume.obvTrend.value,
        volumeRatio: analysis.volume.volumeRatio.value,
        zScore: analysis.volatility.zScore.value,
        atr: analysis.volatility.atr,
        vwap: analysis.trend.vwap,
        // NEW: Hyperliquid positioning data
        fundingRate: fundingRateValue,
        oiChange: oiChangeValue,
    };

    return {
        coin,
        direction,
        score,
        entryPrice: riskLevels.entryPrice,
        stopLoss: riskLevels.stopLoss,
        takeProfit: riskLevels.takeProfit,
        riskRewardRatio: riskLevels.riskRewardRatio,
        breakdown: {
            momentum: { score: momentum.score, max: momentum.max },
            trend: { score: trend.score, max: trend.max },
            volume: { score: volume.score, max: volume.max },
            sentiment: { score: sentiment.score, max: sentiment.max },
            positioning: { score: positioning.score, max: positioning.max },
        },
        indicators,
        timestamp: new Date(),
    };
}

/**
 * Batch generate signals for multiple coins
 */
export function generateSignals(
    coinData: { coin: string; data: OHLCV[] }[],
    fearGreedIndex: number | null = null,
    weights: IndicatorWeights = DEFAULT_WEIGHTS
): SignalOutput[] {
    return coinData.map(({ coin, data }) =>
        generateSignal(data, coin, fearGreedIndex, weights)
    );
}

/**
 * Filter signals by direction
 */
export function filterSignals(
    signals: SignalOutput[],
    direction: SignalDirection
): SignalOutput[] {
    return signals.filter(s => s.direction === direction);
}

/**
 * Sort signals by confidence score
 */
export function sortSignalsByScore(signals: SignalOutput[]): SignalOutput[] {
    return [...signals].sort((a, b) => b.score - a.score);
}
