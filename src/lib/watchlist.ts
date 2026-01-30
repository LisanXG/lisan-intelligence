/**
 * Watchlist Storage Utilities
 * 
 * Manages user's saved assets using localStorage.
 * Stores coin, price at time of adding, and timestamp.
 */

const WATCHLIST_KEY = 'lisan_watchlist';

export interface WatchlistItem {
    coin: string;        // e.g. "BTC", "ETH"
    addedAt: string;     // ISO timestamp
    priceAtAdd: number;  // Price when added to watchlist
}

/**
 * Get all watchlisted coins
 */
export function getWatchlist(): WatchlistItem[] {
    if (typeof window === 'undefined') return [];

    try {
        const data = localStorage.getItem(WATCHLIST_KEY);
        return data ? JSON.parse(data) : [];
    } catch {
        return [];
    }
}

/**
 * Get a single watchlist item by coin
 */
export function getWatchlistItem(coin: string): WatchlistItem | undefined {
    const list = getWatchlist();
    return list.find(item => item.coin === coin);
}

/**
 * Check if a coin is in the watchlist
 */
export function isInWatchlist(coin: string): boolean {
    const list = getWatchlist();
    return list.some(item => item.coin === coin);
}

/**
 * Add a coin to the watchlist with current price
 */
export function addToWatchlist(coin: string, price: number): void {
    if (typeof window === 'undefined') return;
    if (isInWatchlist(coin)) return;

    const list = getWatchlist();
    list.push({
        coin,
        addedAt: new Date().toISOString(),
        priceAtAdd: price
    });

    localStorage.setItem(WATCHLIST_KEY, JSON.stringify(list));
}

/**
 * Remove a coin from the watchlist
 */
export function removeFromWatchlist(coin: string): void {
    if (typeof window === 'undefined') return;

    const list = getWatchlist();
    const filtered = list.filter(item => item.coin !== coin);

    localStorage.setItem(WATCHLIST_KEY, JSON.stringify(filtered));
}

/**
 * Toggle a coin in the watchlist
 * Returns true if added, false if removed
 */
export function toggleWatchlist(coin: string, price: number): boolean {
    if (isInWatchlist(coin)) {
        removeFromWatchlist(coin);
        return false;
    } else {
        addToWatchlist(coin, price);
        return true;
    }
}

/**
 * Clear entire watchlist
 */
export function clearWatchlist(): void {
    if (typeof window === 'undefined') return;
    localStorage.removeItem(WATCHLIST_KEY);
}
