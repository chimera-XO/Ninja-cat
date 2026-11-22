"use client";

import { useEffect, useRef } from "react";
import type * as Phaser from "phaser";
import { GameHudState, RunTelemetry } from "@/types/game";

interface Props {
  onHudUpdate: (state: GameHudState) => void;
  onGameOver: (telemetry: RunTelemetry) => void;
  onLoadProgress: (progress: number) => void;
  onLoadComplete: () => void;
  onLoadError: (msg: string) => void;
  gameRef: React.MutableRefObject<Phaser.Game | null>;
}

export default function PhaserGameContainer({
  onHudUpdate,
  onGameOver,
  onLoadProgress,
  onLoadComplete,
  onLoadError,
  gameRef,
}: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    let destroyed = false;

    async function mountPhaser() {
      if (!containerRef.current || gameRef.current) return;
      try {
        onLoadProgress(15);
        const PhaserLib = await import("phaser");
        const { createPhaserConfig } = await import("@/game/config");

        if (destroyed || !containerRef.current) return;

        onLoadProgress(30);
        const game = new PhaserLib.Game(createPhaserConfig(containerRef.current));
        gameRef.current = game;

        game.events.on("load-progress", (pct: number) => {
          onLoadProgress(30 + Math.round(pct * 0.7));
        });
        game.events.on("load-warning", (warnMsg: string) => {
          onLoadError(warnMsg);
        });
        game.events.on("load-complete", () => {
          onLoadProgress(100);
          onLoadComplete();
        });
        game.events.on("hud-update", onHudUpdate);
        game.events.on("run-gameover", onGameOver);
      } catch (err) {
        console.error("Failed to initialize Phaser:", err);
        if (!destroyed) {
          onLoadError("Graphics engine took longer than expected to initialize.");
        }
      }
    }

    mountPhaser();

    return () => {
      destroyed = true;
      if (gameRef.current) {
        gameRef.current.destroy(true);
        gameRef.current = null;
      }
    };
  }, [gameRef, onGameOver, onHudUpdate, onLoadComplete, onLoadError, onLoadProgress]);

  return (
    <div
      ref={containerRef}
      className="w-full h-full touch-none select-none overflow-hidden flex items-center justify-center bg-[#0e112a]"
    />
  );
}
