'use client';

import { SignalOutput } from '@/lib/engine';
import { useState, useEffect, useCallback } from 'react';
import ShareButton from './ShareButton';
import SignalDetailModal from './SignalDetailModal';
import { useAuth } from '@/context/auth-context';
import {
    isInWatchlist as isInWatchlistDb,
    addToWatchlist,
    removeFromWatchlist
} from '@/lib/supabase';

// Simple helper to get score bucket context (placeholder until real stats API)
function getScoreBucketWinRate(score: number): { winRate: number; sampleSize: number } | null {
    // Return null as we don't have historical data yet
    // This will be populated once the proof-stats API has enough data
    return null;
}

interface SignalCardProps {
    signal: SignalOutput & { name?: string; image?: string };
    sparklineData?: number[];
    onWatchlistChange?: () => void;
}

/**
 * Premium Signal Card Component
 * Clean layout with proper hierarchy and readable text
 */
export default function SignalCard({ signal, sparklineData, onWatchlistChange }: SignalCardProps) {
    const { user } = useAuth();
    const { coin, direction, score, entryPrice, stopLoss, takeProfit, riskRewardRatio, breakdown } = signal;
    const image = (signal as { image?: string }).image;
    const name = (signal as { name?: string }).name || coin;

    const [imgError, setImgError] = useState(false);
    const [isWatched, setIsWatched] = useState(false);
    const [showDetail, setShowDetail] = useState(false);
    const [bucketContext, setBucketContext] = useState<{ winRate: number; sampleSize: number } | null>(null);

    // Check watchlist status on mount
    const checkWatchlistStatus = useCallback(async () => {
        if (!user) return;
        const inWatchlist = await isInWatchlistDb(user.id, coin);
        setIsWatched(inWatchlist);
    }, [user, coin]);

    // Compute bucket context synchronously (not in effect)
    const bucketContextValue = getScoreBucketWinRate(score);

    // eslint-disable-next-line react-hooks/set-state-in-effect
    useEffect(() => {
        // Fetch watchlist status on mount - this async pattern is intentional
        checkWatchlistStatus();
        setBucketContext(bucketContextValue);
    }, [checkWatchlistStatus, bucketContextValue]);

    // Handle watchlist toggle
    const handleWatchlistClick = async (e: React.MouseEvent) => {
        e.stopPropagation();
        if (!user) return;

        if (isWatched) {
            await removeFromWatchlist(user.id, coin);
            setIsWatched(false);
        } else {
            await addToWatchlist(user.id, coin, entryPrice);
            setIsWatched(true);
        }
        onWatchlistChange?.();
    };

    // Score styling
    const getScoreClass = () => {
        if (score >= 70) return 'score-badge-high';
        if (score >= 40) return 'score-badge-medium';
        return 'score-badge-low';
    };

    // Direction badge
    const getDirectionBadge = () => {
        const baseClass = "inline-flex items-center px-4 py-1.5 text-sm font-bold rounded border border-black/30";
        switch (direction) {
            case 'LONG':
                return <span className={`${baseClass} bg-[rgba(5,150,105,0.2)] text-[#10b981]`}>LONG</span>;
            case 'SHORT':
                return <span className={`${baseClass} bg-[rgba(220,38,38,0.2)] text-[#ef4444]`}>SHORT</span>;
            default:
                return <span className={`${baseClass} bg-[rgba(156,163,175,0.2)] text-[#9ca3af]`}>HOLD</span>;
        }
    };

    // Format price
    const formatPrice = (price: number) => {
        if (price >= 1000) return `$${(price / 1000).toFixed(2)}K`;
        if (price >= 1) return `$${price.toFixed(2)}`;
        return `$${price.toFixed(4)}`;
    };

    // Sparkline chart
    const renderSparkline = () => {
        if (!sparklineData || sparklineData.length < 2) return null;

        const min = Math.min(...sparklineData);
        const max = Math.max(...sparklineData);
        const range = max - min || 1;
        const height = 70;
        const width = 200;

        const points = sparklineData.map((val, i) => {
            const x = (i / (sparklineData.length - 1)) * width;
            const y = height - ((val - min) / range) * (height - 8) - 4;
            return `${x},${y}`;
        }).join(' ');

        const areaPoints = `0,${height} ${points} ${width},${height}`;
        const isPositive = sparklineData[sparklineData.length - 1] > sparklineData[0];
        const lineColor = isPositive ? '#10b981' : '#ef4444';
        const fillColor = isPositive ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.15)';

        return (
            <div className="w-full mt-4 mb-3">
                <svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none">
                    <polygon points={areaPoints} fill={fillColor} />
                    <polyline
                        points={points}
                        fill="none"
                        stroke={lineColor}
                        strokeWidth="2"
                        vectorEffect="non-scaling-stroke"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                    />
                </svg>
                <div className="text-xs text-[#9ca3af] text-right mt-1">7 Day</div>
            </div>
        );
    };

    return (
        <div className="card p-6 cursor-pointer hover:border-[var(--accent-cyan)] transition-all">
            {/* Row 1: Logo + Name + Star + Score */}
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                    {image && !imgError ? (
                        <img
                            src={image}
                            alt={coin}
                            onError={() => setImgError(true)}
                            className="w-11 h-11 rounded-full"
                        />
                    ) : (
                        <div className="w-11 h-11 rounded-full bg-gradient-to-br from-[var(--accent-cyan)] to-[var(--accent-purple)] flex items-center justify-center text-white font-bold text-sm">
                            {coin.slice(0, 3)}
                        </div>
                    )}
                    <div>
                        <div className="font-semibold text-lg">{name}</div>
                        <div className="text-sm text-[#9ca3af] uppercase tracking-wide">{coin}</div>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    {/* Details Button */}
                    <button
                        onClick={(e) => { e.stopPropagation(); setShowDetail(true); }}
                        className="p-2 rounded-lg text-slate-400 hover:text-[var(--accent-cyan)] hover:bg-slate-50 transition-all"
                        title="View indicator details"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                        </svg>
                    </button>
                    {/* Share Button */}
                    <ShareButton signal={signal} />
                    {/* Watchlist Star Button */}
                    <button
                        onClick={handleWatchlistClick}
                        className={`p-2 rounded-lg transition-all ${isWatched
                            ? 'text-amber-500 hover:bg-amber-50'
                            : 'text-slate-300 hover:text-amber-400 hover:bg-slate-50'
                            }`}
                        title={isWatched ? 'Remove from watchlist' : 'Add to watchlist'}
                    >
                        <svg className="w-6 h-6" fill={isWatched ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                        </svg>
                    </button>
                    <div className={`score-badge ${getScoreClass()} border border-black/30 text-4xl px-5 py-3 font-bold`} style={{ WebkitTextStroke: '0.5px black' } as React.CSSProperties}>{score}</div>
                </div>
            </div>

            {/* Row 2: Direction + Price */}
            <div className="flex items-center justify-between mb-2">
                {getDirectionBadge()}
                <div className="font-mono text-2xl font-bold">{formatPrice(entryPrice)}</div>
            </div>

            {/* Row 3: Chart */}
            {renderSparkline()}

            {/* Row 4: Stop/Target/R:R — hidden for HOLD (no risk levels exist) */}
            <div className="flex justify-between text-base py-3 border-t border-[var(--border-secondary)]">
                <div>
                    <span className="text-[#9ca3af]">SL </span>
                    <span className="font-mono font-semibold text-[#ef4444]">{direction === 'HOLD' ? '—' : formatPrice(stopLoss)}</span>
                </div>
                <div>
                    <span className="text-[#9ca3af]">TP </span>
                    <span className="font-mono font-semibold text-[#10b981]">{direction === 'HOLD' ? '—' : formatPrice(takeProfit)}</span>
                </div>
                <div>
                    <span className="text-[#9ca3af]">R:R </span>
                    <span className="font-mono font-bold text-[#06b6d4]">{direction === 'HOLD' ? '—' : `1:${riskRewardRatio.toFixed(1)}`}</span>
                </div>
            </div>

            {/* Row 5: Score breakdown — all 5 categories */}
            <div className="flex justify-between text-base pt-3 border-t border-[var(--border-secondary)] text-[#9ca3af]">
                <span>Mom: <strong className="text-[var(--text-primary)]">{Math.round(breakdown.momentum.score)}</strong></span>
                <span>Trend: <strong className="text-[var(--text-primary)]">{Math.round(breakdown.trend.score)}</strong></span>
                <span>Vol: <strong className="text-[var(--text-primary)]">{Math.round(breakdown.volume.score)}</strong></span>
                <span>Sent: <strong className="text-[var(--text-primary)]">{Math.round(breakdown.sentiment.score)}</strong></span>
                <span>Pos: <strong className="text-[var(--text-primary)]">{Math.round(breakdown.positioning.score)}</strong></span>
            </div>

            {/* Row 6: Score bucket context (only if enough historical data) */}
            {bucketContext && bucketContext.sampleSize >= 10 && (
                <div className="text-xs text-center pt-2 text-[var(--text-muted)]">
                    Signals in this range: <span className={bucketContext.winRate >= 50 ? 'text-[var(--accent-green)]' : 'text-[var(--accent-orange)]'}>{bucketContext.winRate.toFixed(0)}% win rate</span> ({bucketContext.sampleSize} signals)
                </div>
            )}

            {/* Detail Modal */}
            {showDetail && (
                <SignalDetailModal signal={signal} onClose={() => setShowDetail(false)} />
            )}
        </div>
    );
}
