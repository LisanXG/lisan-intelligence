'use client';

/**
 * Client-side Providers wrapper
 * 
 * Wraps the app with AuthProvider and AuthGate.
 * Needed because layout.tsx is a server component.
 */

import React from 'react';
import { AuthProvider } from '@/context/auth-context';
import AuthGate from '@/components/AuthGate';

interface ProvidersProps {
    children: React.ReactNode;
}

export default function Providers({ children }: ProvidersProps) {
    return (
        <AuthProvider>
            <AuthGate>
                {children}
            </AuthGate>
        </AuthProvider>
    );
}
