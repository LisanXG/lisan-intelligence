/**
 * LISAN INTELLIGENCE — Asset Constants
 * 
 * Single source of truth for the curated coin universe.
 * All signal generation and UI should reference this list.
 */

/**
 * Curated list of assets tracked by LISAN Intelligence.
 * These are selected for liquidity and trading volume.
 */
export const CURATED_ASSETS = [
    'BTC',   // Bitcoin
    'ETH',   // Ethereum
    'SOL',   // Solana
    'AVAX',  // Avalanche
    'LINK',  // Chainlink
    'DOGE',  // Dogecoin
    'XRP',   // Ripple
    'ADA',   // Cardano
    'DOT',   // Polkadot
    'MATIC', // Polygon
    'UNI',   // Uniswap
    'ATOM',  // Cosmos
    'LTC',   // Litecoin
    'NEAR',  // NEAR Protocol
    'ARB',   // Arbitrum
    'OP',    // Optimism
    'APT',   // Aptos
    'SUI',   // Sui
    'HYPE',  // Hyperliquid
    'INJ',   // Injective
] as const;

export type CuratedAsset = typeof CURATED_ASSETS[number];

/**
 * Number of assets in the curated universe
 */
export const ASSET_COUNT = CURATED_ASSETS.length;

/**
 * Get asset with USDT pair suffix for exchange APIs
 */
export function getAssetPair(symbol: CuratedAsset): string {
    return `${symbol}USDT`;
}

/**
 * Check if a symbol is in the curated universe
 */
export function isCuratedAsset(symbol: string): symbol is CuratedAsset {
    return CURATED_ASSETS.includes(symbol.toUpperCase() as CuratedAsset);
}
