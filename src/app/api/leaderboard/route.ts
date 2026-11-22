import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { verifySessionToken } from "@/lib/sessionToken";

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization") || "";
  const token = authHeader.replace(/^Bearer\s+/i, "");
  const session = token ? verifySessionToken(token) : null;

  const { data: rows, error } = await supabaseAdmin
    .from("player_stats")
    .select(
      `
      user_id,
      highest_score,
      games_played,
      profiles!inner (
        display_name,
        username,
        avatar_url
      )
    `
    )
    .gt("highest_score", 0)
    .order("highest_score", { ascending: false })
    .limit(50);

  if (error) {
    return NextResponse.json({ error: "Failed to query leaderboard" }, { status: 500 });
  }

  const leaderboard = (rows || []).map((row: Record<string, unknown>, idx: number) => {
    const p = row.profiles as Record<string, unknown>;
    return {
      rank: idx + 1,
      user_id: row.user_id,
      display_name: p?.display_name || "Shinobi Cat",
      username: p?.username || null,
      avatar_url: p?.avatar_url || null,
      highest_score: row.highest_score,
      games_played: row.games_played,
    };
  });

  let currentPlayerRank: number | null = null;
  if (session) {
    const found = leaderboard.find((item) => item.user_id === session.userId);
    if (found) {
      currentPlayerRank = found.rank;
    } else {
      const { data: myStat } = await supabaseAdmin
        .from("player_stats")
        .select("highest_score")
        .eq("user_id", session.userId)
        .single();

      if (myStat && myStat.highest_score > 0) {
        const { count } = await supabaseAdmin
          .from("player_stats")
          .select("user_id", { count: "exact", head: true })
          .gt("highest_score", myStat.highest_score);
        currentPlayerRank = (count ?? 0) + 1;
      }
    }
  }

  return NextResponse.json({ leaderboard, currentPlayerRank });
}
