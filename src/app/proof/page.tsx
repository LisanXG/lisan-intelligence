'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
    getScoreBucketStats,
    getCumulativeReturns,
    getPerformanceSummary,
    getRecentOutcomes,
    getFailureModes,
    ScoreBucketStats,
    CumulativeReturn,
    PerformanceSummary,
    RecentOutcome,
} from '@/lib/engine/stats';

// ============================================================================
// PAGE COMPONENT
// ============================================================================

export default function ProofPage() {
    const [bucketStats, setBucketStats] = useState<ScoreBucketStats[]>([]);
    const [cumulativeReturns, setCumulativeReturns] = useState<CumulativeReturn[]>([]);
    const [summary, setSummary] = useState<PerformanceSummary | null>(null);
    const [recentOutcomes, setRecentOutcomes] = useState<RecentOutcome[]>([]);
    const [failureModes, setFailureModes] = useState<string[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        // Load all stats on mount
        setBucketStats(getScoreBucketStats());
        setCumulativeReturns(getCumulativeReturns());
        setSummary(getPerformanceSummary());
        setRecentOutcomes(getRecentOutcomes(15));
        setFailureModes(getFailureModes());
        setIsLoading(false);
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
                        <p className="text-3xl font-bold text-[var(--text-primary)]">{summary?.daysLive || 0}</p>
                        <p className="text-sm text-[var(--text-muted)] mt-1">Days Live</p>
                    </div>
                    <div className="card p-5 text-center">
                        <p className="text-3xl font-bold text-[var(--text-primary)]">{summary?.completedSignals || 0}</p>
                        <p className="text-sm text-[var(--text-muted)] mt-1">Completed Signals</p>
                    </div>
                    <div className="card p-5 text-center">
                        <p className={`text-3xl font-bold ${(summary?.overallWinRate || 0) >= 55 ? 'text-[var(--accent-green)]' :
                            (summary?.overallWinRate || 0) >= 45 ? 'text-[var(--accent-orange)]' :
                                'text-[var(--accent-red)]'
                            }`}>
                            {summary?.overallWinRate?.toFixed(1) || '0.0'}%
                        </p>
                        <p className="text-sm text-[var(--text-muted)] mt-1">Win Rate</p>
                    </div>
                    <div className="card p-5 text-center">
                        <p className={`text-3xl font-bold ${(summary?.totalR || 0) > 0 ? 'text-[var(--accent-green)]' :
                            (summary?.totalR || 0) < 0 ? 'text-[var(--accent-red)]' :
                                'text-[var(--text-primary)]'
                            }`}>
                            {(summary?.totalR || 0) >= 0 ? '+' : ''}{summary?.totalR?.toFixed(1) || '0.0'}R
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
                <section className="card p-6">
                    <h2 className="text-xl font-semibold mb-4">Cumulative Performance</h2>
                    <p className="text-sm text-[var(--text-secondary)] mb-6">
                        Running total of risk-adjusted returns (R). Each win = +1R (or actual R:R), each loss = -1R.
                    </p>

                    {cumulativeReturns.length > 0 ? (
                        <CumulativeChart returns={cumulativeReturns} />
                    ) : (
                        <div className="h-48 flex items-center justify-center text-[var(--text-muted)]">
                            No completed signals yet
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
                                            <td className="py-3 px-2 text-right font-mono text-xs">${outcome.entryPrice.toLocaleString()}</td>
                                            <td className="py-3 px-2 text-right font-mono text-xs">${outcome.exitPrice.toLocaleString()}</td>
                                            <td className={`py-3 px-2 text-right font-mono text-xs ${outcome.profitPct >= 0 ? 'text-[var(--accent-green)]' : 'text-[var(--accent-red)]'
                                                }`}>
                                                {outcome.profitPct >= 0 ? '+' : ''}{outcome.profitPct}%
                                            </td>
                                            <td className="py-3 px-2 text-center">
                                                <span className={`text-xs font-semibold px-2 py-0.5 rounded ${outcome.outcome === 'WIN' ? 'bg-[rgba(16,185,129,0.15)] text-[var(--accent-green)]' :
                                                    'bg-[rgba(239,68,68,0.15)] text-[var(--accent-red)]'
                                                    }`}>
                                                    {outcome.outcome}
                                                </span>
                                            </td>
                                            <td className="py-3 px-2 text-[var(--text-muted)]">{outcome.exitReason}</td>
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
                    <h2 className="text-xl font-semibold mb-4">Known Limitations</h2>
                    <p className="text-sm text-[var(--text-secondary)] mb-6">
                        Every system has failure modes. Here&apos;s where this one struggles:
                    </p>

                    <ul className="space-y-3">
                        {failureModes.map((mode, i) => (
                            <li key={i} className="flex items-start gap-3">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--accent-orange)" strokeWidth="2" className="mt-1 flex-shrink-0">
                                    <circle cx="12" cy="12" r="10" />
                                    <line x1="12" y1="8" x2="12" y2="12" />
                                    <line x1="12" y1="16" x2="12.01" y2="16" />
                                </svg>
                                <span className="text-[var(--text-secondary)]">{mode}</span>
                            </li>
                        ))}
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
                        Data updates in real-time via WebSocket. Last refreshed: {new Date().toLocaleTimeString()}
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
    );
}

// ============================================================================
// CUMULATIVE CHART COMPONENT
// ============================================================================

function CumulativeChart({ returns }: { returns: CumulativeReturn[] }) {
    if (returns.length === 0) return null;

    const maxR = Math.max(...returns.map(r => r.cumulativeR), 0);
    const minR = Math.min(...returns.map(r => r.cumulativeR), 0);
    const range = Math.max(maxR - minR, 1);
    const height = 200;
    const width = 100; // percentage

    // Create SVG path
    const points = returns.map((r, i) => {
        const x = (i / (returns.length - 1 || 1)) * width;
        const y = height - ((r.cumulativeR - minR) / range) * height;
        return `${x},${y}`;
    });
    const pathD = `M ${points.join(' L ')}`;

    // Zero line position
    const zeroY = height - ((0 - minR) / range) * height;

    return (
        <div className="relative h-52">
            <svg
                viewBox={`0 0 ${width} ${height}`}
                preserveAspectRatio="none"
                className="w-full h-full"
            >
                {/* Zero line */}
                <line
                    x1="0" y1={zeroY}
                    x2={width} y2={zeroY}
                    stroke="var(--border-primary)"
                    strokeWidth="0.5"
                    strokeDasharray="2,2"
                />

                {/* Performance line */}
                <path
                    d={pathD}
                    fill="none"
                    stroke={returns[returns.length - 1].cumulativeR >= 0 ? 'var(--accent-green)' : 'var(--accent-red)'}
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                />

                {/* End dot */}
                <circle
                    cx={width}
                    cy={height - ((returns[returns.length - 1].cumulativeR - minR) / range) * height}
                    r="2"
                    fill={returns[returns.length - 1].cumulativeR >= 0 ? 'var(--accent-green)' : 'var(--accent-red)'}
                />
            </svg>

            {/* Y-axis labels */}
            <div className="absolute left-0 top-0 h-full flex flex-col justify-between text-xs text-[var(--text-muted)] -ml-8 w-8 text-right">
                <span>{maxR.toFixed(1)}R</span>
                <span>0R</span>
                <span>{minR.toFixed(1)}R</span>
            </div>

            {/* X-axis label */}
            <div className="absolute bottom-0 left-0 right-0 text-center text-xs text-[var(--text-muted)] -mb-6">
                Signal # (oldest → newest)
            </div>
        </div>
    );
}
