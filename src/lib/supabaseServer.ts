/**
 * Server-side Supabase Client
 * 
 * Uses service role key to bypass RLS for cron jobs.
 * NEVER import this in client-side code.
 */

import { createClient } from '@supabase/supabase-js';
import { logger } from '@/lib/logger';
import type { DbSignal, ExitReason } from '@/lib/types/database';

// Re-export for convenience
export type { DbSignal, ExitReason };

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !serviceRoleKey) {
    throw new Error('Missing Supabase environment variables for server client');
}

export const supabaseServer = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
        autoRefreshToken: false,
        persistSession: false,
    },
});

// ============================================================================
// SERVER-SIDE HELPERS
// ============================================================================

/**
 * Get ALL pending signals across all users (for cron monitoring)
 */
export async function getAllPendingSignals(): Promise<DbSignal[]> {
    const { data, error } = await supabaseServer
        .from('signals')
        .select('*')
        .eq('outcome', 'PENDING');

    if (error) {
        logger.error('Error fetching pending signals', error);
        return [];
    }

    return data || [];
}

/**
 * Update signal outcome (server-side, no RLS)
 */
export async function updateSignalOutcomeServer(
    signalId: string,
    outcome: 'WON' | 'LOST',
    exitPrice: number,
    exitReason: ExitReason,
    profitPct: number
): Promise<DbSignal | null> {
    const { data, error } = await supabaseServer
        .from('signals')
        .update({
            outcome,
            exit_price: exitPrice,
            exit_reason: exitReason,
            profit_pct: profitPct,
            closed_at: new Date().toISOString(),
        })
        .eq('id', signalId)
        .select()
        .single();

    if (error) {
        logger.error('Error updating signal', error);
        return null;
    }

    return data;
}

/**
 * Get all unique user IDs with signals
 */
export async function getAllUserIds(): Promise<string[]> {
    const { data, error } = await supabaseServer
        .from('signals')
        .select('user_id')
        .limit(1000);

    if (error) {
        logger.error('Error fetching user IDs', error);
        return [];
    }

    const uniqueIds = [...new Set(data?.map(d => d.user_id) || [])];
    return uniqueIds;
}

/**
 * Get pending signals for a specific user
 */
export async function getUserPendingSignals(userId: string): Promise<DbSignal[]> {
    const { data, error } = await supabaseServer
        .from('signals')
        .select('*')
        .eq('user_id', userId)
        .eq('outcome', 'PENDING');

    if (error) {
        logger.error('Error fetching user pending signals', error);
        return [];
    }

    return data || [];
}

/**
 * Add a new signal (server-side, bypasses RLS)
 */
export async function addSignalServer(
    userId: string,
    signal: Omit<DbSignal, 'id' | 'user_id' | 'created_at' | 'outcome'>
): Promise<DbSignal | null> {
    // Check for existing pending signal on this coin
    const { data: existing } = await supabaseServer
        .from('signals')
        .select('id')
        .eq('user_id', userId)
        .eq('coin', signal.coin)
        .eq('outcome', 'PENDING')
        .maybeSingle();

    if (existing) {
        logger.debug(`Blocked duplicate: ${signal.coin} already has pending signal`);
        return null;
    }

    const { data, error } = await supabaseServer
        .from('signals')
        .insert({
            user_id: userId,
            ...signal,
            outcome: 'PENDING',
        })
        .select()
        .single();

    if (error) {
        logger.error('Error adding signal', error);
        return null;
    }

    return data;
}

/**
 * Get GLOBAL weights (shared by all users)
 */
export async function getGlobalWeights(): Promise<Record<string, number> | null> {
    const { data, error } = await supabaseServer
        .from('global_weights')
        .select('weights')
        .eq('id', 1)
        .maybeSingle();

    if (error) {
        logger.error('Error fetching global weights', error);
        return null;
    }

    return data?.weights || null;
}

/**
 * Update GLOBAL weights (after learning cycle)
 * Uses upsert to create the row if it doesn't exist yet.
 */
export async function updateGlobalWeights(weights: Record<string, number>): Promise<boolean> {
    const { error } = await supabaseServer
        .from('global_weights')
        .upsert({
            id: 1,
            weights,
            updated_at: new Date().toISOString()
        });

    if (error) {
        logger.error('Error updating global weights', error);
        return false;
    }

    return true;
}

/**
 * Get the ID of the last signal that triggered a learning event
 */
