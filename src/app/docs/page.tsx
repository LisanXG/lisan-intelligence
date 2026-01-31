'use client';

import Header from '@/components/Header';
import { useState } from 'react';

interface AccordionProps {
    title: string;
    children: React.ReactNode;
    defaultOpen?: boolean;
}

function Accordion({ title, children, defaultOpen = false }: AccordionProps) {
    const [isOpen, setIsOpen] = useState(defaultOpen);

    return (
        <div className="border-b border-slate-200">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="w-full py-6 flex items-center justify-between text-left hover:bg-slate-50 transition-colors px-2 -mx-2 rounded"
            >
                <span className="text-xl font-semibold text-slate-800">{title}</span>
                <span className={`text-2xl text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}>
                    ▼
                </span>
            </button>
            {isOpen && (
                <div className="pb-8 text-lg text-slate-600 leading-relaxed">
                    {children}
                </div>
            )}
        </div>
    );
}

export default function DocsPage() {
    return (
        <>
            <Header />
            <main className="pt-28 pb-20 px-6 lg:px-12">
                {/* Hero */}
                <div className="max-w-4xl mx-auto mb-16">
                    <div className="card p-10 text-center">
                        <p className="text-xl font-medium text-cyan-600 mb-4 tracking-wide">TECHNICAL WHITEPAPER</p>
                        <h1 className="text-5xl md:text-6xl font-bold mb-6 leading-tight tracking-wide" style={{ color: '#000000', WebkitTextFillColor: '#000000', background: 'none' }}>
                            LISAN CORE ENGINE
                        </h1>
                        <p className="text-2xl text-slate-600 max-w-2xl mx-auto leading-relaxed">
                            A quantitative signal system that replaces gut feelings with math.
                            No hype. No predictions. Just indicators and probability.
                        </p>
                    </div>

                    {/* Download CTA */}
                    <div className="flex justify-center gap-4 mt-8 mb-16">
                        <a
                            href="/WHITEPAPER.md"
                            download
                            className="px-8 py-4 bg-cyan-600 text-white text-xl font-semibold rounded-lg hover:bg-cyan-700 transition-colors"
                        >
                            Download Full Whitepaper
                        </a>
                    </div>
                </div>

                {/* Main Content */}
                <div className="max-w-4xl mx-auto bg-white rounded-xl shadow-lg border border-slate-200 p-8 md:p-12">

                    {/* Quick Stats */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-12 pb-12 border-b border-slate-200">
                        <div className="text-center">
                            <div className="text-4xl font-bold text-cyan-600 mb-2">14</div>
                            <div className="text-slate-500">Indicators</div>
                        </div>
                        <div className="text-center">
                            <div className="text-4xl font-bold text-purple-600 mb-2">4</div>
                            <div className="text-slate-500">Categories</div>
                        </div>
                        <div className="text-center">
                            <div className="text-4xl font-bold text-blue-600 mb-2">20</div>
                            <div className="text-slate-500">Assets</div>
                        </div>
                        <div className="text-center">
                            <div className="text-4xl font-bold text-emerald-600 mb-2">1:2</div>
                            <div className="text-slate-500">Risk:Reward</div>
                        </div>
                    </div>

                    {/* Philosophical Foundations */}
                    <section className="mb-12 pb-12 border-b border-slate-200">
                        <h2 className="text-3xl font-bold text-slate-800 mb-8">Philosophical Foundations</h2>

                        <div className="space-y-6 text-lg text-slate-600 leading-relaxed">
                            {/* Avatar and intro */}
                            <div className="flex flex-col items-center mb-8">
                                <img
                                    src="/avatar.png"
                                    alt="LISAN"
                                    className="w-40 h-40 rounded-full border-4 border-cyan-500 shadow-xl mb-6"
                                />
                            </div>

                            <p style={{ fontSize: '1.25rem', lineHeight: '1.75rem' }}>
                                I built this because I was tired of watching people get wrecked.
                            </p>

                            <p style={{ fontSize: '1.25rem', lineHeight: '1.75rem' }}>
                                The crypto space is full of noise. &quot;Influencers&quot; with sponsored bags. Trading bots that front-run you.
                                Discord alpha groups selling hopium. Everyone has an angle. Everyone is selling something.
                            </p>

                            <p style={{ fontSize: '1.25rem', lineHeight: '1.75rem' }}>
                                <strong>I&apos;m not selling anything — yet.</strong> Right now, this platform is free.
                                There&apos;s no premium tier. No &quot;unlock full signals for $99/month.&quot; No referral codes.
                            </p>

                            <p style={{ fontSize: '1.25rem', lineHeight: '1.75rem' }}>
                                Will that change? Maybe. Tokens, paid products, premium features — none of it is off the table.
                                But I&apos;m not asking for a seat at anyone else&apos;s table. I&apos;m building my own.
                                Proof of work first. Competency first. Trust first. Then we talk about what comes next.
                            </p>

                            <p className="text-left text-slate-700 mt-6" style={{ fontFamily: 'var(--font-signature)', fontSize: '3rem' }}>
                                — Lisan
                            </p>

                            <p>
                                The Lisan Core Engine is inspired by four foundational projects and the people behind them:
                            </p>

                            <div className="bg-slate-50 rounded-lg p-6 my-6">
                                <div className="space-y-6">
                                    <div>
                                        <h4 className="font-semibold text-slate-800">Bitcoin — Satoshi Nakamoto</h4>
                                        <p className="text-slate-600 mt-1 italic mb-2">
                                            &quot;We propose a system... based on cryptographic proof instead of trust.&quot;
                                        </p>
                                        <p className="text-slate-600">
                                            The engine generates signals algorithmically, not by human opinion. You don&apos;t have to trust me.
                                            You can read the code. Every indicator is documented. Every weight is visible. Trustless verification.
                                        </p>
                                    </div>
                                    <div>
                                        <h4 className="font-semibold text-slate-800">Ethereum — Vitalik Buterin</h4>
                                        <p className="text-slate-600 mt-1 italic mb-2">
                                            &quot;The financial world is full of rent-seeking middlemen and inefficient processes. Decentralization will lead to leaner institutions replacing fat middlemen.&quot;
                                        </p>
                                        <p className="text-slate-600">
                                            Smart contracts are programmable logic. The scoring weights in this engine are the same —
                                            configurable parameters that can be adjusted based on performance. The system isn&apos;t static. It learns and adapts.
                                        </p>
                                    </div>
                                    <div>
                                        <h4 className="font-semibold text-slate-800">mfers — sartoshi</h4>
                                        <p className="text-slate-600 mt-1 italic mb-2">
                                            &quot;mfers are in the public domain. do whatever the fuck you want with them.&quot;
                                        </p>
                                        <p className="text-slate-600">
                                            That energy — building something, releasing it, letting it exist without trying to extract every
                                            last dollar — that&apos;s the ethos here. Use this platform. Fork it. Improve it. I don&apos;t care.
                                            Just don&apos;t get wrecked.
                                        </p>
                                    </div>
                                    <div>
                                        <h4 className="font-semibold text-slate-800">Hyperliquid — Jeff Yan</h4>
                                        <p className="text-slate-600 mt-1 italic mb-2">
                                            &quot;No VCs. No presale. Just product.&quot;
                                        </p>
                                        <p className="text-slate-600 mt-1 italic mb-2">
                                            &quot;You&apos;re welcome to trade elsewhere.&quot;
                                        </p>
                                        <p className="text-slate-600">
                                            Jeff Yan self-funded Hyperliquid and rejected venture capital entirely. Built a perp DEX that genuinely competes with centralized exchanges,
                                            then airdropped HYPE directly to users instead of doing an ICO. That&apos;s the model — build something that works first,
                                            let the product speak for itself.
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <p>
                                <strong>The goal is simple:</strong> Replace emotional trading with systematic analysis.
                                Not to predict the future — that&apos;s impossible. But to identify when probabilities are in your favor,
                                and when they&apos;re not.
                            </p>
                        </div>
                    </section>

                    {/* Definitions */}
                    <section className="mb-12 pb-12 border-b border-slate-200">
                        <h2 className="text-3xl font-bold text-slate-800 mb-8">Definitions</h2>

                        <div className="space-y-8">
                            <div>
                                <h3 className="text-xl font-semibold text-slate-700 mb-3">LISAN HOLDINGS</h3>
                                <p className="text-lg text-slate-600 leading-relaxed">
                                    An independent research, development, and investment firm. Built by one person — me —
                                    for anyone who wants to use it. No subscriptions. No premium tiers. No VC influence.
                                    No board meetings. No roadmap designed to pump a token.
                                </p>
                                <p className="text-lg text-slate-600 leading-relaxed mt-3">
                                    Right now, everything on this platform is free. If you want dedicated <em>paid</em> work done —
                                    custom analysis, integrations, consulting —
                                    <a href="https://lisanholdings.dev/" target="_blank" rel="noopener noreferrer" className="text-cyan-600 hover:underline">reach out</a>.
                                    Otherwise, just use the tools.
                                </p>
                            </div>

                            <div>
                                <h3 className="text-xl font-semibold text-slate-700 mb-3">LISAN INTELLIGENCE</h3>
                                <p className="text-lg text-slate-600 leading-relaxed">
                                    The flagship research platform you&apos;re looking at right now. It aggregates data from
                                    multiple sources (Binance, Hyperliquid, Alternative.me), processes it through the Lisan Core Engine,
                                    and presents actionable signals with confidence scores.
                                </p>
                                <p className="text-lg text-slate-600 leading-relaxed mt-3">
                                    <strong>What it is:</strong> A research tool. A decision-support system. A way to see the market through
                                    14 different quantitative lenses at once.
                                </p>
                                <p className="text-lg text-slate-600 leading-relaxed mt-3">
                                    <strong>What it is NOT:</strong> A trading bot. An automated system that executes trades on your behalf.
                                    Financial advice. A guarantee of profits. A crystal ball.
                                </p>
                            </div>

                            <div>
                                <h3 className="text-xl font-semibold text-slate-700 mb-3">The Lisan Core Engine</h3>
                                <p className="text-lg text-slate-600 leading-relaxed mb-4">
                                    The algorithmic backbone of everything. A quantitative signal generation system that analyzes
                                    cryptocurrency markets using a weighted multi-indicator scoring algorithm. It works in four stages:
                                </p>
                                <ol className="list-decimal list-inside space-y-3 text-lg text-slate-600 ml-4">
                                    <li>
                                        <strong>Data Ingestion</strong> — Collects OHLCV (Open, High, Low, Close, Volume) price data,
                                        sentiment data from the Fear &amp; Greed Index, and derivatives data (funding rates, open interest)
                                        from perpetual exchanges.
                                    </li>
                                    <li>
                                        <strong>Indicator Calculation</strong> — Computes 14 technical indicators across 4 categories:
                                        Momentum, Trend, Volume, and Sentiment/Volatility. Each indicator produces a value, a signal
                                        (bullish/bearish/neutral), and a strength score (0.0 to 1.0).
                                    </li>
                                    <li>
                                        <strong>Signal Scoring</strong> — Aggregates all indicator scores into a single 0-100 confidence score,
                                        with a directional classification: LONG (bullish setup), SHORT (bearish setup), or HOLD (no clear edge).
                                    </li>
                                    <li>
                                        <strong>Risk Computation</strong> — Calculates ATR-based stop loss and take profit levels for every signal,
                                        ensuring a consistent 1:2 risk-to-reward ratio.
                                    </li>
                                </ol>
                            </div>
                        </div>
                    </section>

                    {/* Accordion Sections */}
                    <div className="space-y-0">

                        <Accordion title="Curated Asset Universe" defaultOpen={true}>
                            <p className="mb-6">
                                The engine analyzes a <strong>curated list of 20 major cryptocurrencies</strong> — not the entire market.
                                This is intentional.
                            </p>

                            <p className="mb-6">
                                Technical analysis requires liquidity. When you&apos;re analyzing an asset with $5M daily volume,
                                your RSI reading is based on a handful of trades. That&apos;s noise, not signal.
                                Low-cap coins don&apos;t have the order book depth for indicators to mean anything.
                                One whale can invalidate your entire analysis with a single market order.
                            </p>

                            <p className="mb-6">
                                So I curated a list. These are assets with deep liquidity, significant trading volume,
                                and enough market structure for technical analysis to actually work:
                            </p>

                            <div className="grid grid-cols-4 md:grid-cols-5 gap-3 mb-6">
                                {['BTC', 'ETH', 'SOL', 'BNB', 'AVAX', 'SUI', 'APT', 'HYPE', 'LINK', 'AAVE', 'UNI', 'XRP', 'ADA', 'DOT', 'ATOM', 'MATIC', 'ARB', 'OP', 'DOGE', 'PEPE'].map((coin) => (
                                    <div key={coin} className="py-3 px-4 bg-slate-100 rounded-lg text-center font-semibold text-slate-700">
                                        {coin}
                                    </div>
                                ))}
                            </div>

                            <div className="bg-slate-50 rounded-lg p-4 mt-4">
                                <p className="font-semibold text-slate-700 mb-2">Explicit Exclusions:</p>
                                <ul className="space-y-1 text-slate-600">
                                    <li><strong>Stablecoins</strong> (USDT, USDC, DAI) — No directional opportunity. They&apos;re pegged.</li>
                                    <li><strong>Low-cap assets</strong> (&lt;$1B market cap) — Insufficient liquidity for reliable TA.</li>
                                    <li><strong>Wrapped/derivative tokens</strong> (WBTC, stETH) — Redundant price exposure.</li>
                                </ul>
                            </div>
                        </Accordion>

                        <Accordion title="The 14 Indicators — Complete Breakdown">
                            <p className="mb-6">
                                Every indicator in the engine outputs three things:
                            </p>
                            <ul className="list-disc list-inside space-y-1 text-slate-600 mb-8 ml-4">
                                <li><strong>Value</strong> — The raw calculated number (e.g., RSI = 28.5)</li>
                                <li><strong>Signal</strong> — Classification: bullish, bearish, or neutral</li>
                                <li><strong>Strength</strong> — Confidence in the signal, from 0.0 (no confidence) to 1.0 (maximum conviction)</li>
                            </ul>

                            <p className="mb-6">
                                Weights sum to 100 points. Here&apos;s every indicator, why it matters, and how it&apos;s scored:
                            </p>

                            <div className="space-y-10">
                                {/* Momentum */}
                                <div>
                                    <h4 className="text-xl font-semibold text-cyan-700 mb-4 flex items-center gap-3">
                                        <span className="w-3 h-3 rounded-full bg-cyan-500"></span>
                                        Momentum Cluster (25 points)
                                    </h4>
                                    <p className="text-slate-600 mb-4">
                                        Momentum indicators measure the <em>speed</em> of price movement. They&apos;re leading indicators —
                                        they often signal reversals before they happen.
                                    </p>
                                    <div className="bg-slate-50 rounded-lg p-4 space-y-4">
                                        <div>
                                            <p className="font-semibold text-slate-700">RSI — Relative Strength Index (6 pts)</p>
                                            <p className="text-slate-600">
                                                The classic overbought/oversold indicator. Below 30 = oversold (bullish). Above 70 = overbought (bearish).
                                                We use 14-period RSI, the industry standard.
                                            </p>
                                        </div>
                                        <div>
                                            <p className="font-semibold text-slate-700">Stochastic RSI (5 pts)</p>
                                            <p className="text-slate-600">
                                                RSI&apos;s more sensitive cousin. It oscillates faster and catches momentum shifts earlier.
                                                Below 20 = bullish. Above 80 = bearish.
                                            </p>
                                        </div>
                                        <div>
                                            <p className="font-semibold text-slate-700">MACD — Moving Average Convergence Divergence (6 pts)</p>
                                            <p className="text-slate-600">
                                                Tracks the relationship between two EMAs (12 and 26 period). When MACD line crosses above signal line
                                                with a positive histogram = bullish. We weight this heavily because MACD momentum shifts often precede major moves.
                                            </p>
                                        </div>
                                        <div>
                                            <p className="font-semibold text-slate-700">Williams %R (4 pts)</p>
                                            <p className="text-slate-600">
                                                Similar to stochastic, but inverted. Below -80 = bullish (oversold). Above -20 = bearish (overbought).
                                            </p>
                                        </div>
                                        <div>
                                            <p className="font-semibold text-slate-700">CCI — Commodity Channel Index (4 pts)</p>
                                            <p className="text-slate-600">
                                                Measures deviation from the statistical mean. Below -100 = bullish (price is statistically cheap).
                                                Above 100 = bearish (price is statistically expensive).
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                {/* Trend */}
                                <div>
                                    <h4 className="text-xl font-semibold text-purple-700 mb-4 flex items-center gap-3">
                                        <span className="w-3 h-3 rounded-full bg-purple-500"></span>
                                        Trend Cluster (25 points)
                                    </h4>
                                    <p className="text-slate-600 mb-4">
                                        Trend indicators identify the <em>direction</em> of the market. Are we in an uptrend, downtrend,
                                        or chopping sideways? These are lagging indicators — they confirm what&apos;s already happening.
                                    </p>
                                    <div className="bg-slate-50 rounded-lg p-4 space-y-4">
                                        <div>
                                            <p className="font-semibold text-slate-700">EMA Stack — 7/21/50 Alignment (7 pts)</p>
                                            <p className="text-slate-600">
                                                Three exponential moving averages stacked. When EMA7 &gt; EMA21 &gt; EMA50 and price is above all of them =
                                                strong bullish alignment. The inverse = bearish. This is the foundation of trend analysis.
                                            </p>
                                        </div>
                                        <div>
                                            <p className="font-semibold text-slate-700">Ichimoku Cloud (8 pts)</p>
                                            <p className="text-slate-600">
                                                The most comprehensive single indicator. It gives you support/resistance (the cloud), momentum (TK cross),
                                                and trend confirmation (Chikou Span) all in one. Price above the cloud with a bullish TK cross = strong long signal.
                                                This gets the highest weight in the trend cluster because it&apos;s looking at 5 different factors simultaneously.
                                            </p>
                                        </div>
                                        <div>
                                            <p className="font-semibold text-slate-700">ADX — Average Directional Index (6 pts)</p>
                                            <p className="text-slate-600">
                                                Measures trend <em>strength</em>, not direction. ADX above 25 = trending market (good for directional trades).
                                                Below 20 = choppy, ranging market (signals are less reliable). We use DI+ and DI- to determine direction.
                                            </p>
                                        </div>
                                        <div>
                                            <p className="font-semibold text-slate-700">Bollinger Bands (4 pts)</p>
                                            <p className="text-slate-600">
                                                Price relative to 2 standard deviations from the mean. At the lower band = potential bullish reversal.
                                                At the upper band = potential bearish reversal. Squeeze (bands narrowing) often precedes big moves.
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                {/* Volume */}
                                <div>
                                    <h4 className="text-xl font-semibold text-blue-700 mb-4 flex items-center gap-3">
                                        <span className="w-3 h-3 rounded-full bg-blue-500"></span>
                                        Volume Cluster (20 points)
                                    </h4>
                                    <p className="text-slate-600 mb-4">
                                        Volume is the fuel for price movement. A breakout without volume is suspect.
                                        A breakout WITH volume has conviction. These indicators confirm whether the move is real.
                                    </p>
                                    <div className="bg-slate-50 rounded-lg p-4 space-y-4">
                                        <div>
                                            <p className="font-semibold text-slate-700">OBV Trend — On-Balance Volume (10 pts)</p>
                                            <p className="text-slate-600">
                                                Cumulative volume flow. If price is rising and OBV is rising = healthy trend, accumulation happening.
                                                If price is rising but OBV is falling = divergence, distribution happening. Divergences often signal reversals.
                                            </p>
                                        </div>
                                        <div>
                                            <p className="font-semibold text-slate-700">Volume Ratio (10 pts)</p>
                                            <p className="text-slate-600">
                                                Current volume relative to the 20-period average. Above 1.5x = significant volume, high conviction move.
                                                We don&apos;t trust breakouts that happen on average or below-average volume.
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                {/* Sentiment & Volatility */}
                                <div>
                                    <h4 className="text-xl font-semibold text-emerald-700 mb-4 flex items-center gap-3">
                                        <span className="w-3 h-3 rounded-full bg-emerald-500"></span>
                                        Sentiment &amp; Volatility (30 points)
                                    </h4>
                                    <p className="text-slate-600 mb-4">
                                        The market is people. And people are emotional. These indicators measure fear, greed,
                                        and statistical extremes.
                                    </p>
                                    <div className="bg-slate-50 rounded-lg p-4 space-y-4">
                                        <div>
                                            <p className="font-semibold text-slate-700">Fear &amp; Greed Index (15 pts)</p>
                                            <p className="text-slate-600">
                                                Aggregated market sentiment from multiple sources. Below 25 = Extreme Fear (historically a buying opportunity —
                                                &quot;be greedy when others are fearful&quot;). Above 75 = Extreme Greed (historically time to be cautious —
                                                &quot;be fearful when others are greedy&quot;). This is a contrarian indicator.
                                            </p>
                                        </div>
                                        <div>
                                            <p className="font-semibold text-slate-700">Z-Score (15 pts)</p>
                                            <p className="text-slate-600">
                                                Statistical measure of how far price has deviated from the mean. Below -2 = price is 2+ standard deviations
                                                below average (statistically oversold). Above +2 = statistically overbought. Mean reversion is a powerful force.
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="mt-8 p-4 bg-cyan-50 border border-cyan-200 rounded-lg">
                                <p className="font-semibold text-cyan-800 mb-2">Hyperliquid Funding Rate Adjustment</p>
                                <p className="text-cyan-700">
                                    After the base score is calculated, we apply a post-scoring adjustment based on live funding rate data from Hyperliquid.
                                    If funding confirms direction (e.g., crowded shorts + LONG signal), we add <strong>+5 points</strong>.
                                    If funding contradicts direction, we subtract <strong>-3 points</strong>.
                                    The asymmetry is intentional — confirmation is weighted more heavily than conflict.
                                </p>
                            </div>
                        </Accordion>

                        <Accordion title="Scoring Algorithm — The Math">
                            <p className="mb-6">
                                The algorithm is straightforward. No black boxes. Here&apos;s exactly how a signal is generated:
                            </p>

                            <div className="bg-slate-900 rounded-lg p-6 font-mono text-slate-300 mb-6 overflow-x-auto text-sm md:text-base">
                                <div className="text-slate-500 mb-3">// For each of the 14 indicators:</div>
                                <div className="mb-4">
                                    <div>points = weight × strength</div>
                                    <div className="mt-2">if (signal === &apos;bullish&apos;) totalBullish += points</div>
                                    <div>if (signal === &apos;bearish&apos;) totalBearish += points</div>
                                </div>
                                <div className="text-slate-500 mb-3">// Calculate direction and score:</div>
                                <div className="mb-4">
                                    <div>directionalBias = totalBullish - totalBearish</div>
                                    <div>totalScore = totalBullish + totalBearish</div>
                                    <div>normalizedScore = (totalScore / maxPossible) × 100</div>
                                </div>
                                <div className="text-slate-500 mb-3">// Classification:</div>
                                <div>
                                    <div>if (directionalBias &gt; totalScore × 0.10 AND normalizedScore &gt;= 35)</div>
                                    <div className="ml-4">direction = <span className="text-emerald-400">LONG</span></div>
                                    <div className="mt-2">else if (directionalBias &lt; -totalScore × 0.10 AND normalizedScore &gt;= 35)</div>
                                    <div className="ml-4">direction = <span className="text-red-400">SHORT</span></div>
                                    <div className="mt-2">else</div>
                                    <div className="ml-4">direction = <span className="text-slate-400">HOLD</span></div>
                                </div>
                            </div>

                            <div className="space-y-4 mb-6">
                                <div>
                                    <p className="font-semibold text-slate-700">Why 10% directional bias threshold?</p>
                                    <p className="text-slate-600">
                                        Because 51% bullish vs 49% bearish isn&apos;t a signal — it&apos;s a coin flip.
                                        We require a clear directional edge before emitting a LONG or SHORT signal.
                                        If the indicators are split, that&apos;s a HOLD.
                                    </p>
                                </div>
                                <div>
                                    <p className="font-semibold text-slate-700">Why 35 minimum score?</p>
                                    <p className="text-slate-600">
                                        A score below 35 means most indicators are neutral or weak.
                                        Even if there&apos;s a directional bias, there&apos;s no confluence.
                                        We don&apos;t trade on weak setups.
                                    </p>
                                </div>
                            </div>
                        </Accordion>

                        <Accordion title="Risk Management — ATR-Based Levels">
                            <p className="mb-6">
                                Every signal includes computed stop loss and take profit levels.
                                These aren&apos;t random numbers — they&apos;re based on <strong>ATR (Average True Range)</strong>,
                                a measure of market volatility.
                            </p>

                            <p className="mb-6">
                                Why ATR? Because volatility changes. A 2% stop loss on BTC during a calm week might be fine.
                                That same 2% stop during a Fed announcement gets you stopped out by noise.
                                ATR adapts to current market conditions.
                            </p>

                            <div className="grid md:grid-cols-2 gap-6 mb-6">
                                <div className="p-6 bg-emerald-50 border border-emerald-200 rounded-lg">
                                    <h4 className="font-bold text-emerald-700 mb-4 text-lg">LONG</h4>
                                    <ul className="space-y-2 text-slate-600">
                                        <li><strong>Entry</strong> = Current market price</li>
                                        <li><strong>Stop Loss</strong> = Entry − (1.5 × ATR)</li>
                                        <li><strong>Take Profit</strong> = Entry + (3.0 × ATR)</li>
                                    </ul>
                                </div>
                                <div className="p-6 bg-red-50 border border-red-200 rounded-lg">
                                    <h4 className="font-bold text-red-700 mb-4 text-lg">SHORT</h4>
                                    <ul className="space-y-2 text-slate-600">
                                        <li><strong>Entry</strong> = Current market price</li>
                                        <li><strong>Stop Loss</strong> = Entry + (1.5 × ATR)</li>
                                        <li><strong>Take Profit</strong> = Entry − (3.0 × ATR)</li>
                                    </ul>
                                </div>
                            </div>

                            <div className="bg-slate-50 rounded-lg p-4">
                                <p className="font-semibold text-slate-700 mb-2">Risk:Reward = 1:2</p>
                                <p className="text-slate-600">
                                    This ratio means you&apos;re risking 1 unit to gain 2 units.
                                    At this ratio, you only need to win <strong>34% of trades</strong> to break even.
                                    Win 40%? You&apos;re profitable. Win 50%? You&apos;re doing very well.
                                </p>
                                <p className="text-slate-600 mt-3">
                                    The math is on your side — <em>if you follow the system</em>.
                                    The moment you move your stop loss, double down on a loser, or take profits early
                                    because you&apos;re nervous, you break the math.
                                </p>
                            </div>
                        </Accordion>

                        <Accordion title="Self-Learning System — Adaptive Weights">
                            <p className="mb-6">
                                Static systems die. Markets evolve. What worked in 2021 doesn&apos;t work in 2024.
                                The Lisan Core Engine adapts.
                            </p>

                            <p className="mb-6">
                                Every signal generated is stored with its full indicator snapshot — every value,
                                every weight used at the time. When the signal resolves (hits take profit, hits stop loss, or times out),
                                we record the outcome.
                            </p>

                            <h4 className="font-semibold text-slate-700 mb-3">Learning Trigger: 3 Consecutive Losses</h4>
                            <p className="mb-6 text-slate-600">
                                When the engine generates 3 LONG or SHORT signals in a row that hit their stop losses,
                                it triggers a learning cycle. Not after every loss — that would be overfitting to noise.
                                Three consecutive losses suggests a pattern, not bad luck.
                            </p>

                            <h4 className="font-semibold text-slate-700 mb-3">The Learning Cycle</h4>
                            <ol className="list-decimal list-inside space-y-4 text-slate-600 mb-6">
                                <li>
                                    <strong>Identify problematic indicators</strong> — Which indicators were &quot;confidently wrong&quot;?
                                    An indicator is flagged if it had high strength, aligned with the trade direction,
                                    but the trade still lost. That indicator was overconfident about a bad call.
                                </li>
                                <li>
                                    <strong>Reduce their weights</strong> — Problematic indicators have their weights reduced by up to 15% per cycle.
                                    This is gradual, not dramatic. We&apos;re adjusting, not panic-selling.
                                </li>
                                <li>
                                    <strong>Persist the changes</strong> — New weights are saved to localStorage.
                                    The system remembers. Next time you load the page, the adjusted weights are active.
                                </li>
                            </ol>

                            <div className="bg-slate-50 rounded-lg p-4">
                                <p className="font-semibold text-slate-700 mb-2">Weight Bounds</p>
                                <ul className="space-y-1 text-slate-600">
                                    <li><strong>Minimum</strong>: 1 point — No indicator can ever be fully disabled.</li>
                                    <li><strong>Maximum</strong>: 20 points — No single indicator can dominate the entire scoring.</li>
                                </ul>
                                <p className="text-slate-600 mt-3">
                                    This prevents extreme drift. The system adapts, but within sane boundaries.
                                </p>
                            </div>
                        </Accordion>

                        <Accordion title="Real-Time Signal Tracking">
                            <p className="mb-6">
                                When a signal is generated, the system needs to know when it hits its stop loss or take profit.
                                This is harder than it sounds.
                            </p>

                            <p className="mb-6">
                                A naive approach would be to check the current price every few minutes.
                                But if price spikes to your TP at 2:01 PM and crashes back down by 2:05 PM, you&apos;d never see it.
                                The signal would stay &quot;open&quot; forever, or worse — eventually get marked as a loss when it should have been a win.
                            </p>

                            <div className="bg-cyan-50 border border-cyan-200 rounded-lg p-6 mb-6">
                                <p className="font-semibold text-cyan-800 mb-2">Hyperliquid WebSocket Integration</p>
                                <p className="text-slate-600">
                                    The Lisan Core Engine uses <strong>real-time WebSocket feeds from Hyperliquid</strong> to solve this.
                                    Every minute, we receive candle data with the high and low for that minute.
                                    If the high touched your take profit, you won. If the low touched your stop loss, you lost.
                                    No gaps. No missed exits.
                                </p>
                            </div>

                            <p className="text-slate-500">
                                This is the same data infrastructure professional traders use.
                                The difference is, you don&apos;t have to build it yourself.
                            </p>
                        </Accordion>

                        <Accordion title="Data Sources — Where It All Comes From">
                            <p className="mb-6">
                                Transparency matters. Here&apos;s exactly where the engine gets its data:
                            </p>

                            <div className="overflow-x-auto">
                                <table className="w-full text-left">
                                    <thead>
                                        <tr className="border-b-2 border-slate-200">
                                            <th className="py-4 pr-4 font-bold text-slate-800">Data Type</th>
                                            <th className="py-4 pr-4 font-bold text-slate-800">Source</th>
                                            <th className="py-4 font-bold text-slate-800">Cache TTL</th>
                                        </tr>
                                    </thead>
                                    <tbody className="text-slate-600">
                                        <tr className="border-b border-slate-100">
                                            <td className="py-4 pr-4">OHLCV Price Data</td>
                                            <td className="py-4 pr-4">Binance Public API (no auth required)</td>
                                            <td className="py-4">5 minutes</td>
                                        </tr>
                                        <tr className="border-b border-slate-100">
                                            <td className="py-4 pr-4">HYPE Token Data</td>
                                            <td className="py-4 pr-4">Hyperliquid Candle API</td>
                                            <td className="py-4">5 minutes</td>
                                        </tr>
                                        <tr className="border-b border-slate-100">
                                            <td className="py-4 pr-4">Fear &amp; Greed Index</td>
                                            <td className="py-4 pr-4">Alternative.me</td>
                                            <td className="py-4">1 hour</td>
                                        </tr>
                                        <tr className="border-b border-slate-100">
                                            <td className="py-4 pr-4">Funding Rates</td>
                                            <td className="py-4 pr-4">Hyperliquid Meta API</td>
                                            <td className="py-4">30 seconds</td>
                                        </tr>
                                        <tr className="border-b border-slate-100">
                                            <td className="py-4 pr-4">Open Interest</td>
                                            <td className="py-4 pr-4">Hyperliquid Meta API</td>
                                            <td className="py-4">30 seconds</td>
                                        </tr>
                                        <tr className="bg-cyan-50">
                                            <td className="py-4 pr-4 font-semibold text-cyan-700">Signal Tracking</td>
                                            <td className="py-4 pr-4 font-semibold text-cyan-700">Hyperliquid WebSocket</td>
                                            <td className="py-4 font-semibold text-cyan-700">Real-time (1m candles)</td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>

                            <p className="mt-6 text-slate-500">
                                All API calls happen server-side. Your browser never contacts these APIs directly —
                                except for the WebSocket connection, which runs client-side to track open signals in real-time.
                            </p>
                        </Accordion>

                        <Accordion title="Signal Types — What They Mean">
                            <div className="grid md:grid-cols-3 gap-6 mb-6">
                                <div className="p-6 bg-emerald-50 border border-emerald-200 rounded-lg text-center">
                                    <div className="text-3xl font-bold text-emerald-600 mb-2">LONG</div>
                                    <p className="text-slate-600">
                                        Bullish setup detected. Indicators suggest price is likely to increase.
                                        Entry recommended.
                                    </p>
                                </div>
                                <div className="p-6 bg-red-50 border border-red-200 rounded-lg text-center">
                                    <div className="text-3xl font-bold text-red-600 mb-2">SHORT</div>
                                    <p className="text-slate-600">
                                        Bearish setup detected. Indicators suggest price is likely to decrease.
                                        Entry recommended (if you&apos;re trading perps).
                                    </p>
                                </div>
                                <div className="p-6 bg-slate-100 border border-slate-200 rounded-lg text-center">
                                    <div className="text-3xl font-bold text-slate-600 mb-2">HOLD</div>
                                    <p className="text-slate-600">
                                        No clear edge. Indicators are mixed or weak.
                                        No action recommended. Wait for a better setup.
                                    </p>
                                </div>
                            </div>

                            <p className="text-slate-600">
                                <strong>HOLD is not a bad signal.</strong> It&apos;s the system saying &quot;I don&apos;t see a clear opportunity.&quot;
                                Sometimes the best trade is no trade. Most of the time, actually.
                            </p>
                        </Accordion>

                    </div>

                    {/* Disclaimer */}
                    <div className="mt-12 pt-8 border-t border-slate-200">
                        <div className="p-6 bg-red-50 border border-red-200 rounded-lg">
                            <h3 className="text-xl font-semibold text-red-700 mb-3">⚠️ Disclaimer</h3>
                            <div className="text-slate-600 leading-relaxed space-y-3">
                                <p>
                                    <strong>This is not financial advice.</strong> I&apos;m not a licensed financial advisor.
                                    I&apos;m a developer who built a research tool. LISAN INTELLIGENCE is exactly that — a tool.
                                </p>
                                <p>
                                    All trading involves risk. Past indicator performance does not predict future results.
                                    The market can stay irrational longer than you can stay solvent.
                                </p>
                                <p>
                                    <strong>Never invest more than you can afford to lose.</strong> Seriously.
                                    If losing your position would materially impact your life, you&apos;re overexposed.
                                    Scale down.
                                </p>
                                <p>
                                    Do your own research. Use this as one input among many.
                                    And for the love of god, don&apos;t ape into a position because a signal said LONG.
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Version */}
                    <div className="mt-8 text-center text-slate-400">
                        <p>Version 1.2.0 — January 2026 — LISAN HOLDINGS</p>
                    </div>
                </div>
            </main>
        </>
    );
}
