import { NextResponse } from 'next/server';
import {
    generateSignal,
    OHLCV,
    SignalOutput,
    DEFAULT_WEIGHTS,
    HyperliquidContext
} from '@/lib/engine';
import { CURATED_ASSETS, COIN_METADATA } from '@/lib/constants/assets';
import { detectMarketRegime, MarketRegime } from '@/lib/engine/regime';
import { getMarketSnapshots } from '@/lib/supabaseServer';

// Hyperliquid API
const HYPERLIQUID_API = 'https://api.hyperliquid.xyz/info';

interface HyperliquidAssetCtx {
    coin: string;
    funding: string;
    openInterest: string;
    markPx: string;
    dayNtlVlm: string;
    premium: string;
}

interface HyperliquidMeta {
    universe: { name: string }[];
}

interface HLEnrichedData {
    fundingRate: number;
    annualizedFunding: number;
    openInterest: number;
    premium: number;
    volume24h: number;
    fundingSignal: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
}

async function fetchHyperliquidData(): Promise<Map<string, HLEnrichedData>> {
    try {
        const response = await fetch(HYPERLIQUID_API, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ type: 'metaAndAssetCtxs' }),
            next: { revalidate: 30 },
        });

        if (!response.ok) return new Map();

        const [meta, assetCtxs] = await response.json() as [HyperliquidMeta, HyperliquidAssetCtx[]];
        const result = new Map<string, HLEnrichedData>();

        meta.universe.forEach((asset, idx) => {
            const ctx = assetCtxs[idx];
            if (!ctx) return;

            const fundingRate = parseFloat(ctx.funding);
            const annualizedFunding = fundingRate * 8760;
            const openInterest = parseFloat(ctx.openInterest) * parseFloat(ctx.markPx);
            const premium = parseFloat(ctx.premium || '0');
            const volume24h = parseFloat(ctx.dayNtlVlm || '0');
            const fundingSignal: 'BULLISH' | 'BEARISH' | 'NEUTRAL' =
                annualizedFunding > 0.3 ? 'BEARISH' :
                    annualizedFunding < -0.1 ? 'BULLISH' :
                        'NEUTRAL';

            result.set(asset.name.toUpperCase(), {
                fundingRate,
                annualizedFunding,
                openInterest,
                premium,
                volume24h,
                fundingSignal,
            });
        });

        return result;
    } catch {
        return new Map();
    }
}

// Types for external API responses
interface BinanceKline {
    0: number;  // Open time
    1: string;  // Open
    2: string;  // High
    3: string;  // Low
    4: string;  // Close
    5: string;  // Volume
}

interface CoinGeckoMarket {
    id: string;
    symbol: string;
    name: string;
    image: string;
    current_price: number;
    sparkline_in_7d?: { price: number[] };
}

// Convert Binance klines to OHLCV format
function binanceToOHLCV(klines: BinanceKline[]): OHLCV[] {
    return klines.map(k => ({
        timestamp: k[0],
        open: parseFloat(k[1]),
        high: parseFloat(k[2]),
        low: parseFloat(k[3]),
        close: parseFloat(k[4]),
        volume: parseFloat(k[5]),
    }));
}

