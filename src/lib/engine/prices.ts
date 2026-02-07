/**
 * LISAN INTELLIGENCE — Live Price Module
 * 
 * Shared utility for fetching current market prices from Hyperliquid.
 * Used by both the monitor and generate cron jobs.
 */

const HYPERLIQUID_API = 'https://api.hyperliquid.xyz/info';

interface HyperliquidAssetCtx {
    markPx: string;
}

interface HyperliquidMeta {
    universe: { name: string }[];
}

/**
 * Fetch current live prices from Hyperliquid for all assets.
 * Returns a Map of uppercase coin symbol -> price.
 */
export async function fetchCurrentPrices(context: string = 'Cron'): Promise<Map<string, number>> {
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
        console.error(`[${context}] Error fetching live prices:`, error);
        return new Map();
    }
}
