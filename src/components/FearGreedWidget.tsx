'use client';

import { useEffect, useState } from 'react';

interface FearGreedData {
    value: number;
    value_classification: string;
    timestamp: string;
}

export default function FearGreedWidget() {
    const [data, setData] = useState<FearGreedData | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function fetchFearGreed() {
            try {
                const res = await fetch('/api/fear-greed');
                const result = await res.json();
                setData(result);
            } catch (error) {
                console.error('Failed to fetch fear & greed:', error);
            } finally {
                setLoading(false);
            }
        }

        fetchFearGreed();
        const interval = setInterval(fetchFearGreed, 300000);
        return () => clearInterval(interval);
    }, []);

    // Get color based on value
    const getColor = (value: number) => {
        if (value <= 25) return '#ef4444';
        if (value <= 45) return '#f97316';
        if (value <= 55) return '#eab308';
        if (value <= 75) return '#22c55e';
        return '#10b981';
    };

    if (loading) {
        return (
            <div className="card p-6">
                <div className="skeleton h-5 w-40 mb-4" />
                <div className="skeleton h-16 w-full rounded-xl" />
            </div>
        );
    }

    if (!data) {
        return (
            <div className="card p-6 flex items-center justify-center h-full">
                <p className="text-slate-400 text-sm">Unable to load data</p>
            </div>
        );
    }

    const color = getColor(data.value);

    return (
        <div className="card p-6">
            <h3 className="text-lg font-semibold text-slate-700 mb-5">Fear & Greed Index</h3>

            {/* Main content */}
            <div className="flex items-center gap-5">
                {/* Value circle */}
                <div
                    className="flex-shrink-0 w-20 h-20 rounded-full flex flex-col items-center justify-center border-4"
                    style={{
                        borderColor: color,
                        backgroundColor: `${color}15`
                    }}
                >
                    <span
                        className="text-3xl font-bold leading-none"
                        style={{ color }}
                    >
                        {data.value}
                    </span>
                </div>

                {/* Right side */}
                <div className="flex-1 min-w-0">
                    <div
                        className="text-lg font-semibold mb-2"
                        style={{ color }}
                    >
                        {data.value_classification}
                    </div>

                    {/* Gradient bar */}
                    <div className="relative">
                        <div
                            className="h-2.5 rounded-full w-full"
                            style={{
                                background: 'linear-gradient(to right, #ef4444, #f97316, #eab308, #22c55e, #10b981)'
                            }}
                        />
                        {/* Indicator dot */}
                        <div
                            className="absolute top-1/2 -translate-y-1/2 w-4 h-4 rounded-full border-2 border-white shadow-lg transition-all duration-500"
                            style={{
                                left: `calc(${data.value}% - 8px)`,
                                backgroundColor: color
                            }}
                        />
                    </div>

                    {/* Labels */}
                    <div className="flex justify-between text-xs text-slate-400 mt-1.5">
                        <span>Fear</span>
                        <span>Greed</span>
                    </div>
                </div>
            </div>
        </div>
    );
}
