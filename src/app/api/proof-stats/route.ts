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
    totalR: number;
    isEarlyData: boolean;
    earlyDataThreshold: number;
}

interface CumulativeReturn {
    signalIndex: number;
    coin: string;
    score: number;
    outcome: 'WON' | 'LOST';
    rValue: number;
    cumulativeR: number;
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
        // Fetch all signals across all users (for public proof page)
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

        let runningR = 0;
        const cumulativeReturns: CumulativeReturn[] = completedSignals.map((signal, index) => {
            // Win = +1R, Loss = -1R (simplified R calculation)
            const rValue = signal.outcome === 'WON' ? 1 : -1;
            runningR += rValue;

            return {
                signalIndex: index + 1,
                coin: signal.coin,
                score: signal.score,
                outcome: signal.outcome as 'WON' | 'LOST',
                rValue,
                cumulativeR: Math.round(runningR * 100) / 100,
                closedAt: signal.closed_at || signal.created_at,
            };
        });

        // Calculate summary
        const wins = allSignals.filter(s => s.outcome === 'WON').length;
        const losses = allSignals.filter(s => s.outcome === 'LOST').length;
        const open = allSignals.filter(s => s.outcome === 'PENDING').length;
        const completed = wins + losses;
        const EARLY_DATA_THRESHOLD = 30;
        const totalR = cumulativeReturns.length > 0
            ? cumulativeReturns[cumulativeReturns.length - 1].cumulativeR
            : 0;

        const summary: PerformanceSummary = {
            totalSignals: allSignals.length,
            completedSignals: completed,
            openSignals: open,
            wins,
            losses,
            overallWinRate: completed > 0 ? Math.round((wins / completed) * 100) : 0,
            totalR,
            isEarlyData: completed < EARLY_DATA_THRESHOLD,
            earlyDataThreshold: EARLY_DATA_THRESHOLD,
        };

        // Recent completed outcomes
        const recentOutcomes: RecentOutcome[] = allSignals
            .filter(s => s.outcome !== 'PENDING')
            .slice(0, 20);

        return NextResponse.json({
            bucketStats,
            summary,
            recentOutcomes,
            cumulativeReturns,
        });

    } catch (error) {
        console.error('Proof stats error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