// Fetch OHLCV from Hyperliquid (for coins not on Binance)
async function fetchHyperliquidCandles(symbol: string, limit: number = 100): Promise<OHLCV[]> {
    try {
        const endTime = Date.now();
        const startTime = endTime - (limit * 4 * 60 * 60 * 1000); // 4h candles

        const response = await fetch(HYPERLIQUID_API, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                type: 'candleSnapshot',
                req: {
                    coin: symbol.toUpperCase(),
                    interval: '4h',
                    startTime,
                    endTime,
                }
            }),
            next: { revalidate: 300 },
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

// Coins that should use Hyperliquid instead of Binance
const HYPERLIQUID_ONLY_COINS = ['HYPE'];

// Fetch OHLCV data from Binance (or Hyperliquid fallback)
async function fetchOHLCV(symbol: string, interval: string = '4h', limit: number = 100): Promise<OHLCV[]> {
    // Use Hyperliquid for coins not on Binance
    if (HYPERLIQUID_ONLY_COINS.includes(symbol.toUpperCase())) {
        return fetchHyperliquidCandles(symbol, limit);
    }

    try {
        const binanceSymbol = `${symbol.toUpperCase()}USDT`;
        const url = `https://api.binance.com/api/v3/klines?symbol=${binanceSymbol}&interval=${interval}&limit=${limit}`;
        const response = await fetch(url, { next: { revalidate: 300 } }); // Cache 5 min

        if (!response.ok) {
            console.error(`Binance API error for ${symbol}: ${response.status}`);
            // Try Hyperliquid as fallback
            return fetchHyperliquidCandles(symbol, limit);
        }

        const klines = await response.json();
        return binanceToOHLCV(klines);
    } catch (error) {
        console.error(`Failed to fetch OHLCV for ${symbol}:`, error);
        // Try Hyperliquid as fallback
        return fetchHyperliquidCandles(symbol, limit);
    }
}

// Fetch Fear & Greed Index
async function fetchFearGreed(): Promise<number | null> {
    try {
        const response = await fetch('https://api.alternative.me/fng/?limit=1', {
            next: { revalidate: 3600 }, // Cache 1 hour
        });

        if (!response.ok) return null;

        const data = await response.json();
        return parseInt(data.data?.[0]?.value) || null;
    } catch {
        return null;
    }
}

// Derive coin list from single source of truth (CURATED_ASSETS + COIN_METADATA)
const COINS_TO_ANALYZE = CURATED_ASSETS.map(symbol => ({
    symbol,
    name: COIN_METADATA[symbol].name,
    image: COIN_METADATA[symbol].image,
}));

export interface EngineSignalResponse {
    signals: (SignalOutput & {
        name: string;
        image: string;
        sparkline?: number[];
        hyperliquid?: {
            fundingRate: number;
            openInterest: number;
            fundingSignal: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
        };
    })[];
    fearGreed: number | null;
    regime: MarketRegime;
    regimeConfidence: number;
    lastUpdated: string;
    weightsVersion: string;
}

export async function GET() {
    try {
        // Fetch Fear & Greed and Hyperliquid data in parallel
        const [fearGreed, hyperliquidData] = await Promise.all([
            fetchFearGreed(),
            fetchHyperliquidData(),
        ]);

        // Get current engine weights (server-side uses defaults; user weights from Supabase in cron routes)
        const weights = DEFAULT_WEIGHTS;

        // Fetch OHLCV data for each coin in parallel
        const ohlcvPromises = COINS_TO_ANALYZE.map(async coin => {
            const data = await fetchOHLCV(coin.symbol);
            return { ...coin, data };
        });

        const coinData = await Promise.all(ohlcvPromises);

        // Fetch market snapshots from Supabase for HL comparison data
        // This gives us the same prevOI, prevFunding, avgVolume the cron route uses
        const allSymbols = coinData.map(c => c.symbol);
        const prevSnapshots = await getMarketSnapshots(allSymbols);

        // Detect market regime using BTC data (same approach as cron/generate)
        const btcCoin = coinData.find(c => c.symbol === 'BTC');
        let regime: MarketRegime = 'UNKNOWN';
        let regimeConfidence = 0;
        if (btcCoin && btcCoin.data.length >= 50) {
            try {
                const altcoinChanges = coinData
                    .filter(c => c.symbol !== 'BTC' && c.data.length >= 2)
                    .map(c => {
                        const last = c.data[c.data.length - 1].close;
                        const prev = c.data[c.data.length - 2].close;
                        return ((last - prev) / prev) * 100;
                    });

                // Compute real avgFunding and avgOIChange from HL + snapshots
                let totalFunding = 0;
                let fundingCount = 0;
                let totalOIChange = 0;
                let oiChangeCount = 0;
                for (const coin of coinData) {
                    const hlData = hyperliquidData.get(coin.symbol.toUpperCase());
                    const prevSnap = prevSnapshots.get(coin.symbol.toUpperCase());
                    if (hlData) {
                        totalFunding += hlData.annualizedFunding;
                        fundingCount++;
                        if (prevSnap && prevSnap.open_interest > 0) {
                            totalOIChange += ((hlData.openInterest - prevSnap.open_interest) / prevSnap.open_interest) * 100;
                            oiChangeCount++;
                        }
                    }
                }

                const regimeResult = detectMarketRegime({
                    btcData: btcCoin.data,
                    altcoinChanges,
                    avgFunding: fundingCount > 0 ? totalFunding / fundingCount : 0,
                    avgOIChange: oiChangeCount > 0 ? totalOIChange / oiChangeCount : 0,
                });
                regime = regimeResult.regime;
                regimeConfidence = regimeResult.confidence ?? 0;
            } catch {
                // Fall back to UNKNOWN if regime detection fails
            }
        }

        // Generate signals for coins with sufficient data
        const signals: EngineSignalResponse['signals'] = [];

        for (const coin of coinData) {
            if (coin.data.length < 50) {
                console.warn(`Insufficient data for ${coin.symbol}, skipping`);
                continue;
            }

            try {
                // Get Hyperliquid data for this coin
                const hlData = hyperliquidData.get(coin.symbol.toUpperCase());
                const prevSnapshot = prevSnapshots.get(coin.symbol.toUpperCase());

                // Build HyperliquidContext — same shape as cron/generate
                let hlContext: HyperliquidContext | null = null;
                if (hlData) {
                    // Compute price change from OHLCV
                    const priceChange = coin.data.length >= 2
                        ? ((coin.data[coin.data.length - 1].close - coin.data[coin.data.length - 2].close) /
                            coin.data[coin.data.length - 2].close) * 100
                        : 0;

                    hlContext = {
                        fundingRate: hlData.fundingRate,
                        annualizedFunding: hlData.annualizedFunding,
                        openInterest: hlData.openInterest,
                        premium: hlData.premium,
                        volume24h: hlData.volume24h,
                        priceChange,
                        prevOpenInterest: prevSnapshot?.open_interest ?? undefined,
                        avgVolume: prevSnapshot?.volume_7d_avg || hlData.volume24h,
                        prevFunding: prevSnapshot?.funding_rate ?? undefined,
                    };
                }

                const signal = generateSignal(coin.data, coin.symbol, fearGreed, weights, hlContext, '4h', regime);

                // Extract 7D sparkline (last 42 candles at 4h = 7 days)
                const sparklineData = coin.data.slice(-42).map(d => d.close);

                signals.push({
                    ...signal,
                    name: coin.name,
                    image: coin.image,
                    sparkline: sparklineData,
                    hyperliquid: hlData ? {
                        fundingRate: hlData.fundingRate,
                        openInterest: hlData.openInterest,
                        fundingSignal: hlData.fundingSignal,
                    } : undefined,
                });
            } catch (error) {
                console.error(`Failed to generate signal for ${coin.symbol}:`, error);
            }
        }

        // Sort by score descending
        signals.sort((a, b) => b.score - a.score);

        return NextResponse.json({
            signals,
            fearGreed,
            regime,
            regimeConfidence,
            lastUpdated: new Date().toISOString(),
            weightsVersion: 'v1',
        } as EngineSignalResponse);

    } catch (error) {
        console.error('Engine signals API error:', error);

        // Return fallback response
        return NextResponse.json({
            signals: [],
            fearGreed: null,
            regime: 'UNKNOWN' as MarketRegime,
            regimeConfidence: 0,
            lastUpdated: new Date().toISOString(),
            weightsVersion: 'v1',
            error: 'Failed to generate signals',
        }, { status: 500 });
    }
}
