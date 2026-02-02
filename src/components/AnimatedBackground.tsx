'use client';

import { useEffect, useState } from 'react';
import Script from 'next/script';

export default function AnimatedBackground() {
    const [scriptLoaded, setScriptLoaded] = useState(false);

    useEffect(() => {
        // Initialize UnicornStudio after script loads
        if (scriptLoaded && window.UnicornStudio) {
            const us = window.UnicornStudio;
            if (us.init && !us.isInitialized) {
                try {
                    us.init();
                    us.isInitialized = true;
                    console.log('[AnimatedBackground] UnicornStudio initialized');
                } catch {
                    // UnicornStudio may fail on localhost if domain isn't whitelisted
                    // This is expected - it will work in production
                    console.debug('[AnimatedBackground] UnicornStudio init skipped (localhost)');
                }
            }
        }
    }, [scriptLoaded]);

    return (
        <>
            <Script
                src="https://cdn.jsdelivr.net/gh/hiunicornstudio/unicornstudio.js@v1.4.29/dist/unicornStudio.umd.js"
                strategy="afterInteractive"
                onLoad={() => {
                    console.log('[AnimatedBackground] Script loaded via Next.js');
                    setScriptLoaded(true);
                }}
                onError={(e) => {
                    console.error('[AnimatedBackground] Script failed to load:', e);
                }}
            />
            <div
                className="background-container"
                style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    width: '100%',
                    height: '100vh',
                    backgroundColor: '#030303',
                    zIndex: 0,
                    pointerEvents: 'none',
                }}
            >
                <div
                    className="background-inner"
                    style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        width: '100%',
                        height: '100%',
                    }}
                >
                    <div
                        data-us-project="FixNvEwvWwbu3QX9qC3F"
                        className="unicorn-embed"
                        style={{
                            position: 'absolute',
                            width: '100%',
                            height: '100%',
                            left: 0,
                            top: 0,
                            // Ice crystal frost - cool blue-white, away from teal
                            filter: 'hue-rotate(-25deg) saturate(0.35) brightness(1.25) contrast(0.85)',
                        }}
                    />
                </div>
            </div>
        </>
    );
}

// Extend window for UnicornStudio
declare global {
    interface Window {
        UnicornStudio?: {
            isInitialized?: boolean;
            init?: () => void;
        };
    }
}

