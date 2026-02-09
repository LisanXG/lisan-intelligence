'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { useAuth } from '@/context/auth-context';

export default function Header() {
    const pathname = usePathname();
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const { user, signOut } = useAuth();

    const navLinks = [
        { href: '/', label: 'Dashboard' },
        { href: '/watchlist', label: 'Watchlist' },
        { href: '/signals', label: 'Signals' },
        { href: '/proof', label: 'Proof' },
        { href: '/learning', label: 'Learning' },
        { href: '/docs', label: 'Docs' },
    ];

    const handleSignOut = async () => {
        await signOut();
    };

    return (
        <header className="fixed top-0 left-0 right-0 z-50 bg-white/90 backdrop-blur-2xl border-b border-slate-200/50">
            <div className="w-full px-4 md:px-8 lg:px-12 xl:px-16 flex items-center justify-between h-16 md:h-20 relative">
                {/* Left: Logo + Brand */}
                <Link href="/" className="flex items-center gap-3 md:gap-5 group flex-shrink-0">
                    {/* Logo */}
                    <div className="relative w-10 h-10 md:w-12 md:h-12 flex-shrink-0">
                        <div className="absolute inset-0 bg-gradient-to-br from-cyan-400 via-cyan-500 to-violet-600 rounded-xl rotate-3 group-hover:rotate-6 transition-transform shadow-lg shadow-cyan-500/30"></div>
                        <div className="absolute inset-0 bg-gradient-to-br from-cyan-500 to-violet-600 rounded-xl flex items-center justify-center">
                            <svg viewBox="0 0 24 24" className="w-6 h-6 md:w-7 md:h-7 text-white" fill="none" stroke="currentColor" strokeWidth="2.5">
                                <path d="M6 4v16M6 20h12" strokeLinecap="round" strokeLinejoin="round" />
                                <path d="M10 8h8M10 12h6" strokeLinecap="round" strokeOpacity="0.6" />
                            </svg>
                        </div>
                    </div>
                    {/* Brand Name */}
                    <span className="text-base md:text-xl font-bold tracking-wide text-slate-700">
                        LISAN INTELLIGENCE
                    </span>
                </Link>

                {/* Mobile: Hamburger Button */}
                <button
                    className="xl:hidden flex flex-col gap-1.5 p-2"
                    onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                    aria-label="Toggle menu"
                >
                    <span className={`w-6 h-0.5 bg-slate-700 transition-transform ${mobileMenuOpen ? 'rotate-45 translate-y-2' : ''}`}></span>
                    <span className={`w-6 h-0.5 bg-slate-700 transition-opacity ${mobileMenuOpen ? 'opacity-0' : ''}`}></span>
                    <span className={`w-6 h-0.5 bg-slate-700 transition-transform ${mobileMenuOpen ? '-rotate-45 -translate-y-2' : ''}`}></span>
                </button>

                {/* Center: Navigation (Desktop) */}
                <nav className="hidden xl:flex items-center gap-1 absolute left-1/2 -translate-x-1/2">
                    {navLinks.map((link) => {
                        const isActive = pathname === link.href;
                        return (
                            <Link
                                key={link.href}
                                href={link.href}
                                className={`px-4 py-2.5 text-sm font-semibold rounded-xl transition-all duration-200 whitespace-nowrap ${isActive
                                    ? 'text-white bg-gradient-to-r from-cyan-500 to-cyan-600 shadow-lg shadow-cyan-500/25'
                                    : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
                                    }`}
                            >
                                {link.label}
                            </Link>
                        );
                    })}
                </nav>

                {/* Right: User + Live Data (Desktop) */}
                <div className="hidden xl:flex items-center gap-4">
                    <div className="flex items-center gap-2">
                        <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></span>
                        <span className="text-sm font-medium text-slate-600">Live</span>
                    </div>
                    <span className="text-sm text-slate-500">
                        {new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                    </span>
                    {user && (
                        <div className="flex items-center gap-2">
                            <span className="text-xs text-slate-500 truncate max-w-28">
                                {user.email}
                            </span>
                            <button
                                onClick={handleSignOut}
                                className="text-xs font-medium text-slate-500 hover:text-red-500 transition-colors px-2 py-1 rounded-lg hover:bg-red-50"
                            >
                                Sign Out
                            </button>
                        </div>
                    )}
                    <span className="text-xs text-slate-400 font-mono bg-slate-100/80 px-2 py-1 rounded-lg">
                        v4.1.1
                    </span>
                </div>
            </div>

            {/* Mobile Menu Dropdown */}
            {mobileMenuOpen && (
                <div className="xl:hidden bg-white/95 backdrop-blur-xl border-t border-slate-200/50 shadow-lg">
                    <nav className="flex flex-col p-4 gap-2">
                        {navLinks.map((link) => {
                            const isActive = pathname === link.href;
                            return (
                                <Link
                                    key={link.href}
                                    href={link.href}
                                    onClick={() => setMobileMenuOpen(false)}
                                    className={`px-4 py-3 text-base font-semibold rounded-lg transition-all ${isActive
                                        ? 'text-white bg-gradient-to-r from-cyan-500 to-cyan-600'
                                        : 'text-slate-700 hover:bg-slate-100'
                                        }`}
                                >
                                    {link.label}
                                </Link>
                            );
                        })}
                    </nav>
                    {/* Mobile: User + Live indicator */}
                    <div className="px-4 pb-4 flex items-center gap-2 text-sm text-slate-500">
                        <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></span>
                        <span>Live Data</span>
                        {user && (
                            <>
                                <span className="ml-2 truncate max-w-32">{user.email}</span>
                                <button
                                    onClick={handleSignOut}
                                    className="ml-2 text-red-500 font-medium"
                                >
                                    Sign Out
                                </button>
                            </>
                        )}
                        <span className="ml-auto font-mono text-xs bg-slate-100 px-2 py-1 rounded">v4.1.1</span>
                    </div>
                </div>
            )}
        </header>
    );
}

