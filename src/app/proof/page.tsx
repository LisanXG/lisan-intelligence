'use client';

import { useEffect, useState } from 'react';
import Header from '@/components/Header';

// ============================================================================
// TYPES (from API response)
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
    avgWinPct: number;
    avgLossPct: number;
    totalPct: number;
    isEarlyData: boolean;
    earlyDataThreshold: number;
}

interface CumulativeReturn {
    signalIndex: number;
    coin: string;
    direction: string;
    score: number;
    outcome: 'WON' | 'LOST';
    profitPct: number;
    cumulativePct: number;
    closedAt: string;
    entryPrice: number;
    exitPrice: number;
    exitReason: string | null;
    durationHours: number;
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
}

interface BestWorstTrade {
    coin: string;
    direction: string;
    profitPct: number;
    closedAt: string;
}

// ============================================================================
// PAGE COMPONENT
// ============================================================================

export default function ProofPage() {
    const [bucketStats, setBucketStats] = useState<ScoreBucketStats[]>([]);
    const [summary, setSummary] = useState<PerformanceSummary | null>(null);
    const [recentOutcomes, setRecentOutcomes] = useState<RecentOutcome[]>([]);
    const [cumulativeReturns, setCumulativeReturns] = useState<CumulativeReturn[]>([]);
    const [learningEvents, setLearningEvents] = useState<LearningEvent[]>([]);
    const [exitBreakdown, setExitBreakdown] = useState<ExitBreakdown | null>(null);
    const [bestTrade, setBestTrade] = useState<BestWorstTrade | null>(null);
    const [worstTrade, setWorstTrade] = useState<BestWorstTrade | null>(null);
    const [avgDurationHours, setAvgDurationHours] = useState<number>(0);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Smart price formatting - more decimals for cheap coins
    const formatPrice = (price: number | null | undefined): string => {
        if (price === null || price === undefined) return '-';
        if (price >= 1000) return `$${price.toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
        if (price >= 1) return `$${price.toFixed(2)}`;
        if (price >= 0.01) return `$${price.toFixed(4)}`;
        return `$${price.toFixed(6)}`;
    };

    useEffect(() => {
        async function loadStats() {
            try {
                setIsLoading(true);
                // Fetch ALL signals (public, server-wide proof)
                const response = await fetch('/api/proof-stats');
                if (!response.ok) throw new Error('Failed to load stats');

                const data = await response.json();
                setBucketStats(data.bucketStats || []);
                setSummary(data.summary || null);
                setRecentOutcomes(data.recentOutcomes || []);
                setCumulativeReturns(data.cumulativeReturns || []);
                setLearningEvents(data.learningEvents || []);
                setExitBreakdown(data.exitBreakdown || null);
                setBestTrade(data.bestTrade || null);
                setWorstTrade(data.worstTrade || null);
                setAvgDurationHours(data.avgDurationHours || 0);
            } catch (err) {
                setError('Failed to load performance data');
                console.error(err);
            } finally {
                setIsLoading(false);
            }
        }
        loadStats();
    }, []);

    if (isLoading) {
        return (
            <main className="min-h-screen p-6 md:p-8">
                <div className="max-w-6xl mx-auto">
                    <div className="skeleton h-12 w-64 mb-8" />
                    <div className="skeleton h-64 w-full mb-6" />
                    <div className="skeleton h-96 w-full" />
                </div>
            </main>
        );
    }

    return (
        <>
            <Header />
            <main className="min-h-screen pt-28 pb-20 px-6 lg:px-12">
                <div className="max-w-6xl mx-auto space-y-8">

                    {/* Header */}
                    <header className="card p-6 space-y-4">
                        <div>
                            <h1 className="text-3xl md:text-4xl font-semibold mb-2 text-[var(--text-primary)]">
                                Does This Actually Work?
                            </h1>
                            <p className="text-[var(--text-secondary)] max-w-2xl">
                                Real performance data. No cherry-picking. Here&apos;s every signal we&apos;ve generated
                                and how it performed. Judge for yourself.
                            </p>
                        </div>
                    </header>

                    {/* Early Data Warning */}
                    {summary?.isEarlyData && (
                        <div className="card p-4 border-l-4 border-l-[var(--accent-orange)] bg-[rgba(245,158,11,0.08)]">
                            <div className="flex items-start gap-3">
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--accent-orange)" strokeWidth="2" className="mt-0.5 flex-shrink-0">
                                    <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                                    <line x1="12" y1="9" x2="12" y2="13" />
                                    <line x1="12" y1="17" x2="12.01" y2="17" />
                                </svg>
                                <div>
                                    <h3 className="font-semibold text-[var(--accent-orange)] mb-1">Early Noise Alert</h3>
                                    <p className="text-sm text-[var(--text-secondary)]">
                                        We have {summary.completedSignals} completed signals. Statistical significance requires
                                        at least {summary.earlyDataThreshold}. Take these numbers with appropriate skepticism.
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Summary Stats */}
                    <section className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="card p-5 text-center">
                            <p className={`text-3xl font-bold ${(summary?.overallWinRate || 0) >= 55 ? 'text-[var(--accent-green)]' :
                                (summary?.overallWinRate || 0) >= 45 ? 'text-[var(--accent-orange)]' :
                                    'text-[var(--accent-red)]'
                                }`}>
                                {summary?.overallWinRate || 0}%
                            </p>
                            <p className="text-sm text-[var(--text-muted)] mt-1">Win Rate</p>
                            <p className="text-xs text-[var(--text-muted)]">{summary?.wins || 0} of {summary?.completedSignals || 0}</p>
                        </div>
                        <div className="card p-5 text-center">
                            <p className="text-3xl font-bold text-[var(--accent-green)]">
                                +{summary?.avgWinPct || 0}%
                            </p>
                            <p className="text-sm text-[var(--text-muted)] mt-1">Avg Win</p>
                            <p className="text-xs text-[var(--text-muted)]">per trade</p>
                        </div>
                        <div className="card p-5 text-center">
                            <p className="text-3xl font-bold text-[var(--accent-red)]">
                                -{summary?.avgLossPct || 0}%
                            </p>
                            <p className="text-sm text-[var(--text-muted)] mt-1">Avg Loss</p>
                            <p className="text-xs text-[var(--text-muted)]">per trade</p>
                        </div>
                        <div className="card p-5 text-center">
                            <p className={`text-3xl font-bold ${(summary?.totalPct || 0) > 0 ? 'text-[var(--accent-green)]' :
                                (summary?.totalPct || 0) < 0 ? 'text-[var(--accent-red)]' :
                                    'text-[var(--text-primary)]'
                                }`}>
                                {(summary?.totalPct || 0) >= 0 ? '+' : ''}{summary?.totalPct || 0}%
                            </p>
                            <p className="text-sm text-[var(--text-muted)] mt-1">Total Return</p>
                            <p className="text-xs text-[var(--text-muted)]">sum of trades</p>
                        </div>
                    </section>

                    {/* Score Distribution Chart */}
                    <section className="card p-6">
                        <h2 className="text-xl font-semibold mb-4">Score Distribution</h2>
                        <p className="text-sm text-[var(--text-secondary)] mb-6">
                            Win rates grouped by signal score. Higher scores should correlate with better outcomes.
                        </p>

                        <div className="space-y-4">
                            {bucketStats.map(bucket => (
                                <ScoreBucketRow key={bucket.range} bucket={bucket} />
                            ))}
                        </div>
                    </section>

                    {/* Cumulative Performance Chart */}
                    <section className="card p-6 overflow-hidden">
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-4">
                            <div>
                                <h2 className="text-xl font-semibold">Cumulative Performance</h2>
                                <p className="text-sm text-[var(--text-secondary)] mt-1">
                                    Sum of all trade returns. Assumes equal position sizes per trade.
                                </p>
                            </div>
                            {cumulativeReturns.length > 0 && (
                                <div className={`text-xl md:text-2xl font-bold px-4 py-2 rounded-lg w-fit ${(summary?.totalPct || 0) >= 0
                                    ? 'bg-[rgba(16,185,129,0.15)] text-[var(--accent-green)]'
                                    : 'bg-[rgba(239,68,68,0.15)] text-[var(--accent-red)]'}`}>
                                    {(summary?.totalPct || 0) >= 0 ? '+' : ''}{summary?.totalPct || 0}%
                                </div>
                            )}
                        </div>

                        {cumulativeReturns.length > 0 ? (
                            <CumulativeChart returns={cumulativeReturns} learningEvents={learningEvents} />
                        ) : (
                            <div className="h-64 flex items-center justify-center text-[var(--text-muted)] bg-[var(--bg-secondary)] rounded-lg">
                                <div className="text-center">
                                    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="mx-auto mb-3 opacity-50">
                                        <path d="M3 3v18h18" />
                                        <path d="M7 16l4-4 4 4 5-6" />
                                    </svg>
                                    <p>No completed signals yet</p>
                                    <p className="text-sm opacity-60 mt-1">Chart will appear once signals resolve</p>
                                </div>
                            </div>
                        )}
                    </section>

                    {/* Recent Outcomes Table */}
                    <section className="card p-6">
                        <h2 className="text-xl font-semibold mb-4">Recent Outcomes</h2>
                        <p className="text-sm text-[var(--text-secondary)] mb-6">
                            Last {recentOutcomes.length} completed signals with verified entry/exit prices.
                        </p>

                        {recentOutcomes.length > 0 ? (
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="border-b border-[var(--border-primary)]">
                                            <th className="text-left py-3 px-2 text-[var(--text-muted)] font-medium">Coin</th>
                                            <th className="text-left py-3 px-2 text-[var(--text-muted)] font-medium">Dir</th>
                                            <th className="text-center py-3 px-2 text-[var(--text-muted)] font-medium">Score</th>
                                            <th className="text-right py-3 px-2 text-[var(--text-muted)] font-medium">Entry</th>
                                            <th className="text-right py-3 px-2 text-[var(--text-muted)] font-medium">Exit</th>
                                            <th className="text-right py-3 px-2 text-[var(--text-muted)] font-medium">P/L</th>
                                            <th className="text-center py-3 px-2 text-[var(--text-muted)] font-medium">Result</th>
                                            <th className="text-left py-3 px-2 text-[var(--text-muted)] font-medium">Reason</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {recentOutcomes.map(outcome => (
                                            <tr key={outcome.id} className="border-b border-[var(--border-secondary)] hover:bg-[var(--bg-secondary)] transition-colors">
                                                <td className="py-3 px-2 font-medium">{outcome.coin}</td>
                                                <td className="py-3 px-2">
                                                    <span className={`text-xs font-semibold px-2 py-0.5 rounded ${outcome.direction === 'LONG' ? 'bg-[rgba(16,185,129,0.15)] text-[var(--accent-green)]' :
                                                        outcome.direction === 'SHORT' ? 'bg-[rgba(239,68,68,0.15)] text-[var(--accent-red)]' :
                                                            'bg-[rgba(100,116,139,0.15)] text-[var(--text-muted)]'
                                                        }`}>
                                                        {outcome.direction}
                                                    </span>
                                                </td>
                                                <td className="py-3 px-2 text-center">{outcome.score}</td>
                                                <td className="py-3 px-2 text-right font-mono text-xs">{formatPrice(outcome.entry_price)}</td>
                                                <td className="py-3 px-2 text-right font-mono text-xs">{formatPrice(outcome.exit_price)}</td>
                                                <td className={`py-3 px-2 text-right font-mono text-xs ${(outcome.profit_pct || 0) >= 0 ? 'text-[var(--accent-green)]' : 'text-[var(--accent-red)]'
                                                    }`}>
                                                    {(outcome.profit_pct || 0) >= 0 ? '+' : ''}{outcome.profit_pct?.toFixed(2) || '0'}%
                                                </td>
                                                <td className="py-3 px-2 text-center">
                                                    <span className={`text-xs font-semibold px-2 py-0.5 rounded ${outcome.outcome === 'WON' ? 'bg-[rgba(16,185,129,0.15)] text-[var(--accent-green)]' :
                                                        'bg-[rgba(239,68,68,0.15)] text-[var(--accent-red)]'
                                                        }`}>
                                                        {outcome.outcome}
                                                    </span>
                                                </td>
                                                <td className="py-3 px-2 text-[var(--text-muted)]">{outcome.exit_reason || '-'}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        ) : (
                            <div className="h-32 flex items-center justify-center text-[var(--text-muted)]">
                                No completed signals yet
                            </div>
                        )}
                    </section>

                    {/* Honest Disclaimers */}
                    <section className="card p-6">
                        <h2 className="text-xl font-semibold mb-4">Disclaimers</h2>
                        <ul className="space-y-3">
                            <li className="flex items-start gap-3">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="2" className="mt-1 flex-shrink-0">
                                    <circle cx="12" cy="12" r="10" />
                                    <line x1="12" y1="8" x2="12" y2="12" />
                                    <line x1="12" y1="16" x2="12.01" y2="16" />
                                </svg>
                                <span className="text-[var(--text-muted)]">
                                    Past performance does not guarantee future results. This is not financial advice.
                                </span>
                            </li>
                        </ul>
                    </section>

                    {/* Footer */}
                    <footer className="text-center text-sm text-[var(--text-muted)] py-8">
                        <p>
                            Data refreshes on page load. Last refreshed: {new Date().toLocaleTimeString()}
                        </p>
                    </footer>
                </div>
            </main>
        </>
    );
}

// ============================================================================
// SCORE BUCKET ROW COMPONENT
// ============================================================================

function ScoreBucketRow({ bucket }: { bucket: ScoreBucketStats }) {
    const total = bucket.wins + bucket.losses;
    const winPercent = total > 0 ? (bucket.wins / total) * 100 : 0;
    const hasData = total > 0;

    return (
        <div className="flex items-center gap-4">
            {/* Label */}
            <div className="w-16 text-sm font-medium text-[var(--text-primary)]">
                {bucket.range}
            </div>

            {/* Bar */}
            <div className="flex-1 h-8 bg-[var(--bg-tertiary)] rounded-lg overflow-hidden relative">
                {hasData ? (
                    <>
                        {/* Win portion */}
                        <div
                            className="absolute inset-y-0 left-0 bg-[var(--accent-green)] transition-all duration-500"
                            style={{ width: `${winPercent}%` }}
                        />
                        {/* Loss portion */}
                        <div
                            className="absolute inset-y-0 right-0 bg-[var(--accent-red)] transition-all duration-500"
                            style={{ width: `${100 - winPercent}%` }}
                        />
                    </>
                ) : (
                    <div className="absolute inset-0 flex items-center justify-center text-xs text-[var(--text-muted)]">
                        No data
                    </div>
                )}
            </div>

            {/* Stats */}
            <div className="w-32 text-right text-sm">
                {hasData ? (
                    <>
                        <span className="font-semibold text-[var(--text-primary)]">
                            {winPercent.toFixed(0)}%
                        </span>
                        <span className="text-[var(--text-muted)] ml-2">
                            ({bucket.wins}W/{bucket.losses}L)
                        </span>
                    </>
                ) : (
                    <span className="text-[var(--text-muted)]">—</span>
                )}
            </div>
        </div>
    )
}

// ============================================================================
// PREMIUM CUMULATIVE CHART COMPONENT
// ============================================================================

function CumulativeChart({ returns, learningEvents }: { returns: CumulativeReturn[]; learningEvents: LearningEvent[] }) {
    const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

    if (returns.length === 0) {
        return (
            <div className="h-64 flex items-center justify-center text-slate-500 bg-slate-900/50 rounded-xl border border-slate-800">
                No completed trades yet
            </div>
        );
    }

    // Smart price formatting for cheap coins
    const formatChartPrice = (price: number | undefined): string => {
        if (!price) return '-';
        if (price >= 1000) return `$${price.toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
        if (price >= 1) return `$${price.toFixed(2)}`;
        if (price >= 0.01) return `$${price.toFixed(4)}`;
        return `$${price.toFixed(6)}`;
    };

    // Chart dimensions
    const chartHeight = 280;

    // Calculate Y-axis range (percentage-based)
    const dataMax = Math.max(...returns.map(r => r.cumulativePct), 0);
    const dataMin = Math.min(...returns.map(r => r.cumulativePct), 0);
    const maxPct = Math.max(Math.ceil(dataMax / 10) * 10 + 10, 20);
    const minPct = Math.min(Math.floor(dataMin / 10) * 10 - 10, -20);
    const yRange = maxPct - minPct;

    const finalPct = returns[returns.length - 1]?.cumulativePct || 0;
    const isPositive = finalPct >= 0;

    // SVG coordinate helpers - left margin of 12 to avoid Y-axis overlap
    const chartLeft = 12;
    const chartRight = 98;
    const chartWidth = chartRight - chartLeft;
    const getX = (index: number) => returns.length === 1 ? (chartLeft + chartRight) / 2 : chartLeft + (index / (returns.length - 1)) * chartWidth;
    const getY = (pct: number) => 20 + ((maxPct - pct) / yRange) * (chartHeight - 60);
    const zeroY = getY(0);

    // Build points & paths
    const points = returns.map((r, i) => ({ x: getX(i), y: getY(r.cumulativePct), data: r }));
    const linePath = points.length > 1 ? `M ${points.map(p => `${p.x},${p.y}`).join(' L ')}` : '';
    const areaPath = points.length > 1 ? `${linePath} L ${points[points.length - 1].x},${zeroY} L ${points[0].x},${zeroY} Z` : '';

    const hoveredPoint = hoveredIndex !== null ? points[hoveredIndex] : null;

    // Y-axis ticks (percentage-based)
    const tickStep = yRange <= 50 ? 10 : yRange <= 100 ? 20 : 50;
    const yTicks: number[] = [];
    for (let i = minPct; i <= maxPct; i += tickStep) yTicks.push(i);
    if (!yTicks.includes(0)) yTicks.push(0);
    yTicks.sort((a, b) => b - a);

    // Compute learning event positions from the trade sequence itself
    // Place a marker at every 3rd consecutive loss for clean visual alignment
    const learningPositions: { x: number; streakLength: number }[] = [];
    let consecutiveLosses = 0;
    for (let i = 0; i < returns.length; i++) {
        if (returns[i].outcome === 'LOST') {
            consecutiveLosses++;
            if (consecutiveLosses >= 3 && consecutiveLosses % 3 === 0) {
                learningPositions.push({ x: getX(i), streakLength: consecutiveLosses });
            }
        } else {
            consecutiveLosses = 0;
        }
    }

    // Format date for display
    const formatDate = (dateStr: string) => {
        const d = new Date(dateStr);
        return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    };

    // Format duration
    const formatDuration = (hours: number) => {
        if (hours < 1) return `${Math.round(hours * 60)}m`;
        if (hours < 24) return `${hours.toFixed(1)}h`;
        const days = Math.floor(hours / 24);
        const remainingHours = Math.round(hours % 24);
        return remainingHours > 0 ? `${days}d ${remainingHours}h` : `${days}d`;
    };

    // Get X-axis dates (first, middle, last)
    const firstDate = returns.length > 0 ? formatDate(returns[0].closedAt) : '';
    const lastDate = returns.length > 0 ? formatDate(returns[returns.length - 1].closedAt) : '';

    return (
        <div className="relative">
            {/* Chart container - black background */}
            <div className="relative rounded-lg overflow-hidden bg-black" style={{ height: `${chartHeight}px` }}>

                {/* Y-axis labels - white text */}
                <div className="absolute left-2 top-0 h-full pointer-events-none z-10">
                    {yTicks.map(tick => (
                        <div
                            key={tick}
                            className="absolute text-[11px] text-white/70"
                            style={{ top: `${getY(tick)}px`, transform: 'translateY(-50%)' }}
                        >
                            {tick > 0 ? '+' : ''}{tick}%
                        </div>
                    ))}
                </div>

                {/* SVG Chart */}
                <svg viewBox={`0 0 100 ${chartHeight}`} preserveAspectRatio="none" className="w-full h-full" onMouseLeave={() => setHoveredIndex(null)}>
                    <defs>
                        <linearGradient id="cyanFill" x1="0%" y1="0%" x2="0%" y2="100%">
                            <stop offset="0%" stopColor="rgba(34, 211, 238, 0.25)" />
                            <stop offset="100%" stopColor="rgba(34, 211, 238, 0)" />
                        </linearGradient>
                        <linearGradient id="redFill" x1="0%" y1="100%" x2="0%" y2="0%">
                            <stop offset="0%" stopColor="rgba(239, 68, 68, 0.25)" />
                            <stop offset="100%" stopColor="rgba(239, 68, 68, 0)" />
                        </linearGradient>
                    </defs>

                    {/* Zero line */}
                    <line x1="8" y1={zeroY} x2="100" y2={zeroY} stroke="rgba(255,255,255,0.15)" strokeWidth="0.2" />

                    {/* Learning event markers */}
                    {learningPositions.map((lp, i) => (
                        <line key={`learn-${i}`} x1={lp.x} y1={20} x2={lp.x} y2={chartHeight - 40} stroke="rgba(168,85,247,0.4)" strokeWidth="0.3" />
                    ))}

                    {/* Main cumulative return line - white */}
                    {points.length > 1 && (
                        <path d={linePath} fill="none" stroke="#ffffff" strokeWidth="0.7" strokeLinecap="round" strokeLinejoin="round" />
                    )}

                    {/* Single point */}
                    {points.length === 1 && <circle cx={points[0].x} cy={points[0].y} r="2" fill={points[0].data.outcome === 'WON' ? '#22c55e' : '#ef4444'} />}



                    {/* Trade dots */}
                    {points.map((point, i) => (
                        <g key={i}>
                            <rect
                                x={returns.length === 1 ? 0 : point.x - 50 / returns.length}
                                y={0}
                                width={returns.length === 1 ? 100 : 100 / returns.length}
                                height={chartHeight}
                                fill="transparent"
                                onMouseEnter={() => setHoveredIndex(i)}
                                style={{ cursor: 'crosshair' }}
                            />
                            {points.length > 1 && (
                                <circle
                                    cx={point.x}
                                    cy={point.y}
                                    r={hoveredIndex === i ? 1.5 : 0.8}
                                    fill={point.data.outcome === 'WON' ? '#22c55e' : '#ef4444'}
                                />
                            )}
                        </g>
                    ))}

                    {/* Hover crosshair */}
                    {hoveredPoint && (
                        <line x1={hoveredPoint.x} y1={20} x2={hoveredPoint.x} y2={chartHeight - 40} stroke="rgba(255,255,255,0.2)" strokeWidth="0.15" />
                    )}
                </svg>

                {/* Enhanced Tooltip */}
                {hoveredPoint && (
                    <div className="absolute bottom-3 left-1/2 transform -translate-x-1/2 z-20">
                        <div className="bg-slate-800 border border-slate-700 rounded-lg px-4 py-2.5 shadow-xl text-sm">
                            {/* Row 1: Coin, Direction, Outcome */}
                            <div className="flex items-center gap-3 mb-2">
                                <span className="text-white font-medium">{hoveredPoint.data.coin}</span>
                                <span className={`text-xs px-1.5 py-0.5 rounded ${hoveredPoint.data.direction === 'LONG' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                                    {hoveredPoint.data.direction}
                                </span>
                                <span className={`px-2 py-0.5 rounded text-xs ${hoveredPoint.data.outcome === 'WON' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                                    {hoveredPoint.data.outcome}
                                </span>
                                <span className={`font-mono font-semibold ${hoveredPoint.data.profitPct > 0 ? 'text-green-400' : 'text-red-400'}`}>
                                    {hoveredPoint.data.profitPct > 0 ? '+' : ''}{hoveredPoint.data.profitPct.toFixed(2)}%
                                </span>
                            </div>
                            {/* Row 2: Entry, Exit, Duration, Date */}
                            <div className="flex items-center gap-4 text-xs text-slate-400">
                                <span>Entry: <span className="font-mono text-slate-300">{formatChartPrice(hoveredPoint.data.entryPrice)}</span></span>
                                <span>Exit: <span className="font-mono text-slate-300">{formatChartPrice(hoveredPoint.data.exitPrice)}</span></span>
                                <span>Duration: <span className="text-slate-300">{formatDuration(hoveredPoint.data.durationHours)}</span></span>
                                <span className="text-slate-500">{formatDate(hoveredPoint.data.closedAt)}</span>
                            </div>
                            {/* Row 3: Cumulative total */}
                            <div className="mt-2 pt-2 border-t border-slate-700 text-center">
                                <span className={`font-mono font-semibold ${hoveredPoint.data.cumulativePct >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                                    Cumulative: {hoveredPoint.data.cumulativePct >= 0 ? '+' : ''}{hoveredPoint.data.cumulativePct.toFixed(1)}%
                                </span>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* X-axis - black text */}
            <div className="flex justify-between mt-3 px-1 text-xs text-black">
                <span>{firstDate}</span>
                <span className="text-black/60">{returns.length} trades</span>
                <span>{lastDate}</span>
            </div>

            {/* Legend - black text */}
            <div className="flex items-center justify-center gap-8 mt-4 text-sm text-black">
                <div className="flex items-center gap-2">
                    <div className="w-5 h-0.5 bg-white rounded border border-black/20"></div>
                    <span>Cumulative Return</span>
                </div>
                <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-green-500"></div>
                    <span>Win</span>
                </div>
                <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-red-500"></div>
                    <span>Loss</span>
                </div>
                {learningPositions.length > 0 && (
                    <div className="flex items-center gap-2">
                        <div className="w-0.5 h-4 bg-purple-400"></div>
                        <span>Learning Event</span>
                    </div>
                )}
            </div>
        </div>
    );
}
