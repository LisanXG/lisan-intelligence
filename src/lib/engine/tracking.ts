/**
 * LISAN INTELLIGENCE — Signal Tracking System
 * 
 * Stores signal history, monitors outcomes, and tracks win/loss records.
 * Provides data for the self-learning engine.
 */

import { SignalOutput } from './scoring';
import { SignalDirection } from './risk';

// ============================================================================
// TYPES
// ============================================================================

export type SignalOutcome = 'WIN' | 'LOSS' | 'OPEN';
export type ExitReason = 'STOP_LOSS' | 'TAKE_PROFIT' | 'TARGET_3_PERCENT' | 'MANUAL' | 'TIMEOUT';

export interface SignalRecord {
    id: string;
    signal: SignalOutput;

    // Outcome tracking
    outcome: SignalOutcome;
    exitPrice?: number;
    exitTimestamp?: Date;
    profitPct?: number;
    exitReason?: ExitReason;

    // For learning
    indicatorSnapshot: Record<string, number>;
    weightsUsed: Record<string, number>;
}

export interface TrackingStats {
    totalSignals: number;
    openSignals: number;
    wins: number;
    losses: number;
    winRate: number;
    avgProfit: number;
    avgLoss: number;
    consecutiveLosses: number;

    byDirection: {
        LONG: { wins: number; losses: number; total: number };
        SHORT: { wins: number; losses: number; total: number };
        HOLD: { wins: number; losses: number; total: number };
    };
}

// ============================================================================
// SIGNAL HISTORY MANAGER
// ============================================================================

/**
 * In-memory signal history with localStorage persistence
 */
class SignalHistory {
    private signals: SignalRecord[] = [];
    private readonly storageKey = 'lisan_signal_history';
    private readonly versionKey = 'lisan_tracking_version';
    private readonly currentVersion = 2; // v2 = WebSocket-based tracking
    private readonly maxHistory = 1000; // Keep last 1000 signals

    constructor() {
        this.checkVersion();
        this.loadFromStorage();
    }

    /**
     * Check tracking system version and clear old data if needed
     */
    private checkVersion(): void {
        if (typeof window === 'undefined') return;

        try {
            const storedVersion = localStorage.getItem(this.versionKey);
            const version = storedVersion ? parseInt(storedVersion, 10) : 1;

            if (version < this.currentVersion) {
                console.log('[Tracking] Upgrading from v' + version + ' to v' + this.currentVersion + ' - clearing old data');
                localStorage.removeItem(this.storageKey);
                localStorage.setItem(this.versionKey, this.currentVersion.toString());
            }
        } catch (e) {
            console.error('Failed to check tracking version:', e);
        }
    }

    /**
     * Load signals from localStorage
     */
    private loadFromStorage(): void {
        if (typeof window === 'undefined') return;

        try {
            const stored = localStorage.getItem(this.storageKey);
            if (stored) {
                const parsed = JSON.parse(stored);
                this.signals = parsed.map((s: SignalRecord) => ({
                    ...s,
                    signal: {
                        ...s.signal,
                        timestamp: new Date(s.signal.timestamp),
                    },
                    exitTimestamp: s.exitTimestamp ? new Date(s.exitTimestamp) : undefined,
                }));
            }
        } catch (e) {
            console.error('Failed to load signal history:', e);
            this.signals = [];
        }
    }

    /**
     * Save signals to localStorage
     */
    private saveToStorage(): void {
        if (typeof window === 'undefined') return;

        try {
            localStorage.setItem(this.storageKey, JSON.stringify(this.signals));
        } catch (e) {
            console.error('Failed to save signal history:', e);
        }
    }

