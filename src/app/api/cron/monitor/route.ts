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
 * Fetch recent candles from Binance for momentum check
 */
async function fetchRecentCandles(symbol: string, limit: number = 50): Promise<{ closes: number[]; data: { high: number; low: number; close: number; volume: number }[] } | null> {
    try {
        const pair = `${symbol.toUpperCase()}USDT`;
        const response = await fetch(
            `https://api.binance.com/api/v3/klines?symbol=${pair}&interval=15m&limit=${limit}`
        );

        if (!response.ok) return null;

        const klines = await response.json() as [number, string, string, string, string, string][];
        const closes = klines.map(k => parseFloat(k[4]));
        const data = klines.map(k => ({
            high: parseFloat(k[2]),
            low: parseFloat(k[3]),
            close: parseFloat(k[4]),
            volume: parseFloat(k[5]),
        }));

        return { closes, data };
    } catch (error) {
        console.error(`[Cron Monitor] Error fetching candles for ${symbol}:`, error);
        return null;
    }
}

/**
 * Quick momentum check using RSI and MACD
 * Returns true if momentum is still aligned with trade direction
 */
function checkMomentumAligned(closes: number[], direction: 'LONG' | 'SHORT'): { aligned: boolean; reason: string } {
    if (closes.length < 30) {
        return { aligned: true, reason: 'Insufficient data, allowing trade to continue' };
    }

    // Calculate RSI (simplified inline version)
    const period = 14;
    const gains: number[] = [];
    const losses: number[] = [];

    for (let i = 1; i < closes.length; i++) {
        const change = closes[i] - closes[i - 1];
        gains.push(change > 0 ? change : 0);
        losses.push(change < 0 ? Math.abs(change) : 0);
    }

    const recentGains = gains.slice(-period);
    const recentLosses = losses.slice(-period);
    const avgGain = recentGains.reduce((a, b) => a + b, 0) / period;
    const avgLoss = recentLosses.reduce((a, b) => a + b, 0) / period;
    const rs = avgLoss === 0 ? 100 : avgGain / avgLoss;
    const rsi = 100 - (100 / (1 + rs));

    // Calculate MACD trend (simplified)
    const ema12 = closes.slice(-12).reduce((a, b) => a + b, 0) / 12;
    const ema26 = closes.slice(-26).reduce((a, b) => a + b, 0) / 26;
    const macdLine = ema12 - ema26;
    const prevEma12 = closes.slice(-13, -1).reduce((a, b) => a + b, 0) / 12;
    const prevEma26 = closes.slice(-27, -1).reduce((a, b) => a + b, 0) / 26;
    const prevMacd = prevEma12 - prevEma26;
    const macdTrending = macdLine > prevMacd ? 'up' : 'down';

    // Check alignment based on direction
    if (direction === 'LONG') {
        // For LONG: momentum fading if RSI dropping from overbought OR MACD turning down
        const rsiWeakening = rsi < 45;
        const macdWeakening = macdTrending === 'down' && macdLine < 0;

        if (rsiWeakening && macdWeakening) {
            return { aligned: false, reason: `RSI=${rsi.toFixed(0)}, MACD trending down - momentum fading` };
        }
        return { aligned: true, reason: `RSI=${rsi.toFixed(0)}, MACD ${macdTrending} - momentum intact` };
    } else {
        // For SHORT: momentum fading if RSI rising from oversold OR MACD turning up  
        const rsiWeakening = rsi > 55;
        const macdWeakening = macdTrending === 'up' && macdLine > 0;

        if (rsiWeakening && macdWeakening) {
            return { aligned: false, reason: `RSI=${rsi.toFixed(0)}, MACD trending up - momentum fading` };
        }
        return { aligned: true, reason: `RSI=${rsi.toFixed(0)}, MACD ${macdTrending} - momentum intact` };
    }
}

/**
 * Check if a signal hit SL or TP
 * Now with smart momentum re-evaluation at 3% profit
 */
