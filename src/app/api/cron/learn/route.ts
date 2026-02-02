/**
 * CRON: Learning Cycle
 * 
 * Analyzes signal performance and adjusts indicator weights
 * when users have consecutive losses.
 * 
 * Called every hour by external cron service.
 */

import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/logger';
import {
    getAllUserIds,
    getConsecutiveLossesServer,
    supabaseServer,
} from '@/lib/supabaseServer';
import { DEFAULT_WEIGHTS, IndicatorWeights } from '@/lib/engine/scoring';

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

interface LearningResult {
    userId: string;
    consecutiveLosses: number;
    adjustments: WeightAdjustment[];
}

// ============================================================================
// LEARNING CONFIG
// ============================================================================

const LEARNING_CONFIG = {
    maxWeightChange: 15,        // Max % change per cycle
    minWeight: 1,               // Minimum weight
    maxWeight: 20,              // Maximum weight
    consecutiveLossThreshold: 3, // Losses to trigger learning
};

// ============================================================================
// SERVER-SIDE LEARNING FUNCTIONS
// ============================================================================

/**
 * Get user weights from Supabase, or return defaults
 */
async function getUserWeights(userId: string): Promise<IndicatorWeights> {
    const { data, error } = await supabaseServer
        .from('user_weights')
        .select('weights')
        .eq('user_id', userId)
        .maybeSingle();

    if (error || !data) {
        return { ...DEFAULT_WEIGHTS };
    }

    return { ...DEFAULT_WEIGHTS, ...data.weights };
}

/**
 * Save user weights to Supabase
 */
async function saveUserWeights(userId: string, weights: IndicatorWeights): Promise<boolean> {
    const { error } = await supabaseServer
        .from('user_weights')
        .upsert({
            user_id: userId,
            weights,
            updated_at: new Date().toISOString(),
        });

    if (error) {
        log.error('Failed to save weights', error);
        return false;
    }

    return true;
}

/**
 * Get recent losing signals for analysis
 */
async function getRecentLosingSignals(userId: string, limit: number = 20) {
    const { data, error } = await supabaseServer
        .from('signals')
        .select('*')
        .eq('user_id', userId)
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
        const direction = signal.direction;
        const indicators = signal.indicator_snapshot || {};

        for (const [name, weightKey] of Object.entries(indicatorToWeight)) {
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

            // ADX analysis
            if (name === 'adx' && value > 25) {
                wasWronglyConfident = true;
            }

            // Volume indicators
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
 * Run learning cycle for a specific user
 */
async function runLearningCycleForUser(userId: string): Promise<LearningResult | null> {
    const consecutiveLosses = await getConsecutiveLossesServer(userId);

    if (consecutiveLosses < LEARNING_CONFIG.consecutiveLossThreshold) {
        return null;
    }

    const losingSignals = await getRecentLosingSignals(userId, 20);

    if (losingSignals.length === 0) {
        return null;
    }

    const indicatorAnalysis = analyzeLosingSignals(losingSignals);
    const currentWeights = await getUserWeights(userId);
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
        await saveUserWeights(userId, currentWeights);

        // Record learning cycle
        await supabaseServer.from('learning_cycles').insert({
            user_id: userId,
            triggered_by: 'consecutive_losses',
            signals_analyzed: losingSignals.length,
            adjustments,
            consecutive_losses: consecutiveLosses,
        });
    }

    return {
        userId: userId.slice(0, 8), // Partial for logs
        consecutiveLosses,
        adjustments,
    };
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
        const userIds = await getAllUserIds();
        log.debug(`Found ${userIds.length} users to check`);

        if (userIds.length === 0) {
            return NextResponse.json({
                success: true,
                message: 'No users with signals yet',
                duration: Date.now() - startTime,
            });
        }

        const results: LearningResult[] = [];

        for (const userId of userIds) {
            const result = await runLearningCycleForUser(userId);
            if (result && result.adjustments.length > 0) {
                results.push(result);
                log.info(`Learning cycle completed for user with ${result.adjustments.length} adjustments`);
            }
        }

        return NextResponse.json({
            success: true,
            usersChecked: userIds.length,
            learningCyclesRun: results.length,
            results,
            duration: Date.now() - startTime,
        });

    } catch (error) {
        log.error('Learn error', error);
        return NextResponse.json({
            success: false,
            error: 'Internal server error',
            duration: Date.now() - startTime,
        }, { status: 500 });
    }
}
