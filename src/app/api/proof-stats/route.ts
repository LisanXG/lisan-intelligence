/**
 * API: Proof Stats
 * 
 * Returns aggregated signal statistics from Supabase for the /proof page.
 * This is the source of truth for performance data.
 */

import { NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabaseServer';

// ============================================================================
// TYPES
// ============================================================================

interface ScoreBucketStats {
    range: string;
    minScore: number;
    maxScore: number;
    total: number;
    wins: number;
    losses: number;
    open: number;
    winRate: number;
}

interface RecentOutcome {
    id: string;
    coin: string;
    direction: string;
    score: number;
    entry_price: number;
    exit_price: number | null;
    profit_pct: number | null;
    outcome: string;
    exit_reason: string | null;
    created_at: string;
    closed_at: string | null;
}

interface PerformanceSummary {
    totalSignals: number;
    completedSignals: number;
    openSignals: number;
    wins: number;
    losses: number;
    overallWinRate: number;
    avgWinPct: number;       // Average win percentage
    avgLossPct: number;      // Average loss percentage (positive number)
    totalPct: number;        // Sum of all trade returns
    isEarlyData: boolean;
    earlyDataThreshold: number;
}

interface CumulativeReturn {
    signalIndex: number;
    coin: string;
    direction: string;
    score: number;
    outcome: 'WON' | 'LOST';
    profitPct: number;        // Individual trade return
    cumulativePct: number;    // Running sum of all returns
    closedAt: string;
    entryPrice: number;
    exitPrice: number;
    exitReason: string | null;
    durationHours: number;    // How long the trade was open
}

interface LearningEvent {
    occurredAt: string;
    triggeredBy: string;
    signalsAnalyzed: number;
    consecutiveLosses: number;
    adjustments: { indicator: string; oldWeight: number; newWeight: number; reason: string }[];
}

interface ExitBreakdown {
    takeProfit: number;
    stopLoss: number;
    momentumExit: number;
    target3Percent: number;
}

interface BestWorstTrade {
    coin: string;
    direction: string;
    profitPct: number;
    closedAt: string;
}

// ============================================================================
// SCORE BUCKETS
// ============================================================================

const SCORE_BUCKETS = [
    { range: '80+', minScore: 80, maxScore: 100 },
    { range: '70-79', minScore: 70, maxScore: 79 },
    { range: '60-69', minScore: 60, maxScore: 69 },
    { range: '50-59', minScore: 50, maxScore: 59 },
    { range: '<50', minScore: 0, maxScore: 49 },
];

// ============================================================================
// API HANDLER
// ============================================================================

export async function GET() {
    try {
        // Fetch ALL signals across all users (public proof page)
        const { data: signals, error } = await supabaseServer
            .from('signals')
            .select('id, coin, direction, score, entry_price, exit_price, profit_pct, outcome, exit_reason, created_at, closed_at')
            .order('created_at', { ascending: false });

        if (error) {
            console.error('Failed to fetch signals for proof:', error);
            return NextResponse.json({ error: 'Failed to fetch data' }, { status: 500 });
        }

        const allSignals = signals || [];

        // Calculate bucket stats
        const bucketStats: ScoreBucketStats[] = SCORE_BUCKETS.map(bucket => {
            const bucketSignals = allSignals.filter(
                s => s.score >= bucket.minScore && s.score <= bucket.maxScore
            );
            const wins = bucketSignals.filter(s => s.outcome === 'WON').length;
            const losses = bucketSignals.filter(s => s.outcome === 'LOST').length;
            const open = bucketSignals.filter(s => s.outcome === 'PENDING').length;
            const completed = wins + losses;

            return {
                range: bucket.range,
                minScore: bucket.minScore,
                maxScore: bucket.maxScore,
                total: bucketSignals.length,
                wins,
                losses,
                open,
                winRate: completed > 0 ? Math.round((wins / completed) * 100) : 0,
            };
        });

        // Calculate cumulative returns (sorted by closed_at, oldest first)
        const completedSignals = allSignals
            .filter(s => s.outcome === 'WON' || s.outcome === 'LOST')
            .sort((a, b) => {
                const aTime = a.closed_at ? new Date(a.closed_at).getTime() : 0;
                const bTime = b.closed_at ? new Date(b.closed_at).getTime() : 0;
                return aTime - bTime; // Oldest first
            });

        // Calculate percentage-based cumulative returns with enhanced data
        let runningPct = 0;
        const cumulativeReturns: CumulativeReturn[] = completedSignals.map((signal, index) => {
            const profitPct = signal.profit_pct || 0;
            runningPct += profitPct;

            // Calculate duration in hours
            const createdTime = new Date(signal.created_at).getTime();
            const closedTime = signal.closed_at ? new Date(signal.closed_at).getTime() : createdTime;
            const durationHours = Math.round((closedTime - createdTime) / (1000 * 60 * 60) * 10) / 10;

            return {
                signalIndex: index + 1,
                coin: signal.coin,
                direction: signal.direction,
                score: signal.score,
                outcome: signal.outcome as 'WON' | 'LOST',
                profitPct: Math.round(profitPct * 100) / 100,
                cumulativePct: Math.round(runningPct * 100) / 100,
                closedAt: signal.closed_at || signal.created_at,
                entryPrice: signal.entry_price,
                exitPrice: signal.exit_price || signal.entry_price,
                exitReason: signal.exit_reason,
                durationHours,
            };
        });

        // Calculate summary with percentage metrics
        const wins = allSignals.filter(s => s.outcome === 'WON').length;
        const losses = allSignals.filter(s => s.outcome === 'LOST').length;
        const open = allSignals.filter(s => s.outcome === 'PENDING').length;
        const completed = wins + losses;
        const EARLY_DATA_THRESHOLD = 30;

        // Calculate average win and loss percentages
        const winSignals = completedSignals.filter(s => s.outcome === 'WON');
        const lossSignals = completedSignals.filter(s => s.outcome === 'LOST');

        const avgWinPct = winSignals.length > 0
            ? winSignals.reduce((sum, s) => sum + (s.profit_pct || 0), 0) / winSignals.length
            : 0;
        const avgLossPct = lossSignals.length > 0
            ? Math.abs(lossSignals.reduce((sum, s) => sum + (s.profit_pct || 0), 0) / lossSignals.length)
            : 0;

        const totalPct = cumulativeReturns.length > 0
            ? cumulativeReturns[cumulativeReturns.length - 1].cumulativePct
            : 0;

        const summary: PerformanceSummary = {
            totalSignals: allSignals.length,
            completedSignals: completed,
            openSignals: open,
            wins,
            losses,
            overallWinRate: completed > 0 ? Math.round((wins / completed) * 100) : 0,
            avgWinPct: Math.round(avgWinPct * 100) / 100,
            avgLossPct: Math.round(avgLossPct * 100) / 100,
            totalPct: Math.round(totalPct * 100) / 100,
            isEarlyData: completed < EARLY_DATA_THRESHOLD,
            earlyDataThreshold: EARLY_DATA_THRESHOLD,
        };

        // Recent completed outcomes
        const recentOutcomes: RecentOutcome[] = allSignals
            .filter(s => s.outcome !== 'PENDING')
            .slice(0, 20);

        // Fetch learning events
        const { data: learningData } = await supabaseServer
            .from('learning_cycles')
            .select('created_at, triggered_by, signals_analyzed, consecutive_losses, adjustments')
            .order('created_at', { ascending: true });

        const learningEvents: LearningEvent[] = (learningData || []).map(lc => ({
            occurredAt: lc.created_at,
            triggeredBy: lc.triggered_by,
            signalsAnalyzed: lc.signals_analyzed,
            consecutiveLosses: lc.consecutive_losses,
            adjustments: lc.adjustments || [],
        }));

        // Calculate exit breakdown
        const exitBreakdown: ExitBreakdown = {
            takeProfit: completedSignals.filter(s => s.exit_reason === 'TAKE_PROFIT').length,
            stopLoss: completedSignals.filter(s => s.exit_reason === 'STOP_LOSS').length,
            momentumExit: completedSignals.filter(s => s.exit_reason === 'MOMENTUM_EXIT').length,
            target3Percent: completedSignals.filter(s => s.exit_reason === 'TARGET_3_PERCENT').length,
        };

        // Find best and worst trades
        const sortedByProfit = completedSignals
            .filter(s => s.profit_pct !== null)
            .sort((a, b) => (b.profit_pct || 0) - (a.profit_pct || 0));

        const bestTrade: BestWorstTrade | null = sortedByProfit.length > 0 ? {
            coin: sortedByProfit[0].coin,
            direction: sortedByProfit[0].direction,
            profitPct: Math.round((sortedByProfit[0].profit_pct || 0) * 100) / 100,
            closedAt: sortedByProfit[0].closed_at || sortedByProfit[0].created_at,
        } : null;

        const worstTrade: BestWorstTrade | null = sortedByProfit.length > 0 ? {
            coin: sortedByProfit[sortedByProfit.length - 1].coin,
            direction: sortedByProfit[sortedByProfit.length - 1].direction,
            profitPct: Math.round((sortedByProfit[sortedByProfit.length - 1].profit_pct || 0) * 100) / 100,
            closedAt: sortedByProfit[sortedByProfit.length - 1].closed_at || sortedByProfit[sortedByProfit.length - 1].created_at,
        } : null;

        // Calculate average duration
        const totalDuration = cumulativeReturns.reduce((sum, r) => sum + r.durationHours, 0);
        const avgDurationHours = cumulativeReturns.length > 0
            ? Math.round(totalDuration / cumulativeReturns.length * 10) / 10
            : 0;

        return NextResponse.json({
            bucketStats,
            summary,
            recentOutcomes,
            cumulativeReturns,
            learningEvents,
            exitBreakdown,
            bestTrade,
            worstTrade,
            avgDurationHours,
        });

    } catch (error) {
        console.error('Proof stats error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

