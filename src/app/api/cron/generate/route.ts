/**
 * CRON: Signal Generator
 * 
 * Generates GLOBAL signals for coins that don't have pending signals.
 * All users see the same signals (shared engine).
 * 
 * Called every 15 minutes by external cron service.
 */

import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/logger';
import {
    getAllPendingSignals,
    addGlobalSignal,
    getGlobalWeights,
    findUnprocessedLossStreak,
    getRecentlyClosedCoins,
} from '@/lib/supabaseServer';
import {
    generateSignal,
    OHLCV,
    DEFAULT_WEIGHTS,
    IndicatorWeights,
} from '@/lib/engine';
import { CURATED_ASSETS } from '@/lib/constants/assets';

const HYPERLIQUID_API = 'https://api.hyperliquid.xyz/info';

// Convert curated assets to format needed for generation
const COINS_TO_ANALYZE = CURATED_ASSETS;

const HYPERLIQUID_ONLY_COINS = ['HYPE'];

/**
 * Fetch OHLCV data from Binance
 */
async function fetchOHLCV(symbol: string): Promise<OHLCV[]> {
    if (HYPERLIQUID_ONLY_COINS.includes(symbol.toUpperCase())) {
        return fetchHyperliquidCandles(symbol);
    }

    try {
        const binanceSymbol = `${symbol.toUpperCase()}USDT`;
        const url = `https://api.binance.com/api/v3/klines?symbol=${binanceSymbol}&interval=4h&limit=100`;
        const response = await fetch(url);

        if (!response.ok) {
            return fetchHyperliquidCandles(symbol);
        }

        const klines = await response.json();
        return klines.map((k: number[]) => ({
            timestamp: k[0],
            open: parseFloat(String(k[1])),
            high: parseFloat(String(k[2])),
            low: parseFloat(String(k[3])),
            close: parseFloat(String(k[4])),
            volume: parseFloat(String(k[5])),
        }));
    } catch {
        return fetchHyperliquidCandles(symbol);
    }
}

/**
 * Fetch candles from Hyperliquid
 */
async function fetchHyperliquidCandles(symbol: string): Promise<OHLCV[]> {
    try {
        const endTime = Date.now();
        const startTime = endTime - (100 * 4 * 60 * 60 * 1000);

        const response = await fetch(HYPERLIQUID_API, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                type: 'candleSnapshot',
                req: { coin: symbol.toUpperCase(), interval: '4h', startTime, endTime },
            }),
        });

        if (!response.ok) return [];

        const candles = await response.json();
        return candles.map((c: { t: number; o: string; h: string; l: string; c: string; v: string }) => ({
            timestamp: c.t,
            open: parseFloat(c.o),
            high: parseFloat(c.h),
            low: parseFloat(c.l),
            close: parseFloat(c.c),
            volume: parseFloat(c.v),
        }));
    } catch {
        return [];
    }
}

/**
 * Fetch Fear & Greed index
 */
async function fetchFearGreed(): Promise<number | null> {
    try {
        const response = await fetch('https://api.alternative.me/fng/?limit=1');
        if (!response.ok) return null;
        const data = await response.json();
        return parseInt(data.data?.[0]?.value) || null;
    } catch {
        return null;
    }
}

export async function GET(request: NextRequest) {
    const secret = request.nextUrl.searchParams.get('secret');
    const cronSecret = process.env.CRON_SECRET;

    // SECURITY: Fail-closed - reject if secret missing or doesn't match
    if (!cronSecret || secret !== cronSecret) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const log = logger.withContext('CronGenerate');
    const startTime = Date.now();

    try {
        // 1. Get all pending signals (global)
        const pending = await getAllPendingSignals();
        const pendingCoins = new Set(pending.map(p => p.coin.toUpperCase()));
        log.debug(`Found ${pending.length} pending signals`);

        // 2. Get coins in cooldown period (recently closed)
        const recentlyClosed = await getRecentlyClosedCoins(4); // 4 hour cooldown
        log.debug(`Coins in cooldown: ${recentlyClosed.join(', ') || 'none'}`);

        // 3. Find coins without pending signals AND not in cooldown
        const allCoins = [...COINS_TO_ANALYZE];
        const coinsToGenerate = allCoins.filter(coin =>
            !pendingCoins.has(coin.toUpperCase()) &&
            !recentlyClosed.includes(coin.toUpperCase())
        );

        if (coinsToGenerate.length === 0) {
            return NextResponse.json({
                success: true,
                message: 'All coins have pending signals or are in cooldown',
                pendingCount: pending.length,
                cooldownCount: recentlyClosed.length,
                duration: Date.now() - startTime,
            });
        }

        // 3. Get GLOBAL weights (or use defaults)
        const weights = await getGlobalWeights();
        const effectiveWeights = weights
            ? (weights as unknown as IndicatorWeights)
            : DEFAULT_WEIGHTS;

        // 4. Fetch Fear & Greed once
        const fearGreed = await fetchFearGreed();

        // 5. Generate signals for missing coins
        const generated: { coin: string; direction: string; score: number }[] = [];

        for (const coin of coinsToGenerate) {
            const ohlcv = await fetchOHLCV(coin);

            if (ohlcv.length < 50) {
                log.debug(`Insufficient data for ${coin}`);
                continue;
            }

            const signal = generateSignal(ohlcv, coin, fearGreed, effectiveWeights);

            // Only add if not HOLD
            if (signal.direction !== 'HOLD') {
                const confidenceLabel =
                    signal.score >= 80 ? 'HIGH' :
                        signal.score >= 60 ? 'MEDIUM' : 'LOW';

                const added = await addGlobalSignal({
                    coin: signal.coin,
                    direction: signal.direction,
                    score: signal.score,
                    confidence: confidenceLabel,
                    entry_price: signal.entryPrice,
                    stop_loss: signal.stopLoss,
                    take_profit: signal.takeProfit,
                    indicator_snapshot: signal.indicators,
                    weights_used: effectiveWeights as unknown as Record<string, number>,
                });

                if (added) {
                    generated.push({
                        coin: signal.coin,
                        direction: signal.direction,
                        score: signal.score,
                    });
                    log.debug(`Added ${signal.coin} ${signal.direction}`);
                }
            }
        }

        // 6. Check if learning should trigger (global)
        const lossStreak = await findUnprocessedLossStreak();
        const consecutiveLosses = lossStreak.count;
        if (consecutiveLosses >= 3) {
            log.info(`${consecutiveLosses} consecutive losses - learning needed`);
        }

        return NextResponse.json({
            success: true,
            pendingBefore: pending.length,
            signalsGenerated: generated.length,
            signals: generated,
            consecutiveLosses,
            duration: Date.now() - startTime,
        });

    } catch (error) {
        log.error('Generate error', error);
        return NextResponse.json({
            success: false,
            error: 'Internal server error',
            duration: Date.now() - startTime,
        }, { status: 500 });
    }
}

