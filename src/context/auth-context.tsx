'use client';

/**
 * Auth Context for LISAN Intelligence
 * 
 * Provides authentication state and functions throughout the app.
 */

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';

interface AuthContextType {
    user: User | null;
    session: Session | null;
    loading: boolean;
    isAdmin: boolean; // True if user email matches ADMIN_EMAIL env var
    signIn: (email: string, password: string) => Promise<{ error: Error | null; data: { user: User | null; session: Session | null } | null }>;
    signUp: (email: string, password: string) => Promise<{ error: Error | null; data: { user: User | null; session: Session | null } | null }>;
    signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [session, setSession] = useState<Session | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Get initial session
        const getSession = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            setSession(session);
            setUser(session?.user ?? null);
            setLoading(false);
        };

        getSession();

        // Listen for auth changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange(
            async (_event, session) => {
                setSession(session);
                setUser(session?.user ?? null);
                setLoading(false);
            }
        );

        return () => {
            subscription.unsubscribe();
        };
    }, []);

    const signIn = useCallback(async (email: string, password: string) => {
        const { error, data } = await supabase.auth.signInWithPassword({
            email,
            password,
        });
        return {
            error: error as Error | null,
            data: data ? { user: data.user, session: data.session } : null
        };
    }, []);

    const signUp = useCallback(async (email: string, password: string) => {
        const { error, data } = await supabase.auth.signUp({
            email,
            password,
        });
        return {
            error: error as Error | null,
            data: data ? { user: data.user, session: data.session } : null
        };
    }, []);

    const signOut = useCallback(async () => {
        await supabase.auth.signOut();
        setUser(null);
        setSession(null);
    }, []);

    // Admin check - compare user email to ADMIN_EMAIL env var
    const adminEmail = process.env.NEXT_PUBLIC_ADMIN_EMAIL?.toLowerCase();
    const isAdmin = Boolean(user?.email && adminEmail && user.email.toLowerCase() === adminEmail);

    const value = {
        user,
        session,
        loading,
        isAdmin,
        signIn,
        signUp,
        signOut,
    };

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
}
