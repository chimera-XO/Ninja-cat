import { NextRequest, NextResponse } from "next/server";
import { verifyTelegramInitData } from "@/lib/telegramAuth";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { signSessionToken } from "@/lib/sessionToken";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const initData: string = body?.initData || "";
    const isDevMode =
      process.env.NODE_ENV !== "production" &&
      process.env.NEXT_PUBLIC_ENABLE_DEV_AUTH === "true";

    let tgUser = verifyTelegramInitData(
      initData,
      process.env.TELEGRAM_BOT_TOKEN || ""
    );

    if (!tgUser && isDevMode && body?.devUser) {
      tgUser = {
        id: 999000111,
        first_name: "Shadow",
        last_name: "Cat",
        username: "ninjacat_dev",
      };
    }

    if (!tgUser) {
      return NextResponse.json(
        { error: "Unauthorized Telegram session" },
        { status: 401 }
      );
    }

    const displayName = [tgUser.first_name, tgUser.last_name]
      .filter(Boolean)
      .join(" ")
      .slice(0, 48);

    const { data: profile, error: upsertErr } = await supabaseAdmin
      .from("profiles")
      .upsert(
        {
          telegram_id: tgUser.id,
          username: tgUser.username || null,
          display_name: displayName,
          avatar_url: tgUser.photo_url || null,
        },
        { onConflict: "telegram_id" }
      )
      .select("*")
      .single();

    if (upsertErr) {
      console.error("[AUTH] Supabase profile upsert failed:", upsertErr);
    }

    if (upsertErr || !profile) {
      return NextResponse.json(
        { error: "Failed to register player profile" },
        { status: 500 }
      );
    }

    await supabaseAdmin
      .from("player_stats")
      .upsert({ user_id: profile.id }, { onConflict: "user_id", ignoreDuplicates: true });

    const { data: stats } = await supabaseAdmin
      .from("player_stats")
      .select("games_played, highest_score, total_coins")
      .eq("user_id", profile.id)
      .single();

    const token = signSessionToken(profile.id, tgUser.id);

    return NextResponse.json({
      token,
      profile: {
        ...profile,
        games_played: stats?.games_played ?? 0,
        highest_score: stats?.highest_score ?? 0,
        total_coins: stats?.total_coins ?? 0,
      },
    });
  } catch (error) {
    console.error("[AUTH] Unexpected authentication error:", error);
    return NextResponse.json(
      { error: "Authentication failed" },
      { status: 500 }
    );
  }
}
