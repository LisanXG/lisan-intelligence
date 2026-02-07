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
    getMarketSnapshots,
    upsertMarketSnapshot,
    getCacheValue,
    setCacheValue,
} from '@/lib/supabaseServer';
import {
    generateSignal,
    OHLCV,
    DEFAULT_WEIGHTS,
    IndicatorWeights,
    HyperliquidContext,
} from '@/lib/engine';
import { CURATED_ASSETS } from '@/lib/constants/assets';
import { fetchHyperliquidMarketContext } from '@/lib/engine/hyperliquidData';
import { detectMarketRegime, MarketContext, MarketRegime } from '@/lib/engine/regime';
import { fetchCurrentPrices } from '@/lib/engine/prices';

const HYPERLIQUID_API = 'https://api.hyperliquid.xyz/info';

// Convert curated assets to format needed for generation
const COINS_TO_ANALYZE = CURATED_ASSETS;

const BINANCE_ONLY_COINS = ['AVAX', 'ATOM', 'LTC']; // Coins with poor HL coverage

/**
 * Fetch OHLCV data - Binance primary, Hyperliquid fallback
 * IMPORTANT: We use Binance first because HL 4h candles have stale close prices
 */
async function fetchOHLCV(symbol: string): Promise<OHLCV[]> {
    // Try Binance first (primary) - has more recent candle data
    try {
        const binanceData = await fetchBinanceCandles(symbol);
        if (binanceData.length >= 50) {
            return binanceData;
        }
    } catch {
        // Binance failed, try Hyperliquid
    }

    // Fallback to Hyperliquid
    try {
        const hlData = await fetchHyperliquidCandles(symbol);
        if (hlData.length >= 50) {
            return hlData;
        }
    } catch {
        // Both failed
    }

    return [];
}

/**
 * Fetch candles from Binance (fallback)
 */
