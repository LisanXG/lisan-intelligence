/**
 * Hyperliquid WebSocket Manager
 * 
 * Connects to Hyperliquid's WebSocket API and subscribes to 1-minute candles
 * for real-time SL/TP detection. This fixes the polling gap bug where trades
 * were incorrectly marked as WIN because we only checked prices every 5 minutes.
 */

import { getSignalHistory } from './tracking';
import { logger } from '@/lib/logger';

const log = logger.withContext('WS');
// Hyperliquid WebSocket endpoint
const WS_URL = 'wss://api.hyperliquid.xyz/ws';

interface Candle {
    t: number;    // timestamp
    o: string;    // open
    h: string;    // high
    l: string;    // low
    c: string;    // close
    v: string;    // volume
}

interface WsMessage {
    channel?: string;
    data?: {
        s?: string;  // symbol/coin
        i?: string;  // interval
        t?: number;  // timestamp
        o?: string;  // OHLC data
        h?: string;
        l?: string;
        c?: string;
    };
}

class HyperliquidWebSocket {
    private ws: WebSocket | null = null;
    private subscriptions: Set<string> = new Set();
    private reconnectAttempts: number = 0;
    private maxReconnectAttempts: number = 5;
    private reconnectDelay: number = 3000;
    private isConnected: boolean = false;
    private heartbeatInterval: ReturnType<typeof setInterval> | null = null;

    /**
     * Connect to Hyperliquid WebSocket
     */
    connect(): void {
        if (this.ws && this.isConnected) {
            log.debug('Already connected');
            return;
        }

        try {
            log.debug('Connecting to Hyperliquid...');
            this.ws = new WebSocket(WS_URL);

            this.ws.onopen = () => {
                log.info('Connected to Hyperliquid');
                this.isConnected = true;
                this.reconnectAttempts = 0;
                this.updateStatus('connected');

                // Re-subscribe to any existing subscriptions
                for (const coin of this.subscriptions) {
                    this.sendSubscription(coin);
                }

                // Start heartbeat
                this.startHeartbeat();
            };

            this.ws.onmessage = (event) => {
                try {
                    const message: WsMessage = JSON.parse(event.data);
                    this.handleMessage(message);
                } catch (e) {
                    log.error('Failed to parse message', e);
                }
            };

            this.ws.onerror = (error) => {
                log.error('WebSocket error', error);
                this.updateStatus('error');
            };

            this.ws.onclose = () => {
                log.debug('Connection closed');
                this.isConnected = false;
                this.updateStatus('disconnected');
                this.stopHeartbeat();
                this.attemptReconnect();
            };

        } catch (error) {
            log.error('Failed to connect', error);
            this.attemptReconnect();
        }
    }

    /**
     * Disconnect from WebSocket
     */
    disconnect(): void {
        this.stopHeartbeat();
        if (this.ws) {
            this.ws.close();
            this.ws = null;
        }
        this.isConnected = false;
        this.updateStatus('disconnected');
        log.debug('Disconnected');
    }

    /**
     * Subscribe to 1m candles for a coin
     */
    subscribe(coin: string): void {
        // Normalize coin name (remove USDT suffix if present)
        const normalizedCoin = coin.replace('USDT', '').toUpperCase();

        if (this.subscriptions.has(normalizedCoin)) {
            return;
        }

        this.subscriptions.add(normalizedCoin);
        log.debug(`Subscribing to ${normalizedCoin} candles`);

        if (this.isConnected && this.ws) {
            this.sendSubscription(normalizedCoin);
        }
    }

    /**
     * Unsubscribe from a coin
     */
    unsubscribe(coin: string): void {
        const normalizedCoin = coin.replace('USDT', '').toUpperCase();

        if (!this.subscriptions.has(normalizedCoin)) {
            return;
        }

        this.subscriptions.delete(normalizedCoin);
        log.debug(`Unsubscribing from ${normalizedCoin}`);

        if (this.isConnected && this.ws) {
            const message = {
                method: 'unsubscribe',
                subscription: {
                    type: 'candle',
                    coin: normalizedCoin,
                    interval: '1m'
                }
            };
            this.ws.send(JSON.stringify(message));
        }
    }

    /**
     * Get current connection status
     */
    getStatus(): string {
        return this.isConnected ? 'connected' : 'disconnected';
    }

    /**
     * Get list of subscribed coins
     */
    getSubscriptions(): string[] {
        return Array.from(this.subscriptions);
    }

    // Private methods

