/**
 * LISAN INTELLIGENCE — CSV Export Utility
 * 
 * Generates CSV files from signal data for download.
 */

import { SignalOutput } from './engine/scoring';

// ============================================================================
// CSV GENERATION
// ============================================================================

/**
 * Convert signals array to CSV string
 */
export function signalsToCSV(signals: SignalOutput[]): string {
    const headers = [
        'Coin',
        'Direction',
        'Score',
        'Entry Price',
        'Stop Loss',
        'Take Profit',
        'Risk:Reward',
        'Momentum Score',
        'Trend Score',
        'Volume Score',
        'Sentiment Score',
        'Timestamp',
    ];

    const rows = signals.map(signal => [
        signal.coin,
        signal.direction,
        signal.score.toString(),
        signal.entryPrice.toString(),
        signal.stopLoss.toString(),
        signal.takeProfit.toString(),
        signal.riskRewardRatio.toFixed(2),
        signal.breakdown.momentum.score.toFixed(1),
        signal.breakdown.trend.score.toFixed(1),
        signal.breakdown.volume.score.toFixed(1),
        signal.breakdown.sentiment.score.toFixed(1),
        new Date(signal.timestamp).toISOString(),
    ]);

    const csvContent = [
        headers.join(','),
        ...rows.map(row => row.map(cell => `"${cell}"`).join(',')),
    ].join('\n');

    return csvContent;
}

/**
 * Download CSV file
 */
export function downloadCSV(signals: SignalOutput[], filename?: string): void {
    const csv = signalsToCSV(signals);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);

    const link = document.createElement('a');
    link.href = url;
    link.download = filename || `lisan_signals_${Date.now()}.csv`;
    link.click();

    URL.revokeObjectURL(url);
}
