/**
 * Admin: Restore Weights to a Specific Learning Event
 * 
 * POST with { learningCycleId: string }
 * Calculates weights at that point by replaying adjustments from DEFAULT.
 * Admin-only endpoint.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { updateGlobalWeights, supabaseServer } from '@/lib/supabaseServer';
import { DEFAULT_WEIGHTS, IndicatorWeights } from '@/lib/engine/scoring';
import { logger } from '@/lib/logger';

const log = logger.withContext('AdminRestoreWeights');
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
}

export async function POST(request: NextRequest) {
    try {
        // Parse request body
        const body = await request.json();
        const { learningCycleId } = body;

        if (!learningCycleId) {
            return NextResponse.json({ error: 'learningCycleId required' }, { status: 400 });
        }

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
            log.warn(`Non-admin restore attempt by ${user.email}`);
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        // Fetch the target learning cycle
        const { data: targetCycle, error: targetError } = await supabaseServer
            .from('learning_cycles')
            .select('id, created_at, adjustments, weights_snapshot')
            .eq('id', learningCycleId)
            .single();

        if (targetError || !targetCycle) {
            return NextResponse.json({ error: 'Learning cycle not found' }, { status: 404 });
        }

        let restoredWeights: Record<string, number>;

        // Fast path: use snapshot if available
        if (targetCycle.weights_snapshot) {
            restoredWeights = targetCycle.weights_snapshot as Record<string, number>;
            log.debug(`Using stored snapshot for cycle ${learningCycleId}`);
        } else {
            // Fallback: replay adjustments from DEFAULT
            log.debug(`No snapshot found, replaying adjustments for cycle ${learningCycleId}`);

            // Fetch all learning cycles up to this point (chronologically)
            const { data: allCycles, error: cyclesError } = await supabaseServer
                .from('learning_cycles')
                .select('id, created_at, adjustments')
                .lte('created_at', targetCycle.created_at)
                .order('created_at', { ascending: true });

            if (cyclesError) {
                log.error('Failed to fetch learning cycles', cyclesError);
                return NextResponse.json({ error: 'Failed to fetch learning history' }, { status: 500 });
            }

            // Start from defaults and replay all adjustments up to target
            restoredWeights = { ...DEFAULT_WEIGHTS };

            for (const cycle of (allCycles as LearningCycle[])) {
                if (cycle.adjustments && Array.isArray(cycle.adjustments)) {
                    for (const adj of cycle.adjustments) {
                        if (adj.indicator && typeof adj.newWeight === 'number') {
                            restoredWeights[adj.indicator] = adj.newWeight;
                        }
                    }
                }
            }
        }

        // Apply the restored weights
        const success = await updateGlobalWeights(restoredWeights);

        if (!success) {
            return NextResponse.json({ error: 'Failed to update weights' }, { status: 500 });
        }

        log.info(`Admin ${user.email} restored weights to learning event ${learningCycleId}`);

        return NextResponse.json({
            success: true,
            message: `Weights restored to state after learning event`,
            targetEvent: targetCycle.created_at,
            usedSnapshot: !!targetCycle.weights_snapshot,
            weights: restoredWeights,
        });

    } catch (error) {
        log.error('Restore weights error', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
