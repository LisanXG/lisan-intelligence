'use client';

import { SignalOutput } from '@/lib/engine/scoring';

interface ShareableCardProps {
    signal: SignalOutput & { name?: string; image?: string };
}

/**
 * Shareable Signal Card Component
 * 
 * Designed for PNG export and Twitter sharing.
 * Dark theme, eye-catching design with LISAN branding.
 */
export default function ShareableCard({ signal }: ShareableCardProps) {
    const isLong = signal.direction === 'LONG';
    const isShort = signal.direction === 'SHORT';

    const formatPrice = (price: number) => {
        if (price >= 1000) return price.toLocaleString(undefined, { maximumFractionDigits: 0 });
        if (price >= 1) return price.toFixed(2);
        if (price >= 0.01) return price.toFixed(4);
        return price.toFixed(6);
    };

    return (
        <div
            className="shareable-card"
            style={{
                width: '400px',
                padding: '24px',
                background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
                borderRadius: '16px',
                fontFamily: 'Inter, -apple-system, sans-serif',
                color: '#f8fafc',
                position: 'relative',
                overflow: 'hidden',
            }}
        >
            {/* Gradient accent */}
            <div style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                height: '4px',
                background: isLong
                    ? 'linear-gradient(90deg, #10b981, #34d399)'
                    : isShort
                        ? 'linear-gradient(90deg, #ef4444, #f87171)'
                        : 'linear-gradient(90deg, #64748b, #94a3b8)',
            }} />

            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
                <div>
                    <div style={{ fontSize: '12px', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '4px' }}>
                        Signal
                    </div>
                    <div style={{ fontSize: '28px', fontWeight: '700', letterSpacing: '-0.02em' }}>
                        {signal.name || signal.coin}
                    </div>
                </div>

                {/* Direction Badge */}
                <div style={{
                    padding: '8px 16px',
                    borderRadius: '8px',
                    fontWeight: '700',
                    fontSize: '14px',
                    background: isLong ? 'rgba(16, 185, 129, 0.2)' : isShort ? 'rgba(239, 68, 68, 0.2)' : 'rgba(100, 116, 139, 0.2)',
                    color: isLong ? '#34d399' : isShort ? '#f87171' : '#94a3b8',
                }}>
                    {signal.direction}
                </div>
            </div>

            {/* Score */}
            <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                marginBottom: '24px',
                padding: '16px',
                background: 'rgba(255, 255, 255, 0.05)',
                borderRadius: '12px',
            }}>
                <div style={{
                    fontSize: '48px',
                    fontWeight: '800',
                    color: signal.score >= 70 ? '#10b981' : signal.score >= 55 ? '#f59e0b' : '#ef4444',
                    lineHeight: 1,
                }}>
                    {signal.score}
                </div>
                <div>
                    <div style={{ fontSize: '14px', color: '#94a3b8' }}>Confidence Score</div>
                    <div style={{ fontSize: '12px', color: '#64748b' }}>out of 100</div>
                </div>
            </div>

            {/* Price Levels */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', marginBottom: '24px' }}>
                <div style={{ background: 'rgba(255, 255, 255, 0.03)', padding: '12px', borderRadius: '8px' }}>
                    <div style={{ fontSize: '11px', color: '#64748b', marginBottom: '4px' }}>Entry</div>
                    <div style={{ fontSize: '16px', fontWeight: '600', fontFamily: 'monospace' }}>
                        ${formatPrice(signal.entryPrice)}
                    </div>
                </div>
                <div style={{ background: 'rgba(239, 68, 68, 0.1)', padding: '12px', borderRadius: '8px' }}>
                    <div style={{ fontSize: '11px', color: '#f87171', marginBottom: '4px' }}>Stop Loss</div>
                    <div style={{ fontSize: '16px', fontWeight: '600', fontFamily: 'monospace', color: '#f87171' }}>
                        ${formatPrice(signal.stopLoss)}
                    </div>
                </div>
                <div style={{ background: 'rgba(16, 185, 129, 0.1)', padding: '12px', borderRadius: '8px' }}>
                    <div style={{ fontSize: '11px', color: '#34d399', marginBottom: '4px' }}>Take Profit</div>
                    <div style={{ fontSize: '16px', fontWeight: '600', fontFamily: 'monospace', color: '#34d399' }}>
                        ${formatPrice(signal.takeProfit)}
                    </div>
                </div>
            </div>

            {/* R:R Ratio */}
            <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '12px 16px',
                background: 'rgba(6, 182, 212, 0.1)',
                borderRadius: '8px',
                marginBottom: '24px',
            }}>
                <span style={{ fontSize: '13px', color: '#94a3b8' }}>Risk:Reward</span>
                <span style={{ fontSize: '18px', fontWeight: '700', color: '#22d3ee' }}>
                    {signal.riskRewardRatio.toFixed(1)}:1
                </span>
            </div>

            {/* Footer Branding */}
            <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                paddingTop: '16px',
                borderTop: '1px solid rgba(255, 255, 255, 0.1)',
            }}>
                <div>
                    <div style={{ fontSize: '14px', fontWeight: '600', color: '#f8fafc' }}>LISAN INTELLIGENCE</div>
                    <div style={{ fontSize: '11px', color: '#64748b' }}>lisanintel.com</div>
                </div>
                <div style={{
                    fontSize: '10px',
                    color: '#475569',
                    textAlign: 'right',
                }}>
                    {new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                </div>
            </div>
        </div>
    );
}
