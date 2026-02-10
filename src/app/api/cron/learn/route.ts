/**
 * CRON: Learning Cycle
 * 
 * v4.1: Bidirectional — analyzes GLOBAL signal performance and
 * adjusts shared weights on both consecutive losses AND wins.
 * 
 * Called every hour by external cron service.
 */

import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/logger';
import {
    findUnprocessedLossStreak,
    findUnprocessedWinStreak,
    getGlobalWeights,
    updateGlobalWeights,
    supabaseServer,
    getTrailingWinRate,
    getDirectionalStats,
    getTradesSinceIndicatorLoss,
} from '@/lib/supabaseServer';
import { DEFAULT_WEIGHTS, IndicatorWeights, normalizeWeights } from '@/lib/engine/scoring';

const log = logger.withContext('CronLearn');

// ============================================================================
// TYPES
// ============================================================================

interface WeightAdjustment {
    indicator: keyof IndicatorWeights;
    oldWeight: number;
    newWeight: number;
    changePercent: number;
    reason: string;
}

// ============================================================================
// LEARNING CONFIG
// ============================================================================

const LEARNING_CONFIG = {
    maxWeightChange: 15,        // Max % change per cycle
    minWeight: 1,               // Minimum weight
    maxWeight: 20,              // Maximum weight
    consecutiveLossThreshold: 3, // Losses to trigger learning
    consecutiveWinThreshold: 3,  // v4.1: Wins to trigger boost
    maxWinBoost: 10,             // v4.1: Max % boost per win cycle (conservative)
    // Phase 4: Weight recovery settings
    recoveryThreshold: 20,       // Trades without indicator loss before recovery starts
    recoveryRate: 0.05,          // Recover 5% of lost weight per check
    // Phase 4: Proactive detection
    proactiveWinRateThreshold: 50, // Trigger warning if trailing win rate drops below this
    proactiveWindowSize: 10,      // Window size for trailing win rate calculation
};

// ============================================================================
// GLOBAL LEARNING FUNCTIONS
// ============================================================================

/**
 * F4 FIX: Shared indicator-to-weight mapping used by both loss and win analysis.
 * Extracted to module level to prevent asymmetry if a new indicator is added to one side.
 */
const INDICATOR_TO_WEIGHT: Record<string, keyof IndicatorWeights> = {
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
    // v4.1: HL-native indicators (24pts total)
    fearGreed: 'fearGreed',
    fundingRate: 'fundingRate',
    oiChange: 'oiChange',
    basisPremium: 'basisPremium',
    hlVolume: 'hlVolume',
};

/**
 * Get recent losing signals (global)
 */
async function getRecentLosingSignals(limit: number = 20) {
    const { data, error } = await supabaseServer
        .from('signals')
        .select('*')
        .eq('outcome', 'LOST')
        .order('closed_at', { ascending: false })
        .limit(limit);

    if (error) {
        log.error('Failed to fetch losing signals', error);
        return [];
    }

    return data || [];
}

/**
 * Analyze losing signals to find problematic indicators
 */