    /**
     * Generate unique ID for a signal
     */
    private generateId(): string {
        return `sig_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    /**
     * Add a new signal to history
     */
    addSignal(signal: SignalOutput, weightsUsed: Record<string, number>): SignalRecord {
        const record: SignalRecord = {
            id: this.generateId(),
            signal,
            outcome: 'OPEN',
            indicatorSnapshot: { ...signal.indicators },
            weightsUsed: { ...weightsUsed },
        };

        this.signals.push(record);

        // Trim old signals if over limit
        if (this.signals.length > this.maxHistory) {
            this.signals = this.signals.slice(-this.maxHistory);
        }

        this.saveToStorage();
        return record;
    }

    /**
     * Update signal outcome
     */
    updateOutcome(
        signalId: string,
        outcome: SignalOutcome,
        exitPrice: number,
        exitReason: ExitReason
    ): SignalRecord | null {
        const record = this.signals.find(s => s.id === signalId);
        if (!record) return null;

        record.outcome = outcome;
        record.exitPrice = exitPrice;
        record.exitTimestamp = new Date();
        record.exitReason = exitReason;

        // Calculate profit/loss percentage
        const entry = record.signal.entryPrice;
        if (record.signal.direction === 'LONG') {
            record.profitPct = ((exitPrice - entry) / entry) * 100;
        } else if (record.signal.direction === 'SHORT') {
            record.profitPct = ((entry - exitPrice) / entry) * 100;
        } else {
            record.profitPct = 0;
        }

        this.saveToStorage();
        return record;
    }

    /**
     * Check if a signal should be marked as win/loss based on current price
     * 
     * Win condition: Price hits take profit OR +3% gain
     * Loss condition: Price hits stop loss
     */
    checkOutcome(
        signalId: string,
        currentPrice: number
    ): { shouldUpdate: boolean; outcome?: SignalOutcome; exitReason?: ExitReason } {
        const record = this.signals.find(s => s.id === signalId);
        if (!record || record.outcome !== 'OPEN') {
            return { shouldUpdate: false };
        }

        const { entryPrice, stopLoss, takeProfit, direction } = record.signal;
        const WIN_THRESHOLD_PCT = 3; // 3% profit = win

        if (direction === 'LONG') {
            // Check take profit or 3% gain
            const profitPct = ((currentPrice - entryPrice) / entryPrice) * 100;
            if (currentPrice >= takeProfit) {
                return { shouldUpdate: true, outcome: 'WIN', exitReason: 'TAKE_PROFIT' };
            }
            if (profitPct >= WIN_THRESHOLD_PCT) {
                return { shouldUpdate: true, outcome: 'WIN', exitReason: 'TARGET_3_PERCENT' };
            }
            // Check stop loss
            if (currentPrice <= stopLoss) {
                return { shouldUpdate: true, outcome: 'LOSS', exitReason: 'STOP_LOSS' };
            }
        } else if (direction === 'SHORT') {
            // Check take profit or 3% gain
            const profitPct = ((entryPrice - currentPrice) / entryPrice) * 100;
            if (currentPrice <= takeProfit) {
                return { shouldUpdate: true, outcome: 'WIN', exitReason: 'TAKE_PROFIT' };
            }
            if (profitPct >= WIN_THRESHOLD_PCT) {
                return { shouldUpdate: true, outcome: 'WIN', exitReason: 'TARGET_3_PERCENT' };
            }
            // Check stop loss
            if (currentPrice >= stopLoss) {
                return { shouldUpdate: true, outcome: 'LOSS', exitReason: 'STOP_LOSS' };
            }
        }

        return { shouldUpdate: false };
    }

    /**
     * Get all signals
     */
    getAll(): SignalRecord[] {
        return [...this.signals];
    }

    /**
     * Get open signals
     */
    getOpen(): SignalRecord[] {
        return this.signals.filter(s => s.outcome === 'OPEN');
    }

    /**
     * Get recent signals
     */
    getRecent(count: number = 20): SignalRecord[] {
        return this.signals.slice(-count);
    }

    /**
     * Get signals by coin
     */
    getByCoin(coin: string): SignalRecord[] {
        return this.signals.filter(s => s.signal.coin === coin);
    }

    /**
     * Get signals by direction
     */
    getByDirection(direction: SignalDirection): SignalRecord[] {
        return this.signals.filter(s => s.signal.direction === direction);
    }

    /**
     * Get completed signals (non-OPEN)
     */
    getCompleted(): SignalRecord[] {
        return this.signals.filter(s => s.outcome !== 'OPEN');
    }

    /**
     * Get consecutive losses count (from most recent)
     */
    getConsecutiveLosses(): number {
        const completed = this.getCompleted().reverse();
        let count = 0;

        for (const record of completed) {
            if (record.outcome === 'LOSS') {
                count++;
            } else {
                break;
            }
        }

        return count;
    }

    /**
     * Get tracking statistics
     */
    getStats(): TrackingStats {
        const all = this.signals;
        const completed = this.getCompleted();
        const open = this.getOpen();

        const wins = completed.filter(s => s.outcome === 'WIN');
        const losses = completed.filter(s => s.outcome === 'LOSS');

        const avgProfit = wins.length > 0
            ? wins.reduce((sum, s) => sum + (s.profitPct || 0), 0) / wins.length
            : 0;
        const avgLoss = losses.length > 0
            ? losses.reduce((sum, s) => sum + Math.abs(s.profitPct || 0), 0) / losses.length
            : 0;

        const byDirection = {
            LONG: {
                wins: wins.filter(s => s.signal.direction === 'LONG').length,
                losses: losses.filter(s => s.signal.direction === 'LONG').length,
                total: all.filter(s => s.signal.direction === 'LONG').length,
            },
            SHORT: {
                wins: wins.filter(s => s.signal.direction === 'SHORT').length,
                losses: losses.filter(s => s.signal.direction === 'SHORT').length,
                total: all.filter(s => s.signal.direction === 'SHORT').length,
            },
            HOLD: {
                wins: 0, losses: 0,
                total: all.filter(s => s.signal.direction === 'HOLD').length,
            },
        };

        return {
            totalSignals: all.length,
            openSignals: open.length,
            wins: wins.length,
            losses: losses.length,
            winRate: completed.length > 0 ? (wins.length / completed.length) * 100 : 0,
            avgProfit: Math.round(avgProfit * 100) / 100,
            avgLoss: Math.round(avgLoss * 100) / 100,
            consecutiveLosses: this.getConsecutiveLosses(),
            byDirection,
        };
    }

    /**
     * Clear all signals (for testing)
     */
    clearAll(): void {
        this.signals = [];
        this.saveToStorage();
    }
}

// Singleton instance
let historyInstance: SignalHistory | null = null;

export function getSignalHistory(): SignalHistory {
    if (!historyInstance) {
        historyInstance = new SignalHistory();
    }
    return historyInstance;
}

// ============================================================================
// CONVENIENCE EXPORTS
// ============================================================================

export function addSignal(signal: SignalOutput, weightsUsed: Record<string, number>): SignalRecord {
    return getSignalHistory().addSignal(signal, weightsUsed);
}

export function updateSignalOutcome(
    signalId: string,
    outcome: SignalOutcome,
    exitPrice: number,
    exitReason: ExitReason
): SignalRecord | null {
    return getSignalHistory().updateOutcome(signalId, outcome, exitPrice, exitReason);
}

export function checkAndUpdateOutcomes(
    priceUpdates: { coin: string; currentPrice: number }[]
): SignalRecord[] {
    const history = getSignalHistory();
    const openSignals = history.getOpen();
    const updated: SignalRecord[] = [];

    for (const signal of openSignals) {
        const priceInfo = priceUpdates.find(p => p.coin === signal.signal.coin);
        if (!priceInfo) continue;

        const result = history.checkOutcome(signal.id, priceInfo.currentPrice);
        if (result.shouldUpdate && result.outcome && result.exitReason) {
            const updatedSignal = history.updateOutcome(
                signal.id,
                result.outcome,
                priceInfo.currentPrice,
                result.exitReason
            );
            if (updatedSignal) {
                updated.push(updatedSignal);
            }
        }
    }

    return updated;
}

export function getTrackingStats(): TrackingStats {
    return getSignalHistory().getStats();
}

export function shouldTriggerLearning(): boolean {
    return getSignalHistory().getConsecutiveLosses() >= 3;
}
