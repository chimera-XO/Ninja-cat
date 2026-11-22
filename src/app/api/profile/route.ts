import { NextRequest, NextResponse } from "next/server";
import { verifySessionToken } from "@/lib/sessionToken";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization") || "";
  const token = authHeader.replace(/^Bearer\s+/i, "");
  const session = verifySessionToken(token);

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: profile, error } = await supabaseAdmin
    .from("profiles")
    .select("*")
    .eq("id", session.userId)
    .single();

  if (error || !profile) {
    return NextResponse.json({ error: "Profile not found" }, { status: 404 });
  }

  const { data: stats } = await supabaseAdmin
    .from("player_stats")
    .select("games_played, highest_score, total_coins")
    .eq("user_id", session.userId)
    .single();

  return NextResponse.json({
    profile: {
      ...profile,
      games_played: stats?.games_played ?? 0,
      highest_score: stats?.highest_score ?? 0,
      total_coins: stats?.total_coins ?? 0,
    },
  });
}