function analyzeLosingSignals(
    losingSignals: Array<{ direction: string; indicator_snapshot: Record<string, number> }>
): Map<keyof IndicatorWeights, { wrongCount: number; avgConfidence: number }> {
    const indicatorStats = new Map<keyof IndicatorWeights, { wrongCount: number; totalConfidence: number }>();

    // F4 FIX: Uses shared INDICATOR_TO_WEIGHT instead of local duplicate

    for (const signal of losingSignals) {
        const direction = signal.direction;
        const indicators = signal.indicator_snapshot || {};

        for (const [name, weightKey] of Object.entries(INDICATOR_TO_WEIGHT)) {
            const value = indicators[name];
            if (value === undefined) continue;

            let wasWronglyConfident = false;

            // RSI analysis
            if (name === 'rsi') {
                if (direction === 'LONG' && value < 40) wasWronglyConfident = true;
                if (direction === 'SHORT' && value > 60) wasWronglyConfident = true;
            }

            // MACD analysis
            if (name === 'macd') {
                if (direction === 'LONG' && value > 0) wasWronglyConfident = true;
                if (direction === 'SHORT' && value < 0) wasWronglyConfident = true;
            }

            // EMA Alignment analysis
            if (name === 'emaAlignment') {
                if (direction === 'LONG' && value > 50) wasWronglyConfident = true;
                if (direction === 'SHORT' && value < 50) wasWronglyConfident = true;
            }

            // Ichimoku analysis
            if (name === 'ichimoku') {
                if (direction === 'LONG' && value > 0) wasWronglyConfident = true;
                if (direction === 'SHORT' && value < 0) wasWronglyConfident = true;
            }

            // ADX analysis - FIXED: Only penalize if ADX direction matched signal direction
            // ADX > 25 just means strong trend, we need to check if plusDI > minusDI (bullish) or not
            if (name === 'adx' && value > 25) {
                const plusDI = indicators['plusDI'];
                const minusDI = indicators['minusDI'];
                if (plusDI !== undefined && minusDI !== undefined) {
                    const adxDirection = plusDI > minusDI ? 'LONG' : 'SHORT';
                    // Only penalize if ADX was pointing in our direction but we still lost
                    if (adxDirection === direction) {
                        wasWronglyConfident = true;
                    }
                }
                // If plusDI/minusDI not available (legacy signals), don't penalize
            }

            // Volume indicators
            if (name === 'obvTrend' || name === 'volumeRatio') {
                if (direction === 'LONG' && value > 1) wasWronglyConfident = true;
                if (direction === 'SHORT' && value < 1) wasWronglyConfident = true;
            }

            // Fear & Greed: high greed on LONG that lost = wrongly confident
            if (name === 'fearGreed') {
                if (direction === 'LONG' && value > 60) wasWronglyConfident = true;  // Greedy LONG lost
                if (direction === 'SHORT' && value < 40) wasWronglyConfident = true; // Fearful SHORT lost
            }

            // Funding Rate (contrarian): positive value = crowded longs = bearish signal
            if (name === 'fundingRate') {
                // If LONG lost and funding was negative (bearish crowd = bullish signal), funding was wrong
                if (direction === 'LONG' && value < 0) wasWronglyConfident = true;
                // If SHORT lost and funding was positive (bullish crowd = bearish signal), funding was wrong
                if (direction === 'SHORT' && value > 0) wasWronglyConfident = true;
            }

            // OI Change: positive = bullish signal
            if (name === 'oiChange') {
                if (direction === 'LONG' && value > 0) wasWronglyConfident = true;
                if (direction === 'SHORT' && value < 0) wasWronglyConfident = true;
            }

            // Basis Premium (contrarian): positive premium = crowded longs = bearish
            if (name === 'basisPremium') {
                if (direction === 'LONG' && value < 0) wasWronglyConfident = true;  // Negative premium = bullish signal, but LONG lost
                if (direction === 'SHORT' && value > 0) wasWronglyConfident = true; // Positive premium = bearish signal, but SHORT lost
            }

            // HL Volume: ratio > 1.5 with price move = conviction signal
            if (name === 'hlVolume') {
                if (direction === 'LONG' && value > 1.5) wasWronglyConfident = true;  // Volume confirmed but LONG lost
                if (direction === 'SHORT' && value > 1.5) wasWronglyConfident = true; // Volume confirmed but SHORT lost
            }

            if (wasWronglyConfident) {
                const existing = indicatorStats.get(weightKey) || { wrongCount: 0, totalConfidence: 0 };
                existing.wrongCount++;
                existing.totalConfidence += Math.abs(value);
                indicatorStats.set(weightKey, existing);
            }
        }
    }

    const result = new Map<keyof IndicatorWeights, { wrongCount: number; avgConfidence: number }>();
    for (const [key, stats] of indicatorStats.entries()) {
        result.set(key, {
            wrongCount: stats.wrongCount,
            avgConfidence: stats.wrongCount > 0 ? stats.totalConfidence / stats.wrongCount : 0,
        });
    }

    return result;
}

/**
 * Run GLOBAL learning cycle
 */
