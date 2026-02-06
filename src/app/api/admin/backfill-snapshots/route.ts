/**
 * Admin: Backfill weights_snapshot for existing learning events
 * 
 * POST - runs once to calculate and store weights_snapshot for all existing learning cycles
 * Admin-only endpoint.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { supabaseServer } from '@/lib/supabaseServer';
import { DEFAULT_WEIGHTS, IndicatorWeights } from '@/lib/engine/scoring';
import { logger } from '@/lib/logger';

const log = logger.withContext('AdminBackfillSnapshots');
const ADMIN_EMAIL = process.env.NEXT_PUBLIC_ADMIN_EMAIL;

interface WeightAdjustment {
    indicator: keyof IndicatorWeights;
    oldWeight: number;
    newWeight: number;
    changePercent: number;
    reason?: string;
}

interface LearningCycle {
    id: string;
    created_at: string;
    adjustments: WeightAdjustment[];
    weights_snapshot: Record<string, number> | null;
}

export async function POST(request: NextRequest) {
    try {
        // Create server-side Supabase client to get current user
        const cookieStore = await cookies();
        const supabase = createServerClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
            {
                cookies: {
                    getAll() {
                        return cookieStore.getAll();
                    },
                    setAll(cookiesToSet) {
                        cookiesToSet.forEach(({ name, value, options }) =>
                            cookieStore.set(name, value, options)
                        );
                    },
                },
            }
        );

        // Get current user
        const { data: { user }, error: authError } = await supabase.auth.getUser();

        if (authError || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Admin check
        if (!ADMIN_EMAIL || user.email !== ADMIN_EMAIL) {
            log.warn(`Non-admin backfill attempt by ${user.email}`);
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        // Fetch all learning cycles in chronological order
        const { data: allCycles, error: cyclesError } = await supabaseServer
            .from('learning_cycles')
            .select('id, created_at, adjustments, weights_snapshot')
            .order('created_at', { ascending: true });

        if (cyclesError) {
            log.error('Failed to fetch learning cycles', cyclesError);
            return NextResponse.json({ error: 'Failed to fetch learning cycles' }, { status: 500 });
        }

        // Replay from defaults and update each cycle
        const weights: Record<string, number> = { ...DEFAULT_WEIGHTS };
        let updatedCount = 0;
        let skippedCount = 0;

        for (const cycle of (allCycles as LearningCycle[])) {
            // Apply this cycle's adjustments
            if (cycle.adjustments && Array.isArray(cycle.adjustments)) {
                for (const adj of cycle.adjustments) {
                    if (adj.indicator && typeof adj.newWeight === 'number') {
                        weights[adj.indicator] = adj.newWeight;
                    }
                }
            }

            // Only update if no snapshot exists
            if (!cycle.weights_snapshot) {
                const { error: updateError } = await supabaseServer
                    .from('learning_cycles')
                    .update({ weights_snapshot: { ...weights } })
                    .eq('id', cycle.id);

                if (updateError) {
                    log.error(`Failed to update cycle ${cycle.id}`, updateError);
                } else {
                    updatedCount++;
                }
            } else {
                skippedCount++;
            }
        }

        log.info(`Admin ${user.email} backfilled ${updatedCount} learning cycles, skipped ${skippedCount} with existing snapshots`);

        return NextResponse.json({
            success: true,
            message: `Backfilled ${updatedCount} learning cycles`,
            updated: updatedCount,
            skipped: skippedCount,
            total: allCycles?.length || 0,
        });

    } catch (error) {
        log.error('Backfill error', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
