/**
 * LISAN INTELLIGENCE — Market Regime Detection
 * 
 * Classifies the current market regime based on:
 * - BTC trend direction and strength
 * - Market-wide volatility (ATR)
 * - Altcoin correlation to BTC
 * - Funding rate environment
 * 
 * Regime detection helps the engine adapt to different market conditions.
 */

import { OHLCV, ADX, ATR, EMA, RSI } from './indicators';

// ============================================================================
// TYPES
// ============================================================================

/**
 * Market regime classification
 */
export type MarketRegime =
    | 'BULL_TREND'      // Strong uptrend, high trend strength, positive momentum
    | 'BEAR_TREND'      // Strong downtrend, high trend strength, negative momentum
    | 'HIGH_VOL_CHOP'   // Sideways with large swings, low trend strength, high ATR
    | 'RECOVERY_PUMP'   // After dump, sharp reversal with decreasing OI
    | 'DISTRIBUTION'    // Rising with divergence, decreasing volume
    | 'ACCUMULATION'    // Falling with accumulation signs
    | 'UNKNOWN';        // Insufficient data or unclear regime

/**
 * Full regime analysis output
 */
export interface RegimeAnalysis {
    regime: MarketRegime;
    confidence: number;         // 0-1 confidence in regime classification
    btcTrend: 'UP' | 'DOWN' | 'SIDEWAYS';
    btcTrendStrength: number;   // ADX value
    volatilityLevel: 'LOW' | 'NORMAL' | 'HIGH' | 'EXTREME';
    avgAltcoinChange: number;   // Average 24h change across altcoins
    marketBias: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
    timestamp: Date;
}

/**
 * Market context input for regime detection
 */
export interface MarketContext {
    btcData: OHLCV[];
    altcoinChanges: number[];   // 24h % changes for tracked altcoins
    avgFunding: number;         // Market-wide average funding rate
    avgOIChange: number;        // Market-wide OI change %
}

// ============================================================================
// REGIME DETECTION
// ============================================================================

/**
 * Calculate BTC trend direction and strength
 */
function analyzeBTCTrend(data: OHLCV[]): {
    direction: 'UP' | 'DOWN' | 'SIDEWAYS';
    strength: number;
    momentum: number;
} {
    if (data.length < 20) {
        return { direction: 'SIDEWAYS', strength: 0, momentum: 0 };
    }

    const closes = data.map(d => d.close);
    const adxResult = ADX(data, 14);
    const rsiResult = RSI(closes, 14);

    const ema20 = EMA(closes, 20);
    const currentPrice = closes[closes.length - 1];

    let direction: 'UP' | 'DOWN' | 'SIDEWAYS' = 'SIDEWAYS';

    // Determine direction based on EMA position and DI
    if (currentPrice > ema20 * 1.02 && adxResult.plusDI > adxResult.minusDI) {
        direction = 'UP';
    } else if (currentPrice < ema20 * 0.98 && adxResult.minusDI > adxResult.plusDI) {
        direction = 'DOWN';
    }

    // Momentum from RSI
    const momentum = (rsiResult.value - 50) / 50; // -1 to 1

    return {
        direction,
        strength: adxResult.adx,
        momentum,
    };
}

/**
 * Classify volatility level based on ATR relative to price
 */
function classifyVolatility(data: OHLCV[]): 'LOW' | 'NORMAL' | 'HIGH' | 'EXTREME' {
    if (data.length < 14) return 'NORMAL';

    const atr = ATR(data, 14);
    const currentPrice = data[data.length - 1].close;
    const atrPercent = (atr / currentPrice) * 100;

    // Crypto-adjusted thresholds
    if (atrPercent < 2) return 'LOW';
    if (atrPercent < 4) return 'NORMAL';
    if (atrPercent < 7) return 'HIGH';
    return 'EXTREME';
}

/**
 * Calculate market-wide bias from altcoin movements
 */
function calculateMarketBias(altcoinChanges: number[]): {
    bias: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
    avgChange: number;
} {
    if (altcoinChanges.length === 0) {
        return { bias: 'NEUTRAL', avgChange: 0 };
    }

    const avgChange = altcoinChanges.reduce((sum, c) => sum + c, 0) / altcoinChanges.length;
    const positiveCount = altcoinChanges.filter(c => c > 0).length;
    const ratio = positiveCount / altcoinChanges.length;

    let bias: 'BULLISH' | 'BEARISH' | 'NEUTRAL' = 'NEUTRAL';

    if (avgChange > 2 && ratio > 0.6) {
        bias = 'BULLISH';
    } else if (avgChange < -2 && ratio < 0.4) {
        bias = 'BEARISH';
    }

    return { bias, avgChange };
}

/**
 * Main regime detection function
 */
