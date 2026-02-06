/**
 * Alert Utilities for Watchlist
 */

export async function requestNotificationPermission(): Promise<boolean> {
    if (!('Notification' in window)) return false;
    if (Notification.permission === 'granted') return true;
    const permission = await Notification.requestPermission();
    return permission === 'granted';
}

export function areNotificationsEnabled(): boolean {
    if (typeof window === 'undefined') return false;
    if (!('Notification' in window)) return false;
    return Notification.permission === 'granted';
}

interface SignalState {
    coin: string;
    direction: string;
    score: number;
    checkedAt: string;
}

const STORAGE_KEY = 'lisan_signal_states';

export function saveSignalStates(states: SignalState[]): void {
    if (typeof window === 'undefined') return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(states));
}

function getSavedStates(): SignalState[] {
    if (typeof window === 'undefined') return [];
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? JSON.parse(saved) : [];
}

export function checkForSignalChanges(
    signals: { coin: string; direction: string; score: number }[],
    watchlistCoins: string[]
): SignalState[] {
    const savedStates = getSavedStates();
    const now = new Date().toISOString();
    const newStates: SignalState[] = [];

    for (const signal of signals) {
        if (!watchlistCoins.includes(signal.coin)) continue;

        const savedState = savedStates.find(s => s.coin === signal.coin);
        newStates.push({
            coin: signal.coin,
            direction: signal.direction,
            score: signal.score,
            checkedAt: now,
        });

        if (savedState && savedState.direction !== signal.direction && areNotificationsEnabled()) {
            new Notification(`LISAN: ${signal.coin}`, {
                body: `Signal changed to ${signal.direction}`,
                icon: '/favicon.ico',
            });
        }
    }

    return newStates;
}
