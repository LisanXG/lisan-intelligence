/**
 * LISAN INTELLIGENCE — Self-Learning Engine
 * 
 * Analyzes signal performance and adjusts indicator weights
 * to improve future accuracy. Triggers on 3 consecutive losses.
 */

import { DEFAULT_WEIGHTS, IndicatorWeights } from './scoring';
import { getSignalHistory, SignalRecord } from './tracking';

// ============================================================================
// TYPES
// ============================================================================

export interface WeightAdjustment {
    indicator: keyof IndicatorWeights;
    oldWeight: number;
    newWeight: number;
    changePercent: number;
    reason: string;
}

export interface LearningCycle {
    id: string;
    timestamp: Date;
    triggeredBy: 'consecutive_losses' | 'manual' | 'scheduled';
    signalsAnalyzed: number;
    adjustments: WeightAdjustment[];
    previousWinRate: number;
    consecutiveLosses: number;
}

export interface LearningConfig {
    maxWeightChange: number;       // Max % change per cycle (default 15%)
    minWeight: number;             // Minimum weight (default 1)
    maxWeight: number;             // Maximum weight for any indicator (default 20)
    consecutiveLossThreshold: number; // Losses to trigger learning (default 3)
}

// ============================================================================
// DEFAULT CONFIG
// ============================================================================

export const DEFAULT_LEARNING_CONFIG: LearningConfig = {
    maxWeightChange: 15,
    minWeight: 1,
    maxWeight: 20,
    consecutiveLossThreshold: 3,
};

// ============================================================================
// WEIGHT STORAGE
// ============================================================================

class WeightManager {
    private weights: IndicatorWeights;
    private history: LearningCycle[] = [];
    private readonly storageKey = 'lisan_weights';
    private readonly historyKey = 'lisan_learning_history';
    private readonly versionKey = 'lisan_learning_version';
    private readonly currentVersion = 2; // v2 = Fixed PEPE deduplication bug

    constructor() {
        this.weights = { ...DEFAULT_WEIGHTS };
        this.checkVersion();
        this.loadFromStorage();
    }

    private checkVersion(): void {
        if (typeof window === 'undefined') return;

        try {
            const storedVersion = localStorage.getItem(this.versionKey);
            const version = storedVersion ? parseInt(storedVersion, 10) : 1;

            if (version < this.currentVersion) {
                console.log('[Learning] Upgrading from v' + version + ' to v' + this.currentVersion + ' - resetting weights and history');
                localStorage.removeItem(this.storageKey);
                localStorage.removeItem(this.historyKey);
                localStorage.setItem(this.versionKey, this.currentVersion.toString());
            }
        } catch (e) {
            console.error('Failed to check learning version:', e);
        }
    }

    private loadFromStorage(): void {
        if (typeof window === 'undefined') return;

        try {
            const stored = localStorage.getItem(this.storageKey);
            if (stored) {
                this.weights = { ...DEFAULT_WEIGHTS, ...JSON.parse(stored) };
            }

            const historyStored = localStorage.getItem(this.historyKey);
            if (historyStored) {
                this.history = JSON.parse(historyStored).map((h: LearningCycle) => ({
                    ...h,
                    timestamp: new Date(h.timestamp),
                }));
            }
        } catch (e) {
            console.error('Failed to load weights:', e);
        }
    }

    private saveToStorage(): void {
        if (typeof window === 'undefined') return;

        try {
            localStorage.setItem(this.storageKey, JSON.stringify(this.weights));
            localStorage.setItem(this.historyKey, JSON.stringify(this.history));
        } catch (e) {
            console.error('Failed to save weights:', e);
        }
    }

    getWeights(): IndicatorWeights {
        return { ...this.weights };
    }

    getHistory(): LearningCycle[] {
        return [...this.history];
    }

    updateWeight(
        indicator: keyof IndicatorWeights,
        newWeight: number,
        config: LearningConfig = DEFAULT_LEARNING_CONFIG
    ): void {
        // Clamp to min/max
        this.weights[indicator] = Math.max(
            config.minWeight,
            Math.min(config.maxWeight, newWeight)
        );
        this.saveToStorage();
    }

