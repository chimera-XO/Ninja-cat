"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import type * as Phaser from "phaser";
import LoadingScreen from "@/components/LoadingScreen";
import { useTelegramWebApp } from "@/hooks/useTelegramWebApp";
import { GameHudState, LeaderboardEntry, RunTelemetry } from "@/types/game";
import type { RunnerScene } from "@/game/scenes/RunnerScene";

const PhaserGameContainer = dynamic(() => import("@/components/PhaserGameContainer"), {
  ssr: false,
});

export default function HomePage() {
  const { token, profile, setProfile, loading: authLoading } = useTelegramWebApp();
  const gameRef = useRef<Phaser.Game | null>(null);

  const [phaserReady, setPhaserReady] = useState(false);
  const [phaserProgress, setPhaserProgress] = useState(5);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [bypassedLoading, setBypassedLoading] = useState(false);

  const [hud, setHud] = useState<GameHudState>({
    status: "menu",
    score: 0,
    distance: 0,
    coins: 0,
    biome: "moonlit_temple",
    isNewRecord: false,
  });

  const [muted, setMuted] = useState(false);
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [myRank, setMyRank] = useState<number | null>(null);
  const [isNewRecord, setIsNewRecord] = useState(false);

  const isStillLoading = !bypassedLoading && (!phaserReady || authLoading);
  const combinedProgress = bypassedLoading
    ? 100
    : Math.min(100, Math.round((phaserProgress + (authLoading ? 50 : 100)) / 2));

  // Safety guard so players are never stuck if an external request hangs
  useEffect(() => {
    if (!isStillLoading) return;
    const timer = window.setTimeout(() => {
      if (!phaserReady) {
        setLoadError("Loading is taking longer than usual. You can enter the main menu now.");
      } else if (authLoading) {
        setBypassedLoading(true);
      }
    }, 8000);
    return () => window.clearTimeout(timer);
  }, [authLoading, isStillLoading, phaserReady]);

  // Gentle WebAudio snoring sigh while sleeping loading screen is active & sound is ON
  useEffect(() => {
    if (!isStillLoading || muted) return;
    let ctx: AudioContext | null = null;
    let intervalId: number | undefined;

    const triggerGentleSnore = () => {
      try {
        const AudioCtx =
          window.AudioContext ||
          (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
        if (!AudioCtx) return;
        ctx = ctx || new AudioCtx();
        if (ctx.state === "suspended") return;

        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "sine";
        const now = ctx.currentTime;
        osc.frequency.setValueAtTime(165, now);
        osc.frequency.exponentialRampToValueAtTime(125, now + 0.45);

        gain.gain.setValueAtTime(0.001, now);
        gain.gain.linearRampToValueAtTime(0.035, now + 0.14);
        gain.gain.exponentialRampToValueAtTime(0.0008, now + 0.5);

        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.52);
      } catch {
        // Ignore audio autoplay blocks on mobile before user gesture
      }
    };

    intervalId = window.setInterval(triggerGentleSnore, 2600);
    return () => {
      if (intervalId) window.clearInterval(intervalId);
      if (ctx) {
        ctx.close().catch(() => {});
      }
    };
  }, [isStillLoading, muted]);

  const handleLoadComplete = useCallback(() => {
    setPhaserReady(true);
  }, []);

  const handleLoadError = useCallback((msg: string) => {
    setLoadError(msg);
  }, []);

  const getRunnerScene = () =>
    gameRef.current?.scene.getScene("RunnerScene") as RunnerScene | undefined;

  const handleStart = () => {
    if (!phaserReady) {
      setLoadError("The game is still initializing. Please wait a moment.");
      return;
    }
    setIsNewRecord(false);
    setShowLeaderboard(false);
    getRunnerScene()?.startNewRun();
  };

  const handlePauseToggle = () => {
    const nextPaused = hud.status === "playing";
    getRunnerScene()?.setPaused(nextPaused);
  };

  const handleReturnMenu = () => {
    setShowLeaderboard(false);
    getRunnerScene()?.returnToMenu();
  };

  const handleToggleMute = () => {
    const next = !muted;
    setMuted(next);
    getRunnerScene()?.setMuted(next);
  };

  const fetchLeaderboard = useCallback(async () => {
    setShowLeaderboard(true);
    const res = await fetch("/api/leaderboard", {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    if (res.ok) {
      const data = await res.json();
      setLeaderboard(data.leaderboard || []);
      setMyRank(data.currentPlayerRank ?? null);
    }
  }, [token]);

  const handleGameOver = useCallback(
    async (telemetry: RunTelemetry) => {
      if (!token) return;
      const res = await fetch("/api/scores", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(telemetry),
      });
      if (res.ok) {
        const data = await res.json();
        setIsNewRecord(Boolean(data.stats?.is_new_record));
        setProfile((prev) =>
          prev
            ? {
                ...prev,
                games_played: data.stats.games_played,
                highest_score: data.stats.highest_score,
                total_coins: data.stats.total_coins,
              }
            : prev
        );
      }
    },
    [setProfile, token]
  );

  useEffect(() => {
    let cleanup: (() => void) | undefined;
    import("@twa-dev/sdk").then(({ default: WebApp }) => {
      const onBack = () => {
        if (showLeaderboard) setShowLeaderboard(false);
        else if (hud.status === "playing") getRunnerScene()?.setPaused(true);
        else if (hud.status === "paused" || hud.status === "gameover") handleReturnMenu();
      };
      if (hud.status !== "menu" || showLeaderboard) {
        WebApp.BackButton.show();
        WebApp.BackButton.onClick(onBack);
        cleanup = () => {
          WebApp.BackButton.offClick(onBack);
          WebApp.BackButton.hide();
        };
      } else {
        WebApp.BackButton.hide();
      }
    });
    return () => cleanup?.();
  }, [hud.status, showLeaderboard]);

  return (
    <main className="relative w-screen h-dvh overflow-hidden bg-[#0e112a] text-amber-50 font-mono select-none">
      {isStillLoading && (
        <LoadingScreen
          progress={combinedProgress}
          error={loadError}
          onContinueAnyway={() => setBypassedLoading(true)}
        />
      )}

      <PhaserGameContainer
        onHudUpdate={setHud}
        onGameOver={handleGameOver}
        onLoadProgress={setPhaserProgress}
        onLoadComplete={handleLoadComplete}
        onLoadError={handleLoadError}
        gameRef={gameRef}
      />

      {!isStillLoading && (
        <button
          onClick={handleToggleMute}
          aria-label="Toggle Sound"
          className="absolute top-3 right-3 z-30 px-3 py-1.5 rounded border-2 border-amber-400/70 bg-slate-950/80 text-xs font-bold tracking-wider hover:bg-slate-900 active:scale-95"
        >
          {muted ? "SOUND: OFF" : "SOUND: ON"}
        </button>
      )}

      {!isStillLoading && (hud.status === "playing" || hud.status === "paused") && (
        <div className="absolute top-3 left-3 right-28 z-20 flex items-center justify-between gap-2 pointer-events-none">
          <div className="flex items-center gap-3 px-3 py-1.5 rounded border-2 border-amber-400/60 bg-slate-950/80 text-xs sm:text-sm font-bold">
            <span className="text-amber-300">SCORE: {hud.score.toLocaleString()}</span>
            <span className="text-emerald-300">{hud.distance}m</span>
            <span className="text-yellow-400">COINS: {hud.coins}</span>
          </div>
          <button
            onClick={handlePauseToggle}
            className="pointer-events-auto px-3 py-1.5 rounded border-2 border-red-500 bg-red-950/90 text-xs font-bold uppercase hover:bg-red-800 active:scale-95"
          >
            {hud.status === "paused" ? "RESUME" : "PAUSE"}
          </button>
        </div>
      )}

      {!isStillLoading && hud.status === "menu" && !showLeaderboard && (
        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center p-4 bg-gradient-to-b from-slate-950/45 via-slate-950/35 to-slate-950/80">
          <div className="max-w-md w-full rounded-xl border-2 border-amber-400/80 bg-slate-950/85 p-5 shadow-2xl text-center backdrop-blur-sm">
            <img
              src="/assets/ui/ninja-cat-emblem.png"
              alt="Ninja Cat Emblem"
              className="w-20 h-20 mx-auto mb-2 rounded-full border-2 border-red-500 shadow-lg"
            />
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-widest text-amber-400 drop-shadow">
              NINJA CAT
            </h1>
            <p className="text-xs tracking-[0.28em] text-red-400 font-bold mb-4">
              SHADOW RUN
            </p>

            <div className="mb-4 rounded-lg border border-slate-700 bg-slate-900/90 p-3 text-left text-xs">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-slate-400">SHINOBI</span>
                <span className="font-bold text-amber-200">
                  {authLoading ? "Syncing..." : profile?.display_name || "Guest Ninja"}
                </span>
              </div>
              <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-800 text-center">
                <div>
                  <div className="text-[10px] text-slate-400">BEST</div>
                  <div className="font-bold text-amber-400">
                    {(profile?.highest_score ?? 0).toLocaleString()}
                  </div>
                </div>
                <div>
                  <div className="text-[10px] text-slate-400">COINS</div>
                  <div className="font-bold text-yellow-300">
                    {(profile?.total_coins ?? 0).toLocaleString()}
                  </div>
                </div>
                <div>
                  <div className="text-[10px] text-slate-400">RUNS</div>
                  <div className="font-bold text-emerald-300">
                    {profile?.games_played ?? 0}
                  </div>
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-2.5">
              <button
                onClick={handleStart}
                disabled={!phaserReady}
                className="w-full py-3 rounded-lg border-2 border-amber-300 bg-red-600 hover:bg-red-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-extrabold tracking-widest text-base shadow-lg active:scale-98"
              >
                PLAY RUN
              </button>
              <button
                onClick={fetchLeaderboard}
                className="w-full py-2.5 rounded-lg border-2 border-amber-400/70 bg-slate-900 hover:bg-slate-800 text-amber-300 font-bold tracking-wider text-sm active:scale-98"
              >
                GLOBAL LEADERBOARD
              </button>
            </div>
            <p className="mt-3 text-[11px] text-slate-400">
              Tap screen or press SPACE to Jump & Double-Jump
            </p>
          </div>
        </div>
      )}

      {!isStillLoading && hud.status === "paused" && (
        <div className="absolute inset-0 z-30 flex items-center justify-center bg-slate-950/75 p-4">
          <div className="max-w-xs w-full rounded-xl border-2 border-amber-400 bg-slate-900 p-5 text-center space-y-3">
            <h2 className="text-xl font-extrabold text-amber-300 tracking-widest">PAUSED</h2>
            <button
              onClick={handlePauseToggle}
              className="w-full py-2.5 rounded bg-emerald-600 hover:bg-emerald-500 font-bold text-sm"
            >
              RESUME
            </button>
            <button
              onClick={handleStart}
              className="w-full py-2.5 rounded bg-amber-600 hover:bg-amber-500 font-bold text-sm"
            >
              RESTART
            </button>
            <button
              onClick={handleReturnMenu}
              className="w-full py-2.5 rounded bg-slate-800 hover:bg-slate-700 border border-slate-600 font-bold text-sm"
            >
              MAIN MENU
            </button>
          </div>
        </div>
      )}

      {!isStillLoading && hud.status === "gameover" && !showLeaderboard && (
        <div className="absolute inset-0 z-30 flex items-center justify-center bg-slate-950/80 p-4">
          <div className="max-w-sm w-full rounded-xl border-2 border-red-500 bg-slate-950 p-5 text-center shadow-2xl">
            <h2 className="text-2xl font-extrabold text-red-400 tracking-widest mb-1">
              RUN ENDED
            </h2>
            {isNewRecord && (
              <div className="inline-block px-3 py-0.5 mb-2 rounded-full bg-amber-400 text-slate-950 text-xs font-black tracking-wider">
                NEW PERSONAL RECORD!
              </div>
            )}

            <div className="my-3 rounded-lg border border-slate-800 bg-slate-900 p-3 space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-400">FINAL SCORE</span>
                <span className="font-extrabold text-amber-300">
                  {hud.score.toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">DISTANCE</span>
                <span className="font-bold text-emerald-300">{hud.distance} m</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">COINS COLLECTED</span>
                <span className="font-bold text-yellow-300">{hud.coins}</span>
              </div>
              <div className="flex justify-between border-t border-slate-800 pt-2">
                <span className="text-slate-400">PERSONAL BEST</span>
                <span className="font-extrabold text-amber-400">
                  {Math.max(profile?.highest_score ?? 0, hud.score).toLocaleString()}
                </span>
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <button
                onClick={handleStart}
                className="w-full py-3 rounded-lg bg-red-600 hover:bg-red-500 border-2 border-amber-300 font-extrabold tracking-wider"
              >
                PLAY AGAIN
              </button>
              <button
                onClick={fetchLeaderboard}
                className="w-full py-2.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-amber-400/70 text-amber-300 font-bold text-sm"
              >
                LEADERBOARD
              </button>
              <button
                onClick={handleReturnMenu}
                className="w-full py-2 text-xs text-slate-400 hover:text-white"
              >
                Return to Main Menu
              </button>
            </div>
          </div>
        </div>
      )}

      {!isStillLoading && showLeaderboard && (
        <div className="absolute inset-0 z-40 flex items-center justify-center bg-slate-950/85 p-4">
          <div className="max-w-md w-full max-h-[82dvh] flex flex-col rounded-xl border-2 border-amber-400 bg-slate-950 p-4 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h2 className="text-lg font-extrabold text-amber-400 tracking-wider">
                TOP SHINOBI RANKINGS
              </h2>
              <button
                onClick={() => setShowLeaderboard(false)}
                className="px-2.5 py-1 rounded bg-slate-800 text-xs font-bold hover:bg-slate-700"
              >
                CLOSE
              </button>
            </div>

            {myRank !== null && (
              <div className="my-2 px-3 py-1.5 rounded bg-amber-500/15 border border-amber-400/50 text-xs flex justify-between">
                <span>YOUR GLOBAL RANK</span>
                <span className="font-extrabold text-amber-300">#{myRank}</span>
              </div>
            )}

            <div className="flex-1 overflow-y-auto divide-y divide-slate-800/80 my-1">
              {leaderboard.length === 0 ? (
                <p className="py-8 text-center text-xs text-slate-400">
                  No runs recorded yet. Be the first Ninja Cat on the board!
                </p>
              ) : (
                leaderboard.map((entry) => (
                  <div
                    key={entry.user_id}
                    className={`py-2.5 px-2 flex items-center justify-between text-xs ${
                      entry.user_id === profile?.id ? "bg-amber-400/10 rounded" : ""
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <span className="w-6 font-extrabold text-amber-400">#{entry.rank}</span>
                      <div>
                        <div className="font-bold text-slate-100">{entry.display_name}</div>
                        {entry.username && (
                          <div className="text-[10px] text-slate-400">@{entry.username}</div>
                        )}
                      </div>
                    </div>
                    <div className="font-extrabold text-amber-300">
                      {entry.highest_score.toLocaleString()}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
