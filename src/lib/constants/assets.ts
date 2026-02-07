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
    'TON',   // Toncoin
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
 * Metadata for each curated asset — single source of truth.
 * Used by engine-signals, market API, and UI components.
 */
export interface CoinMeta {
    symbol: CuratedAsset;
    name: string;
    image: string;
    coingeckoId: string;
}

export const COIN_METADATA: Record<CuratedAsset, CoinMeta> = {
    BTC: { symbol: 'BTC', name: 'Bitcoin', image: 'https://assets.coingecko.com/coins/images/1/small/bitcoin.png', coingeckoId: 'bitcoin' },
    ETH: { symbol: 'ETH', name: 'Ethereum', image: 'https://assets.coingecko.com/coins/images/279/small/ethereum.png', coingeckoId: 'ethereum' },
    SOL: { symbol: 'SOL', name: 'Solana', image: 'https://assets.coingecko.com/coins/images/4128/small/solana.png', coingeckoId: 'solana' },
    AVAX: { symbol: 'AVAX', name: 'Avalanche', image: 'https://assets.coingecko.com/coins/images/12559/small/Avalanche_Circle_RedWhite_Trans.png', coingeckoId: 'avalanche-2' },
    LINK: { symbol: 'LINK', name: 'Chainlink', image: 'https://assets.coingecko.com/coins/images/877/small/chainlink-new-logo.png', coingeckoId: 'chainlink' },
    TON: { symbol: 'TON', name: 'Toncoin', image: 'https://assets.coingecko.com/coins/images/17980/small/ton_symbol.png', coingeckoId: 'the-open-network' },
    XRP: { symbol: 'XRP', name: 'XRP', image: 'https://assets.coingecko.com/coins/images/44/small/xrp-symbol-white-128.png', coingeckoId: 'ripple' },
    ADA: { symbol: 'ADA', name: 'Cardano', image: 'https://assets.coingecko.com/coins/images/975/small/cardano.png', coingeckoId: 'cardano' },
    DOT: { symbol: 'DOT', name: 'Polkadot', image: 'https://assets.coingecko.com/coins/images/12171/small/polkadot.png', coingeckoId: 'polkadot' },
    MATIC: { symbol: 'MATIC', name: 'Polygon', image: 'https://assets.coingecko.com/coins/images/4713/small/polygon.png', coingeckoId: 'matic-network' },
    UNI: { symbol: 'UNI', name: 'Uniswap', image: 'https://assets.coingecko.com/coins/images/12504/small/uniswap-uni.png', coingeckoId: 'uniswap' },
    ATOM: { symbol: 'ATOM', name: 'Cosmos', image: 'https://assets.coingecko.com/coins/images/1481/small/cosmos_hub.png', coingeckoId: 'cosmos' },
    LTC: { symbol: 'LTC', name: 'Litecoin', image: 'https://assets.coingecko.com/coins/images/2/small/litecoin.png', coingeckoId: 'litecoin' },
    NEAR: { symbol: 'NEAR', name: 'NEAR Protocol', image: 'https://assets.coingecko.com/coins/images/10365/small/near.jpg', coingeckoId: 'near' },
    ARB: { symbol: 'ARB', name: 'Arbitrum', image: 'https://assets.coingecko.com/coins/images/16547/small/photo_2023-03-29_21.47.00.jpeg', coingeckoId: 'arbitrum' },
    OP: { symbol: 'OP', name: 'Optimism', image: 'https://assets.coingecko.com/coins/images/25244/small/Optimism.png', coingeckoId: 'optimism' },
    APT: { symbol: 'APT', name: 'Aptos', image: 'https://assets.coingecko.com/coins/images/26455/small/aptos_round.png', coingeckoId: 'aptos' },
    SUI: { symbol: 'SUI', name: 'Sui', image: 'https://assets.coingecko.com/coins/images/26375/small/sui_asset.jpeg', coingeckoId: 'sui' },
    HYPE: { symbol: 'HYPE', name: 'Hyperliquid', image: 'https://assets.coingecko.com/coins/images/40431/small/hyperliquid.jpeg', coingeckoId: 'hyperliquid' },
    INJ: { symbol: 'INJ', name: 'Injective', image: 'https://assets.coingecko.com/coins/images/12882/small/Secondary_Symbol.png', coingeckoId: 'injective-protocol' },
};

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
