'use client';

import { SignalOutput } from '@/lib/engine';
import { useEffect } from 'react';
import { createPortal } from 'react-dom';

interface SignalDetailModalProps {
    signal: SignalOutput & { name?: string; image?: string };
    onClose: () => void;
}

// ─── Indicator metadata: maps raw keys to display names + categories + formatting ───
const INDICATOR_CONFIG: {
    key: string;
    label: string;
    category: 'momentum' | 'trend' | 'volume' | 'sentiment' | 'positioning' | 'volatility';
    format: (v: number) => string;
    signal: (v: number) => 'bullish' | 'bearish' | 'neutral';
}[] = [
        // ── Momentum ──
        {
            key: 'rsi', label: 'RSI (14)', category: 'momentum',
            format: v => v.toFixed(1),
            signal: v => v < 40 ? 'bullish' : v > 60 ? 'bearish' : 'neutral',
        },
        {
            key: 'stochRSI', label: 'Stochastic RSI', category: 'momentum',
            format: v => v.toFixed(2),
            signal: v => v < 0.3 ? 'bullish' : v > 0.7 ? 'bearish' : 'neutral',
        },
        {
            key: 'macd', label: 'MACD Histogram', category: 'momentum',
            format: v => v.toFixed(4),
            signal: v => v > 0 ? 'bullish' : v < 0 ? 'bearish' : 'neutral',
        },
        {
            key: 'williamsR', label: 'Williams %R', category: 'momentum',
            format: v => v.toFixed(1),
            signal: v => v < -70 ? 'bullish' : v > -30 ? 'bearish' : 'neutral',
        },
        {
            key: 'cci', label: 'CCI (20)', category: 'momentum',
            format: v => v.toFixed(1),
            signal: v => v < -100 ? 'bullish' : v > 100 ? 'bearish' : 'neutral',
        },

        // ── Trend ──
        {
            key: 'emaAlignment', label: 'EMA Alignment', category: 'trend',
            format: v => v > 0 ? 'Bullish' : v < 0 ? 'Bearish' : 'Flat',
            signal: v => v > 0 ? 'bullish' : v < 0 ? 'bearish' : 'neutral',
        },
        {
            key: 'ichimoku', label: 'Ichimoku Cloud', category: 'trend',
            format: v => v > 0 ? 'Above Cloud' : v < 0 ? 'Below Cloud' : 'In Cloud',
            signal: v => v > 0 ? 'bullish' : v < 0 ? 'bearish' : 'neutral',
        },
        {
            key: 'adx', label: 'ADX', category: 'trend',
            format: v => v.toFixed(1),
            signal: v => v > 25 ? 'bullish' : 'neutral', // ADX measures trend strength, not direction
        },
        {
            key: 'plusDI', label: '+DI', category: 'trend',
            format: v => v.toFixed(1),
            signal: () => 'neutral', // Context indicator — shown with ADX
        },
        {
            key: 'minusDI', label: '-DI', category: 'trend',
            format: v => v.toFixed(1),
            signal: () => 'neutral',
        },
        {
            key: 'bollinger', label: 'Bollinger %B', category: 'trend',
            format: v => v.toFixed(2),
            signal: v => v < 0.2 ? 'bullish' : v > 0.8 ? 'bearish' : 'neutral',
        },
        {
            key: 'vwap', label: 'VWAP Position', category: 'trend',
            format: v => v > 0 ? 'Above' : v < 0 ? 'Below' : 'At VWAP',
            signal: v => v > 0 ? 'bullish' : v < 0 ? 'bearish' : 'neutral',
        },

        // ── Volume ──
        {
            key: 'obvTrend', label: 'OBV Trend', category: 'volume',
            format: v => v > 0 ? 'Rising ↑' : v < 0 ? 'Falling ↓' : 'Flat',
            signal: v => v > 0 ? 'bullish' : v < 0 ? 'bearish' : 'neutral',
        },
        {
            key: 'volumeRatio', label: 'Volume Ratio', category: 'volume',
            format: v => v.toFixed(2) + 'x',
            signal: v => v > 1.2 ? 'bullish' : v < 0.8 ? 'bearish' : 'neutral',
        },

        // ── Sentiment ──
        // Fear & Greed is external — we build it from the score
        // (No raw key in indicators for this, but we can infer from breakdown)

        // ── Positioning ──
        {
            key: 'fundingRate', label: 'Funding Rate', category: 'positioning',
            format: v => (v * 100).toFixed(4) + '%',
            signal: v => v > 0.3 ? 'bearish' : v < -0.1 ? 'bullish' : 'neutral', // Contrarian
        },
        {
            key: 'oiChange', label: 'OI Change', category: 'positioning',
            format: v => v === 0 ? 'N/A' : (v > 0 ? '+' : '') + v.toFixed(2) + '%',
            signal: v => v === 0 ? 'neutral' : v > 0 ? 'bullish' : 'bearish',
        },
        {
            key: 'basisPremium', label: 'Basis Premium', category: 'positioning',
            format: v => v === 0 ? 'N/A' : (v * 100).toFixed(3) + '%',
            signal: v => v === 0 ? 'neutral' : v > 0.001 ? 'bearish' : v < -0.001 ? 'bullish' : 'neutral',
        },
        {
            key: 'hlVolume', label: 'HL Volume Signal', category: 'positioning',
            format: v => v === 0 ? 'N/A' : v > 0 ? 'Bullish' : 'Bearish',
            signal: v => v === 0 ? 'neutral' : v > 0 ? 'bullish' : 'bearish',
        },

        // ── Volatility (risk-sizing, not scored) ──
        {
            key: 'atr', label: 'ATR (14)', category: 'volatility',
            format: v => v >= 1000 ? '$' + (v / 1000).toFixed(1) + 'K' : v >= 1 ? '$' + v.toFixed(2) : '$' + v.toFixed(4),
            signal: () => 'neutral', // Volatility doesn't have direction
        },
        {
            key: 'zScore', label: 'Z-Score', category: 'volatility',
            format: v => v.toFixed(2),
            signal: v => v > 2 ? 'bearish' : v < -2 ? 'bullish' : 'neutral',
        },
    ];

