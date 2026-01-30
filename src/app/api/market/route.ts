import { NextResponse } from 'next/server';

// Server-side API route - fetches from CoinGecko
export async function GET() {
    try {
        const response = await fetch(
            'https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=20&page=1&sparkline=false&price_change_percentage=24h',
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

        // Skip stablecoins
        const STABLECOINS = ['tether', 'usd-coin', 'dai', 'binance-usd', 'trueusd', 'frax', 'paxos-standard', 'usdd', 'gemini-dollar', 'first-digital-usd'];

        // Map to our format (excluding stablecoins)
        const coins = data
            .filter((coin: Record<string, unknown>) => !STABLECOINS.includes(coin.id as string))
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

        // Return mock data as fallback
        return NextResponse.json({
            coins: [
                { id: 'bitcoin', symbol: 'btc', name: 'Bitcoin', current_price: 97500, price_change_percentage_24h: 2.5, market_cap: 1920000000000, total_volume: 45000000000, image: 'https://assets.coingecko.com/coins/images/1/small/bitcoin.png' },
                { id: 'ethereum', symbol: 'eth', name: 'Ethereum', current_price: 3250, price_change_percentage_24h: 1.8, market_cap: 390000000000, total_volume: 18000000000, image: 'https://assets.coingecko.com/coins/images/279/small/ethereum.png' },
                { id: 'solana', symbol: 'sol', name: 'Solana', current_price: 185, price_change_percentage_24h: 4.2, market_cap: 85000000000, total_volume: 5500000000, image: 'https://assets.coingecko.com/coins/images/4128/small/solana.png' },
                { id: 'ripple', symbol: 'xrp', name: 'XRP', current_price: 2.45, price_change_percentage_24h: -0.8, market_cap: 140000000000, total_volume: 8200000000, image: 'https://assets.coingecko.com/coins/images/44/small/xrp-symbol-white-128.png' },
                { id: 'cardano', symbol: 'ada', name: 'Cardano', current_price: 0.92, price_change_percentage_24h: 3.1, market_cap: 32000000000, total_volume: 980000000, image: 'https://assets.coingecko.com/coins/images/975/small/cardano.png' },
            ]
        });
    }
}
