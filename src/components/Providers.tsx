'use client';

/**
 * Client-side Providers wrapper
 * 
 * Wraps the app with AuthProvider, AuthGate, and ErrorBoundary.
 * Needed because layout.tsx is a server component.
 */

import React from 'react';
import { AuthProvider } from '@/context/auth-context';
import AuthGate from '@/components/AuthGate';
import { ErrorBoundary } from '@/components/ErrorBoundary';

interface ProvidersProps {
    children: React.ReactNode;
}

export default function Providers({ children }: ProvidersProps) {
    return (
        <ErrorBoundary>
            <AuthProvider>
                <AuthGate>
                    {children}
                </AuthGate>
            </AuthProvider>
        </ErrorBoundary>
    );
}
