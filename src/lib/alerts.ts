/**
 * Signal Alerts System
 * 
 * Uses browser notifications to alert users when
 * watchlisted signals change direction.
 */

const LAST_SIGNALS_KEY = 'lisan_last_signals';

export interface LastSignalState {
    coin: string;
    direction: 'LONG' | 'SHORT' | 'HOLD';
    score: number;
    checkedAt: string;
}

/**
 * Request notification permission from the user
 */
export async function requestNotificationPermission(): Promise<boolean> {
    if (typeof window === 'undefined' || !('Notification' in window)) {
        return false;
    }

    if (Notification.permission === 'granted') {
        return true;
    }

    if (Notification.permission !== 'denied') {
        const permission = await Notification.requestPermission();
        return permission === 'granted';
    }

    return false;
}

/**
 * Check if notifications are supported and enabled
 */
export function areNotificationsEnabled(): boolean {
    if (typeof window === 'undefined' || !('Notification' in window)) {
        return false;
    }
    return Notification.permission === 'granted';
}

/**
 * Get last known signal states
 */
export function getLastSignalStates(): LastSignalState[] {
    if (typeof window === 'undefined') return [];

    try {
        const data = localStorage.getItem(LAST_SIGNALS_KEY);
        return data ? JSON.parse(data) : [];
    } catch {
        return [];
    }
}

/**
 * Save current signal states
 */
export function saveSignalStates(states: LastSignalState[]): void {
    if (typeof window === 'undefined') return;
    localStorage.setItem(LAST_SIGNALS_KEY, JSON.stringify(states));
}

/**
 * Show a browser notification
 */
export function showNotification(title: string, body: string, icon?: string): void {
    if (!areNotificationsEnabled()) return;

    new Notification(title, {
        body,
        icon: icon || '/favicon.ico',
        badge: '/favicon.ico',
        tag: 'lisan-signal-alert',
        requireInteraction: true
    });
}

/**
 * Check for signal changes and send notifications
 * Returns the new signal states for saving
 */
export function checkForSignalChanges(
    currentSignals: Array<{ coin: string; direction: 'LONG' | 'SHORT' | 'HOLD'; score: number; name?: string }>,
    watchlistCoins: string[]
): LastSignalState[] {
    const lastStates = getLastSignalStates();
    const lastStatesMap = new Map(lastStates.map(s => [s.coin, s]));

    // Only check watchlisted coins
    const watchlistSet = new Set(watchlistCoins);
    const watchlistedSignals = currentSignals.filter(s => watchlistSet.has(s.coin));

    // Check for changes
    for (const signal of watchlistedSignals) {
        const lastState = lastStatesMap.get(signal.coin);

        if (lastState && lastState.direction !== signal.direction) {
            // Direction changed!
            const name = signal.name || signal.coin;
            showNotification(
                `${name} Signal Changed!`,
                `${signal.coin} changed from ${lastState.direction} to ${signal.direction} (Score: ${signal.score})`,
            );
        }
    }

    // Return new states to save
    return currentSignals.map(s => ({
        coin: s.coin,
        direction: s.direction,
        score: s.score,
        checkedAt: new Date().toISOString()
    }));
}