const CATEGORY_META: Record<string, {
    label: string;
    icon: string;
    color: string;
    bgColor: string;
    borderColor: string;
    note?: string;
}> = {
    momentum: {
        label: 'Momentum',
        icon: '⚡',
        color: '#f59e0b',
        bgColor: 'rgba(245, 158, 11, 0.08)',
        borderColor: 'rgba(245, 158, 11, 0.2)',
    },
    trend: {
        label: 'Trend',
        icon: '📈',
        color: '#3b82f6',
        bgColor: 'rgba(59, 130, 246, 0.08)',
        borderColor: 'rgba(59, 130, 246, 0.2)',
    },
    volume: {
        label: 'Volume',
        icon: '📊',
        color: '#8b5cf6',
        bgColor: 'rgba(139, 92, 246, 0.08)',
        borderColor: 'rgba(139, 92, 246, 0.2)',
    },
    sentiment: {
        label: 'Sentiment',
        icon: '🧠',
        color: '#06b6d4',
        bgColor: 'rgba(6, 182, 212, 0.08)',
        borderColor: 'rgba(6, 182, 212, 0.2)',
    },
    positioning: {
        label: 'Positioning',
        icon: '🎯',
        color: '#10b981',
        bgColor: 'rgba(16, 185, 129, 0.08)',
        borderColor: 'rgba(16, 185, 129, 0.2)',
    },
    volatility: {
        label: 'Volatility',
        icon: '🌊',
        color: '#ef4444',
        bgColor: 'rgba(239, 68, 68, 0.08)',
        borderColor: 'rgba(239, 68, 68, 0.2)',
        note: 'Used for SL/TP sizing — does not contribute to score',
    },
};