export async function getLastLearnedSignalId(): Promise<string | null> {
    const { data, error } = await supabaseServer
        .from('learning_cycles')
        .select('created_at')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

    if (error || !data) return null;

    // Get the most recent signal closed before or at learning time
    const { data: signalData } = await supabaseServer
        .from('signals')
        .select('id')
        .neq('outcome', 'PENDING')
        .lte('closed_at', data.created_at)
        .order('closed_at', { ascending: false })
        .limit(1)
        .maybeSingle();

    return signalData?.id || null;
}

/**
 * Find any streak of 3+ consecutive losses that hasn't been processed yet.
 * Returns the count of the streak and the signal IDs involved.
 * 
 * Logic: Scans chronologically and looks for ANY 3+ consecutive losses.
 * When a WIN is encountered, if we have a streak of 3+, return it.
 * Otherwise reset and keep looking.
 */
export async function findUnprocessedLossStreak(): Promise<{
    count: number;
    signalIds: string[];
    streakEndTime: string | null;  // Timestamp of the 3rd loss for chart positioning
}> {
    // Get all completed signals ordered by close time
    const { data, error } = await supabaseServer
        .from('signals')
        .select('id, outcome, closed_at')
        .neq('outcome', 'PENDING')
        .order('closed_at', { ascending: true }); // Oldest first

    if (error || !data || data.length === 0) {
        return { count: 0, signalIds: [], streakEndTime: null };
    }

    // Get the timestamp of the last learning event
    const { data: lastLearning } = await supabaseServer
        .from('learning_cycles')
        .select('created_at')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

    const lastLearnedAt = lastLearning?.created_at ? new Date(lastLearning.created_at) : null;

    // Scan for any streak of 3+ losses after the last learning event
    let currentStreak: { id: string; closedAt: string }[] = [];

    for (const signal of data) {
        // Skip signals that were already processed by a learning event
        if (lastLearnedAt && new Date(signal.closed_at) <= lastLearnedAt) {
            continue;
        }

        if (signal.outcome === 'LOST') {
            currentStreak.push({ id: signal.id, closedAt: signal.closed_at });
        } else {
            // WIN encountered - check if we have a valid streak to return
            if (currentStreak.length >= 3) {
                return {
                    count: currentStreak.length,
                    signalIds: currentStreak.map(s => s.id),
                    streakEndTime: currentStreak[2].closedAt, // 3rd loss timestamp
                };
            }
            // Not enough losses - reset and keep looking
            currentStreak = [];
        }
    }

    // Check if we ended with a valid streak (trailing losses)
    if (currentStreak.length >= 3) {
        return {
            count: currentStreak.length,
            signalIds: currentStreak.map(s => s.id),
            streakEndTime: currentStreak[2].closedAt, // 3rd loss timestamp
        };
    }

    return { count: 0, signalIds: [], streakEndTime: null };
}

/**
 * v4.1: Find any streak of 3+ consecutive WINS that hasn't been processed.
 * Mirrors findUnprocessedLossStreak but for the win-boost learning path.
 */
export async function findUnprocessedWinStreak(): Promise<{
    count: number;
    signalIds: string[];
    streakEndTime: string | null;
}> {
    const { data, error } = await supabaseServer
        .from('signals')
        .select('id, outcome, closed_at')
        .neq('outcome', 'PENDING')
        .order('closed_at', { ascending: true });

    if (error || !data || data.length === 0) {
        return { count: 0, signalIds: [], streakEndTime: null };
    }

    // Get last win_boost learning event timestamp
    const { data: lastBoost } = await supabaseServer
        .from('learning_cycles')
        .select('created_at')
        .eq('triggered_by', 'consecutive_wins')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

    const lastBoostedAt = lastBoost?.created_at ? new Date(lastBoost.created_at) : null;

    let currentStreak: { id: string; closedAt: string }[] = [];

    for (const signal of data) {
        if (lastBoostedAt && new Date(signal.closed_at) <= lastBoostedAt) {
            continue;
        }

        if (signal.outcome === 'WON') {
            currentStreak.push({ id: signal.id, closedAt: signal.closed_at });
        } else {
            if (currentStreak.length >= 3) {
                return {
                    count: currentStreak.length,
                    signalIds: currentStreak.map(s => s.id),
                    streakEndTime: currentStreak[2].closedAt,
                };
            }
            currentStreak = [];
        }
    }

    if (currentStreak.length >= 3) {
        return {
            count: currentStreak.length,
            signalIds: currentStreak.map(s => s.id),
            streakEndTime: currentStreak[2].closedAt,
        };
    }

    return { count: 0, signalIds: [], streakEndTime: null };
}



/**
 * Add a signal (global, no user_id)
 */
