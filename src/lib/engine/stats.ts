/**
 * LISAN INTELLIGENCE — Aggregate Statistics
 * 
 * Provides computed statistics for the /proof transparency page.
 * Score bucket performance, cumulative returns, and honest metrics.
 */

import { getSignalHistory, SignalRecord, TrackingStats } from './tracking';

// ============================================================================
// TYPES
// ============================================================================

export interface ScoreBucketStats {
    range: string;
    minScore: number;
    maxScore: number;
    total: number;
    wins: number;
    losses: number;
    open: number;
    winRate: number;
    avgProfit: number;
    avgLoss: number;
}

export interface CumulativeReturn {
    signalIndex: number;
    timestamp: Date;
    cumulativeR: number;
    outcome: 'WIN' | 'LOSS';
    coin: string;
    score: number;
}

export interface PerformanceSummary {
    daysLive: number;
    totalSignals: number;
    completedSignals: number;
    openSignals: number;
    overallWinRate: number;
    bestPerformingBucket: string;
    worstPerformingBucket: string;
    averageScore: number;
    totalR: number;
    isEarlyData: boolean;
    earlyDataThreshold: number;
}

export interface RecentOutcome {
    id: string;
    coin: string;
    direction: 'LONG' | 'SHORT' | 'HOLD';
    score: number;
    entryPrice: number;
    exitPrice: number;
    profitPct: number;
    outcome: 'WIN' | 'LOSS';
    exitReason: string;
    timestamp: Date;
    exitTimestamp: Date;
}

// ============================================================================
// SCORE BUCKET CONFIGURATION
// ============================================================================

const SCORE_BUCKETS = [
    { range: '80+', minScore: 80, maxScore: 100 },
    { range: '70-79', minScore: 70, maxScore: 79 },
    { range: '60-69', minScore: 60, maxScore: 69 },
    { range: '50-59', minScore: 50, maxScore: 59 },
    { range: '<50', minScore: 0, maxScore: 49 },
];

// ============================================================================
// SCORE BUCKET STATISTICS
// ============================================================================

/**
 * Get performance statistics grouped by score buckets
 */
export function getScoreBucketStats(): ScoreBucketStats[] {
    const history = getSignalHistory();
    const allSignals = history.getAll();

    return SCORE_BUCKETS.map(bucket => {
        const signals = allSignals.filter(
            s => s.signal.score >= bucket.minScore && s.signal.score <= bucket.maxScore
        );

        const completed = signals.filter(s => s.outcome !== 'OPEN');
        const wins = signals.filter(s => s.outcome === 'WIN');
        const losses = signals.filter(s => s.outcome === 'LOSS');
        const open = signals.filter(s => s.outcome === 'OPEN');

        const avgProfit = wins.length > 0
            ? wins.reduce((sum, s) => sum + (s.profitPct || 0), 0) / wins.length
            : 0;

        const avgLoss = losses.length > 0
            ? losses.reduce((sum, s) => sum + Math.abs(s.profitPct || 0), 0) / losses.length
            : 0;

        return {
            range: bucket.range,
            minScore: bucket.minScore,
            maxScore: bucket.maxScore,
            total: signals.length,
            wins: wins.length,
            losses: losses.length,
            open: open.length,
            winRate: completed.length > 0 ? (wins.length / completed.length) * 100 : 0,
            avgProfit: Math.round(avgProfit * 100) / 100,
            avgLoss: Math.round(avgLoss * 100) / 100,
        };
    });
}

/**
 * Get win rate for a specific score (for SignalCard context)
 */
export function getScoreBucketWinRate(score: number): { winRate: number; sampleSize: number } {
    const bucket = SCORE_BUCKETS.find(b => score >= b.minScore && score <= b.maxScore);
    if (!bucket) return { winRate: 0, sampleSize: 0 };

    const history = getSignalHistory();
    const signals = history.getAll().filter(
        s => s.signal.score >= bucket.minScore && s.signal.score <= bucket.maxScore
    );

    const completed = signals.filter(s => s.outcome !== 'OPEN');
    const wins = signals.filter(s => s.outcome === 'WIN');

    return {
        winRate: completed.length > 0 ? Math.round((wins.length / completed.length) * 100) : 0,
        sampleSize: completed.length,
    };
}

// ============================================================================
// CUMULATIVE RETURNS
// ============================================================================

/**
 * Get cumulative R (risk multiples) over time
 * Each signal's R is based on its risk:reward setup
 */
export function getCumulativeReturns(): CumulativeReturn[] {
    const history = getSignalHistory();
    const completed = history.getCompleted()
        .sort((a, b) => {
            const aTime = a.exitTimestamp?.getTime() || 0;
            const bTime = b.exitTimestamp?.getTime() || 0;
            return aTime - bTime;
        });

    let cumulativeR = 0;
    const returns: CumulativeReturn[] = [];

    completed.forEach((signal, index) => {
        // Calculate R for this signal
        // Win = +1R (or actual R:R if exceeded), Loss = -1R
        const riskReward = signal.signal.riskRewardRatio || 2;

        if (signal.outcome === 'WIN') {
            // If profit exceeded normal TP, cap at risk:reward ratio
            const profitPct = signal.profitPct || 0;
            const expectedProfitPct = calculateExpectedProfit(signal);
            const actualR = Math.min(profitPct / expectedProfitPct * riskReward, riskReward);
            cumulativeR += actualR > 0 ? actualR : 1; // At minimum +1R for a win
        } else {
            cumulativeR -= 1; // -1R for a loss
        }

        returns.push({
            signalIndex: index + 1,
            timestamp: signal.exitTimestamp || new Date(),
            cumulativeR: Math.round(cumulativeR * 100) / 100,
            outcome: signal.outcome as 'WIN' | 'LOSS',
            coin: signal.signal.coin,
            score: signal.signal.score,
        });
    });

    return returns;
}

