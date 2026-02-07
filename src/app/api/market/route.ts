import { NextResponse } from 'next/server';
import { CURATED_ASSETS, COIN_METADATA } from '@/lib/constants/assets';

// Derive tracked coins from single source of truth
const TRACKED_COINS = CURATED_ASSETS.map(s => COIN_METADATA[s].coingeckoId);

// Symbol to CoinGecko ID mapping derived from COIN_METADATA
const SYMBOL_TO_ID: Record<string, string> = Object.fromEntries(
    CURATED_ASSETS.map(s => [s.toLowerCase(), COIN_METADATA[s].coingeckoId])
);

// Server-side API route - fetches from CoinGecko (only shows tracked coins)
export async function GET() {
    try {
        // Fetch more coins to ensure we get all of ours
        const response = await fetch(
            'https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=100&page=1&sparkline=false&price_change_percentage=24h',
            {
                headers: {
                    'Accept': 'application/json',
                },
                next: { revalidate: 60 }, // Cache for 60 seconds
            }
        );

        if (!response.ok) {
            throw new Error(`CoinGecko API error: ${response.status}`);
        }

        const data = await response.json();

        // Filter to only our tracked coins
        const coins = data
            .filter((coin: Record<string, unknown>) => TRACKED_COINS.includes(coin.id as string))
            .map((coin: Record<string, unknown>) => ({
                id: coin.id,
                symbol: coin.symbol,
                name: coin.name,
                current_price: coin.current_price,
                price_change_percentage_24h: coin.price_change_percentage_24h,
                market_cap: coin.market_cap,
                total_volume: coin.total_volume,
                image: coin.image,
            }));

        return NextResponse.json({ coins });
    } catch (error) {
        console.error('Market API error:', error);

        // Return mock data as fallback (only tracked coins)
        return NextResponse.json({
            coins: [
                { id: 'bitcoin', symbol: 'btc', name: 'Bitcoin', current_price: 97500, price_change_percentage_24h: 2.5, market_cap: 1920000000000, total_volume: 45000000000, image: 'https://assets.coingecko.com/coins/images/1/small/bitcoin.png' },
                { id: 'ethereum', symbol: 'eth', name: 'Ethereum', current_price: 3250, price_change_percentage_24h: 1.8, market_cap: 390000000000, total_volume: 18000000000, image: 'https://assets.coingecko.com/coins/images/279/small/ethereum.png' },
                { id: 'solana', symbol: 'sol', name: 'Solana', current_price: 185, price_change_percentage_24h: 4.2, market_cap: 85000000000, total_volume: 5500000000, image: 'https://assets.coingecko.com/coins/images/4128/small/solana.png' },
                { id: 'ripple', symbol: 'xrp', name: 'XRP', current_price: 2.45, price_change_percentage_24h: -0.8, market_cap: 140000000000, total_volume: 8200000000, image: 'https://assets.coingecko.com/coins/images/44/small/xrp-symbol-white-128.png' },
                { id: 'litecoin', symbol: 'ltc', name: 'Litecoin', current_price: 105, price_change_percentage_24h: 1.2, market_cap: 8000000000, total_volume: 450000000, image: 'https://assets.coingecko.com/coins/images/2/small/litecoin.png' },
            ]
        });
    }
}
