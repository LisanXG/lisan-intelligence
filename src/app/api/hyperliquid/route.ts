import { NextResponse } from 'next/server';

// Hyperliquid API base URL
const HYPERLIQUID_API = 'https://api.hyperliquid.xyz/info';

// Types for Hyperliquid responses
interface HyperliquidAssetContext {
    coin: string;
    dayNtlVlm: string;
    funding: string;
    impactPxs: string[];
    markPx: string;
    midPx: string;
    openInterest: string;
    oraclePx: string;
    premium: string;
    prevDayPx: string;
}

interface HyperliquidMeta {
    universe: {
        name: string;
        szDecimals: number;
        maxLeverage: number;
    }[];
}

interface HyperliquidMetaAndContext {
    meta: HyperliquidMeta;
    assetCtxs: HyperliquidAssetContext[];
}

interface FundingHistoryEntry {
    coin: string;
    fundingRate: string;
    premium: string;
    time: number;
}

export interface HyperliquidData {
    assets: {
        coin: string;
        fundingRate: number;        // Current 1hr funding rate
        annualizedFunding: number;  // Annualized funding rate
        openInterest: number;       // Open interest in USD
        markPrice: number;
        volume24h: number;
        fundingSignal: 'BULLISH' | 'BEARISH' | 'NEUTRAL'; // Contrarian signal
        oiSignal: 'INCREASING' | 'DECREASING' | 'STABLE';
    }[];
    lastUpdated: string;
}

// Coins we track that are also on Hyperliquid
const HYPERLIQUID_COINS = [
    'BTC', 'ETH', 'SOL', 'BNB', 'AVAX', 'SUI', 'APT', 'HYPE',
    'LINK', 'AAVE', 'UNI', 'XRP', 'LTC', 'DOT', 'ATOM',
    'POL', 'ARB', 'OP', 'TON', 'TIA'
];

async function fetchHyperliquidMetaAndContext(): Promise<HyperliquidMetaAndContext | null> {
    try {
        const response = await fetch(HYPERLIQUID_API, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ type: 'metaAndAssetCtxs' }),
            next: { revalidate: 30 }, // Cache for 30 seconds
        });

        if (!response.ok) {
            throw new Error(`Hyperliquid API error: ${response.status}`);
        }

        const data = await response.json();
        return data as HyperliquidMetaAndContext;
    } catch (error) {
        console.error('Failed to fetch Hyperliquid meta:', error);
        return null;
    }
}

async function fetchFundingHistory(coin: string): Promise<FundingHistoryEntry[]> {
    try {
        const startTime = Date.now() - (24 * 60 * 60 * 1000); // Last 24 hours
        const response = await fetch(HYPERLIQUID_API, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                type: 'fundingHistory',
                coin,
                startTime,
            }),
            next: { revalidate: 60 }, // Cache for 1 minute
        });

        if (!response.ok) {
            return [];
        }

        return await response.json();
    } catch {
        return [];
    }
}

function interpretFundingSignal(fundingRate: number): 'BULLISH' | 'BEARISH' | 'NEUTRAL' {
    // Funding rate is contrarian:
    // High positive funding = longs pay shorts = crowded long = BEARISH signal
    // High negative funding = shorts pay longs = crowded short = BULLISH signal
    const annualized = fundingRate * 8760; // ~8760 hours per year

    if (annualized > 0.3) return 'BEARISH';   // >30% annualized = very crowded longs
    if (annualized < -0.1) return 'BULLISH';  // <-10% annualized = crowded shorts
    return 'NEUTRAL';
}

export async function GET() {
    try {
        const metaAndContext = await fetchHyperliquidMetaAndContext();

        if (!metaAndContext) {
            return NextResponse.json(
                { error: 'Failed to fetch Hyperliquid data' },
                { status: 503 }
            );
        }

        const { meta, assetCtxs } = metaAndContext;

        // Build asset data
        const assets = await Promise.all(
            HYPERLIQUID_COINS.map(async (coin) => {
                // Find asset in Hyperliquid universe
                const universeIndex = meta.universe.findIndex(
                    (u) => u.name.toUpperCase() === coin.toUpperCase()
                );

                if (universeIndex === -1) {
                    return null;
                }

                const ctx = assetCtxs[universeIndex];
                if (!ctx) return null;

                const fundingRate = parseFloat(ctx.funding);
                const openInterest = parseFloat(ctx.openInterest) * parseFloat(ctx.markPx);
                const markPrice = parseFloat(ctx.markPx);
                const volume24h = parseFloat(ctx.dayNtlVlm);
                const annualizedFunding = fundingRate * 8760;

                // Get historical funding to determine OI trend (simplified)
                // For now, we'll use a simple signal based on funding direction
                const fundingSignal = interpretFundingSignal(fundingRate);

                // OI signal would ideally compare to historical OI
                // For now, use a simplified heuristic based on volume
                const oiSignal: 'INCREASING' | 'DECREASING' | 'STABLE' =
                    volume24h > openInterest * 0.5 ? 'INCREASING' :
                        volume24h < openInterest * 0.1 ? 'DECREASING' : 'STABLE';

                return {
                    coin: ctx.coin,
                    fundingRate,
                    annualizedFunding,
                    openInterest,
                    markPrice,
                    volume24h,
                    fundingSignal,
                    oiSignal,
                };
            })
        );

        // Filter out nulls (coins not on Hyperliquid)
        const validAssets = assets.filter((a): a is NonNullable<typeof a> => a !== null);

        const result: HyperliquidData = {
            assets: validAssets,
            lastUpdated: new Date().toISOString(),
        };

        return NextResponse.json(result);
    } catch (error) {
        console.error('Hyperliquid API error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
