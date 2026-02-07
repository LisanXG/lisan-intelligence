'use client';

import { SignalOutput } from '@/lib/engine/scoring';

interface ShareableCardProps {
    signal: SignalOutput & { name?: string; image?: string };
}

/**
 * Premium Shareable Signal Card
 * 
 * Dark-mode frosted design for PNG export and Twitter sharing.
 * Shows score breakdown, risk levels, and LISAN branding.
 */
export default function ShareableCard({ signal }: ShareableCardProps) {
    const isLong = signal.direction === 'LONG';
    const isShort = signal.direction === 'SHORT';
    const dirColor = isLong ? '#10b981' : isShort ? '#ef4444' : '#64748b';
    const dirGlow = isLong ? 'rgba(16,185,129,0.3)' : isShort ? 'rgba(239,68,68,0.3)' : 'rgba(100,116,139,0.2)';

    const formatPrice = (price: number) => {
        if (price >= 1000) return `$${price.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
        if (price >= 1) return `$${price.toFixed(2)}`;
        if (price >= 0.01) return `$${price.toFixed(4)}`;
        return `$${price.toFixed(6)}`;
    };

    const scoreColor = signal.score >= 70 ? '#10b981' : signal.score >= 40 ? '#f59e0b' : '#ef4444';

    // Category breakdown bars
    const categories = [
        { label: 'Mom', score: signal.breakdown.momentum.score, max: signal.breakdown.momentum.max, color: '#f59e0b' },
        { label: 'Trend', score: signal.breakdown.trend.score, max: signal.breakdown.trend.max, color: '#3b82f6' },
        { label: 'Vol', score: signal.breakdown.volume.score, max: signal.breakdown.volume.max, color: '#8b5cf6' },
        { label: 'Sent', score: signal.breakdown.sentiment.score, max: signal.breakdown.sentiment.max, color: '#06b6d4' },
        { label: 'Pos', score: signal.breakdown.positioning.score, max: signal.breakdown.positioning.max, color: '#10b981' },
    ];

    return (
        <div
            className="shareable-card"
            style={{
                width: '420px',
                padding: '0',
                background: '#0c1222',
                borderRadius: '20px',
                fontFamily: 'Inter, -apple-system, sans-serif',
                color: '#f8fafc',
                position: 'relative',
                overflow: 'hidden',
                border: '1px solid rgba(255,255,255,0.08)',
            }}
        >
            {/* Top gradient accent bar */}
            <div style={{
                height: '3px',
                background: `linear-gradient(90deg, transparent, ${dirColor}, transparent)`,
            }} />

            {/* Inner content */}
            <div style={{ padding: '28px 28px 24px' }}>

                {/* Header: Coin + Direction + Score */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px' }}>
                    <div>
                        <div style={{
                            fontSize: '11px',
                            fontWeight: '600',
                            color: '#64748b',
                            textTransform: 'uppercase',
                            letterSpacing: '0.15em',
                            marginBottom: '6px',
                        }}>
                            LISAN SIGNAL
                        </div>-
                        <div style={{
                            fontSize: '30px',
                            fontWeight: '800',
                            letterSpacing: '-0.03em',
                            lineHeight: 1.1,
                        }}>
                            {signal.name || signal.coin}
                        </div>
                        <div style={{ fontSize: '13px', color: '#64748b', marginTop: '2px' }}>
                            ${signal.coin}
                        </div>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '8px' }}>
                        {/* Direction Badge */}
                        <div style={{
                            padding: '6px 18px',
                            borderRadius: '8px',
                            fontWeight: '800',
                            fontSize: '13px',
                            letterSpacing: '0.05em',
                            background: `rgba(${isLong ? '16,185,129' : isShort ? '239,68,68' : '100,116,139'}, 0.15)`,
                            color: dirColor,
                            border: `1px solid ${dirColor}40`,
                        }}>
                            {signal.direction}
                        </div>
                        {/* Score */}
                        <div style={{
                            fontSize: '44px',
                            fontWeight: '900',
                            color: scoreColor,
                            lineHeight: 1,
                            textShadow: `0 0 30px ${scoreColor}40`,
                        }}>
                            {signal.score}
                        </div>
                    </div>
                </div>

                {/* Score Breakdown mini-bars */}
                <div style={{
                    display: 'flex',
                    gap: '6px',
                    marginBottom: '24px',
                    padding: '14px 16px',
                    background: 'rgba(255,255,255,0.03)',
                    borderRadius: '12px',
                    border: '1px solid rgba(255,255,255,0.05)',
                }}>
                    {categories.map(cat => (
                        <div key={cat.label} style={{ flex: 1, textAlign: 'center' }}>
                            <div style={{ fontSize: '10px', color: '#64748b', marginBottom: '6px', fontWeight: '500' }}>
                                {cat.label}
                            </div>
                            <div style={{
                                height: '4px',
                                borderRadius: '2px',
                                background: 'rgba(255,255,255,0.06)',
                                overflow: 'hidden',
                                marginBottom: '4px',
                            }}>
                                <div style={{
                                    height: '100%',
                                    borderRadius: '2px',
                                    width: `${cat.max > 0 ? Math.min((cat.score / cat.max) * 100, 100) : 0}%`,
                                    background: cat.color,
                                }} />
                            </div>
                            <div style={{ fontSize: '11px', fontWeight: '700', color: '#e2e8f0', fontFamily: 'monospace' }}>
                                {Math.round(cat.score)}
                            </div>
                        </div>
                    ))}
                </div>

                {/* Price levels */}
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr 1fr',
                    gap: '8px',
                    marginBottom: '12px',
                }}>
                    <div style={{
                        padding: '14px 12px',
                        borderRadius: '10px',
                        background: 'rgba(255,255,255,0.03)',
                        border: '1px solid rgba(255,255,255,0.06)',
                    }}>
                        <div style={{ fontSize: '10px', color: '#94a3b8', fontWeight: '500', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Entry</div>
                        <div style={{ fontSize: '16px', fontWeight: '700', fontFamily: 'monospace', color: '#f8fafc' }}>
                            {formatPrice(signal.entryPrice)}
                        </div>
                    </div>
                    <div style={{
                        padding: '14px 12px',
                        borderRadius: '10px',
                        background: 'rgba(239, 68, 68, 0.06)',
                        border: '1px solid rgba(239,68,68,0.15)',
                    }}>
                        <div style={{ fontSize: '10px', color: '#f87171', fontWeight: '500', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Stop Loss</div>
                        <div style={{ fontSize: '16px', fontWeight: '700', fontFamily: 'monospace', color: '#f87171' }}>
                            {formatPrice(signal.stopLoss)}
                        </div>
                    </div>
                    <div style={{
                        padding: '14px 12px',
                        borderRadius: '10px',
                        background: 'rgba(16, 185, 129, 0.06)',
                        border: '1px solid rgba(16,185,129,0.15)',
                    }}>
                        <div style={{ fontSize: '10px', color: '#34d399', fontWeight: '500', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Take Profit</div>
                        <div style={{ fontSize: '16px', fontWeight: '700', fontFamily: 'monospace', color: '#34d399' }}>
                            {formatPrice(signal.takeProfit)}
                        </div>
                    </div>
                </div>

                {/* R:R Bar */}
                <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '12px 16px',
                    borderRadius: '10px',
                    background: 'rgba(6,182,212,0.08)',
                    border: '1px solid rgba(6,182,212,0.12)',
                    marginBottom: '20px',
                }}>
                    <span style={{ fontSize: '12px', color: '#94a3b8', fontWeight: '500' }}>Risk : Reward</span>
                    <span style={{
                        fontSize: '18px',
                        fontWeight: '800',
                        color: '#22d3ee',
                        letterSpacing: '-0.02em',
                    }}>
                        1:{signal.riskRewardRatio.toFixed(1)}
                    </span>
                </div>

                {/* Footer Branding */}
                <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    paddingTop: '16px',
                    borderTop: '1px solid rgba(255,255,255,0.06)',
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        {/* Official Logo SVG */}
                        <div style={{
                            width: '28px',
                            height: '28px',
                            borderRadius: '7px',
                            background: '#1e293b',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0,
                        }}>
                            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="#94a3b8" strokeWidth="2.5">
                                <path d="M6 4v16M6 20h12" strokeLinecap="round" strokeLinejoin="round" />
                                <path d="M10 8h8M10 12h6" strokeLinecap="round" strokeOpacity="0.6" />
                            </svg>
                        </div>
                        <div>
                            <div style={{ fontSize: '13px', fontWeight: '700', color: '#e2e8f0', letterSpacing: '0.03em', lineHeight: 1.2 }}>LISAN INTELLIGENCE</div>
                            <div style={{ fontSize: '10px', color: '#64748b', lineHeight: 1.2 }}>lisanintel.com</div>
                        </div>
                    </div>
                    <div style={{
                        fontSize: '11px',
                        color: '#475569',
                        textAlign: 'right',
                    }}>
                        {new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </div>
                </div>
            </div>

            {/* Bottom glow line */}
            <div style={{
                height: '2px',
                background: `linear-gradient(90deg, transparent, ${dirGlow}, transparent)`,
            }} />
        </div>
    );
}