    addCycle(cycle: LearningCycle): void {
        this.history.push(cycle);
        // Keep last 50 cycles
        if (this.history.length > 50) {
            this.history = this.history.slice(-50);
        }
        this.saveToStorage();
    }

    resetToDefaults(): void {
        this.weights = { ...DEFAULT_WEIGHTS };
        this.saveToStorage();
    }
}

// Singleton
let weightManagerInstance: WeightManager | null = null;

export function getWeightManager(): WeightManager {
    if (!weightManagerInstance) {
        weightManagerInstance = new WeightManager();
    }
    return weightManagerInstance;
}

// ============================================================================
// LEARNING ANALYSIS
// ============================================================================

/**
 * Analyze recent losses to find problematic indicators
 * 
 * An indicator is "problematic" if it was confident but wrong
 * (high strength, bullish signal, but resulted in loss for LONG trade)
 */
function analyzeLosingSignals(
    losingSignals: SignalRecord[]
): Map<keyof IndicatorWeights, { wrongCount: number; avgConfidence: number }> {
    const indicatorStats = new Map<keyof IndicatorWeights, { wrongCount: number; totalConfidence: number }>();

    // Map indicator names to weight keys
    const indicatorToWeight: Record<string, keyof IndicatorWeights> = {
        rsi: 'rsi',
        stochRSI: 'stochRSI',
        macd: 'macd',
        williamsR: 'williamsR',
        cci: 'cci',
        emaAlignment: 'emaAlignment',
        ichimoku: 'ichimoku',
        adx: 'adx',
        bollinger: 'bollinger',
        obvTrend: 'obvTrend',
        volumeRatio: 'volumeRatio',
        zScore: 'zScore',
    };

    for (const signal of losingSignals) {
        const direction = signal.signal.direction;
        const indicators = signal.indicatorSnapshot;

        // Check each indicator's value at signal time
        for (const [name, weightKey] of Object.entries(indicatorToWeight)) {
            const value = indicators[name];
            if (value === undefined) continue;

            // Determine if this indicator was "confident" in the wrong direction
            let wasWronglyConfident = false;

            // RSI: oversold (<30) suggests bullish, overbought (>70) suggests bearish
            if (name === 'rsi') {
                if (direction === 'LONG' && value < 40) wasWronglyConfident = true;
                if (direction === 'SHORT' && value > 60) wasWronglyConfident = true;
            }

            // MACD histogram: positive = bullish, negative = bearish
            if (name === 'macd') {
                if (direction === 'LONG' && value > 0) wasWronglyConfident = true;
                if (direction === 'SHORT' && value < 0) wasWronglyConfident = true;
            }

            // EMA Alignment: >60 = bullish, <40 = bearish
            if (name === 'emaAlignment') {
                if (direction === 'LONG' && value > 50) wasWronglyConfident = true;
                if (direction === 'SHORT' && value < 50) wasWronglyConfident = true;
            }

            // Ichimoku: positive score = bullish
            if (name === 'ichimoku') {
                if (direction === 'LONG' && value > 0) wasWronglyConfident = true;
                if (direction === 'SHORT' && value < 0) wasWronglyConfident = true;
            }

            // ADX: higher value = stronger trend in any direction
            if (name === 'adx' && value > 25) {
                wasWronglyConfident = true; // Showed strong trend but was wrong
            }

            // Volume indicators: positive = bullish confirmation
            if (name === 'obvTrend' || name === 'volumeRatio') {
                if (direction === 'LONG' && value > 1) wasWronglyConfident = true;
                if (direction === 'SHORT' && value < 1) wasWronglyConfident = true;
            }

            if (wasWronglyConfident) {
                const existing = indicatorStats.get(weightKey) || { wrongCount: 0, totalConfidence: 0 };
                existing.wrongCount++;
                existing.totalConfidence += Math.abs(value);
                indicatorStats.set(weightKey, existing);
            }
        }
    }

    // Calculate averages
    const result = new Map<keyof IndicatorWeights, { wrongCount: number; avgConfidence: number }>();
    for (const [key, stats] of indicatorStats.entries()) {
        result.set(key, {
            wrongCount: stats.wrongCount,
            avgConfidence: stats.wrongCount > 0 ? stats.totalConfidence / stats.wrongCount : 0,
        });
    }

    return result;
}

