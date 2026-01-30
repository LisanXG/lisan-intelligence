/**
 * LISAN INTELLIGENCE — Signal Engine
 * 
 * Complete self-learning crypto signal engine.
 * 
 * Modules:
 * - indicators: Technical analysis calculations
 * - risk: Stop loss, take profit, position sizing
 * - scoring: Weighted signal generation (LONG/SHORT/HOLD)
 * - tracking: Signal history and outcome monitoring
 * - learning: Self-adjusting weight optimization
 */

// Core types
export type { OHLCV, IndicatorResult } from './indicators';
export type { SignalDirection, RiskLevels, SupportResistance } from './risk';
export type { SignalOutput, IndicatorWeights } from './scoring';
export type { SignalRecord, SignalOutcome, ExitReason, TrackingStats } from './tracking';
export type { WeightAdjustment, LearningCycle, LearningConfig } from './learning';

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
    generateSignal,
    generateSignals,
    filterSignals,
    sortSignalsByScore,
} from './scoring';

// Signal Tracking
export {
    getSignalHistory,
    addSignal,
    updateSignalOutcome,
    checkAndUpdateOutcomes,
    getTrackingStats,
    shouldTriggerLearning,
} from './tracking';

// Self-Learning
export {
    DEFAULT_LEARNING_CONFIG,
    getWeightManager,
    runLearningCycle,
    checkAndTriggerLearning,
    getCurrentWeights,
    getLearningHistory,
    resetWeightsToDefault,
} from './learning';
