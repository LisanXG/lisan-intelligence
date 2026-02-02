/**
 * CRON: Signal Monitor
 * 
 * Checks all PENDING signals against current prices.
 * Updates outcomes (WON/LOST) when SL/TP is hit.
 * 
 * Called every 5 minutes by external cron service.
 */

import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/logger';
import {
    getAllPendingSignals,
    updateSignalOutcomeServer,
    DbSignal,
} from '@/lib/supabaseServer';

const HYPERLIQUID_API = 'https://api.hyperliquid.xyz/info';

interface HyperliquidAssetCtx {
    markPx: string;
}

interface HyperliquidMeta {
    universe: { name: string }[];
}

/**
 * Fetch current prices from Hyperliquid
 */
async function fetchCurrentPrices(): Promise<Map<string, number>> {
    try {
        const response = await fetch(HYPERLIQUID_API, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ type: 'metaAndAssetCtxs' }),
        });

        if (!response.ok) return new Map();

        const [meta, assetCtxs] = await response.json() as [HyperliquidMeta, HyperliquidAssetCtx[]];
        const prices = new Map<string, number>();

        meta.universe.forEach((asset, idx) => {
            const ctx = assetCtxs[idx];
            if (ctx?.markPx) {
                prices.set(asset.name.toUpperCase(), parseFloat(ctx.markPx));
            }
        });

        return prices;
    } catch (error) {
        console.error('[Cron Monitor] Error fetching prices:', error);
        return new Map();
    }
}

/**
 * Check if a signal hit SL or TP
 */
function checkSignalOutcome(
    signal: DbSignal,
    currentPrice: number
): { hit: boolean; outcome?: 'WON' | 'LOST'; exitReason?: 'STOP_LOSS' | 'TAKE_PROFIT' | 'TARGET_3_PERCENT'; profitPct?: number } {
    const { direction, entry_price, stop_loss, take_profit } = signal;
    const WIN_THRESHOLD_PCT = 3;

    if (direction === 'LONG') {
        const profitPct = ((currentPrice - entry_price) / entry_price) * 100;

        if (currentPrice >= take_profit) {
            return { hit: true, outcome: 'WON', exitReason: 'TAKE_PROFIT', profitPct };
        }
        if (profitPct >= WIN_THRESHOLD_PCT) {
            return { hit: true, outcome: 'WON', exitReason: 'TARGET_3_PERCENT', profitPct };
        }
        if (currentPrice <= stop_loss) {
            return { hit: true, outcome: 'LOST', exitReason: 'STOP_LOSS', profitPct };
        }
    } else if (direction === 'SHORT') {
        const profitPct = ((entry_price - currentPrice) / entry_price) * 100;

        if (currentPrice <= take_profit) {
            return { hit: true, outcome: 'WON', exitReason: 'TAKE_PROFIT', profitPct };
        }
        if (profitPct >= WIN_THRESHOLD_PCT) {
            return { hit: true, outcome: 'WON', exitReason: 'TARGET_3_PERCENT', profitPct };
        }
        if (currentPrice >= stop_loss) {
            return { hit: true, outcome: 'LOST', exitReason: 'STOP_LOSS', profitPct };
        }
    }

    return { hit: false };
}

export async function GET(request: NextRequest) {
    // Verify cron secret (prevents random people from triggering)
    const secret = request.nextUrl.searchParams.get('secret');
    const cronSecret = process.env.CRON_SECRET;

    // SECURITY: Fail-closed - reject if secret missing or doesn't match
    if (!cronSecret || secret !== cronSecret) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const log = logger.withContext('CronMonitor');
    const startTime = Date.now();

    try {
        // 1. Get all pending signals
        const pendingSignals = await getAllPendingSignals();
        log.debug(`Found ${pendingSignals.length} pending signals`);

        if (pendingSignals.length === 0) {
            return NextResponse.json({
                success: true,
                monitored: 0,
                updated: [],
                duration: Date.now() - startTime,
            });
        }

        // 2. Fetch current prices
        const prices = await fetchCurrentPrices();
        log.debug(`Fetched prices for ${prices.size} assets`);

        // 3. Check each signal
        const updates: { id: string; coin: string; outcome: string; profitPct: number }[] = [];

        for (const signal of pendingSignals) {
            const currentPrice = prices.get(signal.coin.toUpperCase());

            if (!currentPrice) {
                log.debug(`No price for ${signal.coin}, skipping`);
                continue;
            }

            const result = checkSignalOutcome(signal, currentPrice);

            if (result.hit && result.outcome && result.exitReason && result.profitPct !== undefined) {
                const updated = await updateSignalOutcomeServer(
                    signal.id,
                    result.outcome,
                    currentPrice,
                    result.exitReason,
                    result.profitPct
                );

                if (updated) {
                    updates.push({
                        id: signal.id,
                        coin: signal.coin,
                        outcome: result.outcome,
                        profitPct: Math.round(result.profitPct * 100) / 100,
                    });
                    log.debug(`Updated ${signal.coin}: ${result.outcome} (${result.profitPct.toFixed(2)}%)`);
                }
            }
        }

        return NextResponse.json({
            success: true,
            monitored: pendingSignals.length,
            updated: updates,
            duration: Date.now() - startTime,
        });

    } catch (error) {
        log.error('Monitor error', error);
        return NextResponse.json({
            success: false,
            error: 'Internal server error',
            duration: Date.now() - startTime,
        }, { status: 500 });
    }
}
