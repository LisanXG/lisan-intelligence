'use client';

/**
 * Animated Background - Floating Blob Effect
 * Adapted from Aura template with LISAN color scheme
 */
export default function AnimatedBackground() {
    return (
        <>
            <style jsx global>{`
                .animated-bg {
                    position: fixed;
                    inset: 0;
                    z-index: 0;
                    width: 100vw;
                    height: 100vh;
                    overflow: hidden;
                    background: radial-gradient(ellipse 80% 100% at 50% 0%, rgba(6, 182, 212, 0.18) 0%, rgba(139, 92, 246, 0.06) 100%), 
                                linear-gradient(135deg, #030303 0%, #0a0a0a 100%);
                    pointer-events: none;
                }
                
                .bg-blob {
                    position: absolute;
                    border-radius: 50%;
                    filter: blur(80px);
                    opacity: 0.5;
                    pointer-events: none;
                    mix-blend-mode: screen;
                }
                
                /* Primary Cyan Blob - top left */
                .blob1 {
                    width: 600px;
                    height: 600px;
                    background: #06b6d4;
                    top: -150px;
                    left: -120px;
                    animation: blob1move 20s ease-in-out infinite alternate;
                }
                
                /* Secondary Purple Blob - center right */
                .blob2 {
                    width: 500px;
                    height: 500px;
                    background: #8b5cf6;
                    top: 30%;
                    right: -100px;
                    animation: blob2move 18s ease-in-out infinite alternate;
                }
                
                /* Tertiary Blue Blob - bottom left */
                .blob3 {
                    width: 450px;
                    height: 450px;
                    background: #3b82f6;
                    bottom: -100px;
                    left: 20%;
                    animation: blob3move 22s ease-in-out infinite alternate;
                }
                
                /* Small Teal Accent Blob */
                .blob4 {
                    width: 300px;
                    height: 300px;
                    background: #0891b2;
                    top: 50%;
                    left: 40%;
                    animation: blob4move 16s ease-in-out infinite alternate;
                }
                
                @keyframes blob1move {
                    0% { top: -150px; left: -120px; transform: scale(1); }
                    100% { top: 50px; left: 15vw; transform: scale(1.1); }
                }
                
                @keyframes blob2move {
                    0% { top: 30%; right: -100px; transform: scale(1); }
                    100% { top: 20%; right: 5vw; transform: scale(0.9); }
                }
                
                @keyframes blob3move {
                    0% { bottom: -100px; left: 20%; transform: scale(1); }
                    100% { bottom: 10vh; left: 30%; transform: scale(1.15); }
                }
                
                @keyframes blob4move {
                    0% { top: 50%; left: 40%; transform: scale(1); opacity: 0.4; }
                    100% { top: 35%; left: 50%; transform: scale(1.2); opacity: 0.6; }
                }
            `}</style>

            <div className="animated-bg">
                <div className="bg-blob blob1" />
                <div className="bg-blob blob2" />
                <div className="bg-blob blob3" />
                <div className="bg-blob blob4" />
            </div>
        </>
    );
}
