// Check entry prices and SL/TP levels for recent signals
// Run with: node scripts/check-entry-prices.js

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Read .env.local manually
const envPath = path.join(__dirname, '..', '.env.local');
const envContent = fs.readFileSync(envPath, 'utf8');
const env = {};
envContent.split('\n').forEach(line => {
    const match = line.match(/^([^#=]+)=(.*)$/);
    if (match) env[match[1].trim()] = match[2].trim();
});

const supabase = createClient(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkEntryPrices() {
    // Get recent signals with entry/exit prices
    const { data: signals, error } = await supabase
        .from('signals')
        .select('coin, direction, outcome, entry_price, exit_price, stop_loss, take_profit, created_at, closed_at, profit_pct')
        .in('outcome', ['WON', 'LOST'])
        .order('closed_at', { ascending: false })
        .limit(15);

    if (error) {
        console.error('Error:', error);
        return;
    }

    console.log('Recent signals with prices:');
    console.log('='.repeat(140));
    console.log('COIN   | DIR   | OUTCOME | ENTRY     | EXIT      | SL        | TP        | PROFIT  | DUR(m)');
    console.log('-'.repeat(140));

    signals.forEach(s => {
        const created = new Date(s.created_at);
        const closed = s.closed_at ? new Date(s.closed_at) : null;
        const durationMins = closed ? Math.round((closed.getTime() - created.getTime()) / 60000) : null;

        // Calculate expected profit for SHORT: (entry - exit) / entry * 100
        // For LONG: (exit - entry) / entry * 100
        const calcProfit = s.direction === 'SHORT'
            ? ((s.entry_price - s.exit_price) / s.entry_price * 100)
            : ((s.exit_price - s.entry_price) / s.entry_price * 100);

        console.log(
            s.coin.padEnd(6) + ' |',
            s.direction.padEnd(5) + ' |',
            s.outcome.padEnd(7) + ' |',
            String(s.entry_price?.toFixed(2)).padStart(9) + ' |',
            String(s.exit_price?.toFixed(2) || 'N/A').padStart(9) + ' |',
            String(s.stop_loss?.toFixed(2)).padStart(9) + ' |',
            String(s.take_profit?.toFixed(2)).padStart(9) + ' |',
            String(s.profit_pct?.toFixed(2) + '%').padStart(7) + ' |',
            String(durationMins).padStart(6)
        );
    });
}

checkEntryPrices().catch(console.error);
