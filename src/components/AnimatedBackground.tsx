'use client';

import { useEffect } from 'react';

export default function AnimatedBackground() {
    useEffect(() => {
        // Load UnicornStudio script
        if (!window.UnicornStudio) {
            window.UnicornStudio = { isInitialized: false };
            const script = document.createElement('script');
            script.src = 'https://cdn.jsdelivr.net/gh/hiunicornstudio/unicornstudio.js@v1.4.29/dist/unicornStudio.umd.js';
            script.onload = () => {
                const us = window.UnicornStudio;
                if (us && !us.isInitialized && us.init) {
                    us.init();
                    us.isInitialized = true;
                }
            };
            (document.head || document.body).appendChild(script);
        }
    }, []);

    return (
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
    );
}

// Extend window for UnicornStudio
declare global {
    interface Window {
        UnicornStudio?: {
            isInitialized: boolean;
            init?: () => void;
        };
    }
}
