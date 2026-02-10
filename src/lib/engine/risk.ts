/**
 * LISAN INTELLIGENCE — Risk Management Module
 * 
 * Calculates stop loss, take profit, and risk/reward ratios
 * based on ATR and technical analysis.
 */

import { OHLCV, ATR, EMA, SMA } from './indicators';

// ============================================================================
// TYPES
// ============================================================================

export type SignalDirection = 'LONG' | 'SHORT' | 'HOLD';

export interface RiskLevels {
    entryPrice: number;
    stopLoss: number;
    takeProfit: number;
    riskRewardRatio: number;
    riskPercent: number;      // % distance to stop loss
    rewardPercent: number;    // % distance to take profit
    atrValue: number;         // ATR used for calculation
}

export interface SupportResistance {
    supports: number[];
    resistances: number[];
    nearestSupport: number;
    nearestResistance: number;
}

// ============================================================================
// SUPPORT & RESISTANCE DETECTION
// ============================================================================

/**
 * Find pivot points (local highs and lows) for support/resistance
 * 
 * @param data - OHLCV data array
 * @param leftBars - Bars to the left for pivot detection
 * @param rightBars - Bars to the right for pivot detection
 */
export function findPivotPoints(
    data: OHLCV[],
    leftBars: number = 5,
    rightBars: number = 2
): { pivotHighs: number[]; pivotLows: number[] } {
    const pivotHighs: number[] = [];
    const pivotLows: number[] = [];

    if (data.length < leftBars + rightBars + 1) {
        return { pivotHighs, pivotLows };
    }

    for (let i = leftBars; i < data.length - rightBars; i++) {
        const currentHigh = data[i].high;
        const currentLow = data[i].low;

        // Check for pivot high
        let isPivotHigh = true;
        for (let j = i - leftBars; j < i; j++) {
            if (data[j].high > currentHigh) {
                isPivotHigh = false;
                break;
            }
        }
        if (isPivotHigh) {
            for (let j = i + 1; j <= i + rightBars; j++) {
                if (data[j].high > currentHigh) {
                    isPivotHigh = false;
                    break;
                }
            }
        }
        if (isPivotHigh) {
            pivotHighs.push(currentHigh);
        }

        // Check for pivot low
        let isPivotLow = true;
        for (let j = i - leftBars; j < i; j++) {
            if (data[j].low < currentLow) {
                isPivotLow = false;
                break;
            }
        }
        if (isPivotLow) {
            for (let j = i + 1; j <= i + rightBars; j++) {
                if (data[j].low < currentLow) {
                    isPivotLow = false;
                    break;
                }
            }
        }
        if (isPivotLow) {
            pivotLows.push(currentLow);
        }
    }

    return { pivotHighs, pivotLows };
}

/**
 * Find support and resistance levels near current price
 * 
 * @param data - OHLCV data array
 * @param currentPrice - Current price to find levels around
 */
export function findSupportResistance(
    data: OHLCV[],
    currentPrice: number
): SupportResistance {
    const { pivotHighs, pivotLows } = findPivotPoints(data);

    // Filter to levels near current price (within 20% range)
    const priceTolerance = currentPrice * 0.2;

    const relevantHighs = pivotHighs.filter(
        p => Math.abs(p - currentPrice) < priceTolerance
    );
    const relevantLows = pivotLows.filter(
        p => Math.abs(p - currentPrice) < priceTolerance
    );

    // Resistances are above current price, supports are below
    const resistances = relevantHighs
        .filter(p => p > currentPrice)
        .sort((a, b) => a - b); // Nearest first

    const supports = relevantLows
        .filter(p => p < currentPrice)
        .sort((a, b) => b - a); // Nearest first (descending)

    return {
        resistances,
        supports,
        nearestResistance: resistances[0] || currentPrice * 1.05, // Default 5% above
        nearestSupport: supports[0] || currentPrice * 0.95,       // Default 5% below
    };
}

// ============================================================================
// STOP LOSS & TAKE PROFIT CALCULATION
// ============================================================================

/**
 * Calculate risk levels for a trade
 * 
 * Uses ATR for volatility-based stops:
 * - LONG: SL = entry - (1.5 × ATR), TP = entry + (3 × ATR)
 * - SHORT: SL = entry + (1.5 × ATR), TP = entry - (3 × ATR)
 * 
 * Also considers support/resistance for tighter/wider levels.
 * 
 * @param data - OHLCV data array
 * @param direction - LONG or SHORT
 * @param atrMultiplierSL - ATR multiplier for stop loss (default 1.5)
 * @param atrMultiplierTP - ATR multiplier for take profit (default 3)
 */
