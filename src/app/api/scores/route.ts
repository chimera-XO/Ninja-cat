import { NextRequest, NextResponse } from "next/server";
import { verifySessionToken } from "@/lib/sessionToken";
import { validateScoreSubmission } from "@/lib/scoreValidation";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { RunTelemetry } from "@/types/game";

export async function POST(req: NextRequest) {
  const authHeader = req.headers.get("authorization") || "";
  const token = authHeader.replace(/^Bearer\s+/i, "");
  const session = verifySessionToken(token);

  if (!session) {
    return NextResponse.json({ error: "Invalid or expired session token" }, { status: 401 });
  }

  const telemetry = (await req.json()) as RunTelemetry;
  const check = validateScoreSubmission(telemetry);
  if (!check.valid) {
    return NextResponse.json({ error: check.reason || "Score rejected" }, { status: 422 });
  }

  const { data, error } = await supabaseAdmin.rpc("record_game_run", {
    p_user_id: session.userId,
    p_score: telemetry.score,
    p_distance: telemetry.distance,
    p_coins: telemetry.coinsCollected,
  });

  if (error) {
    return NextResponse.json({ error: "Database write failed" }, { status: 500 });
  }

  const row = Array.isArray(data) ? data[0] : data;
  return NextResponse.json({
    stats: {
      games_played: row?.games_played ?? 1,
      highest_score: row?.highest_score ?? telemetry.score,
      total_coins: row?.total_coins ?? telemetry.coinsCollected,
      is_new_record: Boolean(row?.is_new_record),
    },
  });
}
