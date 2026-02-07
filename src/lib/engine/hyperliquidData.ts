/**
 * LISAN INTELLIGENCE — Hyperliquid Data Module
 * 
 * Handles Hyperliquid API integration for institutional-grade market data:
 * - Funding rates (contrarian positioning signal)
 * - Open interest changes (trend continuation/reversal)
 * - Market context for regime detection
 */

import { IndicatorResult } from './indicators';

const HYPERLIQUID_API = 'https://api.hyperliquid.xyz/info';

// ============================================================================
// TYPES
// ============================================================================

export interface HyperliquidAssetContext {
    coin: string;
    fundingRate: number;           // Current 1hr funding rate
    annualizedFunding: number;     // Annualized rate (funding * 8760)
    openInterest: number;          // OI in USD
    markPrice: number;
    volume24h: number;
    premium: number;               // Basis between mark and index
}

export interface HyperliquidMarketContext {
    assets: Map<string, HyperliquidAssetContext>;
    avgFunding: number;            // Market-wide average funding
    avgOIChange: number;           // Market-wide OI change (requires historical)
    timestamp: Date;
}

interface RawAssetCtx {
    coin: string;
    dayNtlVlm: string;
    funding: string;
    markPx: string;
    openInterest: string;
    premium: string;
}

interface RawMeta {
    universe: { name: string }[];
}

// ============================================================================
// HYPERLIQUID API FUNCTIONS
// ============================================================================

/**
 * Fetch complete market context from Hyperliquid
 */
export async function fetchHyperliquidMarketContext(
    coins: string[]
): Promise<HyperliquidMarketContext | null> {
    try {
        const response = await fetch(HYPERLIQUID_API, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ type: 'metaAndAssetCtxs' }),
        });

        if (!response.ok) return null;

        const [meta, assetCtxs] = await response.json() as [RawMeta, RawAssetCtx[]];
        const assets = new Map<string, HyperliquidAssetContext>();
        let totalFunding = 0;
        let fundingCount = 0;

        for (const coin of coins) {
            const universeIndex = meta.universe.findIndex(
                (u) => u.name.toUpperCase() === coin.toUpperCase()
            );

            if (universeIndex === -1) continue;

            const ctx = assetCtxs[universeIndex];
            if (!ctx) continue;

            const fundingRate = parseFloat(ctx.funding);
            const markPrice = parseFloat(ctx.markPx);
            const openInterest = parseFloat(ctx.openInterest) * markPrice;
            const volume24h = parseFloat(ctx.dayNtlVlm);
            const premium = parseFloat(ctx.premium);
            const annualizedFunding = fundingRate * 8760;

            assets.set(coin.toUpperCase(), {
                coin: coin.toUpperCase(),
                fundingRate,
                annualizedFunding,
                openInterest,
                markPrice,
                volume24h,
                premium,
            });

            totalFunding += annualizedFunding;
            fundingCount++;
        }

        return {
            assets,
            avgFunding: fundingCount > 0 ? totalFunding / fundingCount : 0,
            avgOIChange: 0, // Will be calculated with historical data in Phase 3
            timestamp: new Date(),
        };
    } catch (error) {
        console.error('[HyperliquidData] Failed to fetch market context:', error);
        return null;
    }
}

// ============================================================================
// INDICATOR FUNCTIONS
// ============================================================================

/**
 * Calculate Funding Rate Signal (Contrarian)
 * 
 * High positive funding = Crowded longs = BEARISH signal
 * High negative funding = Crowded shorts = BULLISH signal
 * 
 * @param annualizedFunding - Annualized funding rate (fundingRate * 8760)
 * @returns IndicatorResult with contrarian signal
 */
export function FundingRateSignal(annualizedFunding: number): IndicatorResult {
    // Thresholds based on Hyperliquid typical ranges:
    // > 30% annualized = very crowded longs
    // < -10% annualized = crowded shorts
    // -10% to 30% = neutral zone

    let signal: 'bullish' | 'bearish' | 'neutral' = 'neutral';
    let strength = 0;

    if (annualizedFunding > 0.30) {
        // Very crowded longs - contrarian BEARISH
        signal = 'bearish';
        strength = Math.min(1, (annualizedFunding - 0.30) / 0.50); // Max at 80% annualized
    } else if (annualizedFunding > 0.15) {
        // Moderately crowded longs - mild BEARISH
        signal = 'bearish';
        strength = (annualizedFunding - 0.15) / 0.30; // 0 at 15%, ~0.5 at 30%
    } else if (annualizedFunding < -0.10) {
        // Crowded shorts - contrarian BULLISH
        signal = 'bullish';
        strength = Math.min(1, Math.abs(annualizedFunding + 0.10) / 0.20); // Max at -30%
    } else if (annualizedFunding < -0.05) {
        // Slightly crowded shorts - mild BULLISH
        signal = 'bullish';
        strength = Math.abs(annualizedFunding + 0.05) / 0.10;
    }

    return {
        value: annualizedFunding * 100, // Store as percentage for readability
        signal,
        strength,
    };
}

