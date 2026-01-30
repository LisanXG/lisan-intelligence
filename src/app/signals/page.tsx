import Header from '@/components/Header';
import EngineSignals from '@/components/EngineSignals';

export default function SignalsPage() {
    return (
        <>
            <Header />
            <main className="pt-28 pb-16 px-6 lg:px-12 max-w-[1800px] mx-auto">
                {/* Page Title + Signal Legend */}
                <div className="card p-6 mb-8">
                    <h1 className="text-3xl font-semibold mb-6 text-slate-700">Engine Signals</h1>

                    <div className="pt-6 border-t border-[var(--border-secondary)]">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <div className="flex items-start gap-4">
                                <span className="inline-flex items-center px-4 py-1.5 rounded text-sm font-bold bg-[rgba(5,150,105,0.1)] text-[var(--accent-green)]">
                                    LONG
                                </span>
                                <div>
                                    <div className="font-medium">Bullish Setup</div>
                                    <div className="text-sm text-[var(--text-muted)]">Technical indicators favor upward price movement</div>
                                </div>
                            </div>
                            <div className="flex items-start gap-4">
                                <span className="inline-flex items-center px-4 py-1.5 rounded text-sm font-bold bg-[rgba(220,38,38,0.1)] text-[var(--accent-red)]">
                                    SHORT
                                </span>
                                <div>
                                    <div className="font-medium">Bearish Setup</div>
                                    <div className="text-sm text-[var(--text-muted)]">Technical indicators suggest downward pressure</div>
                                </div>
                            </div>
                            <div className="flex items-start gap-4">
                                <span className="inline-flex items-center px-4 py-1.5 rounded text-sm font-bold bg-[rgba(107,114,128,0.1)] text-[var(--text-muted)]">
                                    HOLD
                                </span>
                                <div>
                                    <div className="font-medium">No Clear Edge</div>
                                    <div className="text-sm text-[var(--text-muted)]">Mixed signals, wait for clarity</div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Engine Signals Grid */}
                <EngineSignals />
            </main>
        </>
    );
}

