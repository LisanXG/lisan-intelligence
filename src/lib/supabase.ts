/**
 * Supabase Client Configuration
 * 
 * Client for browser-side Supabase operations.
 * Uses NEXT_PUBLIC env vars for client-side access.
 */

import { createBrowserClient } from '@supabase/ssr';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createBrowserClient(supabaseUrl, supabaseAnonKey);

// ============================================================================
// AUTH HELPERS
// ============================================================================

export async function signUp(email: string, password: string) {
    const { data, error } = await supabase.auth.signUp({
        email,
        password,
    });
    return { data, error };
}

export async function signIn(email: string, password: string) {
    const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
    });
    return { data, error };
}

export async function signOut() {
    const { error } = await supabase.auth.signOut();
    return { error };
}

export async function getSession() {
    const { data: { session }, error } = await supabase.auth.getSession();
    return { session, error };
}

export async function getUser() {
    const { data: { user }, error } = await supabase.auth.getUser();
    return { user, error };
}

// ============================================================================
// DATABASE TYPES
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

export interface DbWatchlistItem {
    id: string;
    user_id: string;
    coin: string;
    price_at_add: number;
    added_at: string;
}

export interface DbUserWeights {
    user_id: string;
    weights: Record<string, number>;
    updated_at: string;
}

export interface DbLearningCycle {
    id: string;
    user_id: string;
    triggered_by: string;
    signals_analyzed: number;
    adjustments: Array<{
        indicator: string;
        oldWeight: number;
        newWeight: number;
        changePercent: number;
        reason: string;
    }>;
    previous_win_rate?: number;
    consecutive_losses?: number;
    created_at: string;
}

// ============================================================================
// SIGNAL HELPERS
// ============================================================================

/**
 * Check if a signal can be added (no existing PENDING signal for same coin)
 * Only ONE pending signal per coin allowed - prevents duplicates
 */
export async function canAddSignal(
    userId: string,
    coin: string,
    _direction: string // Kept for API compatibility but not used
): Promise<boolean> {
    const { data, error } = await supabase
        .from('signals')
        .select('id')
        .eq('user_id', userId)
        .eq('coin', coin)
        .eq('outcome', 'PENDING')
        .maybeSingle();

    if (error) {
        console.error('[Supabase] Error checking existing signal:', error);
        return false; // Fail safe - don't add if we can't check
    }

    return !data; // Can add only if no existing PENDING signal for this coin
}

/**
 * Get all signals for a user
 */
export async function getUserSignals(userId: string): Promise<DbSignal[]> {
    const { data, error } = await supabase
        .from('signals')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

    if (error) {
        console.error('[Supabase] Error fetching signals:', error);
        return [];
    }

    return data || [];
}

/**
 * Get open signals for a user
 */
export async function getOpenSignals(userId: string): Promise<DbSignal[]> {
    const { data, error } = await supabase
        .from('signals')
        .select('*')
        .eq('user_id', userId)
        .eq('outcome', 'PENDING')
        .order('created_at', { ascending: false });

    if (error) {
        console.error('[Supabase] Error fetching open signals:', error);
        return [];
    }

    return data || [];
}

/**
 * Add a new signal
 */
export async function addSignalToDb(
    userId: string,
    signal: Omit<DbSignal, 'id' | 'user_id' | 'created_at' | 'outcome'>
): Promise<DbSignal | null> {
    // First check if we can add
    const canAdd = await canAddSignal(userId, signal.coin, signal.direction);
    if (!canAdd) {
        console.log(`[Supabase] Blocked duplicate signal: ${signal.coin} ${signal.direction}`);
        return null;
    }

    const { data, error } = await supabase
        .from('signals')
        .insert({
            user_id: userId,
            ...signal,
            outcome: 'PENDING',
        })
        .select()
        .single();

    if (error) {
        console.error('[Supabase] Error adding signal:', error);
        return null;
    }

    return data;
}

/**
 * Update signal outcome
 */
export async function updateSignalOutcome(
    signalId: string,
    outcome: 'WON' | 'LOST',
    exitPrice: number,
    exitReason: 'STOP_LOSS' | 'TAKE_PROFIT' | 'TARGET_3_PERCENT' | 'MANUAL',
    profitPct: number
): Promise<DbSignal | null> {
    const { data, error } = await supabase
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
        console.error('[Supabase] Error updating signal:', error);
        return null;
    }

    return data;
}

/**
 * Get tracking statistics for a user
 */
