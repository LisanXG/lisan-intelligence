/**
 * Admin: Clear ALL Signals
 * 
 * POST only, admin-only endpoint
 * Wipes the entire signals table for a fresh start
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { supabaseServer } from '@/lib/supabaseServer';
import { logger } from '@/lib/logger';

const log = logger.withContext('AdminClearSignals');
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
            log.warn(`Non-admin clear attempt by ${user.email}`);
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        // Delete ALL signals
        const { error: deleteError, count } = await supabaseServer
            .from('signals')
            .delete()
            .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete everything (dummy condition)

        if (deleteError) {
            log.error('Failed to clear signals', deleteError);
            return NextResponse.json({ error: 'Failed to clear signals' }, { status: 500 });
        }

        log.info(`Admin ${user.email} cleared all signals`);

        return NextResponse.json({
            success: true,
            message: 'All signals cleared',
            deleted: count || 'all',
        });

    } catch (error) {
        log.error('Clear signals error', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
