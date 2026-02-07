/**
 * Share Utilities
 */

import html2canvas from 'html2canvas';
import { SignalOutput } from '@/lib/engine/scoring';

export async function generatePng(element: HTMLElement): Promise<string> {
    const canvas = await html2canvas(element, {
        backgroundColor: '#0f172a',
        scale: 2,
        useCORS: true,
        logging: false,
    });
    return canvas.toDataURL('image/png');
}

export function downloadPng(dataUrl: string, filename: string): void {
    const link = document.createElement('a');
    link.download = filename;
    link.href = dataUrl;
    link.click();
}

export function openTwitterIntent(signal: SignalOutput): void {
    const emoji = signal.direction === 'LONG' ? '🟢' : signal.direction === 'SHORT' ? '🔴' : '⚪';
    const formatPrice = (p: number) => p >= 1000 ? `$${p.toLocaleString(undefined, { maximumFractionDigits: 0 })}` : p >= 1 ? `$${p.toFixed(2)}` : `$${p.toFixed(4)}`;
    const text = `${emoji} $${signal.coin} ${signal.direction} | Score: ${signal.score}/100

Entry: ${formatPrice(signal.entryPrice)}
TP: ${formatPrice(signal.takeProfit)}
SL: ${formatPrice(signal.stopLoss)}
R:R: ${signal.riskRewardRatio.toFixed(1)}:1

🧠 lisanintel.com`;

    const url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank', 'width=550,height=420');
}
