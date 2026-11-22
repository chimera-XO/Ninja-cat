import crypto from "crypto";

interface SessionPayload {
  userId: string;
  telegramId: number;
  exp: number;
}

function getSecret(): string {
  return process.env.SESSION_SECRET || process.env.TELEGRAM_BOT_TOKEN || "dev-only-secret";
}

export function signSessionToken(userId: string, telegramId: number): string {
  const payload: SessionPayload = {
    userId,
    telegramId,
    exp: Math.floor(Date.now() / 1000) + 60 * 60 * 12,
  };
  const encoded = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const sig = crypto.createHmac("sha256", getSecret()).update(encoded).digest("base64url");
  return `${encoded}.${sig}`;
}

export function verifySessionToken(token: string): SessionPayload | null {
  const parts = token.split(".");
  if (parts.length !== 2) return null;
  const [encoded, sig] = parts;
  const expectedSig = crypto.createHmac("sha256", getSecret()).update(encoded).digest("base64url");
  if (sig !== expectedSig) return null;

  try {
    const payload = JSON.parse(Buffer.from(encoded, "base64url").toString("utf8")) as SessionPayload;
    if (payload.exp < Math.floor(Date.now() / 1000)) return null;
    return payload;
  } catch {
    return null;
  }
}
