'use client';

import { useEffect, useState, useCallback } from 'react';
import Header from '@/components/Header';
import { getCurrentWeights, getLearningHistory, resetWeightsToDefault, LearningCycle } from '@/lib/engine/learning';
import { IndicatorWeights, DEFAULT_WEIGHTS } from '@/lib/engine/scoring';
import { useAuth } from '@/context/auth-context';
import { getUserSignals, getTrackingStats, DbSignal } from '@/lib/supabase';
import { supabase } from '@/lib/supabase';

interface TrackingStats {
    totalSignals: number;
    openSignals: number;
    wins: number;
    losses: number;
    winRate: number;
    avgProfit: number;
    avgLoss: number;
    consecutiveLosses: number;
}

export default function LearningPage() {
    const { user } = useAuth();
    const [weights, setWeights] = useState<IndicatorWeights>(DEFAULT_WEIGHTS);
    const [history, setHistory] = useState<LearningCycle[]>([]);
    const [signals, setSignals] = useState<DbSignal[]>([]);
    const [stats, setStats] = useState<TrackingStats | null>(null);
    const [mounted, setMounted] = useState(false);

    const loadData = useCallback(async () => {
        if (!user) return;

        try {
            const [userSignals, userStats] = await Promise.all([
                getUserSignals(user.id),
                getTrackingStats(user.id)
            ]);
            setSignals(userSignals);
            setStats(userStats);
        } catch (error) {
            console.error('Failed to load learning data:', error);
        }
    }, [user]);

    useEffect(() => {
        setMounted(true);
        setWeights(getCurrentWeights());
        setHistory(getLearningHistory());
    }, []);

    useEffect(() => {
        if (mounted && user) {
            loadData();
        }
    }, [mounted, user, loadData]);

    const handleReset = () => {
        if (confirm('Reset all weights to defaults? This cannot be undone.')) {
            resetWeightsToDefault();
            setWeights(getCurrentWeights());
            setHistory(getLearningHistory());
        }
    };

    const handleClearHistory = async () => {
        if (!user) return;
        if (confirm('Clear all signal history? This cannot be undone.')) {
            try {
                // Delete all signals for this user from Supabase
                await supabase
                    .from('signals')
                    .delete()
                    .eq('user_id', user.id);

                setSignals([]);
                setStats({
                    totalSignals: 0,
                    openSignals: 0,
                    wins: 0,
                    losses: 0,
                    winRate: 0,
                    avgProfit: 0,
                    avgLoss: 0,
                    consecutiveLosses: 0,
                });
            } catch (error) {
                console.error('Failed to clear history:', error);
            }
        }
    };

    if (!mounted) {
        return (
            <>
                <Header />
                <main className="pt-28 pb-20 px-6 lg:px-12">
                    <div className="max-w-6xl mx-auto">
                        <div className="animate-pulse">Loading...</div>
                    </div>
                </main>
            </>
        );
    }

    // Calculate weight changes from defaults
    const weightChanges = Object.entries(weights).map(([key, value]) => ({
        indicator: key,
        current: value,
        default: DEFAULT_WEIGHTS[key as keyof IndicatorWeights],
        change: value - DEFAULT_WEIGHTS[key as keyof IndicatorWeights],
        changePercent: ((value - DEFAULT_WEIGHTS[key as keyof IndicatorWeights]) / DEFAULT_WEIGHTS[key as keyof IndicatorWeights] * 100).toFixed(1),
    }));

    return (
        <>
            <Header />
            <main className="pt-28 pb-20 px-6 lg:px-12">
                <div className="max-w-6xl mx-auto">
                    {/* Header */}
                    <div className="card p-6 mb-12">
                        <h1 className="text-3xl font-semibold text-slate-700 mb-2">
                            Learning System
                        </h1>
                        <p className="text-base text-slate-500">
                            View the self-learning engine&apos;s weight adjustments, signal history, and learning events.
                        </p>
                    </div>

                    {/* Stats Grid */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-12">
                        <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm">
                            <div className="text-3xl font-bold text-slate-900">{stats?.totalSignals || 0}</div>
                            <div className="text-slate-600">Total Signals</div>
                        </div>
                        <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm">
                            <div className="text-3xl font-bold text-emerald-600">{stats?.wins || 0}</div>
                            <div className="text-slate-600">Wins (Hit TP)</div>
                        </div>
                        <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm">
                            <div className="text-3xl font-bold text-red-600">{stats?.losses || 0}</div>
                            <div className="text-slate-600">Losses (Hit SL)</div>
                        </div>
                        <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm">
                            <div className="text-3xl font-bold text-cyan-600">{stats?.winRate.toFixed(1) || '0'}%</div>
                            <div className="text-slate-600">Win Rate</div>
                        </div>
                    </div>

                    {/* Two Column Layout */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                        {/* Current Weights */}
                        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                            <div className="px-6 py-4 border-b border-slate-200 flex justify-between items-center">
                                <h2 className="text-xl font-bold text-slate-900">Current Weights</h2>
                                <button
                                    onClick={handleReset}
                                    className="text-sm text-red-600 hover:text-red-700 font-medium"
                                >
                                    Reset to Defaults
                                </button>
                            </div>
                            <div className="divide-y divide-slate-100">
                                {weightChanges.map(w => (
                                    <div key={w.indicator} className="px-6 py-3 flex justify-between items-center">
                                        <div>
                                            <span className="font-medium text-slate-900">{w.indicator}</span>
                                            <span className="text-slate-500 ml-2">
                                                (default: {w.default})
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <span className="text-lg font-bold text-slate-900">{w.current}</span>
                                            {w.change !== 0 && (
                                                <span className={`text-sm font-medium ${w.change > 0 ? 'text-emerald-600' : 'text-red-600'
                                                    }`}>
                                                    {w.change > 0 ? '+' : ''}{w.changePercent}%
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Learning Events */}
                        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                            <div className="px-6 py-4 border-b border-slate-200">
                                <h2 className="text-xl font-bold text-slate-900">Learning Events</h2>
                                <p className="text-sm text-slate-500">
                                    Weight adjustments triggered by consecutive losses
                                </p>
                            </div>
                            {history.length === 0 ? (
                                <div className="px-6 py-12 text-center text-slate-500">
                                    <div className="text-4xl mb-3">🧠</div>
                                    <p>No learning events yet.</p>
                                    <p className="text-sm mt-2">
                                        The engine learns after 3 consecutive losses.
                                    </p>
                                </div>
                            ) : (
                                <div className="divide-y divide-slate-100 max-h-96 overflow-y-auto">
                                    {history.slice().reverse().map(event => (
                                        <div key={event.id} className="px-6 py-4">
                                            <div className="flex justify-between items-start mb-2">
                                                <span className="text-sm font-medium text-cyan-600">
                                                    {event.triggeredBy.replace('_', ' ')}
                                                </span>
                                                <span className="text-xs text-slate-500">
                                                    {new Date(event.timestamp).toLocaleString()}
                                                </span>
                                            </div>
                                            <div className="text-sm text-slate-600 mb-2">
                                                Analyzed {event.signalsAnalyzed} signals •
                                                {event.consecutiveLosses} consecutive losses
                                            </div>
                                            {event.adjustments.length > 0 && (
                                                <div className="mt-2 space-y-1">
                                                    {event.adjustments.map((adj, i) => (
                                                        <div key={i} className="text-xs bg-slate-50 rounded px-2 py-1">
                                                            <span className="font-medium">{adj.indicator}</span>:
                                                            {adj.oldWeight} → {adj.newWeight}
                                                            <span className={adj.changePercent < 0 ? 'text-red-600' : 'text-emerald-600'}>
                                                                {' '}({adj.changePercent > 0 ? '+' : ''}{adj.changePercent.toFixed(0)}%)
                                                            </span>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Signal History */}
                    <div className="mt-8 bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                        <div className="px-6 py-4 border-b border-slate-200 flex justify-between items-center">
                            <div>
                                <h2 className="text-xl font-bold text-slate-900">Signal History</h2>
                                <p className="text-sm text-slate-500">Recent signals generated by the engine</p>
                            </div>
                            <button
                                onClick={handleClearHistory}
                                className="text-sm text-red-600 hover:text-red-700 font-medium"
                            >
                                Clear History
                            </button>
                        </div>
                        {signals.length === 0 ? (
                            <div className="px-6 py-12 text-center text-slate-500">
                                <div className="text-4xl mb-3">📊</div>
                                <p>No signal history yet.</p>
                                <p className="text-sm mt-2">
                                    Signals will appear here as they are generated.
                                </p>
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead className="bg-slate-50 text-left">
                                        <tr>
                                            <th className="px-4 py-3 font-medium text-slate-600">Coin</th>
                                            <th className="px-4 py-3 font-medium text-slate-600">Direction</th>
                                            <th className="px-4 py-3 font-medium text-slate-600">Score</th>
                                            <th className="px-4 py-3 font-medium text-slate-600">Entry</th>
                                            <th className="px-4 py-3 font-medium text-slate-600">SL</th>
                                            <th className="px-4 py-3 font-medium text-slate-600">TP</th>
                                            <th className="px-4 py-3 font-medium text-slate-600">Outcome</th>
                                            <th className="px-4 py-3 font-medium text-slate-600">Time</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {signals.slice(0, 50).map(record => (
                                            <tr key={record.id} className="hover:bg-slate-50">
                                                <td className="px-4 py-3 font-medium">{record.coin}</td>
                                                <td className="px-4 py-3">
                                                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${record.direction === 'LONG'
                                                        ? 'bg-emerald-100 text-emerald-700'
                                                        : record.direction === 'SHORT'
                                                            ? 'bg-red-100 text-red-700'
                                                            : 'bg-slate-100 text-slate-700'
                                                        }`}>
                                                        {record.direction}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3">{record.score}</td>
                                                <td className="px-4 py-3">${record.entry_price.toLocaleString()}</td>
                                                <td className="px-4 py-3 text-red-600">${record.stop_loss.toLocaleString()}</td>
                                                <td className="px-4 py-3 text-emerald-600">${record.take_profit.toLocaleString()}</td>
                                                <td className="px-4 py-3">
                                                    {record.outcome === 'PENDING' ? (
                                                        <span className="text-slate-400">Pending</span>
                                                    ) : (
                                                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${record.outcome === 'WON'
                                                            ? 'bg-emerald-100 text-emerald-700'
                                                            : 'bg-red-100 text-red-700'
                                                            }`}>
                                                            {record.outcome}
                                                        </span>
                                                    )}
                                                </td>
                                                <td className="px-4 py-3 text-slate-500 text-xs">
                                                    {new Date(record.created_at).toLocaleString()}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>

                    {/* Info Box */}
                    <div className="mt-8 bg-cyan-50 border border-cyan-200 rounded-xl p-6">
                        <h3 className="font-bold text-cyan-800 mb-2">How the Learning System Works</h3>
                        <ul className="text-cyan-700 space-y-2 text-sm">
                            <li>• <strong>Trigger:</strong> 3 consecutive losing trades activates a learning cycle</li>
                            <li>• <strong>Analysis:</strong> Identifies which indicators were &quot;confidently wrong&quot;</li>
                            <li>• <strong>Adjustment:</strong> Reduces weight of problematic indicators (max 10% per cycle)</li>
                            <li>• <strong>Bounds:</strong> Weights stay between 1-20 points, no indicator is ever disabled</li>
                        </ul>
                    </div>
                </div>
            </main>
        </>
    );
}