async function fetchBinanceCandles(symbol: string): Promise<OHLCV[]> {
    try {
        const binanceSymbol = `${symbol.toUpperCase()}USDT`;
        const url = `https://api.binance.com/api/v3/klines?symbol=${binanceSymbol}&interval=4h&limit=100`;
        const response = await fetch(url);

        if (!response.ok) return [];

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
        return [];
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
        if (!response.ok) throw new Error(`F&G API returned ${response.status}`);
        const data = await response.json();
        const value = parseInt(data.data?.[0]?.value) || null;

        // Cache the successful value for fallback
        if (value !== null) {
            await setCacheValue('fear_greed_latest', { value, timestamp: Date.now() });
        }

        return value;
    } catch {
        // Fallback: try cached value
        const cached = await getCacheValue<{ value: number; timestamp: number }>('fear_greed_latest');
        if (cached && cached.value) {
            console.log(`[CronGenerate] F&G API failed, using cached value: ${cached.value}`);
            return cached.value;
        }
        console.error('[CronGenerate] F&G API failed and no cache available');
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

        // 5. Fetch Hyperliquid market context for positioning data (NEW)
        const hlMarketContext = await fetchHyperliquidMarketContext(coinsToGenerate);
        log.debug(`Fetched HL context for ${hlMarketContext?.assets.size || 0} coins`);

        // 6. Detect market regime (NEW)
        const btcOHLCV = await fetchOHLCV('BTC');

        // Fetch previous market snapshots FIRST — used for both regime detection and signal generation
        const prevSnapshots = await getMarketSnapshots(coinsToGenerate);
        log.debug(`Fetched ${prevSnapshots.size} previous market snapshots`);

        // Compute real avgOIChange from previous snapshots vs current HL data
        let totalOIChange = 0;
        let oiChangeCount = 0;
        for (const coin of coinsToGenerate) {
            const hlAsset = hlMarketContext?.assets.get(coin.toUpperCase());
            const prevSnap = prevSnapshots.get(coin.toUpperCase());
            if (hlAsset && prevSnap && prevSnap.open_interest > 0) {
                totalOIChange += ((hlAsset.openInterest - prevSnap.open_interest) / prevSnap.open_interest) * 100;
                oiChangeCount++;
            }
        }

        // Compute real altcoin price changes from OHLCV (not premium)
        const altcoinChanges: number[] = [];
        for (const c of coinsToGenerate.filter(c => c !== 'BTC')) {
            const altOHLCV = await fetchOHLCV(c);
            if (altOHLCV.length >= 2) {
                const pctChange = ((altOHLCV[altOHLCV.length - 1].close - altOHLCV[altOHLCV.length - 2].close) /
                    altOHLCV[altOHLCV.length - 2].close) * 100;
                altcoinChanges.push(pctChange);
            }
        }

        const regimeContext: MarketContext = {
            btcData: btcOHLCV,
            altcoinChanges,
            avgFunding: hlMarketContext?.avgFunding || 0,
            avgOIChange: oiChangeCount > 0 ? totalOIChange / oiChangeCount : 0,
        };

        const regimeAnalysis = detectMarketRegime(regimeContext);
        log.info(`Market regime: ${regimeAnalysis.regime} (${Math.round(regimeAnalysis.confidence * 100)}% confidence)`);

        // 7. Fetch LIVE prices for accurate entry_price (CRITICAL FIX)
        const livePrices = await fetchCurrentPrices();
        log.debug(`Fetched live prices for ${livePrices.size} assets`);

        // Track coins with HL data for snapshot upserts after generation
        const snapshotsToUpsert: { coin: string; oi: number; vol: number; funding: number; prevAvg: number; prevUpdatedAt: string | null }[] = [];

        // 9. Generate signals for missing coins
        const generated: { coin: string; direction: string; score: number }[] = [];

        for (const coin of coinsToGenerate) {
            const ohlcv = await fetchOHLCV(coin);

            if (ohlcv.length < 50) {
                log.debug(`Insufficient data for ${coin}`);
                continue;
            }

            // Get LIVE price for this coin (CRITICAL: prevents stale entry_price bug)
            const livePrice = livePrices.get(coin.toUpperCase());

            // Build HL context for this coin if available
            let hlContext: HyperliquidContext | null = null;
            const hlAsset = hlMarketContext?.assets.get(coin.toUpperCase());
            if (hlAsset) {
                // Calculate price change from OHLCV
                const priceChange = ohlcv.length >= 2
                    ? ((ohlcv[ohlcv.length - 1].close - ohlcv[ohlcv.length - 2].close) /
                        ohlcv[ohlcv.length - 2].close) * 100
                    : 0;

                // Fetch previous snapshot for comparison
                const prevSnapshot = prevSnapshots.get(coin.toUpperCase());

                hlContext = {
                    fundingRate: hlAsset.fundingRate,
                    annualizedFunding: hlAsset.annualizedFunding,
                    openInterest: hlAsset.openInterest,
                    priceChange,
                    // #1 FIX: Real previous OI from stored snapshot (use ?? to preserve zero values)
                    prevOpenInterest: prevSnapshot?.open_interest ?? undefined,
                    // v4.1: Pass new HL-native data for scoring
                    premium: hlAsset.premium,
                    volume24h: hlAsset.volume24h,
                    // #1 FIX: Real rolling 7-day avg from stored snapshot
                    avgVolume: prevSnapshot?.volume_7d_avg || hlAsset.volume24h,
                    // #4 FIX: Previous funding rate for velocity boost (use ?? to preserve zero)
                    prevFunding: prevSnapshot?.funding_rate ?? undefined,
                };

                // Queue snapshot upsert (pass snapshot for timestamp check)
                snapshotsToUpsert.push({
                    coin: coin.toUpperCase(),
                    oi: hlAsset.openInterest,
                    vol: hlAsset.volume24h,
                    funding: hlAsset.annualizedFunding,
                    prevAvg: prevSnapshot?.volume_7d_avg || 0,
                    prevUpdatedAt: prevSnapshot?.updated_at || null,
                });
            }

            const signal = generateSignal(ohlcv, coin, fearGreed, effectiveWeights, hlContext, '4h', regimeAnalysis.regime);

            // Only add if not HOLD
            if (signal.direction !== 'HOLD') {
                // SAFEGUARD 1: Require live price - NEVER use stale candle data
                if (!livePrice) {
                    log.info(`BLOCKED ${coin}: No live price available - skipping to prevent stale entry`);
                    continue;
                }

                // SAFEGUARD 2: Validate live price isn't too different from candle data
                // If candle close and live price differ by >5%, something is wrong
                const candleClose = ohlcv[ohlcv.length - 1]?.close;
                if (candleClose) {
                    const priceDiff = Math.abs((livePrice - candleClose) / candleClose) * 100;
                    if (priceDiff > 5) {
                        log.info(`BLOCKED ${coin}: Price mismatch - live $${livePrice.toFixed(2)} vs candle $${candleClose.toFixed(2)} (${priceDiff.toFixed(1)}% diff)`);
                        continue;
                    }
                }

                const confidenceLabel =
                    signal.score >= 80 ? 'HIGH' :
                        signal.score >= 60 ? 'MEDIUM' : 'LOW';

                // CRITICAL FIX: Recalculate SL/TP from LIVE price, not stale candle
                // The generateSignal() used candle close which can be hours old
                // We use the ATR ratio from the signal to maintain proper risk:reward
                const atrPercent = signal.indicators?.atr && signal.entryPrice
                    ? (signal.indicators.atr as number) / signal.entryPrice
                    : 0.015; // 1.5% default ATR if unavailable

                let liveStopLoss: number;
                let liveTakeProfit: number;

                if (signal.direction === 'LONG') {
                    liveStopLoss = livePrice * (1 - (atrPercent * 1.5));
                    liveTakeProfit = livePrice * (1 + (atrPercent * 3));
                } else {
                    // SHORT
                    liveStopLoss = livePrice * (1 + (atrPercent * 1.5));
                    liveTakeProfit = livePrice * (1 - (atrPercent * 3));
                }

                const added = await addGlobalSignal({
                    coin: signal.coin,
                    direction: signal.direction,
                    score: signal.score,
                    confidence: confidenceLabel,
                    // CRITICAL: Use live price for entry AND recalculated SL/TP
                    entry_price: livePrice!,
                    stop_loss: Number(liveStopLoss.toFixed(6)),
                    take_profit: Number(liveTakeProfit.toFixed(6)),
                    indicator_snapshot: {
                        ...signal.indicators,
                        regime: regimeAnalysis.regime,
                        regimeConfidence: regimeAnalysis.confidence,
                    } as unknown as Record<string, number>,
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

        // 10. Check if learning should trigger (global)
        const lossStreak = await findUnprocessedLossStreak();
        const consecutiveLosses = lossStreak.count;
        if (consecutiveLosses >= 3) {
            log.info(`${consecutiveLosses} consecutive losses - learning needed`);
        }

        // 11. Persist market snapshots for next run's comparison
        for (const snap of snapshotsToUpsert) {
            // #2 FIX: Only update volume avg when snapshot is >20h old
            // The EMA formula assumes once-per-day updates; running on 15-min cycle destroys smoothing
            const hoursSinceUpdate = snap.prevUpdatedAt
                ? (Date.now() - new Date(snap.prevUpdatedAt).getTime()) / 3600000
                : 999;
            const shouldUpdateVolumeAvg = hoursSinceUpdate >= 20;

            await upsertMarketSnapshot(
                snap.coin, snap.oi, snap.vol, snap.funding,
                snap.prevAvg, shouldUpdateVolumeAvg
            );
        }
        if (snapshotsToUpsert.length > 0) {
            log.debug(`Upserted ${snapshotsToUpsert.length} market snapshots`);
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