export async function getTrackingStats(userId: string) {
    const signals = await getUserSignals(userId);

    const completed = signals.filter(s => s.outcome !== 'PENDING');
    const open = signals.filter(s => s.outcome === 'PENDING');
    const wins = completed.filter(s => s.outcome === 'WON');
    const losses = completed.filter(s => s.outcome === 'LOST');

    // Calculate consecutive losses
    let consecutiveLosses = 0;
    const sortedCompleted = [...completed].sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
    for (const signal of sortedCompleted) {
        if (signal.outcome === 'LOST') {
            consecutiveLosses++;
        } else {
            break;
        }
    }

    const avgProfit = wins.length > 0
        ? wins.reduce((sum, s) => sum + (s.profit_pct || 0), 0) / wins.length
        : 0;
    const avgLoss = losses.length > 0
        ? losses.reduce((sum, s) => sum + Math.abs(s.profit_pct || 0), 0) / losses.length
        : 0;

    return {
        totalSignals: signals.length,
        openSignals: open.length,
        wins: wins.length,
        losses: losses.length,
        winRate: completed.length > 0 ? (wins.length / completed.length) * 100 : 0,
        avgProfit: Math.round(avgProfit * 100) / 100,
        avgLoss: Math.round(avgLoss * 100) / 100,
        consecutiveLosses,
        byDirection: {
            LONG: {
                wins: wins.filter(s => s.direction === 'LONG').length,
                losses: losses.filter(s => s.direction === 'LONG').length,
                total: signals.filter(s => s.direction === 'LONG').length,
            },
            SHORT: {
                wins: wins.filter(s => s.direction === 'SHORT').length,
                losses: losses.filter(s => s.direction === 'SHORT').length,
                total: signals.filter(s => s.direction === 'SHORT').length,
            },
            HOLD: {
                wins: 0,
                losses: 0,
                total: signals.filter(s => s.direction === 'HOLD').length,
            },
        },
    };
}

// ============================================================================
// WATCHLIST HELPERS
// ============================================================================

export async function getWatchlist(userId: string): Promise<DbWatchlistItem[]> {
    const { data, error } = await supabase
        .from('watchlist')
        .select('*')
        .eq('user_id', userId)
        .order('added_at', { ascending: false });

    if (error) {
        console.error('[Supabase] Error fetching watchlist:', error);
        return [];
    }

    return data || [];
}

export async function addToWatchlist(
    userId: string,
    coin: string,
    priceAtAdd: number
): Promise<DbWatchlistItem | null> {
    const { data, error } = await supabase
        .from('watchlist')
        .insert({
            user_id: userId,
            coin,
            price_at_add: priceAtAdd,
        })
        .select()
        .single();

    if (error) {
        // Might be duplicate - that's okay
        if (error.code === '23505') {
            console.log('[Supabase] Coin already in watchlist:', coin);
            return null;
        }
        console.error('[Supabase] Error adding to watchlist:', error);
        return null;
    }

    return data;
}

export async function removeFromWatchlist(userId: string, coin: string): Promise<boolean> {
    const { error } = await supabase
        .from('watchlist')
        .delete()
        .eq('user_id', userId)
        .eq('coin', coin);

    if (error) {
        console.error('[Supabase] Error removing from watchlist:', error);
        return false;
    }

    return true;
}

export async function isInWatchlist(userId: string, coin: string): Promise<boolean> {
    const { data } = await supabase
        .from('watchlist')
        .select('id')
        .eq('user_id', userId)
        .eq('coin', coin)
        .maybeSingle();

    return !!data;
}

// ============================================================================
// WEIGHTS & LEARNING HELPERS
// ============================================================================

export async function getUserWeights(userId: string): Promise<Record<string, number> | null> {
    const { data, error } = await supabase
        .from('user_weights')
        .select('weights')
        .eq('user_id', userId)
        .maybeSingle();

    if (error) {
        console.error('[Supabase] Error fetching weights:', error);
        return null;
    }

    return data?.weights || null;
}

export async function saveUserWeights(
    userId: string,
    weights: Record<string, number>
): Promise<boolean> {
    const { error } = await supabase
        .from('user_weights')
        .upsert({
            user_id: userId,
            weights,
            updated_at: new Date().toISOString(),
        });

    if (error) {
        console.error('[Supabase] Error saving weights:', error);
        return false;
    }

    return true;
}

export async function addLearningCycle(
    userId: string,
    cycle: Omit<DbLearningCycle, 'id' | 'user_id' | 'created_at'>
): Promise<DbLearningCycle | null> {
    const { data, error } = await supabase
        .from('learning_cycles')
        .insert({
            user_id: userId,
            ...cycle,
        })
        .select()
        .single();

    if (error) {
        console.error('[Supabase] Error adding learning cycle:', error);
        return null;
    }

    return data;
}

export async function getLearningHistory(userId: string): Promise<DbLearningCycle[]> {
    const { data, error } = await supabase
        .from('learning_cycles')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(50);

    if (error) {
        console.error('[Supabase] Error fetching learning history:', error);
        return [];
    }

    return data || [];
}
