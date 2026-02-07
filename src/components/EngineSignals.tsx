'use client';

import { useEffect, useState, useCallback } from 'react';
import SignalCard from './SignalCard';
import QuantView from './QuantView';
import { SignalOutput } from '@/lib/engine';
import { useAuth } from '@/context/auth-context';
import {
    getOpenSignals,
    addSignalToDb,
    DbSignal
} from '@/lib/supabase';

import { logger } from '@/lib/logger';

interface EngineSignal extends SignalOutput {
    name: string;
    image: string;
    sparkline?: number[];
}

interface EngineSignalsResponse {
    signals: EngineSignal[];
    fearGreed: number | null;
    lastUpdated: string;
}

interface EngineSignalsProps {
    externalFilter?: 'ALL' | 'LONG' | 'SHORT' | 'HOLD';
    hideFilterTabs?: boolean;
}

/**
 * Engine-powered Signals Grid
 * 
 * Displays signals using the new scoring engine with
 * LONG/SHORT/HOLD directions and premium card design.
 * Now uses Supabase for signal persistence and deduplication.
 */

// Helper to convert score to confidence label
function getConfidenceLabel(score: number): string {
    if (score >= 75) return 'Very High';
    if (score >= 60) return 'High';
    if (score >= 45) return 'Medium';
    if (score >= 30) return 'Low';
    return 'Very Low';
}