export function calculateRiskLevels(
    data: OHLCV[],
    direction: SignalDirection,
    atrMultiplierSL: number = 1.5,
    atrMultiplierTP: number = 3
): RiskLevels {
    if (data.length === 0) {
        return {
            entryPrice: 0,
            stopLoss: 0,
            takeProfit: 0,
            riskRewardRatio: 0,
            riskPercent: 0,
            rewardPercent: 0,
            atrValue: 0,
        };
    }

    const currentPrice = data[data.length - 1].close;
    const atrValue = ATR(data, 14);
    const { nearestSupport, nearestResistance } = findSupportResistance(data, currentPrice);

    let stopLoss: number;
    let takeProfit: number;

    if (direction === 'LONG') {
        // ATR-based levels
        const atrStopLoss = currentPrice - (atrMultiplierSL * atrValue);
        const atrTakeProfit = currentPrice + (atrMultiplierTP * atrValue);

        // Use tighter of ATR or support/resistance
        stopLoss = Math.max(atrStopLoss, nearestSupport * 0.995); // Slightly below support
        takeProfit = Math.min(atrTakeProfit, nearestResistance * 0.995); // Slightly below resistance

        // Ensure minimum distance (at least 2% above entry)
        if (takeProfit <= currentPrice * 1.02) {
            takeProfit = currentPrice + (atrMultiplierTP * atrValue);
        }

        // Final sanity check: TP must be above entry for LONG
        if (takeProfit <= currentPrice) {
            takeProfit = currentPrice * 1.05; // Force 5% above entry as last resort
        }
    } else if (direction === 'SHORT') {
        // ATR-based levels
        const atrStopLoss = currentPrice + (atrMultiplierSL * atrValue);
        const atrTakeProfit = currentPrice - (atrMultiplierTP * atrValue);

        // Use tighter of ATR or support/resistance
        stopLoss = Math.min(atrStopLoss, nearestResistance * 1.005); // Slightly above resistance
        // For SHORT: TP must be BELOW entry, use the HIGHER of (atrTP, support) but cap at entry
        takeProfit = Math.max(atrTakeProfit, nearestSupport * 1.005); // Slightly above support

        // CRITICAL: Ensure TP is always at least 2% below entry for SHORT
        if (takeProfit >= currentPrice * 0.98) {
            takeProfit = currentPrice - (atrMultiplierTP * atrValue);
        }

        // Final sanity check: TP must be below entry for SHORT
        if (takeProfit >= currentPrice) {
            takeProfit = currentPrice * 0.95; // Force 5% below entry as last resort
        }
    } else {
        // HOLD - no trade, return neutral values
        return {
            entryPrice: currentPrice,
            stopLoss: currentPrice,
            takeProfit: currentPrice,
            riskRewardRatio: 0,
            riskPercent: 0,
            rewardPercent: 0,
            atrValue,
        };
    }

    // Calculate percentages
    const riskPercent = Math.abs((currentPrice - stopLoss) / currentPrice) * 100;
    const rewardPercent = Math.abs((takeProfit - currentPrice) / currentPrice) * 100;
    const riskRewardRatio = riskPercent > 0 ? rewardPercent / riskPercent : 0;

    return {
        entryPrice: currentPrice,
        stopLoss: Math.round(stopLoss * 100) / 100, // Round to 2 decimals
        takeProfit: Math.round(takeProfit * 100) / 100,
        riskRewardRatio: Math.round(riskRewardRatio * 100) / 100,
        riskPercent: Math.round(riskPercent * 100) / 100,
        rewardPercent: Math.round(rewardPercent * 100) / 100,
        atrValue: Math.round(atrValue * 100) / 100,
    };
}

/**
 * Validate risk levels meet minimum requirements
 * 
 * @planned Intended for future Portfolio Management feature (position sizing UI).
 * @param levels - Calculated risk levels
 * @param minRR - Minimum acceptable risk/reward ratio (default 1.5)
 */
export function validateRiskLevels(
    levels: RiskLevels,
    minRR: number = 1.5
): { isValid: boolean; reason?: string } {
    if (levels.riskRewardRatio < minRR) {
        return {
            isValid: false,
            reason: `Risk/Reward ratio ${levels.riskRewardRatio} below minimum ${minRR}`,
        };
    }

    if (levels.riskPercent > 10) {
        return {
            isValid: false,
            reason: `Risk percent ${levels.riskPercent}% too high`,
        };
    }

    if (levels.riskPercent < 0.5) {
        return {
            isValid: false,
            reason: `Risk percent ${levels.riskPercent}% too low (likely calculation error)`,
        };
    }

    return { isValid: true };
}

/**
 * Get position size based on risk
 * 
 * @planned Intended for future Portfolio Management feature (position sizing UI).
 * @param accountBalance - Total account balance
 * @param riskPercent - Percentage of account to risk per trade
 * @param levels - Calculated risk levels
 */
export function calculatePositionSize(
    accountBalance: number,
    riskPercentOfAccount: number,
    levels: RiskLevels
): { positionSize: number; quantity: number } {
    const riskAmount = accountBalance * (riskPercentOfAccount / 100);
    const priceRisk = Math.abs(levels.entryPrice - levels.stopLoss);

    if (priceRisk === 0) {
        return { positionSize: 0, quantity: 0 };
    }

    const quantity = riskAmount / priceRisk;
    const positionSize = quantity * levels.entryPrice;

    return {
        positionSize: Math.round(positionSize * 100) / 100,
        quantity: Math.round(quantity * 10000) / 10000, // 4 decimal places
    };
}
