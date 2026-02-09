/**
 * API: Global Weights
 * 
 * Returns the current global engine weights.
 * Uses the server-side Supabase client to bypass RLS.
 */

import { NextResponse } from 'next/server';
import { getGlobalWeights } from '@/lib/supabaseServer';

export async function GET() {
    try {
        const weights = await getGlobalWeights();
        return NextResponse.json({ weights });
    } catch (error) {
        console.error('Failed to fetch weights:', error);
        return NextResponse.json({ weights: null }, { status: 500 });
    }
}
