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
        if (value <= 25) return { main: '#ef4444', light: 'rgba(239, 68, 68, 0.15)' };
        if (value <= 45) return { main: '#f97316', light: 'rgba(249, 115, 22, 0.15)' };
        if (value <= 55) return { main: '#eab308', light: 'rgba(234, 179, 8, 0.15)' };
        if (value <= 75) return { main: '#22c55e', light: 'rgba(34, 197, 94, 0.15)' };
        return { main: '#10b981', light: 'rgba(16, 185, 129, 0.15)' };
    };

    if (loading) {
        return (
            <div className="card p-6">
                <div className="skeleton h-5 w-40 mb-6" />
                <div className="skeleton h-32 w-full rounded-xl" />
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

    const colors = getColor(data.value);

    // Calculate needle rotation: 0 = -90deg (left), 100 = 90deg (right)
    const needleRotation = -90 + (data.value / 100) * 180;

    return (
        <div className="card p-8">
            <h3 className="text-xl font-semibold text-slate-700 mb-6 text-center">Fear & Greed Index</h3>

            {/* Premium Semi-Circle Gauge */}
            <div className="flex flex-col items-center">
                <div className="relative w-52 h-28">
                    {/* SVG Gauge */}
                    <svg
                        viewBox="0 0 200 110"
                        className="w-full h-full"
                        style={{ overflow: 'visible' }}
                    >
                        {/* Gradient definition */}
                        <defs>
                            <linearGradient id="gaugeGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                                <stop offset="0%" stopColor="#ef4444" />
                                <stop offset="25%" stopColor="#f97316" />
                                <stop offset="50%" stopColor="#eab308" />
                                <stop offset="75%" stopColor="#22c55e" />
                                <stop offset="100%" stopColor="#10b981" />
                            </linearGradient>
                        </defs>

                        {/* Background arc */}
                        <path
                            d="M 20 100 A 80 80 0 0 1 180 100"
                            fill="none"
                            stroke="#e2e8f0"
                            strokeWidth="14"
                            strokeLinecap="round"
                        />

                        {/* Colored arc - full gradient background */}
                        <path
                            d="M 20 100 A 80 80 0 0 1 180 100"
                            fill="none"
                            stroke="url(#gaugeGradient)"
                            strokeWidth="14"
                            strokeLinecap="round"
                        />

                        {/* Needle */}
                        <g
                            transform={`rotate(${needleRotation} 100 100)`}
                            style={{ transition: 'transform 0.8s ease-out' }}
                        >
                            <line
                                x1="100"
                                y1="100"
                                x2="100"
                                y2="35"
                                stroke={colors.main}
                                strokeWidth="3"
                                strokeLinecap="round"
                            />
                            <circle
                                cx="100"
                                cy="100"
                                r="8"
                                fill="white"
                                stroke={colors.main}
                                strokeWidth="3"
                            />
                        </g>
                    </svg>

                    {/* Center value display */}
                    <div
                        className="absolute bottom-0 left-1/2 transform -translate-x-1/2 translate-y-2 text-4xl font-bold"
                        style={{ color: colors.main }}
                    >
                        {data.value}
                    </div>
                </div>

                {/* Classification badge */}
                <div
                    className="mt-6 px-5 py-2 rounded-full text-base font-semibold"
                    style={{
                        backgroundColor: colors.light,
                        color: colors.main
                    }}
                >
                    {data.value_classification}
                </div>

                <p className="text-xs text-slate-400 mt-2">Market Sentiment</p>
            </div>

            {/* Scale labels */}
            <div className="flex justify-between text-xs text-slate-400 mt-4 px-4">
                <span>Extreme<br />Fear</span>
                <span className="text-right">Extreme<br />Greed</span>
            </div>
        </div>
    );
}