/**
 * Calculate Open Interest Change Signal
 * 
 * Rising OI + Rising Price = New money entering (trend continuation)
 * Rising OI + Falling Price = Short sellers adding (bearish continuation)
 * Falling OI + Rising Price = Short squeeze (potential reversal)
 * Falling OI + Falling Price = Longs liquidating (bearish continuation)
 * 
 * @param currentOI - Current open interest
 * @param prevOI - Previous period open interest  
 * @param priceChange - Price change percentage
 * @returns IndicatorResult with trend signal
 */
export function OIChangeSignal(
    currentOI: number,
    prevOI: number,
    priceChange: number
): IndicatorResult {
    if (prevOI === 0) {
        return { value: 0, signal: 'neutral', strength: 0 };
    }

    const oiChange = (currentOI - prevOI) / prevOI;

    let signal: 'bullish' | 'bearish' | 'neutral' = 'neutral';
    let strength = 0;

    const significantOIChange = Math.abs(oiChange) > 0.05; // 5%+ OI change
    const significantPriceMove = Math.abs(priceChange) > 1;  // 1%+ price change

    if (significantOIChange && significantPriceMove) {
        if (oiChange > 0 && priceChange > 0) {
            // Rising OI + Rising Price = New longs, bullish continuation
            signal = 'bullish';
            strength = Math.min(1, oiChange * 5); // Normalize
        } else if (oiChange > 0 && priceChange < 0) {
            // Rising OI + Falling Price = New shorts, bearish continuation
            signal = 'bearish';
            strength = Math.min(1, oiChange * 5);
        } else if (oiChange < 0 && priceChange > 0) {
            // Falling OI + Rising Price = Short squeeze, bullish (but cautious)
            signal = 'bullish';
            strength = Math.min(0.6, Math.abs(oiChange) * 3); // Lower max strength (potential reversal)
        } else if (oiChange < 0 && priceChange < 0) {
            // Falling OI + Falling Price = Long liquidations, bearish continuation
            signal = 'bearish';
            strength = Math.min(1, Math.abs(oiChange) * 5);
        }
    }

    return {
        value: oiChange * 100, // Store as percentage
        signal,
        strength,
    };
}

/**
 * Interpret the combined positioning score
 * v4.1: Expanded to include Basis Premium and HL Volume signals
 */
export function calculatePositioningScore(
    fundingSignal: IndicatorResult,
    oiSignal: IndicatorResult,
    fundingWeight: number = 6,
    oiWeight: number = 4,
    basisPremiumSignal?: IndicatorResult,
    hlVolumeSignal?: IndicatorResult,
    basisWeight: number = 3,
    hlVolumeWeight: number = 3
): { score: number; max: number; direction: number } {
    let max = fundingWeight + oiWeight;

    const signalDir = (s: IndicatorResult) =>
        s.signal === 'bullish' ? 1 : s.signal === 'bearish' ? -1 : 0;

    const fundingScore = fundingWeight * fundingSignal.strength * signalDir(fundingSignal);
    const oiScore = oiWeight * oiSignal.strength * signalDir(oiSignal);

    let basisScore = 0;
    let volumeScore = 0;

    if (basisPremiumSignal) {
        max += basisWeight;
        basisScore = basisWeight * basisPremiumSignal.strength * signalDir(basisPremiumSignal);
    }

    if (hlVolumeSignal) {
        max += hlVolumeWeight;
        volumeScore = hlVolumeWeight * hlVolumeSignal.strength * signalDir(hlVolumeSignal);
    }

    const direction = fundingScore + oiScore + basisScore + volumeScore;
    const score = Math.abs(direction);

    return { score: Math.min(score, max), max, direction };
}

