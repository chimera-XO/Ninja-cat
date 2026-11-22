export interface PlayerProfile {
  id: string;
  telegram_id: number;
  username: string | null;
  display_name: string;
  avatar_url: string | null;
  games_played: number;
  highest_score: number;
  total_coins: number;
}

export interface LeaderboardEntry {
  rank: number;
  user_id: string;
  display_name: string;
  username: string | null;
  avatar_url: string | null;
  highest_score: number;
  games_played: number;
}

export interface RunTelemetry {
  score: number;
  distance: number;
  coinsCollected: number;
  durationMs: number;
  runNonce: string;
}

export type GameScreenStatus = "loading" | "menu" | "playing" | "paused" | "gameover";

export interface GameHudState {
  status: GameScreenStatus;
  score: number;
  distance: number;
  coins: number;
  biome: "moonlit_temple" | "sakura_dawn" | "emerald_bamboo";
  isNewRecord: boolean;
  loadProgress?: number;
  loadError?: string | null;
}