async function checkSignalOutcome(
    signal: DbSignal,
    currentPrice: number
): Promise<{ hit: boolean; outcome?: 'WON' | 'LOST'; exitReason?: 'STOP_LOSS' | 'TAKE_PROFIT' | 'TARGET_3_PERCENT' | 'MOMENTUM_EXIT'; profitPct?: number }> {
    const { direction, entry_price, stop_loss, take_profit, coin, created_at } = signal;
    const WIN_THRESHOLD_PCT = 3;

    // SAFEGUARD: Detect impossible instant wins (>10% in <30 min)
    // This indicates stale entry_price data - skip processing
    const signalAge = created_at ? (Date.now() - new Date(created_at).getTime()) / 1000 / 60 : 999; // age in minutes
    const profitPct = direction === 'LONG'
        ? ((currentPrice - entry_price) / entry_price) * 100
        : ((entry_price - currentPrice) / entry_price) * 100;

    if (signalAge < 30 && Math.abs(profitPct) > 10) {
        console.log(`[Monitor] BLOCKED ${coin}: Impossible ${profitPct.toFixed(1)}% in ${signalAge.toFixed(0)}m - likely stale entry price`);
        return { hit: false }; // Don't close this signal - it has bad data
    }

    if (direction === 'LONG') {
        const profitPct = ((currentPrice - entry_price) / entry_price) * 100;

        // Hit full TP - take it (but validate profit is actually positive)
        if (currentPrice >= take_profit) {
            // Sanity check: if TP hit but profit negative, it's a bad TP calculation
            const outcome = profitPct >= 0 ? 'WON' : 'LOST';
            const exitReason = profitPct >= 0 ? 'TAKE_PROFIT' : 'STOP_LOSS';
            return { hit: true, outcome, exitReason, profitPct };
        }

        // Hit 3% threshold - check momentum before exiting
        if (profitPct >= WIN_THRESHOLD_PCT) {
            const candles = await fetchRecentCandles(coin);
            if (candles) {
                const { aligned, reason } = checkMomentumAligned(candles.closes, 'LONG');
                console.log(`[Monitor] ${coin} LONG at +${profitPct.toFixed(2)}%: ${reason}`);

                if (!aligned) {
                    // Momentum fading, take profit now
                    return { hit: true, outcome: 'WON', exitReason: 'MOMENTUM_EXIT', profitPct };
                }
                // Momentum still strong, let it run to TP
            }
            // If candle fetch failed, fall through to let trade continue
        }

        // Hit SL
        if (currentPrice <= stop_loss) {
            return { hit: true, outcome: 'LOST', exitReason: 'STOP_LOSS', profitPct };
        }
    } else if (direction === 'SHORT') {
        const profitPct = ((entry_price - currentPrice) / entry_price) * 100;

        // Hit full TP - take it (but validate profit is actually positive)
        if (currentPrice <= take_profit) {
            // Sanity check: if TP hit but profit negative, it's a bad TP calculation
            const outcome = profitPct >= 0 ? 'WON' : 'LOST';
            const exitReason = profitPct >= 0 ? 'TAKE_PROFIT' : 'STOP_LOSS';
            return { hit: true, outcome, exitReason, profitPct };
        }

        // Hit 3% threshold - check momentum before exiting
        if (profitPct >= WIN_THRESHOLD_PCT) {
            const candles = await fetchRecentCandles(coin);
            if (candles) {
                const { aligned, reason } = checkMomentumAligned(candles.closes, 'SHORT');
                console.log(`[Monitor] ${coin} SHORT at +${profitPct.toFixed(2)}%: ${reason}`);

                if (!aligned) {
                    // Momentum fading, take profit now
                    return { hit: true, outcome: 'WON', exitReason: 'MOMENTUM_EXIT', profitPct };
                }
                // Momentum still strong, let it run to TP
            }
            // If candle fetch failed, fall through to let trade continue
        }

        // Hit SL
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

            const result = await checkSignalOutcome(signal, currentPrice);

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
