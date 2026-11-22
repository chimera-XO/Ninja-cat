"use client";

interface LoadingScreenProps {
  progress: number;
  error?: string | null;
  onContinueAnyway: () => void;
}

export default function LoadingScreen({
  progress,
  error,
  onContinueAnyway,
}: LoadingScreenProps) {
  const clamped = Math.max(0, Math.min(100, progress));

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed inset-0 z-50 flex flex-col items-center justify-center px-6 bg-gradient-to-b from-[#070918] via-[#0d122c] to-[#141738] text-amber-50 select-none overflow-hidden"
    >
      {/* Subtle midnight stars & crescent moon glow */}
      <div className="pointer-events-none absolute top-10 right-12 w-20 h-20 rounded-full bg-amber-100/10 blur-xl" />
      <div className="pointer-events-none absolute top-12 right-14 w-9 h-9 rounded-full bg-amber-100/80 shadow-[0_0_24px_rgba(254,243,199,0.45)]" />

      <div className="relative flex flex-col items-center max-w-xs w-full text-center">
        {/* Floating ZZZ Bubbles */}
        <div className="relative w-32 h-32 flex items-center justify-center mb-3">
          <span
            aria-hidden="true"
            className="animate-zzz-1 absolute -top-2 right-3 text-xs font-black tracking-wider text-amber-300"
          >
            z
          </span>
          <span
            aria-hidden="true"
            className="animate-zzz-2 absolute top-2 right-0 text-sm font-black tracking-wider text-amber-200"
          >
            Z
          </span>
          <span
            aria-hidden="true"
            className="animate-zzz-3 absolute top-6 -right-3 text-base font-black tracking-wider text-yellow-300"
          >
            Z
          </span>

          {/* Sleeping Ninja Cat Artwork */}
          <img
            src="/assets/characters/ninja-cat-sleep-idle.png"
            alt="Sleeping Ninja Cat"
            className="animate-ninja-sleep w-28 h-28 object-contain drop-shadow-[0_10px_18px_rgba(0,0,0,0.75)]"
            style={{ imageRendering: "pixelated" }}
          />
        </div>

        <h1 className="text-xl font-extrabold tracking-widest text-amber-400">
          NINJA CAT
        </h1>
        <p className="animate-snore text-[11px] tracking-[0.22em] text-slate-300 mt-1 mb-5">
          *snore*... preparing shadow dojo
        </p>

        {/* Progress Bar */}
        <div className="w-full h-3.5 rounded-full border-2 border-amber-400/70 bg-slate-950/90 p-0.5 overflow-hidden shadow-inner">
          <div
            className="h-full rounded-full bg-gradient-to-r from-red-600 via-amber-500 to-yellow-300 transition-all duration-150 ease-out"
            style={{ width: `${clamped}%` }}
          />
        </div>

        <div className="mt-2 flex w-full items-center justify-between text-[11px] text-slate-400">
          <span>{clamped < 100 ? "Loading assets..." : "Awakening..."}</span>
          <span className="font-bold text-amber-300">{clamped}%</span>
        </div>

        {error && (
          <div className="mt-4 rounded-lg border border-amber-500/50 bg-amber-950/40 p-3 text-xs text-amber-200">
            <p className="mb-2">{error}</p>
            <button
              onClick={onContinueAnyway}
              className="px-3 py-1.5 rounded bg-red-600 hover:bg-red-500 text-white font-bold text-xs"
            >
              Enter Dojo Anyway
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
