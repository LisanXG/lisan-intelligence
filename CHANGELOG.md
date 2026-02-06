# Changelog

All notable changes to LISAN INTELLIGENCE will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [4.0.0] - 2026-02-06

### Added
- **Engine v4.0** — Major overhaul of the signal generation and learning systems
- **Hyperliquid-Primary Data** — HL perpetuals now primary data source with Binance fallback
- **Funding Rate Indicator** — New indicator from Hyperliquid funding data
- **Open Interest Indicator** — Tracks OI changes for sentiment analysis
- **Market Regime Detection** — Classifies market as BULLISH/BEARISH/NEUTRAL/VOLATILE
- **Context-Aware Learning** — Direction-specific weight tracking (LONG vs SHORT performance)
- **Trailing Win Rate** — Proactive monitoring of recent performance windows
- **Weight Recovery** — Penalized indicators gradually recover after proving stability
- **Live Price Safeguards** — Blocks stale entry prices to prevent fake instant wins

### Changed
- Replaced DOGE with TON in curated 20 assets (stability improvement)
- Raised signal score threshold from 35 → 50 (quality over quantity)
- Reduced Fear & Greed weight from 15 → 8 (less sentiment dependency)
- Entry prices now use live Hyperliquid mark price (not candle close)

### Fixed
- ADX penalty bug in learning system
- Stale entry price bug causing 0-minute impossible winners
- Signals blocked if live price unavailable or differs >5% from candle

## [3.1.16] - 2026-02-06

### Added
- **Admin Governance** — Destructive operations (Reset/Clear) restricted to authorized administrators via RBAC
- **Signal Fidelity Hardening** — PostgreSQL partial unique index prevents duplicate pending signals
- **Positive Outcome Guards** — Enforces profit validation for WON outcomes
- **Smart Exit Strategy** — Momentum re-evaluation at +3% profit to run winners to full ATR TP
- **Autonomous Learning Pipeline** — Hourly weight adaptation on 3+ consecutive loss streaks

### Changed
- Upgraded to Next.js 16 and React 19
- Server-side cron is now sole authority for signal exits (removed client-side race condition)
- Learning events now positioned at exact streak timestamp for chart accuracy

### Fixed
- Take profit polarity validation for SHORT signals
- Display precision for sub-$1 assets (dynamic decimals up to 6)
- Deduplication race conditions during high-frequency volatility

## [0.3.0] - 2026-02-01

### Added
- **User Authentication** — Email/password login and signup via Supabase Auth
- **Cloud Data Persistence** — Signals, watchlist, and learning weights stored in PostgreSQL
- **Protected Routes** — AuthGate wrapper requires login to access platform features
- **Session Management** — Persistent sessions across browser refreshes
- **Row Level Security** — Each user can only access their own data

### Changed
- Migrated signal tracking from localStorage to Supabase database
- Migrated watchlist from localStorage to Supabase database  
- Updated learning system to persist weights per-user in database
- Premium login card redesign with animated gradient background

### Technical
- Added `@supabase/supabase-js` and `@supabase/ssr` dependencies
- Created `signals`, `watchlist`, `user_weights`, and `learning_cycles` tables
- Implemented RLS policies for data isolation

## [0.2.0] - 2026-01-31

### Added
- **Transparency Dashboard** (`/proof`) — Real performance data with win rates, cumulative returns, and score distribution
- **Shareable Signal Cards** — Generate PNG images and share to X/Twitter with pre-filled signal details
- **Quant View** — Dense data table with sorting and CSV export for institutional workflows
- **Score Context** — Historical win rate displayed on signal cards (when sample size ≥ 10)
- **Real-time WebSocket Tracking** — Zero-gap outcome monitoring via Hyperliquid WebSocket
- **Mobile Responsive Styles** — Comprehensive breakpoints for 768px and 375px screens

### Changed
- Replaced PEPE with TIA (Celestia) in curated 20 assets — prevents sub-cent price tracking issues
- Improved signal deduplication to check ALL recent signals (not just OPEN), preventing rapid re-addition

### Fixed
- Share button generating blank PNGs — now renders card on-screen during capture
- Proof page header readability — wrapped in card container

## [0.1.0] - 2026-01-28

### Added
- Initial release of LISAN INTELLIGENCE
- 14-indicator scoring engine (RSI, MACD, Ichimoku, Bollinger, etc.)
- 20 curated cryptocurrency assets
- ATR-based risk levels with 1:2 R:R
- Self-learning weight adaptation
- Watchlist with price tracking
- Real-time data from Binance, Hyperliquid, Alternative.me
