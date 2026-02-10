/**
 * LISAN INTELLIGENCE — Database Types
 * 
 * Shared type definitions for database entities.
 * Single source of truth for both client and server code.
 */

// ============================================================================
// SIGNAL TYPES
// ============================================================================

export interface DbSignal {
    id: string;
    user_id: string | null; // null for global signals
    coin: string;
    direction: 'LONG' | 'SHORT' | 'HOLD';
    score: number;
    confidence: string;
    entry_price: number;
    stop_loss: number;
    take_profit: number;
    outcome: 'PENDING' | 'WON' | 'LOST';
    exit_price?: number;
    exit_reason?: ExitReason;
    profit_pct?: number;
    indicator_snapshot: Record<string, number | string | boolean>;
    weights_used: Record<string, number>;
    created_at: string;
    closed_at?: string;
}

// ============================================================================
// WATCHLIST TYPES
// ============================================================================

export interface DbWatchlistItem {
    id: string;
    user_id: string;
    coin: string;
    price_at_add: number;
    added_at: string;
}

// ============================================================================
// WEIGHTS & LEARNING TYPES
// ============================================================================

export interface DbUserWeights {
    user_id: string;
    weights: Record<string, number>;
    updated_at: string;
}

export interface DbLearningCycle {
    id: string;
    user_id: string | null; // null for global learning
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
    weights_snapshot?: Record<string, number>; // Weights after this learning event
    created_at: string;
}

// ============================================================================
// HELPER TYPES
// ============================================================================

export type SignalDirection = 'LONG' | 'SHORT' | 'HOLD';
export type SignalOutcome = 'PENDING' | 'WON' | 'LOST';
export type ExitReason = 'STOP_LOSS' | 'TAKE_PROFIT' | 'MOMENTUM_EXIT' | 'MANUAL';
