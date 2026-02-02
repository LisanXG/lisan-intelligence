import { NextResponse } from 'next/server';
import {
    generateSignal,
    OHLCV,
    SignalOutput,
    DEFAULT_WEIGHTS
} from '@/lib/engine';

// Hyperliquid API
const HYPERLIQUID_API = 'https://api.hyperliquid.xyz/info';

interface HyperliquidAssetCtx {
    coin: string;
    funding: string;
    openInterest: string;
    markPx: string;
    dayNtlVlm: string;
}

interface HyperliquidMeta {
    universe: { name: string }[];
}

async function fetchHyperliquidData(): Promise<Map<string, { fundingRate: number; openInterest: number; fundingSignal: 'BULLISH' | 'BEARISH' | 'NEUTRAL' }>> {
    try {
        const response = await fetch(HYPERLIQUID_API, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ type: 'metaAndAssetCtxs' }),
            next: { revalidate: 30 },
        });

        if (!response.ok) return new Map();

        const [meta, assetCtxs] = await response.json() as [HyperliquidMeta, HyperliquidAssetCtx[]];
        const result = new Map<string, { fundingRate: number; openInterest: number; fundingSignal: 'BULLISH' | 'BEARISH' | 'NEUTRAL' }>();

        meta.universe.forEach((asset, idx) => {
            const ctx = assetCtxs[idx];
            if (!ctx) return;

            const fundingRate = parseFloat(ctx.funding);
            const annualized = fundingRate * 8760;
            const fundingSignal: 'BULLISH' | 'BEARISH' | 'NEUTRAL' =
                annualized > 0.3 ? 'BEARISH' :   // Crowded longs
                    annualized < -0.1 ? 'BULLISH' :  // Crowded shorts
                        'NEUTRAL';

            result.set(asset.name.toUpperCase(), {
                fundingRate,
                openInterest: parseFloat(ctx.openInterest) * parseFloat(ctx.markPx),
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

// Main coins to analyze with CoinGecko image URLs (20 curated assets)
const COINS_TO_ANALYZE = [
    // Layer 1s
    { symbol: 'BTC', name: 'Bitcoin', image: 'https://assets.coingecko.com/coins/images/1/small/bitcoin.png' },
    { symbol: 'ETH', name: 'Ethereum', image: 'https://assets.coingecko.com/coins/images/279/small/ethereum.png' },
    { symbol: 'SOL', name: 'Solana', image: 'https://assets.coingecko.com/coins/images/4128/small/solana.png' },
    { symbol: 'BNB', name: 'BNB', image: 'https://assets.coingecko.com/coins/images/825/small/bnb-icon2_2x.png' },
    { symbol: 'AVAX', name: 'Avalanche', image: 'https://assets.coingecko.com/coins/images/12559/small/Avalanche_Circle_RedWhite_Trans.png' },
    { symbol: 'SUI', name: 'Sui', image: 'https://assets.coingecko.com/coins/images/26375/small/sui_asset.jpeg' },
    { symbol: 'APT', name: 'Aptos', image: 'https://assets.coingecko.com/coins/images/26455/small/aptos_round.png' },
    // DeFi & Perps
    { symbol: 'HYPE', name: 'Hyperliquid', image: 'https://assets.coingecko.com/coins/images/40431/small/hyperliquid.jpeg' },
    { symbol: 'LINK', name: 'Chainlink', image: 'https://assets.coingecko.com/coins/images/877/small/chainlink-new-logo.png' },
    { symbol: 'AAVE', name: 'Aave', image: 'https://assets.coingecko.com/coins/images/12645/small/AAVE.png' },
    { symbol: 'UNI', name: 'Uniswap', image: 'https://assets.coingecko.com/coins/images/12504/small/uniswap-uni.png' },
    // Legacy & Payments
    { symbol: 'XRP', name: 'XRP', image: 'https://assets.coingecko.com/coins/images/44/small/xrp-symbol-white-128.png' },
    { symbol: 'LTC', name: 'Litecoin', image: 'https://assets.coingecko.com/coins/images/2/small/litecoin.png' },
    { symbol: 'DOT', name: 'Polkadot', image: 'https://assets.coingecko.com/coins/images/12171/small/polkadot.png' },
    { symbol: 'ATOM', name: 'Cosmos', image: 'https://assets.coingecko.com/coins/images/1481/small/cosmos_hub.png' },
    // Scaling & L2s
    { symbol: 'MATIC', name: 'Polygon', image: 'https://assets.coingecko.com/coins/images/4713/small/polygon.png' },
    { symbol: 'ARB', name: 'Arbitrum', image: 'https://assets.coingecko.com/coins/images/16547/small/photo_2023-03-29_21.47.00.jpeg' },
    { symbol: 'OP', name: 'Optimism', image: 'https://assets.coingecko.com/coins/images/25244/small/Optimism.png' },
    // Memes (high volume)
    { symbol: 'DOGE', name: 'Dogecoin', image: 'https://assets.coingecko.com/coins/images/5/small/dogecoin.png' },
    { symbol: 'TIA', name: 'Celestia', image: 'https://assets.coingecko.com/coins/images/31967/small/tia.jpg' },
];

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

        // Generate signals for coins with sufficient data
        const signals: EngineSignalResponse['signals'] = [];

        for (const coin of coinData) {
            if (coin.data.length < 50) {
                console.warn(`Insufficient data for ${coin.symbol}, skipping`);
                continue;
            }

            try {
                const signal = generateSignal(coin.data, coin.symbol, fearGreed, weights);

                // Extract 7D sparkline (last 42 candles at 4h = 7 days)
                const sparklineData = coin.data.slice(-42).map(d => d.close);

                // Get Hyperliquid data for this coin
                const hlData = hyperliquidData.get(coin.symbol.toUpperCase());

                // Apply funding signal boost/penalty (up to ±5 points)
                let adjustedScore = signal.score;
                if (hlData) {
                    if (hlData.fundingSignal === 'BULLISH' && signal.direction === 'LONG') {
                        adjustedScore = Math.min(100, adjustedScore + 5);
                    } else if (hlData.fundingSignal === 'BEARISH' && signal.direction === 'SHORT') {
                        adjustedScore = Math.min(100, adjustedScore + 5);
                    } else if (hlData.fundingSignal === 'BULLISH' && signal.direction === 'SHORT') {
                        adjustedScore = Math.max(0, adjustedScore - 3);
                    } else if (hlData.fundingSignal === 'BEARISH' && signal.direction === 'LONG') {
                        adjustedScore = Math.max(0, adjustedScore - 3);
                    }
                }

                signals.push({
                    ...signal,
                    score: adjustedScore,
                    name: coin.name,
                    image: coin.image,
                    sparkline: sparklineData,
                    hyperliquid: hlData,
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
            lastUpdated: new Date().toISOString(),
            weightsVersion: 'v1',
        } as EngineSignalResponse);

    } catch (error) {
        console.error('Engine signals API error:', error);

        // Return fallback response
        return NextResponse.json({
            signals: [],
            fearGreed: null,
            lastUpdated: new Date().toISOString(),
            weightsVersion: 'v1',
            error: 'Failed to generate signals',
        }, { status: 500 });
    }
}
