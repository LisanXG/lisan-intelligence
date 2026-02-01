/**
 * CRON: Signal Generator
 * 
 * Generates new signals for coins that don't have pending signals.
 * Ensures each user always has ~20 active signals (minus HOLDs).
 * 
 * Called every 15 minutes by external cron service.
 */

import { NextRequest, NextResponse } from 'next/server';
import {
    getAllUserIds,
    getUserPendingSignals,
    addSignalServer,
    getUserWeightsServer,
    getConsecutiveLossesServer,
} from '@/lib/supabaseServer';
import {
    generateSignal,
    OHLCV,
    DEFAULT_WEIGHTS,
    IndicatorWeights,
} from '@/lib/engine';

const HYPERLIQUID_API = 'https://api.hyperliquid.xyz/info';

// 20 curated coins (same as engine-signals route)
const COINS_TO_ANALYZE = [
    { symbol: 'BTC', name: 'Bitcoin' },
    { symbol: 'ETH', name: 'Ethereum' },
    { symbol: 'SOL', name: 'Solana' },
    { symbol: 'BNB', name: 'BNB' },
    { symbol: 'AVAX', name: 'Avalanche' },
    { symbol: 'SUI', name: 'Sui' },
    { symbol: 'APT', name: 'Aptos' },
    { symbol: 'HYPE', name: 'Hyperliquid' },
    { symbol: 'LINK', name: 'Chainlink' },
    { symbol: 'AAVE', name: 'Aave' },
    { symbol: 'UNI', name: 'Uniswap' },
    { symbol: 'XRP', name: 'XRP' },
    { symbol: 'ADA', name: 'Cardano' },
    { symbol: 'DOT', name: 'Polkadot' },
    { symbol: 'ATOM', name: 'Cosmos' },
    { symbol: 'MATIC', name: 'Polygon' },
    { symbol: 'ARB', name: 'Arbitrum' },
    { symbol: 'OP', name: 'Optimism' },
    { symbol: 'DOGE', name: 'Dogecoin' },
    { symbol: 'TIA', name: 'Celestia' },
];

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

    if (cronSecret && secret !== cronSecret) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const startTime = Date.now();

    try {
        // 1. Get all user IDs
        const userIds = await getAllUserIds();
        console.log(`[Cron Generate] Found ${userIds.length} users`);

        if (userIds.length === 0) {
            return NextResponse.json({
                success: true,
                message: 'No users with signals yet',
                duration: Date.now() - startTime,
            });
        }

        // 2. Fetch Fear & Greed once
        const fearGreed = await fetchFearGreed();

        // 3. For each user, generate signals for coins without pending signals
        const generated: { userId: string; coin: string; direction: string; score: number }[] = [];
        const allCoins = COINS_TO_ANALYZE.map(c => c.symbol);

        for (const userId of userIds) {
            // Get existing pending signals
            const pending = await getUserPendingSignals(userId);
            const pendingCoins = new Set(pending.map(p => p.coin.toUpperCase()));

            // Find coins without pending signals
            const coinsToGenerate = allCoins.filter(coin => !pendingCoins.has(coin.toUpperCase()));

            if (coinsToGenerate.length === 0) {
                console.log(`[Cron Generate] User ${userId.slice(0, 8)} has all coins covered`);
                continue;
            }

            // Get user weights or use defaults
            const weights = await getUserWeightsServer(userId);
            const effectiveWeights = weights
                ? (weights as unknown as IndicatorWeights)
                : DEFAULT_WEIGHTS;

            // Generate signals for missing coins
            for (const coin of coinsToGenerate) {
                const ohlcv = await fetchOHLCV(coin);

                if (ohlcv.length < 50) {
                    console.log(`[Cron Generate] Insufficient data for ${coin}`);
                    continue;
                }

                const signal = generateSignal(ohlcv, coin, fearGreed, effectiveWeights);

                // Only add if not HOLD
                if (signal.direction !== 'HOLD') {
                    const confidenceLabel =
                        signal.score >= 80 ? 'HIGH' :
                            signal.score >= 60 ? 'MEDIUM' : 'LOW';

                    const added = await addSignalServer(userId, {
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
                            userId: userId.slice(0, 8),
                            coin: signal.coin,
                            direction: signal.direction,
                            score: signal.score,
                        });
                        console.log(`[Cron Generate] Added ${signal.coin} ${signal.direction} for user ${userId.slice(0, 8)}`);
                    }
                }
            }

            // Check if learning should trigger
            const consecutiveLosses = await getConsecutiveLossesServer(userId);
            if (consecutiveLosses >= 3) {
                console.log(`[Cron Generate] User ${userId.slice(0, 8)} has ${consecutiveLosses} consecutive losses - learning needed`);
                // Learning cycle will be handled by separate endpoint
            }
        }

        return NextResponse.json({
            success: true,
            usersProcessed: userIds.length,
            signalsGenerated: generated.length,
            signals: generated,
            duration: Date.now() - startTime,
        });

    } catch (error) {
        console.error('[Cron Generate] Error:', error);
        return NextResponse.json({
            success: false,
            error: 'Internal server error',
            duration: Date.now() - startTime,
        }, { status: 500 });
    }
}
