import { RunTelemetry } from "@/types/game";

export function validateScoreSubmission(telemetry: RunTelemetry): {
  valid: boolean;
  reason?: string;
} {
  const { score, distance, coinsCollected, durationMs } = telemetry;

  if (
    !Number.isInteger(score) ||
    !Number.isInteger(distance) ||
    !Number.isInteger(coinsCollected) ||
    !Number.isFinite(durationMs)
  ) {
    return { valid: false, reason: "Invalid numeric types" };
  }

  if (score < 0 || distance < 0 || coinsCollected < 0 || durationMs < 500) {
    return { valid: false, reason: "Out-of-bounds run values" };
  }

  const expectedScore = distance * 10 + coinsCollected * 25;
  if (Math.abs(score - expectedScore) > 5) {
    return { valid: false, reason: "Score formula mismatch" };
  }

  const durationSec = durationMs / 1000;
  const maxPossibleDistance = Math.ceil(durationSec * 24 + 15);
  if (distance > maxPossibleDistance) {
    return { valid: false, reason: "Impossible travel speed" };
  }

  const maxPossibleCoins = Math.ceil(durationSec * 6 + 10);
  if (coinsCollected > maxPossibleCoins) {
    return { valid: false, reason: "Impossible coin collection rate" };
  }

  return { valid: true };
}
