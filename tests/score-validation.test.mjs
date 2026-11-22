import test from "node:test";
import assert from "node:assert/strict";

// Mirror validation logic check
function validate(t) {
  const expected = t.distance * 10 + t.coinsCollected * 25;
  if (Math.abs(t.score - expected) > 5) return false;
  if (t.distance > Math.ceil((t.durationMs / 1000) * 24 + 15)) return false;
  return true;
}

test("accepts legitimate run telemetry", () => {
  assert.equal(validate({ score: 1250, distance: 100, coinsCollected: 10, durationMs: 12000 }), true);
});

test("rejects tampered score", () => {
  assert.equal(validate({ score: 99999, distance: 100, coinsCollected: 10, durationMs: 12000 }), false);
});
