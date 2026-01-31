'use client';

import { useState, useRef } from 'react';
import { SignalOutput } from '@/lib/engine/scoring';
import { generatePng, downloadPng, openTwitterIntent } from '@/lib/share';
import ShareableCard from './ShareableCard';

interface ShareButtonProps {
    signal: SignalOutput & { name?: string; image?: string };
}

/**
 * Share Button Component
 * 
 * Renders a share button that generates a PNG of the signal
 * and opens Twitter intent.
 */
export default function ShareButton({ signal }: ShareButtonProps) {
    const [isSharing, setIsSharing] = useState(false);
    const cardRef = useRef<HTMLDivElement>(null);

    const handleShare = async () => {
        setIsSharing(true);

        // Wait for React to render the card
        await new Promise(resolve => setTimeout(resolve, 500));

        if (cardRef.current) {
            try {
                const dataUrl = await generatePng(cardRef.current);
                const filename = `lisan_${signal.coin}_${signal.direction}_${Date.now()}.png`;
                downloadPng(dataUrl, filename);
                openTwitterIntent(signal);
            } catch (error) {
                console.error('Share failed:', error);
                // Still open intent even if image fails
                openTwitterIntent(signal);
            }
        }

        setIsSharing(false);
    };

    return (
        <>
            <button
                onClick={handleShare}
                disabled={isSharing}
                className="share-button"
                title="Share to X"
                style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: '32px',
                    height: '32px',
                    borderRadius: '8px',
                    border: '1px solid var(--border-primary)',
                    background: 'var(--bg-card)',
                    color: 'var(--text-secondary)',
                    cursor: isSharing ? 'wait' : 'pointer',
                    transition: 'all 150ms ease',
                    opacity: isSharing ? 0.6 : 1,
                }}
                onMouseEnter={(e) => {
                    if (!isSharing) {
                        e.currentTarget.style.background = 'var(--bg-card-hover)';
                        e.currentTarget.style.borderColor = 'var(--accent-cyan)';
                        e.currentTarget.style.color = 'var(--accent-cyan)';
                    }
                }}
                onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'var(--bg-card)';
                    e.currentTarget.style.borderColor = 'var(--border-primary)';
                    e.currentTarget.style.color = 'var(--text-secondary)';
                }}
            >
                {isSharing ? (
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="animate-spin">
                        <circle cx="12" cy="12" r="10" strokeDasharray="32" strokeDashoffset="12" />
                    </svg>
                ) : (
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                    </svg>
                )}
            </button>

            {/* Card for PNG generation - visible behind dark overlay when sharing */}
            {isSharing && (
                <div
                    style={{
                        position: 'fixed',
                        inset: 0,
                        zIndex: 9998,
                        backgroundColor: '#0f172a',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                    }}
                >
                    <div ref={cardRef}>
                        <ShareableCard signal={signal} />
                    </div>
                    {/* Loading text */}
                    <div style={{
                        position: 'absolute',
                        bottom: '2rem',
                        left: '50%',
                        transform: 'translateX(-50%)',
                        color: '#94a3b8',
                        fontSize: '14px',
                    }}>
                        Generating image...
                    </div>
                </div>
            )}
        </>
    );
}


