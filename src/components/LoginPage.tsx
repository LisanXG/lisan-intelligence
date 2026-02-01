'use client';

/**
 * Login Page for LISAN Intelligence
 * 
 * Simple email/password authentication.
 * Matches the existing design system.
 */

import React, { useState } from 'react';
import { useAuth } from '@/context/auth-context';

interface LoginPageProps {
    onSuccess?: () => void;
}

export default function LoginPage({ onSuccess }: LoginPageProps) {
    const { signIn, signUp } = useAuth();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [isSignUp, setIsSignUp] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [confirmationSent, setConfirmationSent] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setConfirmationSent(false);
        setLoading(true);

        try {
            const { error, data } = isSignUp
                ? await signUp(email, password)
                : await signIn(email, password);

            if (error) {
                setError(error.message);
            } else if (isSignUp && data?.user && !data?.session) {
                // Signup succeeded but no session = email confirmation required
                setConfirmationSent(true);
            } else {
                onSuccess?.();
            }
        } catch (err) {
            setError('An unexpected error occurred');
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="login-container">
            <div className="login-card">
                {/* Logo */}
                <div className="login-logo">
                    <div className="logo-wrapper">
                        <div className="logo-glow"></div>
                        <div className="logo-main">
                            <svg viewBox="0 0 24 24" width="40" height="40" fill="none" stroke="currentColor" strokeWidth="2.5">
                                <path d="M6 4v16M6 20h12" strokeLinecap="round" strokeLinejoin="round" />
                                <path d="M10 8h8M10 12h6" strokeLinecap="round" strokeOpacity="0.6" />
                            </svg>
                        </div>
                    </div>
                </div>

                <h1 className="login-title">LISAN INTELLIGENCE</h1>
                <p className="login-subtitle">
                    {isSignUp ? 'Create your account' : 'Sign in to continue'}
                </p>

                <form onSubmit={handleSubmit} className="login-form">
                    <div className="form-group">
                        <label htmlFor="email">Email</label>
                        <input
                            id="email"
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="you@example.com"
                            required
                            autoComplete="email"
                        />
                    </div>

                    <div className="form-group">
                        <label htmlFor="password">Password</label>
                        <input
                            id="password"
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="Enter password"
                            required
                            minLength={6}
                            autoComplete={isSignUp ? 'new-password' : 'current-password'}
                        />
                    </div>

                    {error && (
                        <div className="login-error">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <circle cx="12" cy="12" r="10" />
                                <line x1="12" y1="8" x2="12" y2="12" />
                                <line x1="12" y1="16" x2="12.01" y2="16" />
                            </svg>
                            {error}
                        </div>
                    )}

                    {confirmationSent && (
                        <div className="login-success">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M22 2L11 13" strokeLinecap="round" strokeLinejoin="round" />
                                <path d="M22 2L15 22L11 13L2 9L22 2Z" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                            <div>
                                <strong>Check your email!</strong>
                                <p>We sent a confirmation link to {email}</p>
                            </div>
                        </div>
                    )}

                    <button
                        type="submit"
                        className="login-button"
                        disabled={loading}
                    >
                        {loading ? (
                            <span className="login-loading">
                                <svg className="spinner" width="20" height="20" viewBox="0 0 24 24">
                                    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" fill="none" strokeDasharray="32" strokeDashoffset="32">
                                        <animate attributeName="stroke-dashoffset" values="32;0;32" dur="1s" repeatCount="indefinite" />
                                    </circle>
                                </svg>
                                {isSignUp ? 'Creating account...' : 'Signing in...'}
                            </span>
                        ) : (
                            isSignUp ? 'Create Account' : 'Sign In'
                        )}
                    </button>
                </form>

                <div className="login-toggle">
                    {isSignUp ? (
                        <>
                            Already have an account?{' '}
                            <button onClick={() => setIsSignUp(false)}>Sign in</button>
                        </>
                    ) : (
                        <>
                            Don&apos;t have an account?{' '}
                            <button onClick={() => setIsSignUp(true)}>Create one</button>
                        </>
                    )}
                </div>

                <div className="security-disclaimer">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    <span>
                        Accounts enable signal tracking and engine learning across devices.
                        Secured by <a href="https://supabase.com" target="_blank" rel="noopener noreferrer">Supabase</a> — we never see your password.
                    </span>
                </div>
            </div>

            <style jsx>{`
                .login-container {
                    min-height: 100vh;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    background: linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f172a 100%);
                    padding: 2rem;
                    position: relative;
                    overflow: hidden;
                }

                .login-container::before {
                    content: '';
                    position: absolute;
                    top: -50%;
                    left: -50%;
                    width: 200%;
                    height: 200%;
                    background: radial-gradient(circle at 30% 30%, rgba(6, 182, 212, 0.15) 0%, transparent 50%),
                                radial-gradient(circle at 70% 70%, rgba(139, 92, 246, 0.1) 0%, transparent 50%);
                    animation: gradientShift 15s ease infinite;
                }

                @keyframes gradientShift {
                    0%, 100% { transform: translate(0, 0); }
                    50% { transform: translate(-5%, -5%); }
                }

                .login-card {
                    position: relative;
                    width: 100%;
                    max-width: 480px;
                    background: rgba(255, 255, 255, 0.95);
                    backdrop-filter: blur(20px);
                    border: 1px solid rgba(255, 255, 255, 0.2);
                    border-radius: 24px;
                    padding: 3.5rem;
                    text-align: center;
                    box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25),
                                0 0 0 1px rgba(255, 255, 255, 0.1);
                }

                .login-logo {
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    margin: 0 auto 2rem;
                }

                .logo-wrapper {
                    position: relative;
                    width: 80px;
                    height: 80px;
                }

                .logo-glow {
                    position: absolute;
                    inset: 0;
                    background: linear-gradient(135deg, #22d3ee 0%, #06b6d4 50%, #8b5cf6 100%);
                    border-radius: 20px;
                    transform: rotate(3deg);
                    box-shadow: 0 10px 40px -10px rgba(6, 182, 212, 0.6);
                }

                .logo-main {
                    position: absolute;
                    inset: 0;
                    background: linear-gradient(135deg, #06b6d4 0%, #8b5cf6 100%);
                    border-radius: 20px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    color: white;
                }

                .login-title {
                    font-size: 1.75rem;
                    font-weight: 800;
                    letter-spacing: 0.08em;
                    margin-bottom: 0.75rem;
                    color: #0f172a;
                    background: linear-gradient(135deg, #0f172a 0%, #334155 100%);
                    -webkit-background-clip: text;
                    -webkit-text-fill-color: transparent;
                    background-clip: text;
                }

                .login-subtitle {
                    font-size: 1rem;
                    color: #64748b;
                    margin-bottom: 2.5rem;
                    font-weight: 500;
                }

                .login-form {
                    text-align: left;
                }

                .form-group {
                    margin-bottom: 1.5rem;
                }

                .form-group label {
                    display: block;
                    font-size: 0.875rem;
                    font-weight: 600;
                    color: #334155;
                    margin-bottom: 0.625rem;
                    text-transform: uppercase;
                    letter-spacing: 0.05em;
                }

                .form-group input {
                    width: 100%;
                    padding: 1rem 1.25rem;
                    background: #f8fafc;
                    border: 2px solid #e2e8f0;
                    border-radius: 12px;
                    font-size: 1.0625rem;
                    color: #0f172a;
                    transition: all 0.2s ease;
                    font-weight: 500;
                }

                .form-group input:focus {
                    outline: none;
                    border-color: #06b6d4;
                    background: #ffffff;
                    box-shadow: 0 0 0 4px rgba(6, 182, 212, 0.15);
                }

                .form-group input::placeholder {
                    color: #94a3b8;
                    font-weight: 400;
                }

                .login-error {
                    display: flex;
                    align-items: center;
                    gap: 0.625rem;
                    padding: 1rem 1.25rem;
                    background: #fef2f2;
                    border: 2px solid #fecaca;
                    border-radius: 12px;
                    color: #dc2626;
                    font-size: 0.9375rem;
                    font-weight: 500;
                    margin-bottom: 1.5rem;
                }

                .login-success {
                    display: flex;
                    align-items: flex-start;
                    gap: 0.875rem;
                    padding: 1.25rem 1.5rem;
                    background: linear-gradient(135deg, #ecfdf5 0%, #f0fdf4 100%);
                    border: 2px solid #86efac;
                    border-radius: 12px;
                    color: #16a34a;
                    font-size: 0.9375rem;
                    margin-bottom: 1.5rem;
                }

                .login-success strong {
                    display: block;
                    font-weight: 700;
                    font-size: 1rem;
                    margin-bottom: 0.25rem;
                }

                .login-success p {
                    margin: 0;
                    font-weight: 500;
                    opacity: 0.9;
                }

                .login-button {
                    width: 100%;
                    padding: 1.125rem 2rem;
                    background: linear-gradient(135deg, #06b6d4 0%, #8b5cf6 100%);
                    border: none;
                    border-radius: 12px;
                    font-size: 1.0625rem;
                    font-weight: 700;
                    color: white;
                    cursor: pointer;
                    transition: all 0.2s ease;
                    box-shadow: 0 4px 20px -4px rgba(6, 182, 212, 0.5);
                    letter-spacing: 0.02em;
                }

                .login-button:hover:not(:disabled) {
                    transform: translateY(-2px);
                    box-shadow: 0 8px 30px -4px rgba(6, 182, 212, 0.6);
                }

                .login-button:active:not(:disabled) {
                    transform: translateY(0);
                }

                .login-button:disabled {
                    opacity: 0.7;
                    cursor: not-allowed;
                }

                .login-loading {
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    gap: 0.625rem;
                }

                .spinner {
                    animation: spin 1s linear infinite;
                }

                @keyframes spin {
                    from { transform: rotate(0deg); }
                    to { transform: rotate(360deg); }
                }

                .login-toggle {
                    margin-top: 2rem;
                    font-size: 0.9375rem;
                    color: #64748b;
                    font-weight: 500;
                }

                .login-toggle button {
                    background: none;
                    border: none;
                    color: #06b6d4;
                    font-weight: 600;
                    cursor: pointer;
                    text-decoration: none;
                    transition: color 0.2s;
                }

                .login-toggle button:hover {
                    color: #8b5cf6;
                    text-decoration: underline;
                }

                .security-disclaimer {
                    display: flex;
                    align-items: flex-start;
                    gap: 0.5rem;
                    margin-top: 1.5rem;
                    padding: 1rem;
                    background: #f8fafc;
                    border: 1px solid #e2e8f0;
                    border-radius: 10px;
                    font-size: 0.8125rem;
                    color: #64748b;
                    text-align: left;
                    line-height: 1.5;
                }

                .security-disclaimer svg {
                    flex-shrink: 0;
                    margin-top: 2px;
                    color: #06b6d4;
                }

                .security-disclaimer a {
                    color: #06b6d4;
                    font-weight: 600;
                    text-decoration: none;
                }

                .security-disclaimer a:hover {
                    text-decoration: underline;
                }
            `}</style>
        </div>
    );
}
