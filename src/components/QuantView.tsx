'use client';

import { useState } from 'react';
import { SignalOutput } from '@/lib/engine/scoring';
import { downloadCSV } from '@/lib/export';

interface QuantViewProps {
    signals: (SignalOutput & { name?: string; image?: string })[];
}

type SortKey = 'score' | 'coin' | 'direction' | 'entry' | 'rr' | 'timestamp';
type SortDir = 'asc' | 'desc';

/**
 * Quant View Component
 * 
 * Dense data table for serious traders who want raw numbers.
 * Features sortable columns and CSV export.
 */
export default function QuantView({ signals }: QuantViewProps) {
    const [sortKey, setSortKey] = useState<SortKey>('score');
    const [sortDir, setSortDir] = useState<SortDir>('desc');

    // Sort signals
    const sortedSignals = [...signals].sort((a, b) => {
        let aVal: number | string;
        let bVal: number | string;

        switch (sortKey) {
            case 'score':
                aVal = a.score;
                bVal = b.score;
                break;
            case 'coin':
                aVal = a.coin;
                bVal = b.coin;
                break;
            case 'direction':
                aVal = a.direction;
                bVal = b.direction;
                break;
            case 'entry':
                aVal = a.entryPrice;
                bVal = b.entryPrice;
                break;
            case 'rr':
                aVal = a.riskRewardRatio;
                bVal = b.riskRewardRatio;
                break;
            case 'timestamp':
                aVal = new Date(a.timestamp).getTime();
                bVal = new Date(b.timestamp).getTime();
                break;
            default:
                aVal = a.score;
                bVal = b.score;
        }

        if (typeof aVal === 'string' && typeof bVal === 'string') {
            return sortDir === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
        }
        return sortDir === 'asc' ? (aVal as number) - (bVal as number) : (bVal as number) - (aVal as number);
    });

    // Handle column header click
    const handleSort = (key: SortKey) => {
        if (sortKey === key) {
            setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
        } else {
            setSortKey(key);
            setSortDir('desc');
        }
    };

    // Sort indicator
    const SortIcon = ({ column }: { column: SortKey }) => {
        if (sortKey !== column) return null;
        return (
            <span className="ml-1">
                {sortDir === 'asc' ? '↑' : '↓'}
            </span>
        );
    };

    // Format price
    const formatPrice = (price: number) => {
        if (price >= 1000) return `$${price.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
        if (price >= 1) return `$${price.toFixed(2)}`;
        return `$${price.toFixed(4)}`;
    };

    // Handle CSV export
    const handleExport = () => {
        downloadCSV(sortedSignals, `lisan_signals_${new Date().toISOString().split('T')[0]}.csv`);
    };

    return (
        <div className="card overflow-hidden">
            {/* Header with export button */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border-secondary)]">
                <div className="text-sm text-[var(--text-muted)]">
                    {signals.length} signal{signals.length !== 1 ? 's' : ''}
                </div>
                <button
                    onClick={handleExport}
                    className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] bg-[var(--bg-secondary)] hover:bg-[var(--bg-tertiary)] rounded-lg transition-all"
                >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                        <polyline points="7 10 12 15 17 10" />
                        <line x1="12" y1="15" x2="12" y2="3" />
                    </svg>
                    Export CSV
                </button>
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
                <table className="w-full text-sm">
                    <thead>
                        <tr className="border-b border-[var(--border-primary)] bg-[var(--bg-secondary)]">
                            <th
                                onClick={() => handleSort('coin')}
                                className="text-left py-3 px-4 text-[var(--text-muted)] font-medium cursor-pointer hover:text-[var(--text-primary)] transition-colors"
                            >
                                Coin <SortIcon column="coin" />
                            </th>
                            <th
                                onClick={() => handleSort('direction')}
                                className="text-left py-3 px-4 text-[var(--text-muted)] font-medium cursor-pointer hover:text-[var(--text-primary)] transition-colors"
                            >
                                Dir <SortIcon column="direction" />
                            </th>
                            <th
                                onClick={() => handleSort('score')}
                                className="text-center py-3 px-4 text-[var(--text-muted)] font-medium cursor-pointer hover:text-[var(--text-primary)] transition-colors"
                            >
                                Score <SortIcon column="score" />
                            </th>
                            <th
                                onClick={() => handleSort('entry')}
                                className="text-right py-3 px-4 text-[var(--text-muted)] font-medium cursor-pointer hover:text-[var(--text-primary)] transition-colors"
                            >
                                Entry <SortIcon column="entry" />
                            </th>
                            <th className="text-right py-3 px-4 text-[var(--text-muted)] font-medium">
                                SL
                            </th>
                            <th className="text-right py-3 px-4 text-[var(--text-muted)] font-medium">
                                TP
                            </th>
                            <th
                                onClick={() => handleSort('rr')}
                                className="text-center py-3 px-4 text-[var(--text-muted)] font-medium cursor-pointer hover:text-[var(--text-primary)] transition-colors"
                            >
                                R:R <SortIcon column="rr" />
                            </th>
                            <th
                                onClick={() => handleSort('timestamp')}
                                className="text-right py-3 px-4 text-[var(--text-muted)] font-medium cursor-pointer hover:text-[var(--text-primary)] transition-colors"
                            >
                                Time <SortIcon column="timestamp" />
                            </th>
                        </tr>
                    </thead>
                    <tbody>
                        {sortedSignals.map((signal, idx) => (
                            <tr
                                key={`${signal.coin}-${idx}`}
                                className="border-b border-[var(--border-secondary)] hover:bg-[var(--bg-secondary)] transition-colors"
                            >
                                <td className="py-3 px-4">
                                    <div className="flex items-center gap-2">
                                        {signal.image ? (
                                            <img src={signal.image} alt={signal.coin} className="w-5 h-5 rounded-full" />
                                        ) : (
                                            <div className="w-5 h-5 rounded-full bg-gradient-to-br from-[var(--accent-cyan)] to-[var(--accent-purple)] flex items-center justify-center text-[8px] text-white font-bold">
                                                {signal.coin.slice(0, 2)}
                                            </div>
                                        )}
                                        <span className="font-medium">{signal.coin}</span>
                                    </div>
                                </td>
                                <td className="py-3 px-4">
                                    <span className={`text-xs font-semibold px-2 py-0.5 rounded ${signal.direction === 'LONG' ? 'bg-[rgba(16,185,129,0.15)] text-[var(--accent-green)]' :
                                            signal.direction === 'SHORT' ? 'bg-[rgba(239,68,68,0.15)] text-[var(--accent-red)]' :
                                                'bg-[rgba(100,116,139,0.15)] text-[var(--text-muted)]'
                                        }`}>
                                        {signal.direction}
                                    </span>
                                </td>
                                <td className="py-3 px-4 text-center">
                                    <span className={`font-bold ${signal.score >= 70 ? 'text-[var(--accent-green)]' :
                                            signal.score >= 55 ? 'text-[var(--accent-orange)]' :
                                                'text-[var(--accent-red)]'
                                        }`}>
                                        {signal.score}
                                    </span>
                                </td>
                                <td className="py-3 px-4 text-right font-mono text-xs">
                                    {formatPrice(signal.entryPrice)}
                                </td>
                                <td className="py-3 px-4 text-right font-mono text-xs text-[var(--accent-red)]">
                                    {formatPrice(signal.stopLoss)}
                                </td>
                                <td className="py-3 px-4 text-right font-mono text-xs text-[var(--accent-green)]">
                                    {formatPrice(signal.takeProfit)}
                                </td>
                                <td className="py-3 px-4 text-center font-mono text-xs text-[var(--accent-cyan)]">
                                    {signal.riskRewardRatio.toFixed(1)}:1
                                </td>
                                <td className="py-3 px-4 text-right text-xs text-[var(--text-muted)]">
                                    {new Date(signal.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {signals.length === 0 && (
                <div className="py-12 text-center text-[var(--text-muted)]">
                    No signals available
                </div>
            )}
        </div>
    );
}
