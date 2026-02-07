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
    BasisPremiumSignal,
    HLVolumeMomentumSignal,
    FundingVelocityBoost,
    calculatePositioningScore,
} from './hyperliquidData';
import { MarketRegime, getRegimeAdjustments } from './regime';

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

    // Volume (16 points total)
    obvTrend: number;
    volumeRatio: number;

    // Volatility (10 points — v4.1: reduced from 16 for new HL indicators)
    zScore: number;

    // Sentiment (8 points)
    fearGreed: number;

    // Positioning (16 points — v4.1: expanded with 2 new HL indicators)
    fundingRate: number;
    oiChange: number;
    basisPremium: number;   // v4.1: Mark vs Index spread
    hlVolume: number;       // v4.1: HL volume momentum
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
    // v4.1: New HL-native data
    premium?: number;           // Mark-index basis (fractional)
    volume24h?: number;         // 24h USD volume
    avgVolume?: number;         // Rolling avg daily volume (baseline for comparison)
    prevFunding?: number;       // Previous annualized funding for velocity boost
}

export interface SignalOutput {
    coin: string;
    direction: SignalDirection;
    score: number;           // 0-100 confidence
    agreement: number;       // 0-1 cluster agreement ratio (1 = all agree, 0.3 = floor)
    timeframe: string;       // Candle interval that generated this signal (e.g. '4h')

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
        positioning: { score: number; max: number };
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

    // Volume: 16 points
    obvTrend: 10,
    volumeRatio: 6,

    // Volatility: 10 points (v4.1: reduced from 16 — Z-Score was over-weighted)
    zScore: 10,

    // Sentiment: 8 points
    fearGreed: 8,

    // Positioning: 16 points (v4.1: expanded from 10 with 2 new HL indicators)
    fundingRate: 6,
    oiChange: 4,
    basisPremium: 3,    // v4.1: Mark-index basis (contrarian)
    hlVolume: 3,        // v4.1: HL volume momentum
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
    hlContext: HyperliquidContext | null = null,
    timeframe: string = '4h',
    regime: MarketRegime = 'UNKNOWN'
): SignalOutput {
    // Run all indicators
    const analysis = analyzeAsset(data);

    // Calculate category scores
    const momentum = calculateMomentumScore(analysis, weights);
    const trend = calculateTrendScore(analysis, weights);
    const volume = calculateVolumeScore(analysis, weights);
    const sentiment = calculateSentimentScore(fearGreedIndex, weights);

    // Calculate positioning score from Hyperliquid data
    // When hlContext is null, max must be 0 so positioning doesn't inflate the denominator
    let positioning = { score: 0, max: 0, direction: 0 };
    let fundingRateValue = 0;
    let oiChangeValue = 0;
    let basisPremiumValue = 0;
    let hlVolumeValue = 0;

    if (hlContext) {
        const fundingSignal = FundingRateSignal(hlContext.annualizedFunding);

        // v4.1: Apply velocity boost if we have previous funding data
        if (hlContext.prevFunding !== undefined) {
            const velocityMultiplier = FundingVelocityBoost(
                hlContext.annualizedFunding,
                hlContext.prevFunding
            );
            fundingSignal.strength *= velocityMultiplier;
        }

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

        // v4.1: New HL-native signals
        let basisSignal: IndicatorResult | undefined;
        if (hlContext.premium !== undefined) {
            basisSignal = BasisPremiumSignal(hlContext.premium);
            basisPremiumValue = basisSignal.value;
        }

        let volumeSignal: IndicatorResult | undefined;
        if (hlContext.volume24h !== undefined && hlContext.avgVolume !== undefined && hlContext.priceChange !== undefined) {
            volumeSignal = HLVolumeMomentumSignal(hlContext.volume24h, hlContext.avgVolume, hlContext.priceChange);
            hlVolumeValue = volumeSignal.value;
        }

        positioning = calculatePositioningScore(
            fundingSignal,
            oiSignal,
            weights.fundingRate,
            weights.oiChange,
            basisSignal,
            volumeSignal
        );
    }

    // Total directional bias (positive = bullish, negative = bearish)
    const totalDirection = momentum.direction + trend.direction + volume.direction +
        sentiment.direction + positioning.direction;

    // Cluster agreement: penalize contradictory indicators
    // If momentum says LONG but trend says SHORT, the raw score is high (both have magnitude)
    // but the signal quality is low (no consensus). Agreement ratio captures this.
    const clusterDirections = [momentum, trend, volume, sentiment, positioning]
        .map(c => c.direction);
    const nonZeroClusters = clusterDirections.filter(d => d !== 0);
    const agreementRatio = nonZeroClusters.length > 0
        ? Math.abs(nonZeroClusters.reduce((sum, d) => sum + Math.sign(d), 0)) / nonZeroClusters.length
        : 1.0; // #8 FIX: All-neutral clusters should not penalize — default to 1.0
    const agreementFactor = Math.max(0.3, agreementRatio); // Floor at 0.3 to avoid zeroing out

    // Total confidence score (0-100)
    // Agreement factor is tracked for visibility but NOT used as a score multiplier —
    // in mixed markets, it would crush scores to ~15 making everything HOLD.
    const totalMax = momentum.max + trend.max + volume.max + sentiment.max + positioning.max;
    const rawScore = momentum.score + trend.score + volume.score + sentiment.score + positioning.score;
    const score = Math.round((rawScore / totalMax) * 100);

    // Determine direction based on consensus
    let direction: SignalDirection = 'HOLD';

    // v4.1: Apply regime-based threshold adjustments
    const regimeAdj = getRegimeAdjustments(regime);

    // Need significant bias and minimum score to trigger signal
    // Base threshold 40 — regime multiplier adjusts dynamically
    // (e.g., BULL_TREND: 36, HIGH_VOL_CHOP: 52, UNKNOWN: 40)
    const directionThreshold = totalMax * 0.10;
    const scoreThreshold = Math.round(40 * regimeAdj.scoreThresholdMultiplier);

    // Apply regime direction bias to total direction
    const adjustedDirection = totalDirection + (regimeAdj.directionBias * totalMax * 0.02);

    if (adjustedDirection > directionThreshold && score >= scoreThreshold) {
        direction = 'LONG';
    } else if (adjustedDirection < -directionThreshold && score >= scoreThreshold) {
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
        // Hyperliquid positioning data
        fundingRate: fundingRateValue,
        oiChange: oiChangeValue,
        // v4.1: New HL indicators
        basisPremium: basisPremiumValue,
        hlVolume: hlVolumeValue,
        // v4.1: Cluster agreement for learning visibility
        agreement: agreementFactor,
    };

    return {
        coin,
        direction,
        score,
        agreement: agreementFactor,
        timeframe,
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
