# LISAN CORE ENGINE — Technical Whitepaper

> *A quantitative signal system that replaces gut feelings with math.*
> *No hype. No predictions. Just indicators and probability.*

---

## Philosophical Foundations

I built this because I was tired of watching people get wrecked.

The crypto space is full of noise. "Influencers" with sponsored bags. Trading bots that front-run you. Discord alpha groups selling hopium. Everyone has an angle. Everyone is selling something.

**I'm not selling anything — yet.** Right now, this platform is free. There's no premium tier. No "unlock full signals for $99/month." No referral codes.

Will that change? Maybe. Tokens, paid products, premium features — none of it is off the table. But I'm not asking for a seat at anyone else's table. I'm building my own. Proof of work first. Competency first. Trust first. Then we talk about what comes next.

The Lisan Core Engine is inspired by four foundational projects and the people behind them:

### Bitcoin — Satoshi Nakamoto

> "We propose a system... based on cryptographic proof instead of trust."

The engine generates signals algorithmically, not by human opinion. You don't have to trust me. You can read the code. Every indicator is documented. Every weight is visible. Trustless verification.

### Ethereum — Vitalik Buterin

> "The financial world is full of rent-seeking middlemen and inefficient processes. Decentralization will lead to leaner institutions replacing fat middlemen."

Smart contracts are programmable logic. The scoring weights in this engine are the same — configurable parameters that can be adjusted based on performance. The system isn't static. It learns and adapts.

### mfers — sartoshi

> "mfers are in the public domain. do whatever the fuck you want with them."

That energy — building something, releasing it, letting it exist without trying to extract every last dollar — that's the ethos here. Use this platform. Fork it. Improve it. I don't care. Just don't get wrecked.

### Hyperliquid — Jeff Yan

> "No VCs. No presale. Just product."

> "You're welcome to trade elsewhere."

Jeff Yan self-funded Hyperliquid and rejected venture capital entirely. Built a perp DEX that genuinely competes with centralized exchanges, then airdropped HYPE directly to users instead of doing an ICO. That's the model — build something that works first, let the product speak for itself.


**The goal is simple:** Replace emotional trading with systematic analysis. Not to predict the future — that's impossible. But to identify when probabilities are in your favor, and when they're not.

---

## Definitions

### LISAN HOLDINGS

An independent research, development, and investment firm. Built by one person — me — for anyone who wants to use it. No subscriptions. No premium tiers. No VC influence. No board meetings. No roadmap designed to pump a token.

