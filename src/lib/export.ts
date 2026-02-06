/**
 * CSV Export Utility
 */

import { SignalOutput } from '@/lib/engine/scoring';

export function downloadCSV(
    signals: (SignalOutput & { name?: string; image?: string })[],
    filename: string
): void {
    const headers = ['Coin', 'Direction', 'Score', 'Entry', 'StopLoss', 'TakeProfit', 'R:R', 'Timestamp'];

    const rows = signals.map(s => [
        s.coin,
        s.direction,
        s.score.toString(),
        s.entryPrice.toString(),
        s.stopLoss.toString(),
        s.takeProfit.toString(),
        s.riskRewardRatio.toFixed(2),
        new Date(s.timestamp).toISOString(),
    ]);

    const csvContent = [
        headers.join(','),
        ...rows.map(row => row.join(',')),
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}
