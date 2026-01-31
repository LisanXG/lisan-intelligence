'use client';

import { useEffect, useState } from 'react';
import SignalCard from './SignalCard';
import { SignalOutput } from '@/lib/engine';

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
 */
export default function EngineSignals({ externalFilter, hideFilterTabs = false }: EngineSignalsProps) {
    const [signals, setSignals] = useState<EngineSignal[]>([]);
    const [fearGreed, setFearGreed] = useState<number | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [lastUpdated, setLastUpdated] = useState<string>('');
    const [filter, setFilter] = useState<'ALL' | 'LONG' | 'SHORT' | 'HOLD'>('ALL');

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

                // Track LONG/SHORT signals to learning system
                // Only track if we have signals and they're actionable
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

        // Initialize WebSocket for real-time tracking
        import('@/lib/engine/websocket').then(({ initializeWebSocket }) => {
            initializeWebSocket();
        });

        // Refresh every 5 minutes
        const interval = setInterval(fetchSignals, 5 * 60 * 1000);
        return () => {
            clearInterval(interval);
            // Disconnect WebSocket on unmount
            import('@/lib/engine/websocket').then(({ getHyperliquidWebSocket }) => {
                getHyperliquidWebSocket().disconnect();
            });
        };
    }, []);

    // Track signals to the learning system
    const trackSignals = (newSignals: EngineSignal[]) => {
        // Import tracking functions dynamically to avoid SSR issues
        import('@/lib/engine/tracking').then(({ getSignalHistory, checkAndUpdateOutcomes }) => {
            import('@/lib/engine/learning').then(({ getCurrentWeights, checkAndTriggerLearning }) => {
                const history = getSignalHistory();
                const weights = getCurrentWeights();

                // FIRST: Check all open signals against current prices
                // This is what marks signals as WIN/LOSS when SL/TP is hit
                const priceUpdates = newSignals.map(s => ({
                    coin: s.coin,
                    currentPrice: s.entryPrice // entryPrice from API is the current market price
                }));
                const updatedSignals = checkAndUpdateOutcomes(priceUpdates);

                if (updatedSignals.length > 0) {
                    console.log(`[Learning] Updated ${updatedSignals.length} signal outcomes`);
                    // Check if we should run a learning cycle after updating outcomes
                    checkAndTriggerLearning();
                }

                // SECOND: Track new LONG/SHORT signals
                // Improved deduplication: use signal ID based on coin + timestamp window
                const now = Date.now();
                const oneHourAgo = now - (60 * 60 * 1000);

                // Only consider recent open signals for deduplication
                const recentOpenSignals = history.getAll().filter(s =>
                    s.outcome === 'OPEN' &&
                    new Date(s.signal.timestamp).getTime() > oneHourAgo
                );
                const existingCoins = new Set(recentOpenSignals.map(s => s.signal.coin));

                const actionableSignals = newSignals.filter(s =>
                    s.direction !== 'HOLD' &&
                    !existingCoins.has(s.coin)
                );

                for (const signal of actionableSignals) {
                    // Cast weights to Record<string, number> for addSignal
                    history.addSignal(signal, weights as unknown as Record<string, number>);

                    // Subscribe to WebSocket for this coin
                    import('@/lib/engine/websocket').then(({ getHyperliquidWebSocket }) => {
                        getHyperliquidWebSocket().subscribe(signal.coin);
                    });
                }
            });
        });
    };

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
                <div className="flex justify-end">
                    <div className="flex gap-1 p-1 bg-[var(--card-bg)] rounded-lg border border-[var(--border-primary)]">
                        {(['ALL', 'LONG', 'SHORT', 'HOLD'] as const).map((f) => (
                            <button
                                key={f}
                                onClick={() => setFilter(f)}
                                className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${filter === f
                                    ? 'bg-[var(--accent-cyan)] text-white'
                                    : 'text-[#e5e7eb] hover:text-white hover:bg-[rgba(255,255,255,0.1)]'
                                    }`}
                            >
                                {f}
                                <span className="ml-1.5 opacity-70">({counts[f]})</span>
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {/* Signals grid */}
            {filteredSignals.length === 0 ? (
                <div className="card p-12 text-center">
                    <p className="text-[var(--text-muted)] text-lg">
                        No {filter !== 'ALL' ? filter : ''} signals available
                    </p>
                </div>
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
