-- =============================================================================
-- LISAN INTELLIGENCE — Market Snapshots Table
-- 
-- Stores historical OI and volume data per coin to enable:
--   1. OI Change Signal (compares current vs previous OI)
--   2. HL Volume Momentum Signal (compares current vs rolling avg volume)
--   3. Funding Velocity Boost (compares current vs previous funding)
--   4. Fear & Greed fallback cache
--
-- Run this migration in Supabase SQL Editor.
-- =============================================================================

CREATE TABLE IF NOT EXISTS market_snapshots (
    coin TEXT PRIMARY KEY,
    open_interest DOUBLE PRECISION NOT NULL DEFAULT 0,
    volume_24h DOUBLE PRECISION NOT NULL DEFAULT 0,
    volume_7d_avg DOUBLE PRECISION NOT NULL DEFAULT 0,
    funding_rate DOUBLE PRECISION NOT NULL DEFAULT 0,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for fast lookups by coin
CREATE INDEX IF NOT EXISTS idx_market_snapshots_coin ON market_snapshots(coin);

-- Separate table for Fear & Greed cache (single row)
CREATE TABLE IF NOT EXISTS cache_store (
    key TEXT PRIMARY KEY,
    value JSONB NOT NULL DEFAULT '{}',
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Grant access (adjust if using RLS)
ALTER TABLE market_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE cache_store ENABLE ROW LEVEL SECURITY;

-- Allow service role full access
CREATE POLICY "Service role full access on market_snapshots"
    ON market_snapshots FOR ALL
    USING (true)
    WITH CHECK (true);

CREATE POLICY "Service role full access on cache_store"
    ON cache_store FOR ALL
    USING (true)
    WITH CHECK (true);
