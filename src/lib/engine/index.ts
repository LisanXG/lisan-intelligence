/**
 * LISAN INTELLIGENCE — Signal Engine
 * 
 * Complete signal engine for crypto analysis.
 * 
 * Modules:
 * - indicators: Technical analysis calculations
 * - risk: Stop loss, take profit, position sizing
 * - scoring: Weighted signal generation (LONG/SHORT/HOLD)
 */

// Core types
export type { OHLCV, IndicatorResult } from './indicators';
export type { SignalDirection, RiskLevels, SupportResistance } from './risk';
export type { SignalOutput, IndicatorWeights, HyperliquidContext } from './scoring';

// Indicators
export {
    SMA, EMA, EMASeries,
    RSI, StochasticRSI, MACD, WilliamsR, CCI,
    EMAAlignment, BollingerPosition, VWAPApprox, IchimokuCloud, ADX,
    OBVTrend, VolumeRatio,
    ATR, ZScore,
    analyzeAsset,
} from './indicators';

// Risk Management
export {
    findPivotPoints,
    findSupportResistance,
    calculateRiskLevels,
    validateRiskLevels,
    calculatePositionSize,
} from './risk';

// Scoring Engine
export {
    DEFAULT_WEIGHTS,
    normalizeWeights,
    generateSignal,
    generateSignals,
    filterSignals,
    sortSignalsByScore,
} from './scoring';
