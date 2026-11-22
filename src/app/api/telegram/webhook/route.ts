import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const secret = process.env.TELEGRAM_WEBHOOK_SECRET;

  if (!token || !secret) {
    return NextResponse.json(
      { error: "Telegram configuration missing" },
      { status: 500 }
    );
  }

  const suppliedSecret = req.headers.get(
    "x-telegram-bot-api-secret-token"
  );

  if (suppliedSecret !== secret) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 }
    );
  }

  try {
    const update = await req.json();
    const message = update.message;

    if (!message?.text || !message?.chat?.id) {
      return NextResponse.json({ ok: true });
    }

    if (!message.text.startsWith("/start")) {
      return NextResponse.json({ ok: true });
    }

    const chatId = message.chat.id;

    const welcomeMessage =
      "🥷 Welcome to Ninja Cat!\n\n" +
      "Ready to test your skills?\n\n" +
      "🐱 Jump across platforms.\n" +
      "⚔️ Dodge obstacles.\n" +
      "🪙 Collect coins.\n" +
      "🏆 Climb the leaderboard.\n\n" +
      "Think you have what it takes to become the ultimate Ninja Cat?\n\n" +
      "Let's find out! 💜";

    const response = await fetch(
      `https://api.telegram.org/bot${token}/sendMessage`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          chat_id: chatId,
          text: welcomeMessage,
          reply_markup: {
            inline_keyboard: [
              [
                {
                  text: "🥷 PLAY NINJA CAT",
                  web_app: {
                    url: "https://ninja-cat-beta.vercel.app/",
                  },
                },
              ],
            ],
          },
        }),
      }
    );

    if (!response.ok) {
      console.error("Telegram message delivery failed");
    }

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json(
      { error: "Webhook processing failed" },
      { status: 500 }
    );
  }
}