    private sendSubscription(coin: string): void {
        if (!this.ws || !this.isConnected) return;

        const message = {
            method: 'subscribe',
            subscription: {
                type: 'candle',
                coin: coin,
                interval: '1m'
            }
        };
        this.ws.send(JSON.stringify(message));
    }

    private handleMessage(message: WsMessage): void {
        // Candle update
        if (message.channel === 'candle' && message.data) {
            const { s: coin, h: high, l: low } = message.data;

            if (coin && high && low) {
                this.checkSignalOutcomes(coin, parseFloat(high), parseFloat(low));
            }
        }
    }

    /**
     * Check if any open signals have hit SL/TP based on candle high/low
     */
    private checkSignalOutcomes(coin: string, candleHigh: number, candleLow: number): void {
        const history = getSignalHistory();
        const openSignals = history.getOpen().filter(s =>
            s.signal.coin.replace('USDT', '').toUpperCase() === coin.toUpperCase()
        );

        for (const record of openSignals) {
            const { signal } = record;
            const { direction, stopLoss, takeProfit } = signal;

            let shouldClose = false;
            let outcome: 'WIN' | 'LOSS' | null = null;
            let exitReason: 'STOP_LOSS' | 'TAKE_PROFIT' | null = null;
            let exitPrice: number | null = null;

            if (direction === 'LONG') {
                // LONG: SL hit if low <= stopLoss, TP hit if high >= takeProfit
                if (candleLow <= stopLoss) {
                    shouldClose = true;
                    outcome = 'LOSS';
                    exitReason = 'STOP_LOSS';
                    exitPrice = stopLoss;
                } else if (candleHigh >= takeProfit) {
                    shouldClose = true;
                    outcome = 'WIN';
                    exitReason = 'TAKE_PROFIT';
                    exitPrice = takeProfit;
                }
            } else if (direction === 'SHORT') {
                // SHORT: SL hit if high >= stopLoss, TP hit if low <= takeProfit
                if (candleHigh >= stopLoss) {
                    shouldClose = true;
                    outcome = 'LOSS';
                    exitReason = 'STOP_LOSS';
                    exitPrice = stopLoss;
                } else if (candleLow <= takeProfit) {
                    shouldClose = true;
                    outcome = 'WIN';
                    exitReason = 'TAKE_PROFIT';
                    exitPrice = takeProfit;
                }
            }

            if (shouldClose && outcome && exitReason && exitPrice !== null) {
                log.debug(`Signal ${record.id} hit ${exitReason} at ${exitPrice}`);

                // Update the signal outcome
                history.updateOutcome(record.id, outcome, exitPrice, exitReason);

                // Unsubscribe from this coin if no more open signals for it
                const remainingSignals = history.getOpen().filter(s =>
                    s.signal.coin.replace('USDT', '').toUpperCase() === coin.toUpperCase()
                );
                if (remainingSignals.length === 0) {
                    this.unsubscribe(coin);
                }
            }
        }
    }

    private attemptReconnect(): void {
        if (this.reconnectAttempts >= this.maxReconnectAttempts) {
            log.error('Max reconnection attempts reached');
            this.updateStatus('failed');
            return;
        }

        this.reconnectAttempts++;
        const delay = this.reconnectDelay * this.reconnectAttempts;

        log.debug(`Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})`);

        setTimeout(() => {
            this.connect();
        }, delay);
    }

    private startHeartbeat(): void {
        // Send ping every 30 seconds to keep connection alive
        this.heartbeatInterval = setInterval(() => {
            if (this.ws && this.isConnected) {
                this.ws.send(JSON.stringify({ method: 'ping' }));
            }
        }, 30000);
    }

    private stopHeartbeat(): void {
        if (this.heartbeatInterval) {
            clearInterval(this.heartbeatInterval);
            this.heartbeatInterval = null;
        }
    }

    private updateStatus(status: string): void {
        if (typeof window !== 'undefined') {
            localStorage.setItem('lisan_ws_status', status);
        }
    }
}

// Singleton instance
let wsInstance: HyperliquidWebSocket | null = null;

/**
 * Get the singleton WebSocket instance
 */
export function getHyperliquidWebSocket(): HyperliquidWebSocket {
    if (!wsInstance) {
        wsInstance = new HyperliquidWebSocket();
    }
    return wsInstance;
}

/**
 * Initialize WebSocket and subscribe to coins with open signals
 */
export function initializeWebSocket(): void {
    const ws = getHyperliquidWebSocket();
    ws.connect();

    // Subscribe to all coins with open signals
    const history = getSignalHistory();
    const openSignals = history.getOpen();

    for (const signal of openSignals) {
        ws.subscribe(signal.signal.coin);
    }
}
