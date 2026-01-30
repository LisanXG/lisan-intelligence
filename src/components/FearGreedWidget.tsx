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

    // SVG Arc calculation for semi-circle gauge
    const createArc = (value: number) => {
        const radius = 70;
        const strokeWidth = 12;
        const centerX = 80;
        const centerY = 80;

        // Semi-circle from left to right (180 degrees)
        const startAngle = Math.PI;
        const endAngle = 0;
        const valueAngle = Math.PI - (value / 100) * Math.PI;

        // Background arc (full semi-circle)
        const bgStartX = centerX + radius * Math.cos(startAngle);
        const bgStartY = centerY + radius * Math.sin(startAngle);
        const bgEndX = centerX + radius * Math.cos(endAngle);
        const bgEndY = centerY + radius * Math.sin(endAngle);

        const bgPath = `M ${bgStartX} ${bgStartY} A ${radius} ${radius} 0 0 1 ${bgEndX} ${bgEndY}`;

        // Value arc
        const valueEndX = centerX + radius * Math.cos(valueAngle);
        const valueEndY = centerY + radius * Math.sin(valueAngle);
        const largeArc = value > 50 ? 1 : 0;

        const valuePath = `M ${bgStartX} ${bgStartY} A ${radius} ${radius} 0 ${largeArc} 1 ${valueEndX} ${valueEndY}`;

        // Needle position
        const needleX = centerX + (radius - 10) * Math.cos(valueAngle);
        const needleY = centerY + (radius - 10) * Math.sin(valueAngle);

        return { bgPath, valuePath, needleX, needleY, centerX, centerY, strokeWidth };
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
    const arc = createArc(data.value);

    return (
        <div className="card p-8">
            <h3 className="text-xl font-semibold text-slate-700 mb-6">Fear & Greed Index</h3>

            {/* Premium Semi-Circle Gauge */}
            <div className="flex flex-col items-center">
                <div className="relative">
                    <svg width="200" height="120" viewBox="0 0 160 100">
                        {/* Gradient definition */}
                        <defs>
                            <linearGradient id="gaugeGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                                <stop offset="0%" stopColor="#ef4444" />
                                <stop offset="25%" stopColor="#f97316" />
                                <stop offset="50%" stopColor="#eab308" />
                                <stop offset="75%" stopColor="#22c55e" />
                                <stop offset="100%" stopColor="#10b981" />
                            </linearGradient>
                            <filter id="glow">
                                <feGaussianBlur stdDeviation="2" result="coloredBlur" />
                                <feMerge>
                                    <feMergeNode in="coloredBlur" />
                                    <feMergeNode in="SourceGraphic" />
                                </feMerge>
                            </filter>
                        </defs>

                        {/* Background track */}
                        <path
                            d={arc.bgPath}
                            fill="none"
                            stroke="#e2e8f0"
                            strokeWidth={arc.strokeWidth}
                            strokeLinecap="round"
                        />

                        {/* Colored value arc */}
                        <path
                            d={arc.valuePath}
                            fill="none"
                            stroke="url(#gaugeGradient)"
                            strokeWidth={arc.strokeWidth}
                            strokeLinecap="round"
                            filter="url(#glow)"
                            style={{
                                transition: 'all 0.8s ease-out'
                            }}
                        />

                        {/* Needle dot */}
                        <circle
                            cx={arc.needleX}
                            cy={arc.needleY}
                            r="6"
                            fill="white"
                            stroke={colors.main}
                            strokeWidth="3"
                            filter="url(#glow)"
                            style={{
                                transition: 'all 0.8s ease-out'
                            }}
                        />

                        {/* Center value display */}
                        <text
                            x={arc.centerX}
                            y={arc.centerY - 5}
                            textAnchor="middle"
                            className="text-4xl font-bold"
                            fill={colors.main}
                        >
                            {data.value}
                        </text>
                    </svg>
                </div>

                {/* Classification badge */}
                <div
                    className="mt-3 px-5 py-2 rounded-full text-base font-semibold"
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
            <div className="flex justify-between text-sm text-slate-400 mt-6 px-2">
                <span>Extreme Fear</span>
                <span>Extreme Greed</span>
            </div>
        </div>
    );
}
