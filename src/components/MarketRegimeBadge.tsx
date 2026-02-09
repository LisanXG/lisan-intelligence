'use client';

import { useEffect, useState } from 'react';

type MarketRegime =
    | 'BULL_TREND'
    | 'BEAR_TREND'
    | 'HIGH_VOL_CHOP'
    | 'ACCUMULATION'
    | 'DISTRIBUTION'
    | 'RECOVERY_PUMP'
    | 'UNKNOWN';

interface RegimeConfig {
    label: string;
    description: string;
    color: string;
    bgGradient: string;
    icon: string;
}

const REGIME_CONFIG: Record<MarketRegime, RegimeConfig> = {
    BULL_TREND: {
        label: 'Bull Trend',
        description: 'Strong upward momentum across BTC and altcoins',
        color: '#10b981',
        bgGradient: 'from-emerald-500/15 to-green-500/10',
        icon: '📈',
    },
    BEAR_TREND: {
        label: 'Bear Trend',
        description: 'Sustained downward pressure with weakening bids',
        color: '#ef4444',
        bgGradient: 'from-red-500/15 to-rose-500/10',
        icon: '📉',
    },
    HIGH_VOL_CHOP: {
        label: 'Choppy / Ranging',
        description: 'No clear direction — high volatility with mixed signals',
        color: '#f59e0b',
        bgGradient: 'from-amber-500/15 to-yellow-500/10',
        icon: '🔀',
    },
    ACCUMULATION: {
        label: 'Accumulation',
        description: 'Price dipping but smart money building positions',
        color: '#8b5cf6',
        bgGradient: 'from-violet-500/15 to-purple-500/10',
        icon: '🧊',
    },
    DISTRIBUTION: {
        label: 'Distribution',
        description: 'Price rising but OI declining — potential top forming',
        color: '#f97316',
        bgGradient: 'from-orange-500/15 to-amber-500/10',
        icon: '⚠️',
    },
    RECOVERY_PUMP: {
        label: 'Recovery Pump',
        description: 'Sharp reversal after selloff — high conviction bounce',
        color: '#06b6d4',
        bgGradient: 'from-cyan-500/15 to-teal-500/10',
        icon: '🚀',
    },
    UNKNOWN: {
        label: 'Analyzing...',
        description: 'Insufficient data to determine market conditions',
        color: '#94a3b8',
        bgGradient: 'from-slate-500/10 to-gray-500/10',
        icon: '🔍',
    },
};

export default function MarketRegimeBadge() {
    const [regime, setRegime] = useState<MarketRegime>('UNKNOWN');
    const [confidence, setConfidence] = useState(0);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function fetchRegime() {
            try {
                const res = await fetch('/api/engine-signals');
                const data = await res.json();
                if (data.regime) setRegime(data.regime);
                if (data.regimeConfidence !== undefined) setConfidence(data.regimeConfidence);
            } catch (error) {
                console.error('Failed to fetch regime:', error);
            } finally {
                setLoading(false);
            }
        }

        fetchRegime();
        const interval = setInterval(fetchRegime, 300000); // Refresh every 5 min
        return () => clearInterval(interval);
    }, []);

    if (loading) {
        return (
            <div className="card p-6">
                <div className="skeleton h-5 w-40 mb-4" />
                <div className="skeleton h-16 w-full rounded-xl" />
            </div>
        );
    }

    const config = REGIME_CONFIG[regime];
    const confidencePct = Math.round(confidence * 100);

    return (
        <div className={`card p-6 bg-gradient-to-br ${config.bgGradient}`}>
            <h3 className="text-lg font-semibold text-slate-700 mb-4">Market Regime</h3>

            <div className="flex items-center gap-4">
                {/* Regime icon circle */}
                <div
                    className="flex-shrink-0 w-20 h-20 rounded-full flex items-center justify-center border-4 transition-all duration-500"
                    style={{
                        borderColor: config.color,
                        backgroundColor: `${config.color}15`,
                    }}
                >
                    <span className="text-2xl">{config.icon}</span>
                </div>

                {/* Right side */}
                <div className="flex-1 min-w-0">
                    <div
                        className="text-lg font-bold mb-1"
                        style={{ color: config.color }}
                    >
                        {config.label}
                    </div>
                    <p className="text-xs text-slate-500 leading-snug mb-2">
                        {config.description}
                    </p>

                    {/* Confidence bar */}
                    <div className="flex items-center gap-2">
                        <div className="flex-1 h-1.5 rounded-full bg-slate-200 overflow-hidden">
                            <div
                                className="h-full rounded-full transition-all duration-700"
                                style={{
                                    width: `${confidencePct}%`,
                                    backgroundColor: config.color,
                                }}
                            />
                        </div>
                        <span className="text-xs font-medium text-slate-500">
                            {confidencePct}%
                        </span>
                    </div>
                </div>
            </div>
        </div>
    );
}