export async function addGlobalSignal(
    signal: Omit<DbSignal, 'id' | 'user_id' | 'created_at' | 'outcome'>
): Promise<DbSignal | null> {
    // Check for existing pending signal on this coin
    const { data: existing } = await supabaseServer
        .from('signals')
        .select('id')
        .eq('coin', signal.coin)
        .eq('outcome', 'PENDING')
        .maybeSingle();

    if (existing) {
        logger.debug(`Blocked duplicate: ${signal.coin} already has pending signal`);
        return null;
    }

    const { data, error } = await supabaseServer
        .from('signals')
        .insert({
            ...signal,
            user_id: null, // Global signal, no user
            outcome: 'PENDING',
        })
        .select()
        .single();

    if (error) {
        logger.error('Error adding global signal', error);
        return null;
    }

    return data;
}

/**
 * Get coins that had signals close within the cooldown period
 * @param cooldownHours - Number of hours to wait before regenerating
 */
export async function getRecentlyClosedCoins(cooldownHours: number = 4): Promise<string[]> {
    const cooldownTime = new Date();
    cooldownTime.setHours(cooldownTime.getHours() - cooldownHours);

    const { data, error } = await supabaseServer
        .from('signals')
        .select('coin')
        .in('outcome', ['WON', 'LOST'])
        .gte('closed_at', cooldownTime.toISOString());

    if (error) {
        logger.error('Error fetching recently closed coins', error);
        return [];
    }

    // Return unique coin symbols
    const coins = data?.map(s => s.coin.toUpperCase()) || [];
    return [...new Set(coins)];
}

// ============================================================================
// PHASE 4: Context-Aware Learning Helpers
// ============================================================================

/**
 * Get trailing win rate over last N closed signals
 * Used for proactive learning trigger detection
 */
export async function getTrailingWinRate(windowSize: number = 10): Promise<{
    winRate: number;
    wins: number;
    losses: number;
    total: number;
}> {
    const { data, error } = await supabaseServer
        .from('signals')
        .select('outcome')
        .in('outcome', ['WON', 'LOST'])
        .order('closed_at', { ascending: false })
        .limit(windowSize);

    if (error || !data || data.length === 0) {
        return { winRate: 0, wins: 0, losses: 0, total: 0 };
    }

    const wins = data.filter(s => s.outcome === 'WON').length;
    const losses = data.filter(s => s.outcome === 'LOST').length;
    const total = data.length;

    return {
        winRate: total > 0 ? (wins / total) * 100 : 0,
        wins,
        losses,
        total,
    };
}

/**
 * Get directional stats (LONG vs SHORT performance)
 */
export async function getDirectionalStats(limit: number = 50): Promise<{
    long: { wins: number; losses: number; winRate: number };
    short: { wins: number; losses: number; winRate: number };
}> {
    const { data, error } = await supabaseServer
        .from('signals')
        .select('direction, outcome')
        .in('outcome', ['WON', 'LOST'])
        .order('closed_at', { ascending: false })
        .limit(limit);

    if (error || !data) {
        return {
            long: { wins: 0, losses: 0, winRate: 0 },
            short: { wins: 0, losses: 0, winRate: 0 },
        };
    }

    const longs = data.filter(s => s.direction === 'LONG');
    const shorts = data.filter(s => s.direction === 'SHORT');

    const longWins = longs.filter(s => s.outcome === 'WON').length;
    const longLosses = longs.filter(s => s.outcome === 'LOST').length;
    const shortWins = shorts.filter(s => s.outcome === 'WON').length;
    const shortLosses = shorts.filter(s => s.outcome === 'LOST').length;

    return {
        long: {
            wins: longWins,
            losses: longLosses,
            winRate: longs.length > 0 ? (longWins / longs.length) * 100 : 0,
        },
        short: {
            wins: shortWins,
            losses: shortLosses,
            winRate: shorts.length > 0 ? (shortWins / shorts.length) * 100 : 0,
        },
    };
}

/**
 * Get signals grouped by market regime
 */
export async function getSignalsByRegime(limit: number = 100): Promise<
    Map<string, { wins: number; losses: number; total: number; winRate: number }>
> {
    const { data, error } = await supabaseServer
        .from('signals')
        .select('outcome, indicator_snapshot')
        .in('outcome', ['WON', 'LOST'])
        .order('closed_at', { ascending: false })
        .limit(limit);

    if (error || !data) {
        return new Map();
    }

    const regimeStats = new Map<string, { wins: number; losses: number; total: number; winRate: number }>();

    for (const signal of data) {
        // Cast to record with possible string values for regime
        const snapshot = signal.indicator_snapshot as Record<string, unknown> | null;
        const regime = (snapshot?.regime as string) || 'UNKNOWN';

        const existing = regimeStats.get(regime) || { wins: 0, losses: 0, total: 0, winRate: 0 };
        existing.total++;
        if (signal.outcome === 'WON') existing.wins++;
        if (signal.outcome === 'LOST') existing.losses++;
        existing.winRate = (existing.wins / existing.total) * 100;
        regimeStats.set(regime, existing);
    }

    return regimeStats;
}