const CATEGORY_ORDER = ['momentum', 'trend', 'volume', 'sentiment', 'positioning', 'volatility'] as const;

function SignalArrow({ direction }: { direction: 'bullish' | 'bearish' | 'neutral' }) {
    if (direction === 'bullish') {
        return <span className="text-[#10b981] font-bold text-sm">▲</span>;
    }
    if (direction === 'bearish') {
        return <span className="text-[#ef4444] font-bold text-sm">▼</span>;
    }
    return <span className="text-[#64748b] text-sm">—</span>;
}

export default function SignalDetailModal({ signal, onClose }: SignalDetailModalProps) {
    const { coin, score, direction, indicators, breakdown, agreement } = signal;
    const name = (signal as { name?: string }).name || coin;

    // Lock body scroll when modal is open
    useEffect(() => {
        document.body.style.overflow = 'hidden';
        return () => { document.body.style.overflow = ''; };
    }, []);

    // Close on Escape
    useEffect(() => {
        const handleKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
        window.addEventListener('keydown', handleKey);
        return () => window.removeEventListener('keydown', handleKey);
    }, [onClose]);

    // Group indicators by category
    const grouped = CATEGORY_ORDER.map(cat => ({
        category: cat,
        meta: CATEGORY_META[cat],
        indicators: INDICATOR_CONFIG.filter(i => i.category === cat),
        breakdown: (breakdown as Record<string, { score: number; max: number }>)[cat],
    }));

    // Get direction badge colors
    const dirColor = direction === 'LONG' ? '#10b981' : direction === 'SHORT' ? '#ef4444' : '#9ca3af';
    const dirBg = direction === 'LONG' ? 'rgba(16,185,129,0.15)' : direction === 'SHORT' ? 'rgba(239,68,68,0.15)' : 'rgba(156,163,175,0.15)';

    return createPortal(
        <div
            className="fixed inset-0 z-[100] flex items-center justify-center p-4"
            onClick={onClose}
        >
            {/* Backdrop */}
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />

            {/* Modal */}
            <div
                className="relative w-full max-w-lg max-h-[85vh] overflow-y-auto rounded-2xl border border-[var(--glass-border)]"
                style={{
                    background: 'rgba(255, 255, 255, 0.92)',
                    backdropFilter: 'blur(24px)',
                    WebkitBackdropFilter: 'blur(24px)',
                    boxShadow: '0 25px 60px rgba(15, 23, 42, 0.25), 0 8px 20px rgba(15, 23, 42, 0.1), inset 0 1px 0 rgba(255, 255, 255, 0.5)',
                }}
                onClick={e => e.stopPropagation()}
            >
                {/* Top shine line */}
                <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/60 to-transparent" />

                {/* Header */}
                <div className="sticky top-0 z-10 px-6 pt-5 pb-4 border-b border-[var(--border-secondary)]"
                    style={{ background: 'rgba(255, 255, 255, 0.95)', backdropFilter: 'blur(24px)' }}>
                    <div className="flex items-center justify-between">
                        <div>
                            <h3 className="text-xl font-bold text-[var(--text-primary)]">{name} <span className="text-[var(--text-muted)] font-normal text-base">{coin}</span></h3>
                            <div className="flex items-center gap-3 mt-1.5">
                                <span
                                    className="inline-flex items-center px-3 py-1 text-xs font-bold rounded border"
                                    style={{ color: dirColor, background: dirBg, borderColor: dirColor + '40' }}
                                >
                                    {direction}
                                </span>
                                <span className="text-sm text-[var(--text-muted)]">
                                    Score: <strong className="text-[var(--text-primary)]">{score}</strong>/100
                                </span>
                                <span className="text-sm text-[var(--text-muted)]">
                                    Agreement: <strong className="text-[var(--text-primary)]">{Math.round(agreement * 100)}%</strong>
                                </span>
                            </div>
                        </div>
                        <button
                            onClick={onClose}
                            className="p-2 rounded-lg hover:bg-slate-100 transition-colors text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>
                </div>

                {/* Category Sections */}
                <div className="px-6 py-4 space-y-4">
                    {grouped.map(({ category, meta, indicators: catIndicators, breakdown: catBreakdown }) => {
                        const scoreVal = catBreakdown?.score ?? 0;
                        const maxVal = catBreakdown?.max ?? 1;
                        const pct = maxVal > 0 ? (scoreVal / maxVal) * 100 : 0;

                        return (
                            <div
                                key={category}
                                className="rounded-xl border overflow-hidden"
                                style={{ borderColor: meta.borderColor, background: meta.bgColor }}
                            >
                                {/* Category Header */}
                                <div className="px-4 py-3 flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <span className="text-lg">{meta.icon}</span>
                                        <span className="font-semibold text-sm" style={{ color: meta.color }}>{meta.label}</span>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        {/* Score bar */}
                                        <div className="w-20 h-2 rounded-full bg-slate-200 overflow-hidden">
                                            <div
                                                className="h-full rounded-full transition-all"
                                                style={{
                                                    width: `${Math.min(pct, 100)}%`,
                                                    background: meta.color,
                                                }}
                                            />
                                        </div>
                                        <span className="font-mono text-sm font-bold" style={{ color: meta.color }}>
                                            {Math.round(scoreVal)}/{maxVal}
                                        </span>
                                    </div>
                                </div>

                                {/* Note (for volatility) */}
                                {meta.note && (
                                    <div className="px-4 pb-2 text-xs text-[var(--text-muted)] italic">
                                        {meta.note}
                                    </div>
                                )}

                                {/* Indicator Rows */}
                                <div className="border-t" style={{ borderColor: meta.borderColor }}>
                                    {category === 'sentiment' ? (
                                        // Sentiment is a single external indicator — show it differently
                                        <div className="px-4 py-2.5 flex items-center justify-between">
                                            <span className="text-sm text-[var(--text-secondary)]">Fear & Greed Index</span>
                                            <div className="flex items-center gap-2">
                                                <span className="font-mono text-sm font-semibold text-[var(--text-primary)]">
                                                    {scoreVal > 0 ? `${Math.round(scoreVal)} / ${maxVal}` : 'N/A'}
                                                </span>
                                                <SignalArrow direction={
                                                    scoreVal > 0 && catBreakdown
                                                        ? (scoreVal > maxVal * 0.3 ? 'bullish' : 'neutral')
                                                        : 'neutral'
                                                } />
                                            </div>
                                        </div>
                                    ) : (
                                        catIndicators.map(ind => {
                                            const rawValue = indicators?.[ind.key];
                                            const hasValue = rawValue !== undefined && rawValue !== null;

                                            return (
                                                <div
                                                    key={ind.key}
                                                    className="px-4 py-2 flex items-center justify-between border-t first:border-t-0"
                                                    style={{ borderColor: meta.borderColor + '80' }}
                                                >
                                                    <span className="text-sm text-[var(--text-secondary)]">{ind.label}</span>
                                                    <div className="flex items-center gap-2.5">
                                                        <span className="font-mono text-sm font-semibold text-[var(--text-primary)]">
                                                            {hasValue ? ind.format(rawValue) : 'N/A'}
                                                        </span>
                                                        {hasValue ? (
                                                            <SignalArrow direction={ind.signal(rawValue)} />
                                                        ) : (
                                                            <SignalArrow direction="neutral" />
                                                        )}
                                                    </div>
                                                </div>
                                            );
                                        })
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* Footer */}
                <div className="px-6 py-4 border-t border-[var(--border-secondary)] text-center">
                    <p className="text-xs text-[var(--text-muted)]">
                        All values computed in real-time from 4h candles · 15 technical indicators + Hyperliquid positioning data
                    </p>
                </div>
            </div>
        </div>,
        document.body
    );
}