// ============================================================================
// LEARNING ENGINE
// ============================================================================

/**
 * Run a learning cycle
 * 
 * Analyzes recent losing signals and adjusts weights to reduce
 * the influence of indicators that were "confidently wrong"
 */
export function runLearningCycle(
    triggeredBy: 'consecutive_losses' | 'manual' | 'scheduled' = 'consecutive_losses',
    config: LearningConfig = DEFAULT_LEARNING_CONFIG
): LearningCycle | null {
    const history = getSignalHistory();
    const weightManager = getWeightManager();

    const stats = history.getStats();
    const consecutiveLosses = stats.consecutiveLosses;

    // Only proceed if threshold met (for automatic triggers)
    if (triggeredBy === 'consecutive_losses' && consecutiveLosses < config.consecutiveLossThreshold) {
        return null;
    }

    // Get recent losing signals to analyze
    const recentSignals = history.getRecent(20);
    const losingSignals = recentSignals.filter(s => s.outcome === 'LOSS');

    if (losingSignals.length === 0) {
        return null;
    }

    // Analyze which indicators led to wrong predictions
    const indicatorAnalysis = analyzeLosingSignals(losingSignals);

    const adjustments: WeightAdjustment[] = [];
    const currentWeights = weightManager.getWeights();

    // Adjust weights based on analysis
    for (const [indicator, stats] of indicatorAnalysis.entries()) {
        // If indicator was wrong in majority of losing signals, reduce weight
        const wrongRatio = stats.wrongCount / losingSignals.length;

        if (wrongRatio >= 0.5) {
            // Reduce weight by proportional amount (max 15%)
            const reduction = Math.min(
                config.maxWeightChange,
                wrongRatio * config.maxWeightChange
            );

            const oldWeight = currentWeights[indicator];
            const newWeight = Math.max(
                config.minWeight,
                oldWeight * (1 - reduction / 100)
            );

            if (Math.abs(newWeight - oldWeight) > 0.01) {
                weightManager.updateWeight(indicator, newWeight, config);

                adjustments.push({
                    indicator,
                    oldWeight: Math.round(oldWeight * 100) / 100,
                    newWeight: Math.round(newWeight * 100) / 100,
                    changePercent: Math.round(((newWeight - oldWeight) / oldWeight) * 10000) / 100,
                    reason: `Wrong in ${Math.round(wrongRatio * 100)}% of ${losingSignals.length} losses`,
                });
            }
        }
    }

    // Create learning cycle record
    const cycle: LearningCycle = {
        id: `learn_${Date.now()}`,
        timestamp: new Date(),
        triggeredBy,
        signalsAnalyzed: losingSignals.length,
        adjustments,
        previousWinRate: stats.winRate,
        consecutiveLosses,
    };

    weightManager.addCycle(cycle);

    return cycle;
}

/**
 * Check if learning should be triggered and run if needed
 */
export function checkAndTriggerLearning(): LearningCycle | null {
    const history = getSignalHistory();

    if (history.getConsecutiveLosses() >= DEFAULT_LEARNING_CONFIG.consecutiveLossThreshold) {
        return runLearningCycle('consecutive_losses');
    }

    return null;
}

// ============================================================================
// EXPORTS
// ============================================================================

export function getCurrentWeights(): IndicatorWeights {
    return getWeightManager().getWeights();
}

export function getLearningHistory(): LearningCycle[] {
    return getWeightManager().getHistory();
}

export function resetWeightsToDefault(): void {
    getWeightManager().resetToDefaults();
}