/**
 * Count how many trades have passed since an indicator last appeared in a losing signal
 * Used for weight recovery mechanism
 */
export async function getTradesSinceIndicatorLoss(indicatorName: string, limit: number = 50): Promise<number> {
    const { data, error } = await supabaseServer
        .from('signals')
        .select('outcome, indicator_snapshot')
        .in('outcome', ['WON', 'LOST'])
        .order('closed_at', { ascending: false })
        .limit(limit);

    if (error || !data) {
        return 0;
    }

    let tradesSinceLoss = 0;

    for (const signal of data) {
        if (signal.outcome === 'LOST') {
            const snapshot = signal.indicator_snapshot as Record<string, unknown> | null;
            if (snapshot && snapshot[indicatorName] !== undefined) {
                // Found a loss where this indicator was present
                return tradesSinceLoss;
            }
        }
        tradesSinceLoss++;
    }

    // Indicator hasn't appeared in a loss in the last 'limit' trades
    return tradesSinceLoss;
}

// ============================================================================
// MARKET SNAPSHOTS — Historical OI, Volume, Funding for comparison signals
// ============================================================================

export interface MarketSnapshot {
    coin: string;
    open_interest: number;
    volume_24h: number;
    volume_7d_avg: number;
    funding_rate: number;
    updated_at: string;
}

/**
 * Get previous market snapshots for multiple coins
 * Returns a Map of coin → snapshot for O(1) lookups during generation
 */
export async function getMarketSnapshots(coins: string[]): Promise<Map<string, MarketSnapshot>> {
    const result = new Map<string, MarketSnapshot>();

    const { data, error } = await supabaseServer
        .from('market_snapshots')
        .select('*')
        .in('coin', coins.map(c => c.toUpperCase()));

    if (error || !data) {
        console.error('[MarketSnapshots] Failed to fetch:', error?.message);
        return result;
    }

    for (const row of data) {
        result.set(row.coin, row as MarketSnapshot);
    }

    return result;
}

/**
 * Upsert market snapshot for a single coin
 * Calculates rolling 7-day average volume using exponential moving average:
 *   newAvg = (prevAvg * 6 + currentVolume) / 7
 * Only recalculates the average when shouldUpdateVolumeAvg is true (~once per day)
 * to prevent the 15-min cron frequency from destroying the smoothing.
 */
export async function upsertMarketSnapshot(
    coin: string,
    openInterest: number,
    volume24h: number,
    fundingRate: number,
    prevAvgVolume: number = 0,
    shouldUpdateVolumeAvg: boolean = true
): Promise<void> {
    // Calculate rolling avg: only recalculate when enough time has passed
    const volume7dAvg = shouldUpdateVolumeAvg
        ? (prevAvgVolume > 0 ? (prevAvgVolume * 6 + volume24h) / 7 : volume24h)
        : (prevAvgVolume > 0 ? prevAvgVolume : volume24h);

    const { error } = await supabaseServer
        .from('market_snapshots')
        .upsert({
            coin: coin.toUpperCase(),
            open_interest: openInterest,
            volume_24h: volume24h,
            volume_7d_avg: volume7dAvg,
            funding_rate: fundingRate,
            updated_at: new Date().toISOString(),
        }, { onConflict: 'coin' });

    if (error) {
        console.error(`[MarketSnapshots] Upsert failed for ${coin}:`, error.message);
    }
}

// ============================================================================
// CACHE STORE — Generic key-value cache (used for F&G fallback, etc.)
// ============================================================================

/**
 * Get a cached value by key
 */
export async function getCacheValue<T>(key: string): Promise<T | null> {
    const { data, error } = await supabaseServer
        .from('cache_store')
        .select('value, updated_at')
        .eq('key', key)
        .single();

    if (error || !data) return null;

    return data.value as T;
}

/**
 * Set a cached value by key (upserts)
 */
export async function setCacheValue(key: string, value: unknown): Promise<void> {
    const { error } = await supabaseServer
        .from('cache_store')
        .upsert({
            key,
            value,
            updated_at: new Date().toISOString(),
        }, { onConflict: 'key' });

    if (error) {
        console.error(`[CacheStore] Upsert failed for ${key}:`, error.message);
    }
}

