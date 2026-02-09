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
                            <div className="text-4xl font-bold text-cyan-600 mb-2">17</div>
                            <div className="text-slate-500">Indicators</div>
                        </div>
                        <div className="text-center">
                            <div className="text-4xl font-bold text-purple-600 mb-2">6</div>
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
                                    17 different quantitative lenses at once.
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
                                        <strong>Indicator Calculation</strong> — Computes 17 technical indicators across 6 categories:
                                        Momentum, Trend, Volume, Volatility, Sentiment, and Positioning. Each indicator produces a value, a signal
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
                                {['BTC', 'ETH', 'SOL', 'AVAX', 'LINK', 'TON', 'XRP', 'ADA', 'DOT', 'POL', 'UNI', 'ATOM', 'LTC', 'NEAR', 'ARB', 'OP', 'APT', 'SUI', 'HYPE', 'INJ'].map((coin) => (
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

                        <Accordion title="The 17 Indicators — Complete Breakdown">
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
                                        Volume Cluster (16 points)
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
                                            <p className="font-semibold text-slate-700">Volume Ratio (6 pts)</p>
                                            <p className="text-slate-600">
                                                Current volume relative to the 20-period average. Above 1.5x = significant volume, high conviction move.
                                                We don&apos;t trust breakouts that happen on average or below-average volume.
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                {/* Volatility */}
                                <div>
                                    <h4 className="text-xl font-semibold text-amber-700 mb-4 flex items-center gap-3">
                                        <span className="w-3 h-3 rounded-full bg-amber-500"></span>
                                        Volatility Cluster (10 points)
                                    </h4>
                                    <p className="text-slate-600 mb-4">
                                        Statistical measure of price deviation from the norm. Mean reversion is a powerful force —
                                        extreme moves tend to snap back.
                                    </p>
                                    <div className="bg-slate-50 rounded-lg p-4 space-y-4">
                                        <div>
                                            <p className="font-semibold text-slate-700">Z-Score (10 pts)</p>
                                            <p className="text-slate-600">
                                                Statistical measure of how far price has deviated from the mean. Below -2 = price is 2+ standard deviations
                                                below average (statistically oversold). Above +2 = statistically overbought. Mean reversion is a powerful force.
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                {/* Sentiment */}
                                <div>
                                    <h4 className="text-xl font-semibold text-emerald-700 mb-4 flex items-center gap-3">
                                        <span className="w-3 h-3 rounded-full bg-emerald-500"></span>
                                        Sentiment Cluster (8 points)
                                    </h4>
                                    <p className="text-slate-600 mb-4">
                                        The market is people. And people are emotional. This contrarian indicator measures
                                        crowd psychology extremes.
                                    </p>
                                    <div className="bg-slate-50 rounded-lg p-4 space-y-4">
                                        <div>
                                            <p className="font-semibold text-slate-700">Fear &amp; Greed Index (8 pts)</p>
                                            <p className="text-slate-600">
                                                Aggregated market sentiment from multiple sources. Below 25 = Extreme Fear (historically a buying opportunity —
                                                &quot;be greedy when others are fearful&quot;). Above 75 = Extreme Greed (historically time to be cautious —
                                                &quot;be fearful when others are greedy&quot;). This is a contrarian indicator.
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                <div>
                                    <h4 className="text-xl font-semibold text-indigo-700 mb-4 flex items-center gap-3">
                                        <span className="w-3 h-3 rounded-full bg-indigo-500"></span>
                                        Positioning Cluster (16 points)
                                    </h4>
                                    <p className="text-slate-600 mb-4">
                                        v4.1 introduced a full Positioning Cluster — live Hyperliquid institutional data
                                        as first-class weighted indicators. Where is the crowd positioned?
                                        Crowded trades tend to unwind violently.
                                    </p>
                                    <div className="bg-slate-50 rounded-lg p-4 space-y-4">
                                        <div>
                                            <p className="font-semibold text-slate-700">Funding Rate (6 pts)</p>
                                            <p className="text-slate-600">
                                                Perpetual futures funding rate from Hyperliquid. Highly negative funding = crowded shorts (bullish).
                                                Highly positive funding = crowded longs (bearish). Extreme funding often precedes reversals.
                                            </p>
                                        </div>
                                        <div>
                                            <p className="font-semibold text-slate-700">Open Interest Change (4 pts)</p>
                                            <p className="text-slate-600">
                                                Rate of change in open interest. Rising OI with rising price = strong trend.
                                                Rising OI with falling price = aggressive shorting. Divergences signal potential reversals.
                                            </p>
                                        </div>
                                        <div>
                                            <p className="font-semibold text-slate-700">Basis Premium (3 pts)</p>
                                            <p className="text-slate-600">
                                                Mark-to-index spread from Hyperliquid. Large positive basis (mark &gt; index) signals
                                                aggressive long positioning (contrarian bearish). Large negative basis = oversold (contrarian bullish).
                                            </p>
                                        </div>
                                        <div>
                                            <p className="font-semibold text-slate-700">HL Volume Momentum (3 pts)</p>
                                            <p className="text-slate-600">
                                                Compares current 24h Hyperliquid volume to a rolling average. Volume surges (2x+ average)
                                                during breakouts confirm the move. Low volume on moves suggests fakeouts.
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </div>


                        </Accordion>

                        <Accordion title="Scoring Algorithm — The Math">
                            <p className="mb-6">
                                The algorithm is straightforward. No black boxes. Here&apos;s exactly how a signal is generated:
                            </p>

                            <div className="bg-slate-900 rounded-lg p-6 font-mono text-slate-300 mb-6 overflow-x-auto text-sm md:text-base">
                                <div className="text-slate-500 mb-3">// For each of the 17 indicators:</div>
                                <div className="mb-4">
                                    <div>points = weight × strength</div>
                                    <div className="mt-2">if (signal === &apos;bullish&apos;) totalBullish += points</div>
                                    <div>if (signal === &apos;bearish&apos;) totalBearish += points</div>
                                </div>
                                <div className="text-slate-500 mb-3">// v4.1: Cluster agreement tracked for visibility (not a score multiplier)</div>
                                <div className="mb-4">
                                    <div>agreement = agreementRatio(bullishCount, bearishCount)  // 0.3–1.0</div>
                                    <div>normalizedScore = (totalScore / maxPossible) × 100</div>
                                </div>
                                <div className="text-slate-500 mb-3">// Classification (v4.1: threshold adapts to market regime):</div>
                                <div>
                                    <div>scoreThreshold = 25 × regimeMultiplier</div>
                                    <div className="ml-4 text-slate-500">// e.g. 23 in bull trend, 33 in choppy markets</div>
                                    <div className="mt-2">if (directionalBias &gt; maxPossible × 0.05 AND normalizedScore &gt;= scoreThreshold)</div>
                                    <div className="ml-4">direction = <span className="text-emerald-400">LONG</span></div>
                                    <div className="mt-2">else if (directionalBias &lt; -maxPossible × 0.05 AND normalizedScore &gt;= scoreThreshold)</div>
                                    <div className="ml-4">direction = <span className="text-red-400">SHORT</span></div>
                                    <div className="mt-2">else</div>
                                    <div className="ml-4">direction = <span className="text-slate-400">HOLD</span></div>
                                </div>
                            </div>

                            <div className="space-y-4 mb-6">
                                <div>
                                    <p className="font-semibold text-slate-700">Why 5% directional bias threshold?</p>
                                    <p className="text-slate-600">
                                        The engine requires at least 5% net directional bias (bullish minus bearish points
                                        as a fraction of the total possible) before emitting a LONG or SHORT signal.
                                        If indicators are evenly split, that&apos;s a HOLD — no edge, no trade.
                                    </p>
                                </div>
                                <div>
                                    <p className="font-semibold text-slate-700">Why 25 minimum score?</p>
                                    <p className="text-slate-600">
                                        The base threshold is 25, meaning a reasonable portion of indicators must show alignment.
                                        In v4.1, market regime detection adjusts this: in choppy markets (HIGH_VOL_CHOP) it rises to ~33
                                        to filter noise, while in clear trends (BULL_TREND / BEAR_TREND) it drops to ~23
                                        to capture higher-probability setups earlier. Quality over quantity, adapted to conditions.
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
                                        <li><strong>Stop Loss</strong> = Entry − (1.5 × ATR), clamped to nearest support</li>
                                        <li><strong>Take Profit</strong> = Entry + (3.0 × ATR), clamped to nearest resistance</li>
                                    </ul>
                                </div>
                                <div className="p-6 bg-red-50 border border-red-200 rounded-lg">
                                    <h4 className="font-bold text-red-700 mb-4 text-lg">SHORT</h4>
                                    <ul className="space-y-2 text-slate-600">
                                        <li><strong>Entry</strong> = Current market price</li>
                                        <li><strong>Stop Loss</strong> = Entry + (1.5 × ATR), clamped to nearest resistance</li>
                                        <li><strong>Take Profit</strong> = Entry − (3.0 × ATR), clamped to nearest support</li>
                                    </ul>
                                </div>
                            </div>

                            <div className="bg-slate-50 rounded-lg p-4 mb-4">
                                <p className="font-semibold text-slate-700 mb-2">Support/Resistance Clamping</p>
                                <p className="text-slate-600">
                                    ATR provides baseline distances, but the engine also identifies nearby support and resistance
                                    levels from recent price action. Final SL/TP are clamped to these structural levels when they
                                    fall within the ATR range — avoiding stops/targets at arbitrary levels that ignore market
                                    structure. A minimum 2% distance from entry is enforced to prevent unrealistically tight targets.
                                </p>
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

                            <div className="bg-cyan-50 border border-cyan-200 rounded-lg p-4 mt-6">
                                <p className="font-semibold text-cyan-800 mb-2">Smart Exit Strategy — Dual-Timeframe Momentum Re-Evaluation</p>
                                <p className="text-cyan-700 mb-3">
                                    When a trade reaches <strong>+3% profit</strong>, the engine doesn&apos;t exit immediately.
                                    Instead, it fetches fresh candle data on <strong>two timeframes (1h and 4h)</strong> and
                                    re-evaluates RSI and MACD momentum on each:
                                </p>
                                <ul className="list-disc list-inside space-y-1 text-slate-600 ml-4 mb-3">
                                    <li><strong>Both timeframes aligned</strong> — RSI and MACD still confirm trend → Let it run to full TP</li>
                                    <li><strong>Both timeframes fading</strong> — 1h AND 4h show reversal signals → Take profit at current level</li>
                                    <li><strong>Mixed signals</strong> — Only one timeframe weakening → Stay in trade (single-TF noise, not conviction)</li>
                                </ul>
                                <p className="text-slate-500 text-sm">
                                    v4.1 requires dual confirmation to exit — this prevents cutting winners short due to noise on a single timeframe.
                                </p>
                            </div>
                        </Accordion>

                        <Accordion title="Self-Learning System — Adaptive Weights">
                            <p className="mb-6">
                                Static systems die. Markets evolve. What worked in 2021 doesn&apos;t work in 2025.
                                The Lisan Core Engine adapts.
                            </p>

                            <p className="mb-6">
                                Every signal generated is stored with its full indicator snapshot — every value,
                                every weight used at the time. When the signal resolves (hits take profit or hits stop loss),
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
                                    <strong>Persist the changes</strong> — New weights are saved globally and shared by all users.
                                    The collective learning benefits everyone. No account needed to use the adapted weights.
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

                            <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4 mt-6">
                                <p className="font-semibold text-emerald-800 mb-2">v4.1: Win Boost — Bidirectional Learning</p>
                                <p className="text-slate-600 mb-3">
                                    The engine doesn&apos;t just penalize failures — it also rewards success. When <strong>3 consecutive
                                        wins</strong> are detected, a win-boost cycle triggers:
                                </p>
                                <ul className="list-disc list-inside space-y-1 text-slate-600 ml-4 mb-3">
                                    <li><strong>Identify high-performing indicators</strong> — Which indicators were correctly confident in winning trades?</li>
                                    <li><strong>Boost their weights</strong> — Up to <strong>10% per cycle</strong> (conservative, prevents runaway growth)</li>
                                    <li><strong>60% correctness threshold</strong> — An indicator must appear correctly in at least 60% of winning signals to qualify for a boost</li>
                                </ul>
                                <p className="text-slate-600">
                                    This ensures the system converges toward what actually works, not just away from what doesn&apos;t.
                                </p>
                            </div>

                            <div className="bg-cyan-50 border border-cyan-200 rounded-lg p-4 mt-6">
                                <p className="font-semibold text-cyan-800 mb-2">Weight Recovery — Gradual Return to Defaults</p>
                                <p className="text-slate-600 mb-3">
                                    Penalized weights don&apos;t stay penalized forever. After 20 trades where an indicator
                                    does NOT appear in losing signals, we recover 5% of the gap toward its default weight.
                                </p>
                                <p className="text-slate-600">
                                    This prevents permanent over-penalization of temporarily unlucky indicators and ensures the system
                                    doesn&apos;t drift too far from proven defaults during unusual market conditions.
                                </p>
                            </div>
                        </Accordion>

                        <Accordion title="Market Regime Detection">
                            <p className="mb-6">
                                Markets don&apos;t behave the same way all the time. A strategy that works in a bull trend
                                fails in choppy consolidation. The engine now detects the current market regime and adjusts accordingly.
                            </p>

                            <div className="overflow-x-auto mb-6">
                                <table className="w-full text-left">
                                    <thead>
                                        <tr className="border-b-2 border-slate-200">
                                            <th className="py-4 pr-4 font-bold text-slate-800">Regime</th>
                                            <th className="py-4 font-bold text-slate-800">Characteristics</th>
                                        </tr>
                                    </thead>
                                    <tbody className="text-slate-600">
                                        <tr className="border-b border-slate-100">
                                            <td className="py-4 pr-4 font-semibold text-emerald-600">BULL_TREND</td>
                                            <td className="py-4">Strong uptrend, high ADX, positive RSI momentum. Trust trend indicators.</td>
                                        </tr>
                                        <tr className="border-b border-slate-100">
                                            <td className="py-4 pr-4 font-semibold text-red-600">BEAR_TREND</td>
                                            <td className="py-4">Strong downtrend, high ADX, negative momentum. Short bias active.</td>
                                        </tr>
                                        <tr className="border-b border-slate-100">
                                            <td className="py-4 pr-4 font-semibold text-amber-600">HIGH_VOL_CHOP</td>
                                            <td className="py-4">Sideways with large swings, low ADX, high ATR. Stricter entry requirements.</td>
                                        </tr>
                                        <tr className="border-b border-slate-100">
                                            <td className="py-4 pr-4 font-semibold text-cyan-600">RECOVERY_PUMP</td>
                                            <td className="py-4">Sharp reversal after dump, decreasing OI. Momentum plays favored.</td>
                                        </tr>
                                        <tr className="border-b border-slate-100">
                                            <td className="py-4 pr-4 font-semibold text-purple-600">DISTRIBUTION</td>
                                            <td className="py-4">Rising prices with declining OI and divergence. Caution at tops.</td>
                                        </tr>
                                        <tr className="border-b border-slate-100">
                                            <td className="py-4 pr-4 font-semibold text-blue-600">ACCUMULATION</td>
                                            <td className="py-4">Falling prices with accumulation signs, extreme negative funding.</td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>

                            <div className="bg-slate-50 rounded-lg p-4">
                                <p className="font-semibold text-slate-700 mb-2">How Regime Affects Signals</p>
                                <ul className="space-y-1 text-slate-600">
                                    <li><strong>Entry Strictness</strong> — Stricter in chop (+30%), looser in clear trends (-10%)</li>
                                    <li><strong>Indicator Weights</strong> — Trend indicators weighted higher in trends, momentum in reversals</li>
                                    <li><strong>Direction Bias</strong> — Subtle preference for longs in bull, shorts in bear</li>
                                </ul>
                                <p className="text-slate-600 mt-3">
                                    Regime is stored with each signal&apos;s indicator snapshot for future analysis.
                                </p>
                            </div>
                        </Accordion>

                        <Accordion title="Signal Tracking — 24/7 Monitoring">
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
                                <p className="font-semibold text-cyan-800 mb-2">Server-Side Cron Monitoring</p>
                                <p className="text-slate-600">
                                    The Lisan Core Engine uses <strong>server-side cron jobs</strong> that run every 5 minutes,
                                    24/7, to monitor all open signals. The monitoring process fetches high/low candle data from
                                    Hyperliquid and checks if any signal&apos;s take profit or stop loss was touched.
                                    This works even when you&apos;re offline — the engine never sleeps.
                                </p>
                            </div>

                            <div className="bg-slate-50 border border-slate-200 rounded-lg p-6 mb-6">
                                <p className="font-semibold text-slate-700 mb-2">Automatic Signal Generation</p>
                                <p className="text-slate-600">
                                    When signals close, the engine automatically generates new signals to maintain approximately
                                    20 active positions (excluding HOLD signals). A separate learning cycle analyzes losing signals
                                    and adjusts indicator weights hourly.
                                </p>
                            </div>

                            <p className="text-slate-500">
                                This is institutional-grade infrastructure — continuous monitoring with adaptive learning.
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
                                            <td className="py-4 pr-4">Hyperliquid Candle API (primary), Binance (fallback)</td>
                                            <td className="py-4">5 minutes</td>
                                        </tr>
                                        <tr className="border-b border-slate-100">
                                            <td className="py-4 pr-4">Live Entry Prices</td>
                                            <td className="py-4 pr-4">Hyperliquid Mark Prices (metaAndAssetCtxs)</td>
                                            <td className="py-4">Real-time</td>
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
                                            <td className="py-4 pr-4 font-semibold text-cyan-700">Server-side Cron (5-min intervals)</td>
                                            <td className="py-4 font-semibold text-cyan-700">High/Low candle check</td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>

                            <p className="mt-6 text-slate-500">
                                All API calls happen server-side. Your browser never contacts these APIs directly.
                                Signal tracking also runs server-side via cron jobs, so the engine works 24/7 even when you&apos;re offline.
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

                        <Accordion title="Platform Features — Beyond Signals">
                            <p className="mb-6">
                                Signals are just the start. LISAN INTELLIGENCE includes tools for transparency,
                                sharing, and institutional-grade data analysis.
                            </p>

                            <div className="space-y-8">
                                <div>
                                    <h4 className="font-semibold text-slate-700 mb-3 flex items-center gap-2">
                                        <span className="text-cyan-600">📊</span>
                                        Transparency Dashboard (/proof)
                                    </h4>
                                    <p className="text-slate-600 mb-3">
                                        Every signal we&apos;ve ever generated is tracked and verified in Supabase. The <a href="/proof" className="text-cyan-600 hover:underline">/proof page</a> shows:
                                    </p>
                                    <ul className="list-disc list-inside space-y-1 text-slate-600 ml-4 mb-3">
                                        <li><strong>Win rates by score bucket</strong> — Do higher scores actually perform better?</li>
                                        <li><strong>Cumulative performance chart</strong> — Interactive visualization of percentage returns over time</li>
                                        <li><strong>Recent outcomes</strong> — The last 20 completed signals with full entry/exit details</li>
                                        <li><strong>Overall statistics</strong> — Win rate, average win/loss %, and total cumulative return</li>
                                    </ul>
                                    <p className="text-slate-500 text-sm">
                                        No cherry-picking. No hiding losses. All data comes directly from Supabase — the single source of truth.
                                    </p>
                                </div>

                                <div>
                                    <h4 className="font-semibold text-slate-700 mb-3 flex items-center gap-2">
                                        <span className="text-cyan-600">📤</span>
                                        Shareable Signal Cards
                                    </h4>
                                    <p className="text-slate-600 mb-3">
                                        Every signal card has a share button. Click it to:
                                    </p>
                                    <ul className="list-disc list-inside space-y-1 text-slate-600 ml-4 mb-3">
                                        <li>Generate a <strong>PNG image</strong> of the signal (branded, dark theme)</li>
                                        <li>Auto-download the image to your device</li>
                                        <li>Open a <strong>pre-filled X/Twitter post</strong> with the signal details</li>
                                    </ul>
                                    <p className="text-slate-500 text-sm">
                                        Build your track record publicly. Attach the image to show exactly what the signal looked like.
                                    </p>
                                </div>

                                <div>
                                    <h4 className="font-semibold text-slate-700 mb-3 flex items-center gap-2">
                                        <span className="text-cyan-600">📋</span>
                                        Quant View (Institutional Mode)
                                    </h4>
                                    <p className="text-slate-600 mb-3">
                                        Toggle from card view to a dense data table with:
                                    </p>
                                    <ul className="list-disc list-inside space-y-1 text-slate-600 ml-4 mb-3">
                                        <li><strong>All signals in one table</strong> — Sortable by any column</li>
                                        <li><strong>CSV export</strong> — Download all signal data for your own analysis</li>
                                        <li><strong>Raw indicator values</strong> — See the actual numbers, not just scores</li>
                                    </ul>
                                    <p className="text-slate-500 text-sm">
                                        For quants, researchers, and anyone who wants to build on top of the data.
                                    </p>
                                </div>
                            </div>
                        </Accordion>

                        <Accordion title="Authentication & Data Persistence">
                            <p className="mb-6">
                                LISAN INTELLIGENCE now includes user authentication and cloud-based data persistence.
                                Your signals, watchlist, and learning progress are tied to your account — not your browser.
                            </p>

                            <div className="space-y-8">
                                <div>
                                    <h4 className="font-semibold text-slate-700 mb-3 flex items-center gap-2">
                                        <span className="text-cyan-600">🔐</span>
                                        Account System
                                    </h4>
                                    <p className="text-slate-600 mb-3">
                                        Simple email/password authentication. No social logins, no OAuth complexity.
                                        Create an account once, access your data from any device.
                                    </p>
                                    <ul className="list-disc list-inside space-y-1 text-slate-600 ml-4 mb-3">
                                        <li><strong>Email + Password</strong> — Standard authentication</li>
                                        <li><strong>Session Persistence</strong> — Stay logged in across browser sessions</li>
                                        <li><strong>Protected Routes</strong> — Dashboard and tools require authentication</li>
                                    </ul>
                                </div>

                                <div>
                                    <h4 className="font-semibold text-slate-700 mb-3 flex items-center gap-2">
                                        <span className="text-cyan-600">☁️</span>
                                        Cloud Data Storage
                                    </h4>
                                    <p className="text-slate-600 mb-3">
                                        Previously, all data lived in localStorage — tied to one browser, easily lost.
                                        Now everything is stored in a PostgreSQL database:
                                    </p>
                                    <ul className="list-disc list-inside space-y-1 text-slate-600 ml-4 mb-3">
                                        <li><strong>Signals</strong> — Global signals shared by all users (everyone sees the same engine)</li>
                                        <li><strong>Outcomes</strong> — Win/loss records with exit prices and reasons</li>
                                        <li><strong>Watchlist</strong> — Your personal tracked assets (only per-user data)</li>
                                        <li><strong>Engine Weights</strong> — Global indicator weights that adapt based on platform-wide performance</li>
                                    </ul>
                                </div>

                                <div>
                                    <h4 className="font-semibold text-slate-700 mb-3 flex items-center gap-2">
                                        <span className="text-cyan-600">🛡️</span>
                                        Security
                                    </h4>
                                    <p className="text-slate-600 mb-3">
                                        Data isolation is enforced at the database level:
                                    </p>
                                    <ul className="list-disc list-inside space-y-1 text-slate-600 ml-4">
                                        <li><strong>Global Transparency</strong> — All users see the same signals and engine weights</li>
                                        <li><strong>Per-User Privacy</strong> — Watchlists remain private to each user</li>
                                        <li><strong>Passwords Hashed</strong> — Standard industry practices</li>
                                    </ul>
                                </div>
                            </div>

                            <div className="bg-slate-50 rounded-lg p-4 mt-6">
                                <p className="font-semibold text-slate-700 mb-2">Why Not localStorage Anymore?</p>
                                <p className="text-slate-600">
                                    localStorage is convenient for prototypes, but it has real problems:
                                    data gets wiped when you clear browser cache, it doesn&apos;t sync across devices,
                                    and there&apos;s no way to analyze aggregate performance. Moving to a database
                                    solves all of these while enabling cross-device sync and collective learning.
                                </p>
                            </div>
                        </Accordion>

                        <Accordion title="API Rate Limiting">
                            <p className="mb-6">
                                To ensure fair usage and protect against abuse, all public API endpoints are rate limited.
                                If you exceed the limit, you&apos;ll receive a <code className="bg-slate-100 px-2 py-1 rounded text-red-600">429 Too Many Requests</code> response.
                            </p>

                            <div className="overflow-x-auto">
                                <table className="w-full text-left">
                                    <thead>
                                        <tr className="border-b-2 border-slate-200">
                                            <th className="py-4 pr-4 font-bold text-slate-800">Endpoint</th>
                                            <th className="py-4 pr-4 font-bold text-slate-800">Limit</th>
                                            <th className="py-4 font-bold text-slate-800">Window</th>
                                        </tr>
                                    </thead>
                                    <tbody className="text-slate-600">
                                        <tr className="border-b border-slate-100">
                                            <td className="py-4 pr-4 font-mono text-sm">/api/market</td>
                                            <td className="py-4 pr-4">60 requests</td>
                                            <td className="py-4">per minute</td>
                                        </tr>
                                        <tr className="border-b border-slate-100">
                                            <td className="py-4 pr-4 font-mono text-sm">/api/hyperliquid</td>
                                            <td className="py-4 pr-4">60 requests</td>
                                            <td className="py-4">per minute</td>
                                        </tr>
                                        <tr className="border-b border-slate-100">
                                            <td className="py-4 pr-4 font-mono text-sm">/api/fear-greed</td>
                                            <td className="py-4 pr-4">30 requests</td>
                                            <td className="py-4">per minute</td>
                                        </tr>
                                        <tr className="border-b border-slate-100">
                                            <td className="py-4 pr-4 font-mono text-sm">/api/signals</td>
                                            <td className="py-4 pr-4">30 requests</td>
                                            <td className="py-4">per minute</td>
                                        </tr>
                                        <tr className="border-b border-slate-100">
                                            <td className="py-4 pr-4 font-mono text-sm">/api/proof-stats</td>
                                            <td className="py-4 pr-4">20 requests</td>
                                            <td className="py-4">per minute</td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>

                            <div className="bg-slate-50 rounded-lg p-4 mt-6">
                                <p className="font-semibold text-slate-700 mb-2">Normal Usage</p>
                                <p className="text-slate-600">
                                    These limits are generous for normal browsing. You&apos;d have to be refreshing aggressively
                                    or running scripts against the API to hit them. If you do get rate limited,
                                    just wait 60 seconds.
                                </p>
                            </div>
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
                        <p>Version 4.1.1 — February 2026 — Production Accuracy Audit — LISAN HOLDINGS</p>
                    </div>
                </div>
            </main>
        </>
    );
}
