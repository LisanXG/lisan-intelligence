'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

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
// PAGE COMPONENT
// ============================================================================

export default function ProofPage() {
    const [bucketStats, setBucketStats] = useState<ScoreBucketStats[]>([]);
    const [summary, setSummary] = useState<PerformanceSummary | null>(null);
    const [recentOutcomes, setRecentOutcomes] = useState<RecentOutcome[]>([]);
    const [cumulativeReturns, setCumulativeReturns] = useState<CumulativeReturn[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

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
        <main className="min-h-screen p-6 md:p-8">
            <div className="max-w-6xl mx-auto space-y-8">

                {/* Header */}
                <header className="card p-6 space-y-4">
                    <Link
                        href="/"
                        className="inline-flex items-center gap-2 text-sm text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
                    >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M19 12H5M12 19l-7-7 7-7" />
                        </svg>
                        Back to Dashboard
                    </Link>

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
                        <p className="text-3xl font-bold text-[var(--text-primary)]">{summary?.totalSignals || 0}</p>
                        <p className="text-sm text-[var(--text-muted)] mt-1">Total Signals</p>
                    </div>
                    <div className="card p-5 text-center">
                        <p className="text-3xl font-bold text-[var(--text-primary)]">{summary?.completedSignals || 0}</p>
                        <p className="text-sm text-[var(--text-muted)] mt-1">Completed</p>
                    </div>
                    <div className="card p-5 text-center">
                        <p className={`text-3xl font-bold ${(summary?.overallWinRate || 0) >= 55 ? 'text-[var(--accent-green)]' :
                            (summary?.overallWinRate || 0) >= 45 ? 'text-[var(--accent-orange)]' :
                                'text-[var(--accent-red)]'
                            }`}>
                            {summary?.overallWinRate || 0}%
                        </p>
                        <p className="text-sm text-[var(--text-muted)] mt-1">Win Rate</p>
                    </div>
                    <div className="card p-5 text-center">
                        <p className={`text-3xl font-bold ${(summary?.totalR || 0) > 0 ? 'text-[var(--accent-green)]' :
                            (summary?.totalR || 0) < 0 ? 'text-[var(--accent-red)]' :
                                'text-[var(--text-primary)]'
                            }`}>
                            {(summary?.totalR || 0) >= 0 ? '+' : ''}{summary?.totalR || 0}R
                        </p>
                        <p className="text-sm text-[var(--text-muted)] mt-1">Total Return</p>
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
                                Running total of risk-adjusted returns. Each win = +1R, each loss = -1R.
                            </p>
                        </div>
                        {cumulativeReturns.length > 0 && (
                            <div className={`text-xl md:text-2xl font-bold px-4 py-2 rounded-lg w-fit ${(summary?.totalR || 0) >= 0
                                ? 'bg-[rgba(16,185,129,0.15)] text-[var(--accent-green)]'
                                : 'bg-[rgba(239,68,68,0.15)] text-[var(--accent-red)]'}`}>
                                {(summary?.totalR || 0) >= 0 ? '+' : ''}{summary?.totalR || 0}R
                            </div>
                        )}
                    </div>

                    {cumulativeReturns.length > 0 ? (
                        <CumulativeChart returns={cumulativeReturns} />
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
                                            <td className="py-3 px-2 text-right font-mono text-xs">${outcome.entry_price?.toLocaleString()}</td>
                                            <td className="py-3 px-2 text-right font-mono text-xs">${outcome.exit_price?.toLocaleString() || '-'}</td>
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

function CumulativeChart({ returns }: { returns: CumulativeReturn[] }) {
    const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

    if (returns.length === 0) {
        return (
            <div className="h-64 flex items-center justify-center text-slate-500 bg-slate-900/50 rounded-xl border border-slate-800">
                No completed trades yet
            </div>
        );
    }

    // Chart dimensions
    const chartHeight = 280;

    // Calculate Y-axis range (minimum ±5R)
    const dataMax = Math.max(...returns.map(r => r.cumulativeR), 0);
    const dataMin = Math.min(...returns.map(r => r.cumulativeR), 0);
    const maxR = Math.max(Math.ceil(dataMax + 1), 5);
    const minR = Math.min(Math.floor(dataMin - 1), -5);
    const yRange = maxR - minR;

    const finalR = returns[returns.length - 1]?.cumulativeR || 0;
    const isPositive = finalR >= 0;

    // SVG coordinate helpers
    const getX = (index: number) => returns.length === 1 ? 50 : (index / (returns.length - 1)) * 100;
    const getY = (r: number) => 20 + ((maxR - r) / yRange) * (chartHeight - 60);
    const zeroY = getY(0);

    // Build points & paths
    const points = returns.map((r, i) => ({ x: getX(i), y: getY(r.cumulativeR), data: r }));
    const linePath = points.length > 1 ? `M ${points.map(p => `${p.x},${p.y}`).join(' L ')}` : '';
    const areaPath = points.length > 1 ? `${linePath} L ${points[points.length - 1].x},${zeroY} L ${points[0].x},${zeroY} Z` : '';

    const hoveredPoint = hoveredIndex !== null ? points[hoveredIndex] : null;

    // Y-axis ticks
    const tickStep = yRange <= 10 ? 2 : 5;
    const yTicks = [];
    for (let i = minR; i <= maxR; i += tickStep) yTicks.push(i);
    if (!yTicks.includes(0)) yTicks.push(0);
    yTicks.sort((a, b) => b - a);

    return (
        <div className="relative">
            {/* Clean dark container */}
            <div className="relative rounded-xl overflow-hidden bg-[#0d1117] border border-slate-800" style={{ height: `${chartHeight}px` }}>

                {/* Y-axis labels - left side */}
                <div className="absolute left-2 top-0 h-full pointer-events-none z-10">
                    {yTicks.map(tick => (
                        <div
                            key={tick}
                            className={`absolute text-xs font-mono ${tick > 0 ? 'text-green-500' : tick < 0 ? 'text-red-500' : 'text-slate-500'}`}
                            style={{ top: `${getY(tick)}px`, transform: 'translateY(-50%)' }}
                        >
                            {tick > 0 ? '+' : ''}{tick}R
                        </div>
                    ))}
                </div>

                {/* Total PNL badge - top right */}
                <div className="absolute top-3 right-3 z-10">
                    <div className={`px-3 py-1.5 rounded-lg font-mono text-lg font-bold ${isPositive ? 'text-green-400 bg-green-500/10 border border-green-500/20' : 'text-red-400 bg-red-500/10 border border-red-500/20'}`}>
                        {finalR >= 0 ? '+' : ''}{finalR.toFixed(1)}R
                    </div>
                </div>

                {/* SVG Chart */}
                <svg viewBox={`0 0 100 ${chartHeight}`} preserveAspectRatio="none" className="w-full h-full" onMouseLeave={() => setHoveredIndex(null)}>
                    <defs>
                        <linearGradient id="greenFill" x1="0%" y1="0%" x2="0%" y2="100%">
                            <stop offset="0%" stopColor="rgba(34, 197, 94, 0.25)" />
                            <stop offset="100%" stopColor="rgba(34, 197, 94, 0)" />
                        </linearGradient>
                        <linearGradient id="redFill" x1="0%" y1="100%" x2="0%" y2="0%">
                            <stop offset="0%" stopColor="rgba(239, 68, 68, 0.25)" />
                            <stop offset="100%" stopColor="rgba(239, 68, 68, 0)" />
                        </linearGradient>
                    </defs>

                    {/* Zero line */}
                    <line x1="8" y1={zeroY} x2="100" y2={zeroY} stroke="rgba(255,255,255,0.08)" strokeWidth="0.3" />

                    {/* Area fill */}
                    {points.length > 1 && <path d={areaPath} fill={isPositive ? 'url(#greenFill)' : 'url(#redFill)'} />}

                    {/* Main line */}
                    {points.length > 1 && (
                        <path d={linePath} fill="none" stroke={isPositive ? '#22c55e' : '#ef4444'} strokeWidth="0.6" strokeLinecap="round" strokeLinejoin="round" />
                    )}

                    {/* Single point */}
                    {points.length === 1 && <circle cx={points[0].x} cy={points[0].y} r="2" fill={points[0].data.outcome === 'WON' ? '#22c55e' : '#ef4444'} />}

                    {/* Hover zones with visible dots */}
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
                            {/* Always show small dots */}
                            {points.length > 1 && (
                                <circle
                                    cx={point.x}
                                    cy={point.y}
                                    r={hoveredIndex === i ? 1.5 : 0.8}
                                    fill={point.data.outcome === 'WON' ? '#22c55e' : '#ef4444'}
                                    opacity={hoveredIndex === i ? 1 : 0.5}
                                />
                            )}
                        </g>
                    ))}

                    {/* Hover crosshair */}
                    {hoveredPoint && (
                        <line x1={hoveredPoint.x} y1={20} x2={hoveredPoint.x} y2={chartHeight - 40} stroke="rgba(255,255,255,0.2)" strokeWidth="0.15" />
                    )}
                </svg>

                {/* Tooltip - anchored at bottom center */}
                {hoveredPoint && (
                    <div className="absolute bottom-3 left-1/2 transform -translate-x-1/2 z-20">
                        <div className="bg-slate-800 border border-slate-700 rounded-lg px-4 py-2 shadow-xl flex items-center gap-4 text-sm whitespace-nowrap">
                            <span className="text-white font-medium">{hoveredPoint.data.coin}</span>
                            <span className={`px-2 py-0.5 rounded text-xs ${hoveredPoint.data.outcome === 'WON' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                                {hoveredPoint.data.outcome}
                            </span>
                            <span className={`font-mono font-semibold ${hoveredPoint.data.rValue > 0 ? 'text-green-400' : 'text-red-400'}`}>
                                {hoveredPoint.data.rValue > 0 ? '+' : ''}{hoveredPoint.data.rValue}R
                            </span>
                            <span className="text-slate-500">|</span>
                            <span className={`font-mono ${hoveredPoint.data.cumulativeR >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                                Total: {hoveredPoint.data.cumulativeR >= 0 ? '+' : ''}{hoveredPoint.data.cumulativeR.toFixed(1)}R
                            </span>
                        </div>
                    </div>
                )}
            </div>

            {/* X-axis */}
            <div className="flex justify-between mt-2 px-1 text-xs text-slate-500">
                <span>First</span>
                <span>{returns.length} trade{returns.length !== 1 ? 's' : ''}</span>
                <span>Latest</span>
            </div>
        </div>
    );
}
