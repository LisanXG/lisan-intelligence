'use client';

import { useEffect, useState } from 'react';

interface Coin {
    id: string;
    symbol: string;
    name: string;
    current_price: number;
    price_change_percentage_24h: number;
    market_cap: number;
    total_volume: number;
    image: string;
}

export default function MarketOverview() {
    const [coins, setCoins] = useState<Coin[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function fetchMarketData() {
            try {
                const res = await fetch('/api/market');
                const data = await res.json();
                setCoins(data.coins || []);
            } catch (error) {
                console.error('Failed to fetch market data:', error);
            } finally {
                setLoading(false);
            }
        }

        fetchMarketData();
        const interval = setInterval(fetchMarketData, 60000);
        return () => clearInterval(interval);
    }, []);

    const formatPrice = (price: number) => {
        if (price >= 1) {
            return `$${price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
        }
        return `$${price.toFixed(4)}`;
    };

    const formatMarketCap = (cap: number) => {
        if (cap >= 1e12) return `$${(cap / 1e12).toFixed(2)}T`;
        if (cap >= 1e9) return `$${(cap / 1e9).toFixed(2)}B`;
        if (cap >= 1e6) return `$${(cap / 1e6).toFixed(2)}M`;
        return `$${cap.toLocaleString()}`;
    };

    if (loading) {
        return (
            <div className="card p-8">
                <div className="flex items-center justify-between mb-6">
                    <h3 className="text-xl font-semibold">Market Overview</h3>
                </div>
                <div className="space-y-5">
                    {[1, 2, 3, 4, 5].map((i) => (
                        <div key={i} className="skeleton h-16 w-full" />
                    ))}
                </div>
            </div>
        );
    }

    return (
        <div className="card overflow-hidden">
            <div className="p-4 md:p-6 border-b border-[var(--border-secondary)] bg-gradient-to-r from-[#0891b2]/5 to-[#7c3aed]/5">
                <h3 className="text-xl md:text-2xl font-semibold text-[var(--text-primary)]">Market Overview</h3>
            </div>

            {/* Desktop Table Header - Hidden on mobile */}
            <div className="hidden md:grid grid-cols-12 gap-4 px-6 py-4 text-sm font-semibold text-white border-b border-[var(--border-secondary)] bg-[var(--accent-cyan)]">
                <div className="col-span-1">#</div>
                <div className="col-span-3">Asset</div>
                <div className="col-span-2 text-right">Price</div>
                <div className="col-span-2 text-right">24h</div>
                <div className="col-span-2 text-right">Market Cap</div>
                <div className="col-span-2 text-right">Volume</div>
            </div>

            {/* Table Body */}
            <div className="divide-y divide-[var(--border-secondary)]">
                {coins.slice(0, 10).map((coin, index) => (
                    <div key={coin.id}>
                        {/* Mobile Layout */}
                        <div className="md:hidden p-4 hover:bg-[var(--bg-secondary)] transition-colors">
                            <div className="flex items-center justify-between mb-3">
                                <div className="flex items-center gap-3">
                                    <span className="text-sm text-[var(--text-muted)] font-medium w-5">{index + 1}</span>
                                    <img
                                        src={coin.image}
                                        alt={coin.name}
                                        className="w-8 h-8 rounded-full"
                                    />
                                    <div>
                                        <div className="font-semibold text-sm">{coin.name}</div>
                                        <div className="text-xs text-[var(--text-muted)] uppercase">{coin.symbol}</div>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <div className="font-mono text-sm font-medium">{formatPrice(coin.current_price)}</div>
                                    <div className={`text-xs font-semibold ${coin.price_change_percentage_24h >= 0 ? 'price-up' : 'price-down'}`}>
                                        {coin.price_change_percentage_24h >= 0 ? '+' : ''}
                                        {coin.price_change_percentage_24h?.toFixed(2)}%
                                    </div>
                                </div>
                            </div>
                            <div className="flex justify-between text-xs text-[var(--text-muted)]">
                                <span>MCap: {formatMarketCap(coin.market_cap)}</span>
                                <span>Vol: {formatMarketCap(coin.total_volume)}</span>
                            </div>
                        </div>

                        {/* Desktop Layout */}
                        <div className="hidden md:grid grid-cols-12 gap-4 px-6 py-5 items-center hover:bg-[var(--bg-secondary)] transition-colors cursor-pointer">
                            <div className="col-span-1 text-base text-[var(--text-muted)] font-medium">
                                {index + 1}
                            </div>
                            <div className="col-span-3 flex items-center gap-4">
                                <img
                                    src={coin.image}
                                    alt={coin.name}
                                    className="w-10 h-10 rounded-full"
                                />
                                <div>
                                    <div className="font-semibold text-base">{coin.name}</div>
                                    <div className="text-sm text-[var(--text-muted)] uppercase font-medium">{coin.symbol}</div>
                                </div>
                            </div>
                            <div className="col-span-2 text-right font-mono text-base font-medium">
                                {formatPrice(coin.current_price)}
                            </div>
                            <div className={`col-span-2 text-right font-mono text-base font-semibold ${coin.price_change_percentage_24h >= 0 ? 'price-up' : 'price-down'
                                }`}>
                                {coin.price_change_percentage_24h >= 0 ? '+' : ''}
                                {coin.price_change_percentage_24h?.toFixed(2)}%
                            </div>
                            <div className="col-span-2 text-right text-base text-[var(--text-secondary)]">
                                {formatMarketCap(coin.market_cap)}
                            </div>
                            <div className="col-span-2 text-right text-base text-[var(--text-secondary)]">
                                {formatMarketCap(coin.total_volume)}
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
