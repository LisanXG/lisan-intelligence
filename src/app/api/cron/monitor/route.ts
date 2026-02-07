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
import { RSI, MACD } from '@/lib/engine/indicators';

import { fetchCurrentPrices } from '@/lib/engine/prices';


/**
 * Fetch recent candles from Binance for momentum check
 * v4.1: Added interval parameter (was hardcoded to 15m)
 */
async function fetchRecentCandles(symbol: string, limit: number = 50, interval: string = '1h'): Promise<{ closes: number[]; data: { high: number; low: number; close: number; volume: number }[] } | null> {
    // Try Binance first (primary)
    try {
        const pair = `${symbol.toUpperCase()}USDT`;
        const response = await fetch(
            `https://api.binance.com/api/v3/klines?symbol=${pair}&interval=${interval}&limit=${limit}`
        );

        if (response.ok) {
            const klines = await response.json() as [number, string, string, string, string, string][];
            if (klines.length >= 20) {
                const closes = klines.map(k => parseFloat(k[4]));
                const data = klines.map(k => ({
                    high: parseFloat(k[2]),
                    low: parseFloat(k[3]),
                    close: parseFloat(k[4]),
                    volume: parseFloat(k[5]),
                }));
                return { closes, data };
            }
        }
    } catch {
        // Binance failed, try HL fallback
    }

    // Fallback: Hyperliquid candles
    try {
        const endTime = Date.now();
        const intervalMs = interval === '4h' ? 4 * 60 * 60 * 1000 : 60 * 60 * 1000;
        const startTime = endTime - (limit * intervalMs);

        const response = await fetch('https://api.hyperliquid.xyz/info', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                type: 'candleSnapshot',
                req: { coin: symbol.toUpperCase(), interval, startTime, endTime },
            }),
        });

        if (!response.ok) return null;

        const candles = await response.json() as { t: number; o: string; h: string; l: string; c: string; v: string }[];
        if (candles.length < 20) return null;

        const closes = candles.map(c => parseFloat(c.c));
        const data = candles.map(c => ({
            high: parseFloat(c.h),
            low: parseFloat(c.l),
            close: parseFloat(c.c),
            volume: parseFloat(c.v),
        }));

        return { closes, data };
    } catch (error) {
        console.error(`[Cron Monitor] Error fetching ${interval} candles for ${symbol}:`, error);
        return null;
    }
}

/**
 * Quick momentum check using RSI and MACD from the engine
 * Returns true if momentum is still aligned with trade direction
 * v4.1: Loosened thresholds to reduce premature exits from noise
 */
function checkMomentumAligned(closes: number[], direction: 'LONG' | 'SHORT'): { aligned: boolean; reason: string } {
    if (closes.length < 30) {
        return { aligned: true, reason: 'Insufficient data, allowing trade to continue' };
    }

    // Use the same engine calculations that generated the signal
    const rsiResult = RSI(closes, 14);
    const macdResult = MACD(closes, 12, 26, 9);

    const rsi = rsiResult.value;
    const macdTrending = macdResult.histogram > 0 ? 'up' : 'down';
    const macdLine = macdResult.macd;

    // Check alignment based on direction
    if (direction === 'LONG') {
        // v4.1: Loosened from rsi < 45 → rsi < 40 to avoid premature exits
        const rsiWeakening = rsi < 40;
        const macdWeakening = macdTrending === 'down' && macdLine < 0;

        if (rsiWeakening && macdWeakening) {
            return { aligned: false, reason: `RSI=${rsi.toFixed(0)}, MACD trending down - momentum fading` };
        }
        return { aligned: true, reason: `RSI=${rsi.toFixed(0)}, MACD ${macdTrending} - momentum intact` };
    } else {
        // v4.1: Loosened from rsi > 55 → rsi > 60 to avoid premature exits
        const rsiWeakening = rsi > 60;
        const macdWeakening = macdTrending === 'up' && macdLine > 0;

        if (rsiWeakening && macdWeakening) {
            return { aligned: false, reason: `RSI=${rsi.toFixed(0)}, MACD trending up - momentum fading` };
        }
        return { aligned: true, reason: `RSI=${rsi.toFixed(0)}, MACD ${macdTrending} - momentum intact` };
    }
}

