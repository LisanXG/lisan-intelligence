'use client';

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { logger } from '@/lib/logger';

interface Props {
    children: ReactNode;
    fallback?: ReactNode;
}

interface State {
    hasError: boolean;
    error: Error | null;
}

/**
 * Error Boundary Component
 * 
 * Catches JavaScript errors in child component tree and displays a fallback UI.
 * Prevents entire app from crashing due to component errors.
 */
export class ErrorBoundary extends Component<Props, State> {
    constructor(props: Props) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error };
    }

    componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
        logger.error('ErrorBoundary caught an error', {
            error: error.message,
            stack: error.stack,
            componentStack: errorInfo.componentStack,
        });
    }

    handleRetry = (): void => {
        this.setState({ hasError: false, error: null });
    };

    render(): ReactNode {
        if (this.state.hasError) {
            if (this.props.fallback) {
                return this.props.fallback;
            }

            return (
                <div className="error-boundary">
                    <div className="error-content">
                        <div className="error-icon">⚠️</div>
                        <h2>Something went wrong</h2>
                        <p>An unexpected error occurred. Please try again.</p>
                        {process.env.NODE_ENV === 'development' && this.state.error && (
                            <pre className="error-details">
                                {this.state.error.message}
                            </pre>
                        )}
                        <button
                            onClick={this.handleRetry}
                            className="retry-button"
                        >
                            Try Again
                        </button>
                    </div>
                    <style jsx>{`
                        .error-boundary {
                            display: flex;
                            align-items: center;
                            justify-content: center;
                            min-height: 200px;
                            padding: var(--spacing-lg);
                        }
                        .error-content {
                            text-align: center;
                            max-width: 400px;
                        }
                        .error-icon {
                            font-size: 3rem;
                            margin-bottom: var(--spacing-md);
                        }
                        h2 {
                            color: var(--text-primary);
                            margin-bottom: var(--spacing-sm);
                        }
                        p {
                            color: var(--text-secondary);
                            margin-bottom: var(--spacing-md);
                        }
                        .error-details {
                            background: rgba(239, 68, 68, 0.1);
                            border: 1px solid rgba(239, 68, 68, 0.3);
                            border-radius: var(--radius-sm);
                            padding: var(--spacing-sm);
                            font-size: 0.75rem;
                            text-align: left;
                            overflow-x: auto;
                            margin-bottom: var(--spacing-md);
                            color: var(--signal-short);
                        }
                        .retry-button {
                            background: var(--accent-blue);
                            color: white;
                            border: none;
                            padding: var(--spacing-sm) var(--spacing-lg);
                            border-radius: var(--radius-sm);
                            cursor: pointer;
                            font-weight: 500;
                            transition: opacity 0.2s;
                        }
                        .retry-button:hover {
                            opacity: 0.9;
                        }
                    `}</style>
                </div>
            );
        }

        return this.props.children;
    }
}

export default ErrorBoundary;
