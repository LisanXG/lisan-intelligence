'use client';

import { useState } from 'react';
import Header from '@/components/Header';
import MarketOverview from '@/components/MarketOverview';
import FearGreedWidget from '@/components/FearGreedWidget';
import MarketRegimeBadge from '@/components/MarketRegimeBadge';
import QuickStats from '@/components/QuickStats';
import EngineSignals from '@/components/EngineSignals';
import Link from 'next/link';

type FilterType = 'ALL' | 'LONG' | 'SHORT' | 'HOLD';

export default function Dashboard() {
  const [filter, setFilter] = useState<FilterType>('ALL');

  return (
    <>
      <Header />
      <main className="pt-32 pb-16 px-8 lg:px-16 xl:px-20 max-w-[1600px] mx-auto">

        {/* Top Grid: Market Stats + Sidebar */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 mb-12">
          <div className="lg:col-span-3">
            <MarketOverview />
          </div>
          <div className="lg:col-span-1 space-y-8">
            <FearGreedWidget />
            <MarketRegimeBadge />
            <QuickStats />
          </div>
        </div>

        {/* Engine Signals Section */}
        <div>
          {/* Premium Header with Filter Tabs */}
          <div className="card p-6 mb-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[var(--accent-cyan)] to-[var(--accent-purple)] flex items-center justify-center">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                </svg>
              </div>
              <h2 className="flex items-baseline gap-3">
                <span className="font-playfair text-4xl font-semibold text-slate-700 tracking-tight">&ldquo;LISAN CORE&rdquo;</span>
                <span className="text-2xl text-[#06b6d4] font-semibold tracking-wide uppercase">Signals</span>
              </h2>
            </div>

            {/* Filter Tabs - moved to header */}
            <div className="flex items-center gap-4">
              <div className="flex gap-1 p-1 bg-[var(--card-bg)] rounded-lg border border-[var(--border-primary)]">
                {(['ALL', 'LONG', 'SHORT', 'HOLD'] as const).map((f) => (
                  <button
                    key={f}
                    onClick={() => setFilter(f)}
                    className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${filter === f
                      ? 'bg-[var(--accent-cyan)] text-white'
                      : 'text-slate-500 hover:text-slate-700 hover:bg-slate-100'
                      }`}
                  >
                    {f}
                  </button>
                ))}
              </div>
              <Link href="/signals" className="bg-[var(--accent-cyan)] hover:bg-[#0891b2] text-white text-base px-6 py-3 font-semibold rounded-lg transition-colors">
                View All →
              </Link>
            </div>
          </div>
          <EngineSignals externalFilter={filter} hideFilterTabs={true} />
        </div>
      </main>
    </>
  );
}