/**
 * v4.1: Dual-timeframe momentum check
 * Fetches both 1h and 4h candles — exit only when BOTH show fading momentum.
 * This prevents premature exits from short-term noise on a single timeframe.
 */
async function checkDualTimeframeMomentum(
    coin: string,
    direction: 'LONG' | 'SHORT'
): Promise<{ shouldExit: boolean; reason: string }> {
    // Fetch both timeframes in parallel
    const [candles1h, candles4h] = await Promise.all([
        fetchRecentCandles(coin, 50, '1h'),
        fetchRecentCandles(coin, 50, '4h'),
    ]);

    // If we can't get either timeframe, don't exit (conservative)
    if (!candles1h && !candles4h) {
        return { shouldExit: false, reason: 'Could not fetch candle data for momentum check' };
    }

    const result1h = candles1h ? checkMomentumAligned(candles1h.closes, direction) : { aligned: true, reason: 'No 1h data' };
    const result4h = candles4h ? checkMomentumAligned(candles4h.closes, direction) : { aligned: true, reason: 'No 4h data' };

    // Only exit if BOTH timeframes show fading momentum (dual confirmation)
    if (!result1h.aligned && !result4h.aligned) {
        return {
            shouldExit: true,
            reason: `Dual-TF exit: 1h(${result1h.reason}) + 4h(${result4h.reason})`,
        };
    }

    // At least one timeframe still shows momentum — let it run
    const holdReason = result1h.aligned ? `1h: ${result1h.reason}` : `4h: ${result4h.reason}`;
    return {
        shouldExit: false,
        reason: `Momentum intact on at least one TF — ${holdReason}`,
    };
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

    // SAFEGUARD 1: Detect impossible instant wins (>5% in <30 min)
    // This indicates stale entry_price data - skip processing
    const signalAge = created_at ? (Date.now() - new Date(created_at).getTime()) / 1000 / 60 : 999; // age in minutes
    const profitPct = direction === 'LONG'
        ? ((currentPrice - entry_price) / entry_price) * 100
        : ((entry_price - currentPrice) / entry_price) * 100;

    if (signalAge < 30 && Math.abs(profitPct) > 5) {
        console.log(`[Monitor] BLOCKED ${coin}: Suspicious ${profitPct.toFixed(1)}% in ${signalAge.toFixed(0)}m - likely stale entry price`);
        return { hit: false }; // Don't close this signal - it has bad data
    }

    // SAFEGUARD 2: Detect impossibly tight entry-TP spread
    // If TP would be hit immediately (within 1% of entry), the TP was calculated from stale data
    const tpSpread = direction === 'LONG'
        ? ((take_profit - entry_price) / entry_price) * 100
        : ((entry_price - take_profit) / entry_price) * 100;

    if (tpSpread < 1) {
        console.log(`[Monitor] BLOCKED ${coin}: TP spread only ${tpSpread.toFixed(2)}% - indicates stale SL/TP calculation`);
        return { hit: false }; // Don't process - bad TP data
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
        // v4.1: Dual-timeframe confirmation (1h + 4h) to avoid premature exits
        if (profitPct >= WIN_THRESHOLD_PCT) {
            const { shouldExit, reason } = await checkDualTimeframeMomentum(coin, 'LONG');
            console.log(`[Monitor] ${coin} LONG at +${profitPct.toFixed(2)}%: ${reason}`);

            if (shouldExit) {
                // Both timeframes confirm momentum fading — take profit
                return { hit: true, outcome: 'WON', exitReason: 'MOMENTUM_EXIT', profitPct };
            }
            // At least one TF still shows momentum — let it run to TP
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
        // v4.1: Dual-timeframe confirmation (1h + 4h) to avoid premature exits
        if (profitPct >= WIN_THRESHOLD_PCT) {
            const { shouldExit, reason } = await checkDualTimeframeMomentum(coin, 'SHORT');
            console.log(`[Monitor] ${coin} SHORT at +${profitPct.toFixed(2)}%: ${reason}`);

            if (shouldExit) {
                // Both timeframes confirm momentum fading — take profit
                return { hit: true, outcome: 'WON', exitReason: 'MOMENTUM_EXIT', profitPct };
            }
            // At least one TF still shows momentum — let it run to TP
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
