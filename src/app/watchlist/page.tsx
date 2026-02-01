'use client';

import { useEffect, useState, useCallback } from 'react';
import Header from '@/components/Header';
import Link from 'next/link';
import { SignalOutput } from '@/lib/engine';
import {
    requestNotificationPermission,
    areNotificationsEnabled,
    checkForSignalChanges,
    saveSignalStates
} from '@/lib/alerts';
import { useAuth } from '@/context/auth-context';
import {
    getWatchlist as getWatchlistFromDb,
    removeFromWatchlist,
    DbWatchlistItem
} from '@/lib/supabase';

interface EngineSignal extends SignalOutput {
    name: string;
    image: string;
    sparkline?: number[];
}

interface WatchedSignal extends EngineSignal {
    priceAtAdd: number;
    addedAt: string;
    priceChange: number;
    priceChangePercent: number;
}

export default function WatchlistPage() {
    const { user } = useAuth();
    const [watchlist, setWatchlist] = useState<DbWatchlistItem[]>([]);
    const [signals, setSignals] = useState<WatchedSignal[]>([]);
    const [loading, setLoading] = useState(true);
    const [alertsEnabled, setAlertsEnabled] = useState(false);

    // Check notification permission on mount
    useEffect(() => {
        setAlertsEnabled(areNotificationsEnabled());
    }, []);

    // Load watchlist and fetch matching signals
    const loadData = useCallback(async () => {
        if (!user) return;

        setLoading(true);

        try {
            const list = await getWatchlistFromDb(user.id);
            setWatchlist(list);

            if (list.length === 0) {
                setSignals([]);
                setLoading(false);
                return;
            }

            const res = await fetch('/api/engine-signals');
            const data = await res.json();
            const allSignals = data.signals || [];

            // Check for signal changes and trigger alerts
            if (areNotificationsEnabled()) {
                const watchlistCoins = list.map(item => item.coin);
                const newStates = checkForSignalChanges(allSignals, watchlistCoins);
                saveSignalStates(newStates);
            }

            // Filter to watchlisted coins with price change data
            const watchlistCoins = new Set(list.map(item => item.coin));
            const filtered = allSignals
                .filter((s: EngineSignal) => watchlistCoins.has(s.coin))
                .map((s: EngineSignal) => {
                    const watchItem = list.find(w => w.coin === s.coin);
                    const priceAtAdd = watchItem?.price_at_add || s.entryPrice;
                    const priceChange = s.entryPrice - priceAtAdd;
                    const priceChangePercent = priceAtAdd > 0 ? (priceChange / priceAtAdd) * 100 : 0;

                    return {
                        ...s,
                        priceAtAdd,
                        addedAt: watchItem?.added_at || new Date().toISOString(),
                        priceChange,
                        priceChangePercent
                    };
                });

            setSignals(filtered);
        } catch (error) {
            console.error('Failed to fetch signals:', error);
        }

        setLoading(false);
    }, [user]);

    useEffect(() => {
        loadData();
        // Auto-refresh every 5 minutes for alert checking
        const interval = setInterval(loadData, 300000);
        return () => clearInterval(interval);
    }, [loadData]);

    // Handle enabling alerts
    const handleEnableAlerts = async () => {
        const granted = await requestNotificationPermission();
        setAlertsEnabled(granted);
        if (granted) {
            // Save current states as baseline
            const states = signals.map(s => ({
                coin: s.coin,
                direction: s.direction,
                score: s.score,
                checkedAt: new Date().toISOString()
            }));
            saveSignalStates(states);
        }
    };

    // Handle watchlist removal
    const handleRemove = async (coin: string) => {
        if (!user) return;
        await removeFromWatchlist(user.id, coin);
        loadData();
    };

    // Calculate aggregate stats
    const stats = {
        total: signals.length,
        long: signals.filter(s => s.direction === 'LONG').length,
        short: signals.filter(s => s.direction === 'SHORT').length,
        hold: signals.filter(s => s.direction === 'HOLD').length,
        avgScore: signals.length > 0
            ? Math.round(signals.reduce((sum, s) => sum + s.score, 0) / signals.length)
            : 0
    };

    // Format helpers
    const formatPrice = (price: number) => {
        if (price >= 1000) return `$${(price / 1000).toFixed(2)}K`;
        if (price >= 1) return `$${price.toFixed(2)}`;
        return `$${price.toFixed(4)}`;
    };

    const formatDate = (dateStr: string) => {
        const date = new Date(dateStr);
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    };

    return (
        <>
            <Header />
            <main className="pt-32 pb-16 px-8 lg:px-16 xl:px-20 max-w-[1600px] mx-auto">
                {/* Page Title with Alerts Toggle */}
                <div className="card p-6 mb-8">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div>
                            <h1 className="text-3xl font-semibold mb-2 text-slate-700">Watchlist</h1>
                            <p className="text-slate-500 text-base">
                                {watchlist.length > 0
                                    ? `Tracking ${watchlist.length} asset${watchlist.length > 1 ? 's' : ''}`
                                    : 'Track your favorite assets and receive signal updates'
                                }
                            </p>
                        </div>

                        {/* Alerts Toggle Button */}
                        {watchlist.length > 0 && (
                            <button
                                onClick={handleEnableAlerts}
                                className={`inline-flex items-center gap-2 px-5 py-3 rounded-xl font-semibold transition-all ${alertsEnabled
                                    ? 'bg-emerald-100 text-emerald-700 cursor-default'
                                    : 'bg-amber-100 text-amber-700 hover:bg-amber-200'
                                    }`}
                            >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                                </svg>
                                {alertsEnabled ? 'Alerts Enabled' : 'Enable Alerts'}
                            </button>
                        )}
                    </div>
                </div>

                {/* Aggregate Stats */}
                {!loading && signals.length > 0 && (
                    <div className="card p-6 mb-8 bg-gradient-to-r from-slate-50 to-white">
                        <div className="grid grid-cols-2 md:grid-cols-5 gap-6">
                            <div className="text-center">
                                <div className="text-3xl font-bold text-slate-800">{stats.total}</div>
                                <div className="text-sm text-slate-500">Assets</div>
                            </div>
                            <div className="text-center">
                                <div className="text-3xl font-bold text-emerald-600">{stats.long}</div>
                                <div className="text-sm text-slate-500">LONG</div>
                            </div>
                            <div className="text-center">
                                <div className="text-3xl font-bold text-red-500">{stats.short}</div>
                                <div className="text-sm text-slate-500">SHORT</div>
                            </div>
                            <div className="text-center">
                                <div className="text-3xl font-bold text-slate-400">{stats.hold}</div>
                                <div className="text-sm text-slate-500">HOLD</div>
                            </div>
                            <div className="text-center">
                                <div className="text-3xl font-bold text-cyan-600">{stats.avgScore}</div>
                                <div className="text-sm text-slate-500">Avg Score</div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Loading State */}
                {loading && (
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                        {[1, 2, 3].map((i) => (
                            <div key={i} className="card p-6">
                                <div className="flex items-start gap-4">
                                    <div className="skeleton w-11 h-11 rounded-full" />
                                    <div className="flex-1">
                                        <div className="skeleton h-5 w-24 mb-3" />
                                        <div className="skeleton h-4 w-16" />
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* Empty State */}
                {!loading && watchlist.length === 0 && (
                    <div className="card p-12 text-center bg-gradient-to-br from-white to-slate-50">
                        <div className="w-24 h-24 mx-auto mb-8 rounded-2xl bg-gradient-to-br from-[var(--accent-cyan)] to-[var(--accent-purple)] flex items-center justify-center shadow-lg">
                            <svg className="w-12 h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                            </svg>
                        </div>
                        <h2 className="text-2xl font-bold text-slate-800 mb-4">Your watchlist is empty</h2>
                        <p className="text-slate-600 text-lg mb-8 max-w-lg mx-auto">
                            Click the star icon on any signal card to add assets.
                        </p>
                        <Link
                            href="/signals"
                            className="inline-flex items-center gap-2 bg-[var(--accent-cyan)] hover:bg-[#0891b2] text-white text-base px-8 py-4 font-semibold rounded-xl transition-all"
                        >
                            Browse Signals
                        </Link>
                    </div>
                )}

                {/* Watchlist Table */}
                {!loading && signals.length > 0 && (
                    <div className="card overflow-hidden">
                        <table className="w-full">
                            <thead className="bg-slate-50 border-b border-slate-200">
                                <tr>
                                    <th className="text-left py-4 px-6 text-sm font-semibold text-slate-600">Asset</th>
                                    <th className="text-left py-4 px-4 text-sm font-semibold text-slate-600">Signal</th>
                                    <th className="text-left py-4 px-4 text-sm font-semibold text-slate-600">Score</th>
                                    <th className="text-left py-4 px-4 text-sm font-semibold text-slate-600">Current Price</th>
                                    <th className="text-left py-4 px-4 text-sm font-semibold text-slate-600">Price Added</th>
                                    <th className="text-left py-4 px-4 text-sm font-semibold text-slate-600">Change</th>
                                    <th className="text-left py-4 px-4 text-sm font-semibold text-slate-600">Added</th>
                                    <th className="text-center py-4 px-4"></th>
                                </tr>
                            </thead>
                            <tbody>
                                {signals.map((signal) => (
                                    <tr key={signal.coin} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                                        <td className="py-4 px-6">
                                            <div className="flex items-center gap-3">
                                                {signal.image ? (
                                                    <img src={signal.image} alt={signal.coin} className="w-10 h-10 rounded-full" />
                                                ) : (
                                                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-cyan-500 to-purple-500 flex items-center justify-center text-white font-bold text-sm">
                                                        {signal.coin.slice(0, 3)}
                                                    </div>
                                                )}
                                                <div>
                                                    <div className="font-semibold text-slate-800">{signal.name}</div>
                                                    <div className="text-sm text-slate-400">{signal.coin}</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="py-4 px-4">
                                            <span className={`inline-flex items-center px-3 py-1 rounded text-sm font-bold ${signal.direction === 'LONG'
                                                ? 'bg-emerald-100 text-emerald-700'
                                                : signal.direction === 'SHORT'
                                                    ? 'bg-red-100 text-red-700'
                                                    : 'bg-slate-100 text-slate-500'
                                                }`}>
                                                {signal.direction}
                                            </span>
                                        </td>
                                        <td className="py-4 px-4">
                                            <span className={`inline-flex items-center px-3 py-1 rounded text-lg font-bold ${signal.score >= 70
                                                ? 'bg-emerald-100 text-emerald-700'
                                                : signal.score >= 40
                                                    ? 'bg-amber-100 text-amber-700'
                                                    : 'bg-slate-100 text-slate-500'
                                                }`}>
                                                {signal.score}
                                            </span>
                                        </td>
                                        <td className="py-4 px-4 font-mono font-semibold text-slate-800">
                                            {formatPrice(signal.entryPrice)}
                                        </td>
                                        <td className="py-4 px-4 font-mono text-slate-500">
                                            {formatPrice(signal.priceAtAdd)}
                                        </td>
                                        <td className="py-4 px-4">
                                            <div className={`font-semibold ${signal.priceChangePercent >= 0 ? 'text-emerald-600' : 'text-red-500'
                                                }`}>
                                                {signal.priceChangePercent >= 0 ? '+' : ''}{signal.priceChangePercent.toFixed(2)}%
                                            </div>
                                        </td>
                                        <td className="py-4 px-4 text-slate-500">
                                            {formatDate(signal.addedAt)}
                                        </td>
                                        <td className="py-4 px-4 text-center">
                                            <button
                                                onClick={() => handleRemove(signal.coin)}
                                                className="text-amber-500 hover:text-amber-600 p-2 rounded-lg hover:bg-amber-50 transition-all"
                                                title="Remove from watchlist"
                                            >
                                                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                                                    <path d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                                                </svg>
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}

                {/* Add More Link */}
                {!loading && watchlist.length > 0 && (
                    <div className="mt-8 text-center">
                        <Link
                            href="/signals"
                            className="inline-flex items-center gap-2 text-slate-500 hover:text-[var(--accent-cyan)] transition-colors"
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                            </svg>
                            Add more assets from Signals page
                        </Link>
                    </div>
                )}
            </main>
        </>
    );
}
