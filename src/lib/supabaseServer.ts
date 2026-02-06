/**
 * Server-side Supabase Client
 * 
 * Uses service role key to bypass RLS for cron jobs.
 * NEVER import this in client-side code.
 */

import { createClient } from '@supabase/supabase-js';
import { logger } from '@/lib/logger';
import type { DbSignal } from '@/lib/types/database';

// Re-export for convenience
export type { DbSignal };

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
    exitReason: 'STOP_LOSS' | 'TAKE_PROFIT' | 'TARGET_3_PERCENT' | 'MOMENTUM_EXIT',
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
        .single();

    if (error) {
        logger.error('Error fetching global weights', error);
        return null;
    }

    return data?.weights || null;
}

/**
 * Update GLOBAL weights (after learning cycle)
 */
export async function updateGlobalWeights(weights: Record<string, number>): Promise<boolean> {
    const { error } = await supabaseServer
        .from('global_weights')
        .update({
            weights,
            updated_at: new Date().toISOString()
        })
        .eq('id', 1);

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
