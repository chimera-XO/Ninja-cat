"use client";

import { useEffect, useState } from "react";
import { PlayerProfile } from "@/types/game";

export function useTelegramWebApp() {
  const [token, setToken] = useState<string | null>(null);
  const [profile, setProfile] = useState<PlayerProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    async function initTelegram() {
      try {
        const WebApp = (await import("@twa-dev/sdk")).default;
        WebApp.ready();
        WebApp.expand();
        if (typeof WebApp.disableVerticalSwipes === "function") {
          WebApp.disableVerticalSwipes();
        }

        const initData = WebApp.initData || "";
        const res = await fetch("/api/auth/telegram", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            initData,
            devUser: !initData,
          }),
        });

        if (res.ok && mounted) {
          const data = await res.json();
          setToken(data.token);
          setProfile(data.profile);
        }
      } catch (err) {
        console.error("Telegram init error:", err);
      } finally {
        if (mounted) setLoading(false);
      }
    }

    initTelegram();
    return () => {
      mounted = false;
    };
  }, []);

  return { token, profile, setProfile, loading };
}
