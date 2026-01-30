'use client';

import { useEffect, useState } from 'react';

interface MarketStats {
    btcDominance: number;
    totalMarketCap: number;
    total24hVolume: number;
    activeCryptos: number;
}

export default function QuickStats() {
    const [stats, setStats] = useState<MarketStats | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function fetchStats() {
            try {
                const res = await fetch('/api/market');
                const data = await res.json();
                const coins = data.coins || [];

                // Calculate stats from available data
                const btc = coins.find((c: { id: string }) => c.id === 'bitcoin');
                const totalMcap = coins.reduce((sum: number, c: { market_cap: number }) => sum + (c.market_cap || 0), 0);
                const totalVol = coins.reduce((sum: number, c: { total_volume: number }) => sum + (c.total_volume || 0), 0);

                setStats({
                    btcDominance: btc ? (btc.market_cap / totalMcap) * 100 : 55,
                    totalMarketCap: totalMcap,
                    total24hVolume: totalVol,
                    activeCryptos: coins.length,
                });
            } catch (error) {
                console.error('Failed to fetch stats:', error);
                setStats({
                    btcDominance: 55.2,
                    totalMarketCap: 3200000000000,
                    total24hVolume: 125000000000,
                    activeCryptos: 20,
                });
            } finally {
                setLoading(false);
            }
        }

        fetchStats();
    }, []);

    const formatNumber = (num: number) => {
        if (num >= 1e12) return `$${(num / 1e12).toFixed(2)}T`;
        if (num >= 1e9) return `$${(num / 1e9).toFixed(1)}B`;
        return `$${num.toLocaleString()}`;
    };

    if (loading) {
        return (
            <div className="grid grid-cols-2 gap-3">
                {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="skeleton h-24 w-full rounded-xl" />
                ))}
            </div>
        );
    }

    if (!stats) return null;

    const statCards = [
        {
            label: 'BTC Dominance',
            value: `${stats.btcDominance.toFixed(1)}%`,
            gradient: 'from-amber-500/10 to-orange-500/10',
            iconColor: 'text-amber-500',
            icon: (
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zm0 18a8 8 0 1 1 0-16 8 8 0 0 1 0 16zm.5-13h-1v1H10v6h1.5v-2h1c1.1 0 2-.9 2-2s-.9-2-2-2zm0 3h-1V9h1a.5.5 0 0 1 0 1z" />
                </svg>
            ),
        },
        {
            label: 'Total Market Cap',
            value: formatNumber(stats.totalMarketCap),
            gradient: 'from-cyan-500/10 to-blue-500/10',
            iconColor: 'text-cyan-500',
            icon: (
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M3 3v18h18" strokeLinecap="round" />
                    <path d="M7 16l4-4 4 4 5-6" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
            ),
        },
        {
            label: '24h Volume',
            value: formatNumber(stats.total24hVolume),
            gradient: 'from-violet-500/10 to-purple-500/10',
            iconColor: 'text-violet-500',
            icon: (
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M22 12h-4l-3 9L9 3l-3 9H2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
            ),
        },
        {
            label: 'Assets Tracked',
            value: stats.activeCryptos.toString(),
            gradient: 'from-emerald-500/10 to-teal-500/10',
            iconColor: 'text-emerald-500',
            icon: (
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="10" />
                    <path d="M12 6v6l4 2" />
                </svg>
            ),
        },
    ];

    return (
        <div className="grid grid-cols-2 gap-4">
            {statCards.map((stat, i) => (
                <div
                    key={i}
                    className={`card p-5 bg-gradient-to-br ${stat.gradient} hover:shadow-lg transition-all duration-300 group`}
                >
                    <div className="flex items-start justify-between mb-3">
                        <span className="text-sm text-slate-500 font-medium">{stat.label}</span>
                        <div className={`${stat.iconColor} opacity-60 group-hover:opacity-100 transition-opacity`}>
                            {stat.icon}
                        </div>
                    </div>
                    <div className="text-xl font-bold text-slate-700">
                        {stat.value}
                    </div>
                </div>
            ))}
        </div>
    );
}