Everything on this platform is free, forever. If you want dedicated *paid* work done — custom analysis, integrations, consulting — [reach out](https://lisanholdings.dev/). Otherwise, just use the tools.

### LISAN INTELLIGENCE

The flagship research platform you're looking at right now. It aggregates data from multiple sources (Binance, Hyperliquid, Alternative.me), processes it through the Lisan Core Engine, and presents actionable signals with confidence scores.

**What it is:** A research tool. A decision-support system. A way to see the market through 17 different quantitative lenses at once.

**What it is NOT:** A trading bot. An automated system that executes trades on your behalf. Financial advice. A guarantee of profits. A crystal ball.

### The Lisan Core Engine

The algorithmic backbone of everything. A quantitative signal generation system that analyzes cryptocurrency markets using a weighted multi-indicator scoring algorithm. It works in four stages:

1. **Data Ingestion** — Collects OHLCV (Open, High, Low, Close, Volume) price data, sentiment data from the Fear & Greed Index, and derivatives data (funding rates, open interest, basis premium, volume) from Hyperliquid.

2. **Indicator Calculation** — Computes 17 technical indicators across 6 categories: Momentum, Trend, Volume, Volatility, Sentiment, and Positioning. Each indicator produces a value, a signal (bullish/bearish/neutral), and a strength score (0.0 to 1.0).

3. **Signal Scoring** — Aggregates all indicator scores into a single 0-100 confidence score, with a directional classification: LONG (bullish setup), SHORT (bearish setup), or HOLD (no clear edge). v4.1 includes cluster agreement penalty and market regime-adaptive thresholds.

4. **Risk Computation** — Calculates ATR-based stop loss and take profit levels for every signal, ensuring a consistent 1:2 risk-to-reward ratio.

---

## Curated Asset Universe

The engine analyzes a **curated list of 20 major cryptocurrencies** — not the entire market. This is intentional.

Technical analysis requires liquidity. When you're analyzing an asset with $5M daily volume, your RSI reading is based on a handful of trades. That's noise, not signal. Low-cap coins don't have the order book depth for indicators to mean anything. One whale can invalidate your entire analysis with a single market order.

So I curated a list. These are assets with deep liquidity, significant trading volume, and enough market structure for technical analysis to actually work:

| Asset | Asset | Asset | Asset | Asset |
|-------|-------|-------|-------|-------|
| BTC | ETH | SOL | AVAX | LINK |
| DOGE | XRP | ADA | DOT | MATIC |
| UNI | ATOM | LTC | NEAR | ARB |
| OP | APT | SUI | HYPE | INJ |

**Explicit Exclusions:**
- **Stablecoins** (USDT, USDC, DAI) — No directional opportunity. They're pegged.
- **Low-cap assets** (<$1B market cap) — Insufficient liquidity for reliable TA.
- **Wrapped/derivative tokens** (WBTC, stETH) — Redundant price exposure.

---

## The 17 Indicators — Complete Breakdown

Every indicator in the engine outputs three things:

- **Value** — The raw calculated number (e.g., RSI = 28.5)
- **Signal** — Classification: bullish, bearish, or neutral
- **Strength** — Confidence in the signal, from 0.0 (no confidence) to 1.0 (maximum conviction)

Weights sum to 100 points. Here's every indicator, why it matters, and how it's scored:

---

### Momentum Cluster (25 points)

Momentum indicators measure the *speed* of price movement. They're leading indicators — they often signal reversals before they happen.

#### RSI — Relative Strength Index (6 pts)
The classic overbought/oversold indicator. Below 30 = oversold (bullish). Above 70 = overbought (bearish). We use 14-period RSI, the industry standard.

#### Stochastic RSI (5 pts)
RSI's more sensitive cousin. It oscillates faster and catches momentum shifts earlier. Below 20 = bullish. Above 80 = bearish.

#### MACD — Moving Average Convergence Divergence (6 pts)
Tracks the relationship between two EMAs (12 and 26 period). When MACD line crosses above signal line with a positive histogram = bullish. We weight this heavily because MACD momentum shifts often precede major moves.

#### Williams %R (4 pts)
Similar to stochastic, but inverted. Below -80 = bullish (oversold). Above -20 = bearish (overbought).

#### CCI — Commodity Channel Index (4 pts)
Measures deviation from the statistical mean. Below -100 = bullish (price is statistically cheap). Above 100 = bearish (price is statistically expensive).

---

### Trend Cluster (25 points)

Trend indicators identify the *direction* of the market. Are we in an uptrend, downtrend, or chopping sideways? These are lagging indicators — they confirm what's already happening.

#### EMA Stack — 7/21/50 Alignment (7 pts)
Three exponential moving averages stacked. When EMA7 > EMA21 > EMA50 and price is above all of them = strong bullish alignment. The inverse = bearish. This is the foundation of trend analysis.

#### Ichimoku Cloud (8 pts)
The most comprehensive single indicator. It gives you support/resistance (the cloud), momentum (TK cross), and trend confirmation (Chikou Span) all in one. Price above the cloud with a bullish TK cross = strong long signal. This gets the highest weight in the trend cluster because it's looking at 5 different factors simultaneously.

#### ADX — Average Directional Index (6 pts)
Measures trend *strength*, not direction. ADX above 25 = trending market (good for directional trades). Below 20 = choppy, ranging market (signals are less reliable). We use DI+ and DI- to determine direction.

#### Bollinger Bands (4 pts)
Price relative to 2 standard deviations from the mean. At the lower band = potential bullish reversal. At the upper band = potential bearish reversal. Squeeze (bands narrowing) often precedes big moves.

---

### Volume Cluster (16 points)

Volume is the fuel for price movement. A breakout without volume is suspect. A breakout WITH volume has conviction. These indicators confirm whether the move is real.

#### OBV Trend — On-Balance Volume (10 pts)
Cumulative volume flow. If price is rising and OBV is rising = healthy trend, accumulation happening. If price is rising but OBV is falling = divergence, distribution happening. Divergences often signal reversals.

#### Volume Ratio (6 pts)
Current volume relative to the 20-period average. Above 1.5x = significant volume, high conviction move. We don't trust breakouts that happen on average or below-average volume.

---

### Volatility Cluster (10 points)

Statistical measure of price deviation from the norm. Mean reversion is a powerful force — extreme moves tend to snap back.

#### Z-Score (10 pts)
Measures how far price has deviated from the mean. Below -2 = price is 2+ standard deviations below average (statistically oversold). Above +2 = statistically overbought.

---

### Sentiment Cluster (8 points)

The market is people. And people are emotional. This contrarian indicator measures crowd psychology extremes.

#### Fear & Greed Index (8 pts)
Aggregated market sentiment from multiple sources. Below 25 = Extreme Fear (historically a buying opportunity — "be greedy when others are fearful"). Above 75 = Extreme Greed (historically time to be cautious — "be fearful when others are greedy"). This is a contrarian indicator.

---

### Positioning Cluster (16 points)

v4.1 introduced a full Positioning Cluster — live Hyperliquid institutional data as first-class weighted indicators. Where is the crowd positioned? Crowded trades tend to unwind violently.

#### Funding Rate (6 pts)
Hourly funding rate from Hyperliquid, annualized to gauge directional crowding. Extreme negative funding (crowded shorts) is bullish. Extreme positive funding (crowded longs) is bearish. Includes a velocity boost: rapidly changing funding is amplified, while stable near-neutral funding is dampened.

#### Open Interest Change (4 pts)
Measures changes in open interest relative to price action. OI surging with price = trend confirmation. OI surging against price = divergence warning. Uses real historical OI from stored snapshots for accurate comparison.

#### Basis Premium (3 pts)
Mark-to-index spread from Hyperliquid. A large positive basis (mark > index) suggests aggressive long positioning (contrarian bearish). Large negative basis suggests oversold conditions (contrarian bullish).

#### HL Volume Momentum (3 pts)
Compares current 24h Hyperliquid volume to a rolling 7-day average. Volume surges (2x+ average) during breakouts confirm the move. Low volume on moves suggests fakeouts.

---

## Scoring Algorithm — The Math

The algorithm is straightforward. No black boxes. Here's exactly how a signal is generated:

```
// For each of the 17 indicators:
points = weight × strength

if (signal === 'bullish') totalBullish += points
if (signal === 'bearish') totalBearish += points

// v4.1: Cluster agreement penalizes contradictory signals
agreement = agreementRatio(bullishCount, bearishCount)
normalizedScore = (totalScore / maxPossible) × 100 × agreement

// v4.1: Classification (threshold adapts to market regime):
scoreThreshold = 50 × regimeMultiplier
// e.g. 45 in bull trend, 65 in choppy markets

if (directionalBias > totalScore × 0.15 AND normalizedScore >= scoreThreshold)
    direction = LONG
else if (directionalBias < -totalScore × 0.15 AND normalizedScore >= scoreThreshold)
    direction = SHORT
else
    direction = HOLD
```

**Why 15% directional bias threshold?**
v4.1 raised this from 10% to 15%. Because 55% bullish vs 45% bearish isn't conviction — it's noise. We require a clear directional edge before emitting a LONG or SHORT signal. If the indicators are split, that's a HOLD.

**Why ~50 minimum score?**
The base threshold is 50. In v4.1, market regime detection adjusts this automatically: in choppy markets the threshold rises to ~65 to filter noise, while in clear trends it drops to ~45. This lets the engine be more selective when conditions are uncertain and more responsive when conditions are clear.

---

## Risk Management — ATR-Based Levels

Every signal includes computed stop loss and take profit levels. These aren't random numbers — they're based on **ATR (Average True Range)**, a measure of market volatility.

Why ATR? Because volatility changes. A 2% stop loss on BTC during a calm week might be fine. That same 2% stop during a Fed announcement gets you stopped out by noise. ATR adapts to current market conditions.

### LONG
- **Entry** = Current market price
- **Stop Loss** = Entry − (1.5 × ATR)
- **Take Profit** = Entry + (3.0 × ATR)

### SHORT
- **Entry** = Current market price
- **Stop Loss** = Entry + (1.5 × ATR)
- **Take Profit** = Entry − (3.0 × ATR)

### Risk:Reward = 1:2

This ratio means you're risking 1 unit to gain 2 units. At this ratio, you only need to win **34% of trades** to break even. Win 40%? You're profitable. Win 50%? You're doing very well.

The math is on your side — *if you follow the system*. The moment you move your stop loss, double down on a loser, or take profits early because you're nervous, you break the math.

### Smart Exit Strategy — Dual-Timeframe Momentum Re-Evaluation

When a trade reaches **+3% profit**, the engine doesn't exit immediately. Instead, it fetches fresh candle data on **two timeframes (1h and 4h)** and re-evaluates RSI and MACD momentum on each:

- **Both timeframes aligned** — RSI and MACD still confirm trend direction → Let it run to full ATR-based take profit
- **Both timeframes fading** — 1h AND 4h show reversal signals → Take profit at current level
- **Mixed signals** — Only one timeframe weakening → Stay in trade (single-timeframe noise, not conviction)

v4.1 requires dual confirmation to exit — this prevents cutting winners short due to noise on a single timeframe. Candle data is fetched from Binance with Hyperliquid fallback for assets not listed on Binance.

---

## Self-Learning System — Adaptive Weights

Static systems die. Markets evolve. What worked in 2021 doesn't work in 2025. The Lisan Core Engine adapts.

Every signal generated is stored with its full indicator snapshot — every value, every weight used at the time. When the signal resolves (hits take profit or hits stop loss), we record the outcome.

### Learning Trigger: 3 Consecutive Losses

When the engine generates 3 LONG or SHORT signals in a row that hit their stop losses, it triggers a learning cycle. Not after every loss — that would be overfitting to noise. Three consecutive losses suggests a pattern, not bad luck.

### The Learning Cycle

1. **Identify problematic indicators** — Which indicators were "confidently wrong"? An indicator is flagged if it had high strength, aligned with the trade direction, but the trade still lost. That indicator was overconfident about a bad call.

2. **Reduce their weights** — Problematic indicators have their weights reduced by up to 15% per cycle. This is gradual, not dramatic. We're adjusting, not panic-selling.

3. **Persist the changes** — New weights are saved to the database (Supabase). The system remembers. Every user sees the adapted weights.

### Weight Bounds

- **Minimum**: 1 point — No indicator can ever be fully disabled.
- **Maximum**: 20 points — No single indicator can dominate the entire scoring.

This prevents extreme drift. The system adapts, but within sane boundaries. After adjustments, weights are renormalized to sum to exactly 100 points, preserving proportional relationships.

### v4.1: Win Boost — Bidirectional Learning

The engine doesn't just penalize failures — it also rewards success. When 3 consecutive wins are detected, a win-boost cycle triggers:

- **Identify high-performing indicators** — Which indicators were correctly confident in winning trades?
- **Boost their weights** — Up to 10% per cycle (conservative, prevents runaway growth)
- **60% correctness threshold** — An indicator must appear correctly in at least 60% of winning signals to qualify

This ensures the system converges toward what actually works, not just away from what doesn't.

### Weight Recovery — Gradual Return to Defaults

Penalized weights don't stay penalized forever. After 20 trades where an indicator does NOT appear in losing signals, we recover 5% of the gap toward its default weight. This prevents permanent over-penalization during unusual market conditions.

---

## Market Regime Detection

v4.1 introduced market regime detection — the engine classifies the current market environment before generating signals:

- **BULL_TREND** — BTC trending up, altcoins following, normal OI growth → Lower score threshold (~45), slight long bias
- **BEAR_TREND** — BTC trending down, widespread alt decline → Lower threshold (~45), slight short bias
- **HIGH_VOL_CHOP** — High volatility, no clear direction, extreme funding → Stricter threshold (~65), no bias
- **ACCUMULATION** — Flat price action, OI building, compressed volatility → Normal threshold, no bias
- **UNKNOWN** — Insufficient data or mixed signals → Default thresholds, no adjustments

Regime classification uses BTC OHLCV data, real altcoin price changes, average funding rates, and average OI changes from stored market snapshots.

---

## Data Sources — Where It All Comes From

Transparency matters. Here's exactly where the engine gets its data:

| Data Type | Source | Cache TTL |
|-----------|--------|-----------|
| OHLCV Price Data | Binance Public API (no auth required) | 5 minutes |
| HYPE Token Data | Hyperliquid Candle API | 5 minutes |
| Fear & Greed Index | Alternative.me (with Supabase cache fallback) | 1 hour |
| Funding Rates | Hyperliquid Meta API | 30 seconds |
| Open Interest | Hyperliquid Meta API | 30 seconds |
| Basis Premium | Hyperliquid Meta API | 30 seconds |
| 24h Volume | Hyperliquid Meta API | 30 seconds |
| Market Snapshots | Supabase (historical OI, volume, funding) | Per-run |

All API calls happen server-side. Your browser never contacts these APIs directly. This protects rate limits and keeps the architecture clean.

---

## Signal Tracking — 24/7 Monitoring

When a signal is generated, the engine needs to know when it hits its stop loss or take profit. This is harder than it sounds.

A naive approach would be to check the current price every few minutes. But if price spikes to your TP at 2:01 PM and crashes back down by 2:05 PM, you'd never see it.

### Server-Side Cron Monitoring

The Lisan Core Engine uses **server-side cron jobs** that run every 5 minutes, 24/7, to monitor all open signals. The monitoring process fetches prices from Hyperliquid and checks if any signal's take profit or stop loss was touched. This works even when you're offline — the engine never sleeps.

### Automatic Signal Generation

When signals close, the engine automatically generates new signals to maintain approximately 20 active positions (excluding HOLD signals). A separate learning cycle analyzes losing signals and adjusts indicator weights hourly.

---

## Signal Types — What They Mean

### LONG
Bullish setup detected. Indicators suggest price is likely to increase. Entry recommended.

### SHORT
Bearish setup detected. Indicators suggest price is likely to decrease. Entry recommended (if you're trading perps).

### HOLD
No clear edge. Indicators are mixed or weak. No action recommended. Wait for a better setup.

**HOLD is not a bad signal.** It's the system saying "I don't see a clear opportunity." Sometimes the best trade is no trade. Most of the time, actually.

---

## Disclaimer

⚠️ **This is not financial advice.** I'm not a licensed financial advisor. I'm a developer who built a research tool. LISAN INTELLIGENCE is exactly that — a tool.

All trading involves risk. Past indicator performance does not predict future results. The market can stay irrational longer than you can stay solvent.

**Never invest more than you can afford to lose.** Seriously. If losing your position would materially impact your life, you're overexposed. Scale down.

Do your own research. Use this as one input among many. And for the love of god, don't ape into a position because a signal said LONG.

---

*Version 4.1.1 — February 2026 — Production Accuracy Audit — LISAN HOLDINGS*
