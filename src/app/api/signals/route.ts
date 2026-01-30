import { NextResponse } from 'next/server';

// Scoring engine types
interface MarketData {
    id: string;
    symbol: string;
    name: string;
    current_price: number;
    price_change_percentage_24h: number;
    market_cap: number;
    total_volume: number;
    image: string;
}

interface Signal {
    id: string;
    symbol: string;
    name: string;
    image: string;
    price: number;
    change24h: number;
    score: number;
    signalType: 'ACCUMULATE' | 'HOLD' | 'CAUTION';
    technicalScore: number;
    contextScore: number;
    liquidityScore: number;
}

// Scoring functions
function calculateTechnicalScore(coin: MarketData): number {
    let score = 0;

    // Volume confirmation (0-10 points)
    // Higher volume relative to market cap = better
    const volumeRatio = coin.total_volume / coin.market_cap;
    if (volumeRatio > 0.1) score += 10;
    else if (volumeRatio > 0.05) score += 7;
    else if (volumeRatio > 0.02) score += 4;
    else score += 2;

    // Momentum - 24h change (0-10 points)
    const change = coin.price_change_percentage_24h;
    if (change > 5 && change < 20) score += 10; // Strong but not extreme
    else if (change > 2 && change <= 5) score += 8;
    else if (change > 0 && change <= 2) score += 5;
    else if (change > -5 && change <= 0) score += 3;
    else score += 1;

    // We don't have full OHLC data, so we estimate other metrics
    // Breakout structure estimation (0-10 points)
    if (change > 3) score += 8;
    else if (change > 1) score += 5;
    else score += 3;

    // VWAP relationship (estimated) (0-10 points)
    // Assume price above VWAP if positive change
    if (change > 0) score += 7;
    else score += 4;

    return Math.min(40, score); // Max 40 points
}

function calculateContextScore(coin: MarketData, btcChange: number): number {
    let score = 0;

    // BTC trend alignment (0-10 points)
    if (btcChange > 0 && coin.price_change_percentage_24h > 0) {
        score += 10;
    } else if (btcChange < 0 && coin.price_change_percentage_24h > 0) {
        score += 8; // Outperforming BTC
    } else if (btcChange > 0 && coin.price_change_percentage_24h < 0) {
        score += 3;
    } else {
        score += 5;
    }

    // Sector beta estimation (0-8 points)
    const beta = coin.price_change_percentage_24h / (btcChange || 1);
    if (beta > 1.3 && beta < 3) score += 8;
    else if (beta > 1) score += 6;
    else if (beta > 0.5) score += 4;
    else score += 2;

    // Fear & Greed not available in this route, give average (0-6 points)
    score += 4;

    // Volatility regime (0-6 points)
    const absChange = Math.abs(coin.price_change_percentage_24h);
    if (absChange < 10) score += 5;
    else if (absChange < 20) score += 3;
    else score += 1;

    return Math.min(30, score); // Max 30 points
}

function calculateLiquidityScore(coin: MarketData): number {
    let score = 0;

    // Market cap tier (0-10 points)
    if (coin.market_cap > 10e9) score += 10;
    else if (coin.market_cap > 1e9) score += 8;
    else if (coin.market_cap > 100e6) score += 5;
    else score += 2;

    // 24H volume (0-8 points)
    if (coin.total_volume > 100e6) score += 8;
    else if (coin.total_volume > 10e6) score += 6;
    else if (coin.total_volume > 1e6) score += 4;
    else score += 1;

    // Exchange quality (estimated) (0-6 points)
    // Top coins likely on Tier-1 exchanges
    if (coin.market_cap > 1e9) score += 6;
    else if (coin.market_cap > 100e6) score += 4;
    else score += 2;

    // Scam risk (estimated) (0-6 points)
    // Top coins by market cap are generally legit
    if (coin.market_cap > 10e9) score += 6;
    else if (coin.market_cap > 1e9) score += 5;
    else if (coin.market_cap > 100e6) score += 3;
    else score += 1;

    return Math.min(30, score); // Max 30 points
}

function getSignalType(score: number): 'ACCUMULATE' | 'HOLD' | 'CAUTION' {
    if (score >= 70) return 'ACCUMULATE';
    if (score >= 40) return 'HOLD';
    return 'CAUTION';
}

export async function GET() {
    try {
        // Fetch market data
        const response = await fetch(
            'https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=20&page=1&sparkline=false&price_change_percentage=24h',
            {
                headers: { 'Accept': 'application/json' },
                next: { revalidate: 60 },
            }
        );

        if (!response.ok) {
            throw new Error(`CoinGecko API error: ${response.status}`);
        }

        const data: MarketData[] = await response.json();

        // Get BTC for context scoring
        const btc = data.find(c => c.id === 'bitcoin');
        const btcChange = btc?.price_change_percentage_24h || 0;

        // Skip stablecoins
        const STABLECOINS = ['tether', 'usd-coin', 'dai', 'binance-usd', 'trueusd', 'frax', 'paxos-standard', 'usdd', 'gemini-dollar', 'first-digital-usd'];

        // Score each coin
        const signals: Signal[] = data
            .filter(coin => !STABLECOINS.includes(coin.id))
            .map(coin => {
                const technicalScore = calculateTechnicalScore(coin);
                const contextScore = calculateContextScore(coin, btcChange);
                const liquidityScore = calculateLiquidityScore(coin);
                const totalScore = technicalScore + contextScore + liquidityScore;

                return {
                    id: coin.id,
                    symbol: coin.symbol,
                    name: coin.name,
                    image: coin.image,
                    price: coin.current_price,
                    change24h: coin.price_change_percentage_24h,
                    score: totalScore,
                    signalType: getSignalType(totalScore),
                    technicalScore,
                    contextScore,
                    liquidityScore,
                };
            })
            .sort((a, b) => b.score - a.score)
            .slice(0, 12);

        return NextResponse.json({ signals });
    } catch (error) {
        console.error('Signals API error:', error);

        // Return mock signals
        return NextResponse.json({
            signals: [
                { id: 'bitcoin', symbol: 'btc', name: 'Bitcoin', image: 'https://assets.coingecko.com/coins/images/1/small/bitcoin.png', price: 97500, change24h: 2.5, score: 85, signalType: 'ACCUMULATE', technicalScore: 35, contextScore: 25, liquidityScore: 25 },
                { id: 'solana', symbol: 'sol', name: 'Solana', image: 'https://assets.coingecko.com/coins/images/4128/small/solana.png', price: 185, change24h: 4.2, score: 78, signalType: 'ACCUMULATE', technicalScore: 32, contextScore: 24, liquidityScore: 22 },
                { id: 'ethereum', symbol: 'eth', name: 'Ethereum', image: 'https://assets.coingecko.com/coins/images/279/small/ethereum.png', price: 3250, change24h: 1.8, score: 75, signalType: 'ACCUMULATE', technicalScore: 30, contextScore: 22, liquidityScore: 23 },
            ]
        });
    }
}
