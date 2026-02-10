/**
 * Admin: Reset Global Weights to Defaults
 * 
 * POST only, admin-only endpoint
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { updateGlobalWeights } from '@/lib/supabaseServer';
import { DEFAULT_WEIGHTS } from '@/lib/engine/scoring';
import { logger } from '@/lib/logger';

const log = logger.withContext('AdminResetWeights');
const ADMIN_EMAIL = process.env.NEXT_PUBLIC_ADMIN_EMAIL;

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
            log.warn(`Non-admin reset attempt by ${user.email}`);
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        // Reset global weights to defaults
        const success = await updateGlobalWeights(DEFAULT_WEIGHTS);

        if (!success) {
            return NextResponse.json({ error: 'Failed to reset weights' }, { status: 500 });
        }

        log.info(`Admin ${user.email} reset global weights to defaults`);

        return NextResponse.json({
            success: true,
            message: 'Global weights reset to defaults',
            weights: DEFAULT_WEIGHTS,
        });

    } catch (error) {
        log.error('Reset weights error', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