async function runGlobalLearningCycle(): Promise<{
    triggered: boolean;
    consecutiveLosses: number;
    adjustments: WeightAdjustment[];
}> {
    const lossStreak = await findUnprocessedLossStreak();
    const consecutiveLosses = lossStreak.count;

    log.debug(`Loss streak found: ${consecutiveLosses} consecutive losses`, {
        signalIds: lossStreak.signalIds,
        threshold: LEARNING_CONFIG.consecutiveLossThreshold,
    });

    if (consecutiveLosses < LEARNING_CONFIG.consecutiveLossThreshold) {
        return { triggered: false, consecutiveLosses, adjustments: [] };
    }


    const losingSignals = await getRecentLosingSignals(20);

    if (losingSignals.length === 0) {
        return { triggered: false, consecutiveLosses, adjustments: [] };
    }

    const indicatorAnalysis = analyzeLosingSignals(losingSignals);

    // Get current global weights or defaults
    const storedWeights = await getGlobalWeights();
    const currentWeights: IndicatorWeights = storedWeights
        ? { ...DEFAULT_WEIGHTS, ...storedWeights } as IndicatorWeights
        : { ...DEFAULT_WEIGHTS };

    const adjustments: WeightAdjustment[] = [];

    for (const [indicator, stats] of indicatorAnalysis.entries()) {
        const wrongRatio = stats.wrongCount / losingSignals.length;

        if (wrongRatio >= 0.5) {
            const reduction = Math.min(
                LEARNING_CONFIG.maxWeightChange,
                wrongRatio * LEARNING_CONFIG.maxWeightChange
            );

            const oldWeight = currentWeights[indicator];
            const newWeight = Math.max(
                LEARNING_CONFIG.minWeight,
                oldWeight * (1 - reduction / 100)
            );

            if (Math.abs(newWeight - oldWeight) > 0.01) {
                currentWeights[indicator] = newWeight;

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

    if (adjustments.length > 0) {
        // Update global weights
        // #9 FIX: Renormalize to maintain 100-point total
        const normalizedWeights = normalizeWeights(currentWeights);
        Object.assign(currentWeights, normalizedWeights);
        await updateGlobalWeights(currentWeights);

        // Calculate the learning event timestamp: 100ms after the 3rd loss
        const learningEventTime = lossStreak.streakEndTime
            ? new Date(new Date(lossStreak.streakEndTime).getTime() + 100).toISOString()
            : new Date().toISOString();

        // Record learning cycle (global, no user_id)
        await supabaseServer.from('learning_cycles').insert({
            user_id: null, // Global learning
            triggered_by: 'consecutive_losses',
            signals_analyzed: losingSignals.length,
            adjustments,
            consecutive_losses: consecutiveLosses,
            weights_snapshot: currentWeights, // Store weights after this event for fast restore
            created_at: learningEventTime, // Position at streak occurrence, not now
        });
    }

    return {
        triggered: true,
        consecutiveLosses,
        adjustments,
    };
}

// ============================================================================
// v4.1: BIDIRECTIONAL LEARNING — WIN BOOST
// ============================================================================

/**
 * Get recent winning signals (global)
 */
async function getRecentWinningSignals(limit: number = 20) {
    const { data, error } = await supabaseServer
        .from('signals')
        .select('*')
        .eq('outcome', 'WON')
        .order('closed_at', { ascending: false })
        .limit(limit);

    if (error) {
        log.error('Failed to fetch winning signals', error);
        return [];
    }

    return data || [];
}

/**
 * Analyze winning signals to find indicators that correctly predicted direction.
 * This is the inverse of analyzeLosingSignals.
 */
function analyzeWinningSignals(
    winningSignals: Array<{ direction: string; indicator_snapshot: Record<string, number> }>
): Map<keyof IndicatorWeights, { correctCount: number; avgConfidence: number }> {
    const indicatorStats = new Map<keyof IndicatorWeights, { correctCount: number; totalConfidence: number }>();

    // F4 FIX: Uses shared INDICATOR_TO_WEIGHT instead of local duplicate

    for (const signal of winningSignals) {
        const direction = signal.direction;
        const indicators = signal.indicator_snapshot || {};

        for (const [name, weightKey] of Object.entries(INDICATOR_TO_WEIGHT)) {
            const value = indicators[name];
            if (value === undefined) continue;

            let wasCorrectlyConfident = false;

            // RSI: correctly signaled direction
            if (name === 'rsi') {
                if (direction === 'LONG' && value > 50) wasCorrectlyConfident = true;
                if (direction === 'SHORT' && value < 50) wasCorrectlyConfident = true;
            }

            // MACD: histogram aligned with direction
            if (name === 'macd') {
                if (direction === 'LONG' && value > 0) wasCorrectlyConfident = true;
                if (direction === 'SHORT' && value < 0) wasCorrectlyConfident = true;
            }

            // EMA Alignment
            if (name === 'emaAlignment') {
                if (direction === 'LONG' && value > 50) wasCorrectlyConfident = true;
                if (direction === 'SHORT' && value < 50) wasCorrectlyConfident = true;
            }

            // Ichimoku
            if (name === 'ichimoku') {
                if (direction === 'LONG' && value > 0) wasCorrectlyConfident = true;
                if (direction === 'SHORT' && value < 0) wasCorrectlyConfident = true;
            }

            // ADX: direction aligned
            if (name === 'adx' && value > 25) {
                const plusDI = indicators['plusDI'];
                const minusDI = indicators['minusDI'];
                if (plusDI !== undefined && minusDI !== undefined) {
                    const adxDirection = plusDI > minusDI ? 'LONG' : 'SHORT';
                    if (adxDirection === direction) wasCorrectlyConfident = true;
                }
            }

            // Volume
            if (name === 'obvTrend' || name === 'volumeRatio') {
                if (direction === 'LONG' && value > 1) wasCorrectlyConfident = true;
                if (direction === 'SHORT' && value < 1) wasCorrectlyConfident = true;
            }

            // Fear & Greed: greedy on winning LONG = correctly confident
            if (name === 'fearGreed') {
                if (direction === 'LONG' && value > 60) wasCorrectlyConfident = true;
                if (direction === 'SHORT' && value < 40) wasCorrectlyConfident = true;
            }

            // Funding Rate (contrarian)
            if (name === 'fundingRate') {
                if (direction === 'LONG' && value < 0) wasCorrectlyConfident = true;
                if (direction === 'SHORT' && value > 0) wasCorrectlyConfident = true;
            }

            // OI Change
            if (name === 'oiChange') {
                if (direction === 'LONG' && value > 0) wasCorrectlyConfident = true;
                if (direction === 'SHORT' && value < 0) wasCorrectlyConfident = true;
            }

            // Basis Premium (contrarian)
            if (name === 'basisPremium') {
                if (direction === 'LONG' && value < 0) wasCorrectlyConfident = true;
                if (direction === 'SHORT' && value > 0) wasCorrectlyConfident = true;
            }

            // HL Volume
            if (name === 'hlVolume') {
                if (direction === 'LONG' && value > 1.5) wasCorrectlyConfident = true;
                if (direction === 'SHORT' && value > 1.5) wasCorrectlyConfident = true;
            }

            if (wasCorrectlyConfident) {
                const existing = indicatorStats.get(weightKey as keyof IndicatorWeights) || { correctCount: 0, totalConfidence: 0 };
                existing.correctCount++;
                existing.totalConfidence += Math.abs(value);
                indicatorStats.set(weightKey as keyof IndicatorWeights, existing);
            }
        }
    }

    const result = new Map<keyof IndicatorWeights, { correctCount: number; avgConfidence: number }>();
    for (const [key, stats] of indicatorStats.entries()) {
        result.set(key, {
            correctCount: stats.correctCount,
            avgConfidence: stats.correctCount > 0 ? stats.totalConfidence / stats.correctCount : 0,
        });
    }

    return result;
}

/**
 * v4.1: Run GLOBAL win-boost cycle
 * Inverse of loss learning — boosts indicators that consistently predicted correctly.
 */
async function runGlobalWinBoostCycle(): Promise<{
    triggered: boolean;
    consecutiveWins: number;
    adjustments: WeightAdjustment[];
}> {
    const winStreak = await findUnprocessedWinStreak();
    const consecutiveWins = winStreak.count;

    log.debug(`Win streak found: ${consecutiveWins} consecutive wins`, {
        signalIds: winStreak.signalIds,
        threshold: LEARNING_CONFIG.consecutiveWinThreshold,
    });

    if (consecutiveWins < LEARNING_CONFIG.consecutiveWinThreshold) {
        return { triggered: false, consecutiveWins, adjustments: [] };
    }

    const winningSignals = await getRecentWinningSignals(20);

    if (winningSignals.length === 0) {
        return { triggered: false, consecutiveWins, adjustments: [] };
    }

    const indicatorAnalysis = analyzeWinningSignals(winningSignals);

    const storedWeights = await getGlobalWeights();
    const currentWeights: IndicatorWeights = storedWeights
        ? { ...DEFAULT_WEIGHTS, ...storedWeights } as IndicatorWeights
        : { ...DEFAULT_WEIGHTS };

    const adjustments: WeightAdjustment[] = [];

    for (const [indicator, stats] of indicatorAnalysis.entries()) {
        const correctRatio = stats.correctCount / winningSignals.length;

        if (correctRatio >= 0.6) { // 60%+ correct across wins
            const boost = Math.min(
                LEARNING_CONFIG.maxWinBoost,
                correctRatio * LEARNING_CONFIG.maxWinBoost
            );

            const oldWeight = currentWeights[indicator];
            const newWeight = Math.min(
                LEARNING_CONFIG.maxWeight,
                oldWeight * (1 + boost / 100)
            );

            if (Math.abs(newWeight - oldWeight) > 0.01) {
                currentWeights[indicator] = newWeight;

                adjustments.push({
                    indicator,
                    oldWeight: Math.round(oldWeight * 100) / 100,
                    newWeight: Math.round(newWeight * 100) / 100,
                    changePercent: Math.round(((newWeight - oldWeight) / oldWeight) * 10000) / 100,
                    reason: `Correct in ${Math.round(correctRatio * 100)}% of ${winningSignals.length} wins`,
                });
            }
        }
    }

    if (adjustments.length > 0) {
        // #9 FIX: Renormalize to maintain 100-point total
        const normalizedWeights = normalizeWeights(currentWeights);
        Object.assign(currentWeights, normalizedWeights);
        await updateGlobalWeights(currentWeights);

        const boostEventTime = winStreak.streakEndTime
            ? new Date(new Date(winStreak.streakEndTime).getTime() + 100).toISOString()
            : new Date().toISOString();

        await supabaseServer.from('learning_cycles').insert({
            user_id: null,
            triggered_by: 'consecutive_wins',
            signals_analyzed: winningSignals.length,
            adjustments,
            consecutive_losses: 0, // It's a win streak, not a loss
            weights_snapshot: currentWeights,
            created_at: boostEventTime,
        });
    }

    return {
        triggered: true,
        consecutiveWins,
        adjustments,
    };
}

/**
 * Check for weights that should be recovered toward defaults
 * Weights recover if the indicator hasn't appeared in a loss for N trades
 */
async function checkWeightRecovery(): Promise<WeightAdjustment[]> {
    const storedWeights = await getGlobalWeights();
    if (!storedWeights) return [];

    const currentWeights = { ...DEFAULT_WEIGHTS, ...storedWeights } as IndicatorWeights;
    const recoveryAdjustments: WeightAdjustment[] = [];

    // Check each indicator that's below its default weight
    for (const [indicator, defaultWeight] of Object.entries(DEFAULT_WEIGHTS) as [keyof IndicatorWeights, number][]) {
        const currentWeight = currentWeights[indicator];

        // Only recover if weight is below default (it was penalized)
        if (currentWeight < defaultWeight) {
            const tradesSinceLoss = await getTradesSinceIndicatorLoss(indicator);

            if (tradesSinceLoss >= LEARNING_CONFIG.recoveryThreshold) {
                // Calculate recovery amount (5% of the difference back toward default)
                const difference = defaultWeight - currentWeight;
                const recoveryAmount = difference * LEARNING_CONFIG.recoveryRate;
                const newWeight = Math.min(defaultWeight, currentWeight + recoveryAmount);

                if (Math.abs(newWeight - currentWeight) > 0.01) {
                    currentWeights[indicator] = newWeight;

                    recoveryAdjustments.push({
                        indicator,
                        oldWeight: Math.round(currentWeight * 100) / 100,
                        newWeight: Math.round(newWeight * 100) / 100,
                        changePercent: Math.round(((newWeight - currentWeight) / currentWeight) * 10000) / 100,
                        reason: `Recovered: ${tradesSinceLoss} trades since last loss`,
                    });
                }
            }
        }
    }

    if (recoveryAdjustments.length > 0) {
        // #9 FIX: Renormalize to maintain 100-point total
        const normalizedWeights = normalizeWeights(currentWeights);
        Object.assign(currentWeights, normalizedWeights);
        await updateGlobalWeights(currentWeights);
        log.info(`Weight recovery: ${recoveryAdjustments.length} indicators recovered`);
    }

    return recoveryAdjustments;
}

// ============================================================================
// API HANDLER
// ============================================================================

export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url);
    const secret = searchParams.get('secret');
    const cronSecret = process.env.CRON_SECRET;

    // SECURITY: Fail-closed - reject if secret missing or doesn't match
    if (!cronSecret || secret !== cronSecret) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const startTime = Date.now();

    try {
        log.debug('Running context-aware learning cycle');

        // Phase 4: Check trailing win rate for proactive detection
        const trailingStats = await getTrailingWinRate(LEARNING_CONFIG.proactiveWindowSize);
        const directionalStats = await getDirectionalStats(50);

        const proactiveWarning = trailingStats.winRate < LEARNING_CONFIG.proactiveWinRateThreshold
            && trailingStats.total >= 5; // Only warn if we have enough data

        if (proactiveWarning) {
            log.info(`Proactive warning: Win rate dropped to ${trailingStats.winRate.toFixed(1)}% (${trailingStats.wins}W/${trailingStats.losses}L)`);
        }

        // Phase 4: Check for weight recovery opportunities
        const recoveryAdjustments = await checkWeightRecovery();

        // Loop to process ALL unprocessed loss streaks in one run
        const allResults: { consecutiveLosses: number; adjustments: WeightAdjustment[] }[] = [];
        let totalAdjustments = 0;
        const MAX_ITERATIONS = 10; // Safety limit

        for (let i = 0; i < MAX_ITERATIONS; i++) {
            const result = await runGlobalLearningCycle();

            if (!result.triggered) {
                log.debug(`Loss iteration ${i + 1}: No more streaks found`);
                break;
            }

            allResults.push({
                consecutiveLosses: result.consecutiveLosses,
                adjustments: result.adjustments,
            });
            totalAdjustments += result.adjustments.length;
            log.debug(`Loss iteration ${i + 1}: Processed streak of ${result.consecutiveLosses} with ${result.adjustments.length} adjustments`);
        }

        // v4.1: Process ALL unprocessed win streaks
        const winResults: { consecutiveWins: number; adjustments: WeightAdjustment[] }[] = [];
        let totalWinBoosts = 0;

        for (let i = 0; i < MAX_ITERATIONS; i++) {
            const result = await runGlobalWinBoostCycle();

            if (!result.triggered) {
                log.debug(`Win iteration ${i + 1}: No more win streaks found`);
                break;
            }

            winResults.push({
                consecutiveWins: result.consecutiveWins,
                adjustments: result.adjustments,
            });
            totalWinBoosts += result.adjustments.length;
            log.debug(`Win iteration ${i + 1}: Boosted ${result.adjustments.length} indicators from ${result.consecutiveWins} win streak`);
        }

        // Build comprehensive response
        const response = {
            success: true,
            // Loss streak processing
            learningTriggered: allResults.length > 0,
            streaksProcessed: allResults.length,
            totalAdjustments,
            results: allResults.length > 0 ? allResults : undefined,
            // v4.1: Win boost processing
            winBoostTriggered: winResults.length > 0,
            winStreaksProcessed: winResults.length,
            totalWinBoosts,
            winResults: winResults.length > 0 ? winResults : undefined,
            // Weight recovery
            recoveryTriggered: recoveryAdjustments.length > 0,
            recoveryAdjustments: recoveryAdjustments.length > 0 ? recoveryAdjustments : undefined,
            // Proactive monitoring
            proactiveWarning,
            trailingWinRate: Math.round(trailingStats.winRate * 10) / 10,
            directionalStats: {
                long: {
                    winRate: Math.round(directionalStats.long.winRate * 10) / 10,
                    record: `${directionalStats.long.wins}W-${directionalStats.long.losses}L`,
                },
                short: {
                    winRate: Math.round(directionalStats.short.winRate * 10) / 10,
                    record: `${directionalStats.short.wins}W-${directionalStats.short.losses}L`,
                },
            },
            duration: Date.now() - startTime,
        };

        if (allResults.length === 0 && recoveryAdjustments.length === 0 && winResults.length === 0) {
            log.debug('No learning, recovery, or boost actions taken');
        } else {
            log.info(`Learning complete: ${allResults.length} loss streaks, ${winResults.length} win boosts, ${recoveryAdjustments.length} recoveries`);
        }

        return NextResponse.json(response);

    } catch (error) {
        log.error('Learn error', error);
        return NextResponse.json({
            success: false,
            error: 'Internal server error',
            duration: Date.now() - startTime,
        }, { status: 500 });
    }
}

