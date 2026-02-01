'use client';

/**
 * Auth Gate Component
 * 
 * Shows login page if user is not authenticated.
 * Shows children if user is authenticated.
 */

import React from 'react';
import { useAuth } from '@/context/auth-context';
import LoginPage from '@/components/LoginPage';

interface AuthGateProps {
    children: React.ReactNode;
}

export default function AuthGate({ children }: AuthGateProps) {
    const { user, loading } = useAuth();

    // Show loading spinner while checking auth
    if (loading) {
        return (
            <div className="auth-loading">
                <div className="auth-loading-spinner">
                    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <circle cx="12" cy="12" r="10" strokeDasharray="32" strokeDashoffset="32">
                            <animate attributeName="stroke-dashoffset" values="32;0;32" dur="1.5s" repeatCount="indefinite" />
                        </circle>
                    </svg>
                </div>
                <p>Loading LISAN Intelligence...</p>

                <style jsx>{`
                    .auth-loading {
                        min-height: 100vh;
                        display: flex;
                        flex-direction: column;
                        align-items: center;
                        justify-content: center;
                        gap: 1rem;
                        background: var(--bg-primary);
                        color: var(--text-secondary);
                    }

                    .auth-loading-spinner {
                        color: var(--accent-teal);
                    }

                    .auth-loading p {
                        font-size: 0.9rem;
                    }
                `}</style>
            </div>
        );
    }

    // Show login page if not authenticated
    if (!user) {
        return <LoginPage />;
    }

    // Show app content if authenticated
    return <>{children}</>;
}
