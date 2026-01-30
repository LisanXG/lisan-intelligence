'use client';

import { useEffect, useState } from 'react';

interface Signal {
    id: string;
    symbol: string;
    name: string;
    image: string;
    price: number;
    change24h: number;
    score: number;
    signalType: 'ACCUMULATE' | 'HOLD' | 'CAUTION';
    technicalScore: number;
    contextScore: number;
    liquidityScore: number;
}

export default function SignalsList() {
    const [signals, setSignals] = useState<Signal[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function fetchSignals() {
            try {
                const res = await fetch('/api/signals');
                const data = await res.json();
                setSignals(data.signals || []);
            } catch (error) {
                console.error('Failed to fetch signals:', error);
            } finally {
                setLoading(false);
            }
        }

        fetchSignals();
    }, []);

    const getScoreClass = (score: number) => {
        if (score >= 70) return 'score-badge-high';
        if (score >= 40) return 'score-badge-medium';
        return 'score-badge-low';
    };

    const getSignalBadge = (type: Signal['signalType']) => {
        switch (type) {
            case 'ACCUMULATE':
                return (
                    <span className="inline-flex items-center px-3 py-1.5 text-sm font-semibold bg-[rgba(5,150,105,0.12)] text-[var(--accent-green)]">
                        ACCUMULATE
                    </span>
                );
            case 'HOLD':
                return (
                    <span className="inline-flex items-center px-3 py-1.5 text-sm font-semibold bg-[rgba(156,163,175,0.15)] text-[var(--text-secondary)]">
                        HOLD
                    </span>
                );
            case 'CAUTION':
                return (
                    <span className="inline-flex items-center px-3 py-1.5 text-sm font-semibold bg-[rgba(220,38,38,0.12)] text-[var(--accent-red)]">
                        CAUTION
                    </span>
                );
        }
    };

    const formatPrice = (price: number) => {
        if (price >= 1) {
            return `$${price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
        }
        return `$${price.toFixed(6)}`;
    };

    if (loading) {
        return (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {[1, 2, 3, 4, 5, 6].map((i) => (
                    <div key={i} className="card p-6">
                        <div className="flex items-start gap-4">
                            <div className="skeleton w-12 h-12 rounded-full" />
                            <div className="flex-1">
                                <div className="skeleton h-5 w-28 mb-3" />
                                <div className="skeleton h-4 w-20" />
                            </div>
                            <div className="skeleton w-12 h-12 rounded-lg" />
                        </div>
                    </div>
                ))}
            </div>
        );
    }

    if (signals.length === 0) {
        return (
            <div className="card p-12 text-center">
                <p className="text-[var(--text-muted)] text-lg">No signals available</p>
            </div>
        );
    }

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {signals.map((signal) => (
                <div key={signal.id} className="card p-6 cursor-pointer hover:border-[var(--accent-cyan)] transition-all">
                    {/* Header */}
                    <div className="flex items-start justify-between mb-5">
                        <div className="flex items-center gap-4">
                            <img
                                src={signal.image}
                                alt={signal.name}
                                className="w-12 h-12 rounded-full"
                            />
                            <div>
                                <div className="font-semibold text-lg">{signal.name}</div>
                                <div className="text-sm text-[var(--text-muted)] uppercase font-medium">{signal.symbol}</div>
                            </div>
                        </div>
                        <div className={`score-badge ${getScoreClass(signal.score)}`}>
                            {signal.score}
                        </div>
                    </div>

                    {/* Price & Signal */}
                    <div className="flex items-center justify-between mb-5">
                        <div>
                            <div className="font-mono text-xl font-semibold">{formatPrice(signal.price)}</div>
                            <div className={`text-sm font-mono font-semibold ${signal.change24h >= 0 ? 'price-up' : 'price-down'}`}>
                                {signal.change24h >= 0 ? '+' : ''}{signal.change24h.toFixed(2)}%
                            </div>
                        </div>
                        {getSignalBadge(signal.signalType)}
                    </div>

                    {/* Score Breakdown */}
                    <div className="grid grid-cols-3 gap-4 pt-5 border-t border-[var(--border-secondary)] bg-gradient-to-r from-[#0891b2]/5 via-transparent to-[#7c3aed]/5 -mx-6 -mb-6 px-6 pb-5 mt-5">
                        <div className="text-center">
                            <div className="text-sm text-[var(--text-muted)] mb-1">Technical</div>
                            <div className="text-lg font-semibold">{signal.technicalScore}</div>
                        </div>
                        <div className="text-center">
                            <div className="text-sm text-[var(--text-muted)] mb-1">Context</div>
                            <div className="text-lg font-semibold">{signal.contextScore}</div>
                        </div>
                        <div className="text-center">
                            <div className="text-sm text-[var(--text-muted)] mb-1">Liquidity</div>
                            <div className="text-lg font-semibold">{signal.liquidityScore}</div>
                        </div>
                    </div>
                </div>
            ))}
        </div>
    );
}