export function detectMarketRegime(context: MarketContext): RegimeAnalysis {
    const { btcData, altcoinChanges, avgFunding, avgOIChange } = context;

    // Get BTC analysis
    const btcAnalysis = analyzeBTCTrend(btcData);
    const volatility = classifyVolatility(btcData);
    const marketBias = calculateMarketBias(altcoinChanges);

    let regime: MarketRegime = 'UNKNOWN';
    let confidence = 0;

    // Regime classification logic
    if (btcAnalysis.strength > 25) {
        // Strong trend detected
        if (btcAnalysis.direction === 'UP') {
            // Check for distribution
            if (avgOIChange < -5 && marketBias.avgChange > 0) {
                regime = 'DISTRIBUTION';
                confidence = 0.6;
            } else {
                regime = 'BULL_TREND';
                confidence = btcAnalysis.strength > 40 ? 0.9 : 0.7;
            }
        } else if (btcAnalysis.direction === 'DOWN') {
            // Check for accumulation
            if (avgFunding < -0.10 && marketBias.avgChange < 0) {
                regime = 'ACCUMULATION';
                confidence = 0.6;
            } else {
                regime = 'BEAR_TREND';
                confidence = btcAnalysis.strength > 40 ? 0.9 : 0.7;
            }
        }
    } else {
        // Weak trend - likely chop or transition
        if (volatility === 'HIGH' || volatility === 'EXTREME') {
            // Check for recovery pump (sharp reversal)
            if (btcAnalysis.momentum > 0.3 && avgOIChange < -3) {
                regime = 'RECOVERY_PUMP';
                confidence = 0.65;
            } else {
                regime = 'HIGH_VOL_CHOP';
                confidence = 0.5;
            }
        } else {
            // Low volatility, weak trend
            regime = 'HIGH_VOL_CHOP';
            confidence = 0.4;
        }
    }

    // If still unknown, try to classify based on market bias
    if (regime === 'UNKNOWN') {
        if (marketBias.bias === 'BULLISH') {
            regime = 'BULL_TREND';
            confidence = 0.4;
        } else if (marketBias.bias === 'BEARISH') {
            regime = 'BEAR_TREND';
            confidence = 0.4;
        } else {
            regime = 'HIGH_VOL_CHOP';
            confidence = 0.3;
        }
    }

    return {
        regime,
        confidence,
        btcTrend: btcAnalysis.direction,
        btcTrendStrength: btcAnalysis.strength,
        volatilityLevel: volatility,
        avgAltcoinChange: marketBias.avgChange,
        marketBias: marketBias.bias,
        timestamp: new Date(),
    };
}

/**
 * Get regime-specific trading adjustments
 * Returns multipliers for different aspects of signal generation
 */
export function getRegimeAdjustments(regime: MarketRegime): {
    scoreThresholdMultiplier: number;   // Higher = stricter entry requirements
    trendWeightMultiplier: number;      // Higher = more weight on trend indicators
    momentumWeightMultiplier: number;   // Higher = more weight on momentum
    positioningWeightMultiplier: number;// Higher = more weight on positioning
    directionBias: number;              // +1 prefer longs, -1 prefer shorts, 0 neutral
} {
    switch (regime) {
        case 'BULL_TREND':
            return {
                scoreThresholdMultiplier: 0.9,   // Slightly easier entry in bull
                trendWeightMultiplier: 1.2,      // Trust trend indicators more
                momentumWeightMultiplier: 1.0,
                positioningWeightMultiplier: 0.8, // Positioning less important
                directionBias: 0.5,              // Slight long bias
            };
        case 'BEAR_TREND':
            return {
                scoreThresholdMultiplier: 0.9,
                trendWeightMultiplier: 1.2,
                momentumWeightMultiplier: 1.0,
                positioningWeightMultiplier: 0.8,
                directionBias: -0.5,             // Slight short bias
            };
        case 'HIGH_VOL_CHOP':
            return {
                scoreThresholdMultiplier: 1.3,   // Much stricter entry in chop
                trendWeightMultiplier: 0.7,      // Don't trust trends
                momentumWeightMultiplier: 1.2,   // Quick momentum plays
                positioningWeightMultiplier: 1.3, // Fading crowds works
                directionBias: 0,
            };
        case 'RECOVERY_PUMP':
            return {
                scoreThresholdMultiplier: 1.1,
                trendWeightMultiplier: 0.8,
                momentumWeightMultiplier: 1.3,   // Ride the momentum
                positioningWeightMultiplier: 0.9,
                directionBias: 0.7,              // Strong long bias
            };
        case 'DISTRIBUTION':
            return {
                scoreThresholdMultiplier: 1.2,   // Be careful at tops
                trendWeightMultiplier: 0.8,
                momentumWeightMultiplier: 0.9,
                positioningWeightMultiplier: 1.2,
                directionBias: -0.3,             // Slight short bias
            };
        case 'ACCUMULATION':
            return {
                scoreThresholdMultiplier: 1.2,
                trendWeightMultiplier: 0.8,
                momentumWeightMultiplier: 0.9,
                positioningWeightMultiplier: 1.2,
                directionBias: 0.3,              // Slight long bias
            };
        default:
            return {
                scoreThresholdMultiplier: 1.0,
                trendWeightMultiplier: 1.0,
                momentumWeightMultiplier: 1.0,
                positioningWeightMultiplier: 1.0,
                directionBias: 0,
            };
    }
}
