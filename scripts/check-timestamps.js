// Quick script to check signal timestamps
// Run with: node scripts/check-timestamps.js

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

async function checkTimestamps() {
    // Get recent closed signals
    const { data: signals, error } = await supabase
        .from('signals')
        .select('id, coin, direction, outcome, created_at, closed_at, profit_pct, exit_reason')
        .in('outcome', ['WON', 'LOST'])
        .order('closed_at', { ascending: false })
        .limit(20);

    if (error) {
        console.error('Error:', error);
        return;
    }

    console.log('Recent closed signals (created_at vs closed_at):');
    console.log('='.repeat(120));

    signals.forEach(s => {
        const created = new Date(s.created_at);
        const closed = s.closed_at ? new Date(s.closed_at) : null;
        const durationMins = closed ? Math.round((closed.getTime() - created.getTime()) / 60000) : null;

        console.log(
            s.coin.padEnd(6),
            s.direction.padEnd(6),
            s.outcome.padEnd(5),
            '| created:', s.created_at?.substring(0, 19),
            '| closed:', s.closed_at?.substring(0, 19),
            '| dur:', String(durationMins).padStart(6) + 'm',
            '| profit:', (s.profit_pct?.toFixed(2) || 'N/A').padStart(6) + '%',
            '| reason:', s.exit_reason || 'N/A'
        );
    });

    // Check for 0 or very short duration trades
    const shortTrades = signals.filter(s => {
        const created = new Date(s.created_at);
        const closed = s.closed_at ? new Date(s.closed_at) : null;
        const durationMins = closed ? (closed.getTime() - created.getTime()) / 60000 : null;
        return durationMins !== null && durationMins < 5;
    });

    if (shortTrades.length > 0) {
        console.log('\n' + '='.repeat(120));
        console.log(`⚠️  Found ${shortTrades.length} trades with < 5 min duration!`);
    }
}

checkTimestamps().catch(console.error);