/**
 * Calculate expected profit percentage for a signal
 */
function calculateExpectedProfit(signal: SignalRecord): number {
    const entry = signal.signal.entryPrice;
    const tp = signal.signal.takeProfit;

    if (signal.signal.direction === 'LONG') {
        return ((tp - entry) / entry) * 100;
    } else if (signal.signal.direction === 'SHORT') {
        return ((entry - tp) / entry) * 100;
    }
    return 1; // Default to avoid division by zero
}

// ============================================================================
// PERFORMANCE SUMMARY
// ============================================================================

/**
 * Get overall performance summary with honest context
 */
export function getPerformanceSummary(): PerformanceSummary {
    const history = getSignalHistory();
    const allSignals = history.getAll();
    const stats = history.getStats();
    const bucketStats = getScoreBucketStats();
    const cumulativeReturns = getCumulativeReturns();

    // Calculate days since first signal
    const firstSignal = allSignals.length > 0
        ? allSignals.reduce((earliest, s) =>
            s.signal.timestamp < earliest.signal.timestamp ? s : earliest
        )
        : null;

    const daysLive = firstSignal
        ? Math.floor((Date.now() - new Date(firstSignal.signal.timestamp).getTime()) / (1000 * 60 * 60 * 24))
        : 0;

    // Find best/worst performing buckets (with minimum sample size)
    const qualifiedBuckets = bucketStats.filter(b => (b.wins + b.losses) >= 3);

    const bestBucket = qualifiedBuckets.length > 0
        ? qualifiedBuckets.reduce((best, b) => b.winRate > best.winRate ? b : best)
        : null;

    const worstBucket = qualifiedBuckets.length > 0
        ? qualifiedBuckets.reduce((worst, b) => b.winRate < worst.winRate ? b : worst)
        : null;

    // Calculate average score
    const avgScore = allSignals.length > 0
        ? allSignals.reduce((sum, s) => sum + s.signal.score, 0) / allSignals.length
        : 0;

    // Total R from cumulative returns
    const totalR = cumulativeReturns.length > 0
        ? cumulativeReturns[cumulativeReturns.length - 1].cumulativeR
        : 0;

    // "Early data" threshold: < 30 completed signals
    const EARLY_DATA_THRESHOLD = 30;
    const completedCount = stats.wins + stats.losses;

    return {
        daysLive,
        totalSignals: stats.totalSignals,
        completedSignals: completedCount,
        openSignals: stats.openSignals,
        overallWinRate: stats.winRate,
        bestPerformingBucket: bestBucket?.range || 'N/A',
        worstPerformingBucket: worstBucket?.range || 'N/A',
        averageScore: Math.round(avgScore),
        totalR,
        isEarlyData: completedCount < EARLY_DATA_THRESHOLD,
        earlyDataThreshold: EARLY_DATA_THRESHOLD,
    };
}

// ============================================================================
// RECENT OUTCOMES
// ============================================================================

/**
 * Get the most recent completed signals with full details
 */
export function getRecentOutcomes(count: number = 20): RecentOutcome[] {
    const history = getSignalHistory();
    const completed = history.getCompleted()
        .sort((a, b) => {
            const aTime = a.exitTimestamp?.getTime() || 0;
            const bTime = b.exitTimestamp?.getTime() || 0;
            return bTime - aTime; // Most recent first
        })
        .slice(0, count);

    return completed.map(s => ({
        id: s.id,
        coin: s.signal.coin,
        direction: s.signal.direction,
        score: s.signal.score,
        entryPrice: s.signal.entryPrice,
        exitPrice: s.exitPrice || 0,
        profitPct: Math.round((s.profitPct || 0) * 100) / 100,
        outcome: s.outcome as 'WIN' | 'LOSS',
        exitReason: formatExitReason(s.exitReason || 'UNKNOWN'),
        timestamp: new Date(s.signal.timestamp),
        exitTimestamp: s.exitTimestamp || new Date(),
    }));
}

/**
 * Format exit reason for display
 */
function formatExitReason(reason: string): string {
    const map: Record<string, string> = {
        'STOP_LOSS': 'Stop Loss',
        'TAKE_PROFIT': 'Take Profit',
        'TARGET_3_PERCENT': '+3% Target',
        'MANUAL': 'Manual',
        'TIMEOUT': 'Timeout',
        'UNKNOWN': 'Unknown',
    };
    return map[reason] || reason;
}

// ============================================================================
// FAILURE MODE ANALYSIS
// ============================================================================

/**
 * Get known failure modes based on historical data
 * These are displayed as honest disclaimers
 */
export function getFailureModes(): string[] {
    const history = getSignalHistory();
    const losses = history.getCompleted().filter(s => s.outcome === 'LOSS');
    const failures: string[] = [];

    if (losses.length < 5) {
        failures.push('Insufficient data to identify failure patterns');
        return failures;
    }

    // Analyze SHORT performance
    const shortLosses = losses.filter(s => s.signal.direction === 'SHORT').length;
    const shortTotal = history.getAll().filter(s => s.signal.direction === 'SHORT').length;
    if (shortTotal > 5 && (shortLosses / shortTotal) > 0.6) {
        failures.push('SHORT signals underperform in current market conditions');
    }

    // Analyze low-score performance
    const lowScoreLosses = losses.filter(s => s.signal.score < 65).length;
    if (lowScoreLosses > losses.length * 0.5) {
        failures.push('Signals below score 65 have higher failure rate');
    }

    // If no specific patterns, add general disclaimer
    if (failures.length === 0) {
        failures.push('No consistent failure patterns identified yet');
    }

    return failures;
}