// ============================================================================
// v4.1: NEW HYPERLIQUID INDICATORS
// ============================================================================

/**
 * Basis Premium Signal (Contrarian — Mark vs Index spread)
 * 
 * Mark > Index (premium > 0): Perp trades above spot → crowded longs → bearish
 * Mark < Index (premium < 0): Perp trades below spot → crowded shorts → bullish
 * 
 * This is a high-value mean-reversion signal for leverage traders.
 * The premium field comes directly from the HL API (mark - oracle) / oracle.
 * 
 * @param premium - Mark-index basis from HL API (fractional, e.g. 0.001 = 0.1%)
 */
export function BasisPremiumSignal(premium: number): IndicatorResult {
    // premium is usually a small fraction like 0.001 (0.1%)
    const premiumPct = premium * 100; // Convert to percentage

    let signal: 'bullish' | 'bearish' | 'neutral' = 'neutral';
    let strength = 0;

    if (premiumPct > 0.10) {
        // Perp trading above spot by >0.1% = crowded longs → bearish (contrarian)
        signal = 'bearish';
        strength = Math.min(1, premiumPct / 0.5); // Full strength at 0.5%
    } else if (premiumPct < -0.10) {
        // Perp trading below spot by >0.1% = crowded shorts → bullish (contrarian)
        signal = 'bullish';
        strength = Math.min(1, Math.abs(premiumPct) / 0.5);
    }
    // Between -0.1% and +0.1% = equilibrium, no signal

    return {
        value: premiumPct,
        signal,
        strength,
    };
}

/**
 * HL Volume Momentum Signal
 * 
 * Compares current 24h USD volume against a baseline.
 * Volume surge (>1.5x baseline) + trending price = conviction confirmation.
 * Low volume breakouts get penalized (reduced strength).
 * 
 * @param volume24h - Current 24h USD volume from HL API
 * @param avgVolume - Rolling 7-day average daily volume (baseline)
 * @param priceChange - Price change percentage for direction
 */
export function HLVolumeMomentumSignal(
    volume24h: number,
    avgVolume: number,
    priceChange: number
): IndicatorResult {
    if (avgVolume <= 0 || volume24h <= 0) {
        return { value: 0, signal: 'neutral', strength: 0 };
    }

    const volumeRatio = volume24h / avgVolume;
    const significantPriceMove = Math.abs(priceChange) > 1; // >1% move

    let signal: 'bullish' | 'bearish' | 'neutral' = 'neutral';
    let strength = 0;

    if (volumeRatio > 1.5 && significantPriceMove) {
        // Volume surge with price movement = conviction
        signal = priceChange > 0 ? 'bullish' : 'bearish';
        strength = Math.min(1, (volumeRatio - 1) / 2); // 0 at 1x, 0.5 at 2x, 1.0 at 3x
    } else if (volumeRatio < 0.5 && significantPriceMove) {
        // Low volume breakout — contrarian! The move lacks conviction
        signal = priceChange > 0 ? 'bearish' : 'bullish'; // Fade the move
        strength = Math.min(0.5, (1 - volumeRatio)); // Capped at 0.5 strength
    }

    return {
        value: volumeRatio,
        signal,
        strength,
    };
}

/**
 * Funding Rate Velocity Boost
 * 
 * Amplifies the funding rate signal when funding is accelerating.
 * If funding went from 0.01% to 0.05% in one period, it's more significant
 * than stable 0.05% funding (which is already priced in).
 * 
 * Returns a multiplier (0.8 to 1.5) to apply to the base funding signal.
 * 
 * @param currentFunding - Current annualized funding rate
 * @param prevFunding - Previous period annualized funding rate
 */
export function FundingVelocityBoost(
    currentFunding: number,
    prevFunding: number
): number {
    if (prevFunding === 0) return 1.0; // No previous data, no boost

    const velocity = currentFunding - prevFunding;
    const acceleration = Math.abs(velocity);

    if (acceleration > 0.10) {
        // Rapid funding change (>10% annualized shift) = amplify signal
        return Math.min(1.5, 1.0 + acceleration * 2);
    } else if (acceleration < 0.02 && Math.abs(currentFunding) < 0.15) {
        // #6 FIX: Only dampen when stable AND near neutral (already priced in)
        // Stable extreme funding (e.g. 50% for days) is still a strong contrarian signal
        return 0.8;
    }

    return 1.0; // Normal velocity
}