export default function EngineSignals({ externalFilter, hideFilterTabs = false }: EngineSignalsProps) {
    const { user } = useAuth();
    const [signals, setSignals] = useState<EngineSignal[]>([]);
    const [fearGreed, setFearGreed] = useState<number | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [lastUpdated, setLastUpdated] = useState<string>('');
    const [filter, setFilter] = useState<'ALL' | 'LONG' | 'SHORT' | 'HOLD'>('ALL');
    const [viewMode, setViewMode] = useState<'signals' | 'quant'>('signals');
    const [openSignals, setOpenSignals] = useState<DbSignal[]>([]);


    // Track signals to Supabase
    // Kill switch: set NEXT_PUBLIC_SIGNAL_TRACKING_ENABLED=false to disable
    const trackSignals = useCallback(async (newSignals: EngineSignal[]) => {
        if (!user) return;

        // Kill switch - disable all client-side signal insertion
        if (process.env.NEXT_PUBLIC_SIGNAL_TRACKING_ENABLED !== 'true') {
            return;
        }

        try {
            // Get current open signals from Supabase
            const currentOpenSignals = await getOpenSignals();
            setOpenSignals(currentOpenSignals);

            // Create a set of existing coin+direction combos that are PENDING
            const existingPendingKeys = new Set(
                currentOpenSignals.map(s => `${s.coin}:${s.direction}`)
            );

            // NOTE: Outcome checking is handled by the server-side cron/monitor
            // which includes proper momentum checking before exiting at 3%+
            // Client only tracks new signals here.

            // Track new LONG/SHORT signals (with deduplication)
            const actionableSignals = newSignals.filter(s =>
                s.direction !== 'HOLD' &&
                !existingPendingKeys.has(`${s.coin}:${s.direction}`)
            );

            // Get global weights from Supabase
            const { getGlobalWeights } = await import('@/lib/supabase');
            const weights = (await getGlobalWeights()) || {};

            for (const signal of actionableSignals) {
                const added = await addSignalToDb(user.id, {
                    coin: signal.coin,
                    direction: signal.direction,
                    score: signal.score,
                    confidence: getConfidenceLabel(signal.score),
                    entry_price: signal.entryPrice,
                    stop_loss: signal.stopLoss,
                    take_profit: signal.takeProfit,
                    indicator_snapshot: signal.indicators,
                    weights_used: weights as Record<string, number>,
                });

                if (added) {
                    logger.debug(`Added ${signal.coin} ${signal.direction} to tracking`);
                }
            }

            // Refresh open signals
            const updatedOpenSignals = await getOpenSignals();
            setOpenSignals(updatedOpenSignals);

        } catch (err) {
            console.error('[Signal] Error tracking signals:', err);
        }
    }, [user]);



    useEffect(() => {
        async function fetchSignals() {
            try {
                setLoading(true);
                const res = await fetch('/api/engine-signals');

                if (!res.ok) {
                    throw new Error('Failed to fetch signals');
                }

                const data: EngineSignalsResponse = await res.json();
                setSignals(data.signals || []);
                setFearGreed(data.fearGreed);
                setLastUpdated(data.lastUpdated);
                setError(null);

                // Track LONG/SHORT signals to Supabase
                if (data.signals && data.signals.length > 0) {
                    trackSignals(data.signals);
                }
            } catch (err) {
                console.error('Failed to fetch engine signals:', err);
                setError('Failed to load signals. Please try again.');
            } finally {
                setLoading(false);
            }
        }

        fetchSignals();

        // Refresh every 5 minutes
        const interval = setInterval(fetchSignals, 5 * 60 * 1000);
        return () => {
            clearInterval(interval);
        };
    }, [trackSignals]);


    // Use external filter if provided, otherwise use internal state
    const activeFilter = externalFilter ?? filter;

    // Filter signals
    const filteredSignals = activeFilter === 'ALL'
        ? signals
        : signals.filter(s => s.direction === activeFilter);

    // Count by direction
    const counts = {
        ALL: signals.length,
        LONG: signals.filter(s => s.direction === 'LONG').length,
        SHORT: signals.filter(s => s.direction === 'SHORT').length,
        HOLD: signals.filter(s => s.direction === 'HOLD').length,
    };

    if (loading) {
        return (
            <div className="space-y-6">
                <div className="flex items-center justify-between">
                    <div className="skeleton h-8 w-48" />
                    <div className="skeleton h-10 w-64" />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                    {[1, 2, 3, 4, 5, 6].map((i) => (
                        <div key={i} className="card p-6">
                            <div className="flex items-start gap-4">
                                <div className="skeleton w-10 h-10 rounded-full" />
                                <div className="flex-1">
                                    <div className="skeleton h-5 w-24 mb-3" />
                                    <div className="skeleton h-4 w-16" />
                                </div>
                                <div className="skeleton w-16 h-12 rounded-lg" />
                            </div>
                            <div className="mt-4 space-y-2">
                                <div className="skeleton h-10 w-full" />
                                <div className="skeleton h-12 w-full" />
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="card p-12 text-center">
                <p className="text-[var(--accent-red)] text-lg mb-4">{error}</p>
                <button
                    onClick={() => window.location.reload()}
                    className="px-4 py-2 bg-[var(--accent-cyan)] text-white rounded-lg hover:opacity-90"
                >
                    Retry
                </button>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Filter tabs - aligned right (hidden when hideFilterTabs is true) */}
            {!hideFilterTabs && (
                <div className="flex justify-between items-center">
                    {/* View Toggle */}
                    <div className="flex gap-1 p-1 bg-[var(--bg-card)] rounded-lg border border-[var(--border-primary)]">
                        <button
                            onClick={() => setViewMode('signals')}
                            className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-all ${viewMode === 'signals'
                                ? 'bg-[var(--accent-cyan)] text-white'
                                : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                                }`}
                        >
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <rect x="3" y="3" width="7" height="7" />
                                <rect x="14" y="3" width="7" height="7" />
                                <rect x="3" y="14" width="7" height="7" />
                                <rect x="14" y="14" width="7" height="7" />
                            </svg>
                            Cards
                        </button>
                        <button
                            onClick={() => setViewMode('quant')}
                            className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-all ${viewMode === 'quant'
                                ? 'bg-[var(--accent-cyan)] text-white'
                                : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                                }`}
                        >
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <line x1="8" y1="6" x2="21" y2="6" />
                                <line x1="8" y1="12" x2="21" y2="12" />
                                <line x1="8" y1="18" x2="21" y2="18" />
                                <line x1="3" y1="6" x2="3.01" y2="6" />
                                <line x1="3" y1="12" x2="3.01" y2="12" />
                                <line x1="3" y1="18" x2="3.01" y2="18" />
                            </svg>
                            Quant
                        </button>
                    </div>

                    {/* Direction Filter */}
                    <div className="flex gap-1 p-1 bg-[var(--bg-card)] rounded-lg border border-[var(--border-primary)]">
                        {(['ALL', 'LONG', 'SHORT', 'HOLD'] as const).map((f) => (
                            <button
                                key={f}
                                onClick={() => setFilter(f)}
                                className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${filter === f
                                    ? 'bg-[var(--accent-cyan)] text-white'
                                    : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                                    }`}
                            >
                                {f}
                                <span className="ml-1.5 opacity-70">({counts[f]})</span>
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {/* Signals display */}
            {filteredSignals.length === 0 ? (
                <div className="card p-12 text-center">
                    <p className="text-[var(--text-muted)] text-lg">
                        No {filter !== 'ALL' ? filter : ''} signals available
                    </p>
                </div>
            ) : viewMode === 'quant' ? (
                <QuantView signals={filteredSignals} />
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                    {filteredSignals.map((signal) => (
                        <SignalCard
                            key={`${signal.coin}-${signal.timestamp}`}
                            signal={signal}
                            sparklineData={signal.sparkline}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}
