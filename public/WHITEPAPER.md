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

**What it is:** A research tool. A decision-support system. A way to see the market through 14 different quantitative lenses at once.

**What it is NOT:** A trading bot. An automated system that executes trades on your behalf. Financial advice. A guarantee of profits. A crystal ball.

### The Lisan Core Engine

The algorithmic backbone of everything. A quantitative signal generation system that analyzes cryptocurrency markets using a weighted multi-indicator scoring algorithm. It works in four stages:

1. **Data Ingestion** — Collects OHLCV (Open, High, Low, Close, Volume) price data, sentiment data from the Fear & Greed Index, and derivatives data (funding rates, open interest) from perpetual exchanges.

2. **Indicator Calculation** — Computes 14 technical indicators across 4 categories: Momentum, Trend, Volume, and Sentiment/Volatility. Each indicator produces a value, a signal (bullish/bearish/neutral), and a strength score (0.0 to 1.0).

3. **Signal Scoring** — Aggregates all indicator scores into a single 0-100 confidence score, with a directional classification: LONG (bullish setup), SHORT (bearish setup), or HOLD (no clear edge).

4. **Risk Computation** — Calculates ATR-based stop loss and take profit levels for every signal, ensuring a consistent 1:2 risk-to-reward ratio.

---

## Curated Asset Universe

The engine analyzes a **curated list of 20 major cryptocurrencies** — not the entire market. This is intentional.

Technical analysis requires liquidity. When you're analyzing an asset with $5M daily volume, your RSI reading is based on a handful of trades. That's noise, not signal. Low-cap coins don't have the order book depth for indicators to mean anything. One whale can invalidate your entire analysis with a single market order.

So I curated a list. These are assets with deep liquidity, significant trading volume, and enough market structure for technical analysis to actually work:

| Asset | Asset | Asset | Asset | Asset |
|-------|-------|-------|-------|-------|
| BTC | ETH | SOL | BNB | AVAX |
| SUI | APT | HYPE | LINK | AAVE |
| UNI | XRP | ADA | DOT | ATOM |
| MATIC | ARB | OP | DOGE | PEPE |

**Explicit Exclusions:**
- **Stablecoins** (USDT, USDC, DAI) — No directional opportunity. They're pegged.
- **Low-cap assets** (<$1B market cap) — Insufficient liquidity for reliable TA.
- **Wrapped/derivative tokens** (WBTC, stETH) — Redundant price exposure.

---

## The 14 Indicators — Complete Breakdown

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

### Volume Cluster (20 points)

Volume is the fuel for price movement. A breakout without volume is suspect. A breakout WITH volume has conviction. These indicators confirm whether the move is real.

#### OBV Trend — On-Balance Volume (10 pts)
Cumulative volume flow. If price is rising and OBV is rising = healthy trend, accumulation happening. If price is rising but OBV is falling = divergence, distribution happening. Divergences often signal reversals.

#### Volume Ratio (10 pts)
Current volume relative to the 20-period average. Above 1.5x = significant volume, high conviction move. We don't trust breakouts that happen on average or below-average volume.

---

### Sentiment & Volatility (30 points)

The market is people. And people are emotional. These indicators measure fear, greed, and statistical extremes.

#### Fear & Greed Index (15 pts)
Aggregated market sentiment from multiple sources. Below 25 = Extreme Fear (historically a buying opportunity — "be greedy when others are fearful"). Above 75 = Extreme Greed (historically time to be cautious — "be fearful when others are greedy"). This is a contrarian indicator.

#### Z-Score (15 pts)
Statistical measure of how far price has deviated from the mean. Below -2 = price is 2+ standard deviations below average (statistically oversold). Above +2 = statistically overbought. Mean reversion is a powerful force.

---

### Hyperliquid Funding Rate Adjustment

After the base score is calculated, we apply a post-scoring adjustment based on live funding rate data from Hyperliquid. If funding confirms direction (e.g., crowded shorts + LONG signal), we add **+5 points**. If funding contradicts direction, we subtract **-3 points**. The asymmetry is intentional — confirmation is weighted more heavily than conflict.

---

## Scoring Algorithm — The Math

The algorithm is straightforward. No black boxes. Here's exactly how a signal is generated:

```
// For each of the 14 indicators:
points = weight × strength

if (signal === 'bullish') totalBullish += points
if (signal === 'bearish') totalBearish += points

// Calculate direction and score:
directionalBias = totalBullish - totalBearish
totalScore = totalBullish + totalBearish
normalizedScore = (totalScore / maxPossible) × 100

// Classification:
if (directionalBias > totalScore × 0.10 AND normalizedScore >= 35)
    direction = LONG
else if (directionalBias < -totalScore × 0.10 AND normalizedScore >= 35)
    direction = SHORT
else
    direction = HOLD
```

**Why 10% directional bias threshold?**
Because 51% bullish vs 49% bearish isn't a signal — it's a coin flip. We require a clear directional edge before emitting a LONG or SHORT signal. If the indicators are split, that's a HOLD.

**Why 35 minimum score?**
A score below 35 means most indicators are neutral or weak. Even if there's a directional bias, there's no confluence. We don't trade on weak setups.

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

---

## Self-Learning System — Adaptive Weights

Static systems die. Markets evolve. What worked in 2021 doesn't work in 2024. The Lisan Core Engine adapts.

Every signal generated is stored with its full indicator snapshot — every value, every weight used at the time. When the signal resolves (hits take profit, hits stop loss, or times out), we record the outcome.

### Learning Trigger: 3 Consecutive Losses

When the engine generates 3 LONG or SHORT signals in a row that hit their stop losses, it triggers a learning cycle. Not after every loss — that would be overfitting to noise. Three consecutive losses suggests a pattern, not bad luck.

### The Learning Cycle

1. **Identify problematic indicators** — Which indicators were "confidently wrong"? An indicator is flagged if it had high strength, aligned with the trade direction, but the trade still lost. That indicator was overconfident about a bad call.

2. **Reduce their weights** — Problematic indicators have their weights reduced by up to 15% per cycle. This is gradual, not dramatic. We're adjusting, not panic-selling.

3. **Persist the changes** — New weights are saved to localStorage. The system remembers. Next time you load the page, the adjusted weights are active.

### Weight Bounds

- **Minimum**: 1 point — No indicator can ever be fully disabled.
- **Maximum**: 20 points — No single indicator can dominate the entire scoring.

This prevents extreme drift. The system adapts, but within sane boundaries.

---

## Data Sources — Where It All Comes From

Transparency matters. Here's exactly where the engine gets its data:

| Data Type | Source | Cache TTL |
|-----------|--------|-----------|
| OHLCV Price Data | Binance Public API (no auth required) | 5 minutes |
| HYPE Token Data | Hyperliquid Candle API | 5 minutes |
| Fear & Greed Index | Alternative.me | 1 hour |
| Funding Rates | Hyperliquid Meta API | 30 seconds |
| Open Interest | Hyperliquid Meta API | 30 seconds |

All API calls happen server-side. Your browser never contacts these APIs directly. This protects rate limits and keeps the architecture clean.

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

*Version 1.2.0 — January 2026 — LISAN HOLDINGS*
