/**
 * Server-side Supabase Client
 * 
 * Uses service role key to bypass RLS for cron jobs.
 * NEVER import this in client-side code.
 */

import { createClient } from '@supabase/supabase-js';
import { logger } from '@/lib/logger';

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
// TYPES (duplicated from supabase.ts for server isolation)
// ============================================================================

export interface DbSignal {
    id: string;
    user_id: string;
    coin: string;
    direction: 'LONG' | 'SHORT' | 'HOLD';
    score: number;
    confidence: string;
    entry_price: number;
    stop_loss: number;
    take_profit: number;
    outcome: 'PENDING' | 'WON' | 'LOST';
    exit_price?: number;
    exit_reason?: 'STOP_LOSS' | 'TAKE_PROFIT' | 'TARGET_3_PERCENT' | 'MANUAL';
    profit_pct?: number;
    indicator_snapshot: Record<string, number>;
    weights_used: Record<string, number>;
    created_at: string;
    closed_at?: string;
}

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
    exitReason: 'STOP_LOSS' | 'TAKE_PROFIT' | 'TARGET_3_PERCENT',
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
 * Get consecutive losses (global, not per-user)
 */
export async function getConsecutiveLosses(): Promise<number> {
    const { data, error } = await supabaseServer
        .from('signals')
        .select('outcome')
        .neq('outcome', 'PENDING')
        .order('closed_at', { ascending: false })
        .limit(20);

    if (error || !data) return 0;

    let count = 0;
    for (const signal of data) {
        if (signal.outcome === 'LOST') {
            count++;
        } else {
            break;
        }
    }

    return count;
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
