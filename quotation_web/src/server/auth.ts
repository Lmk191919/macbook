import crypto from "node:crypto";

import { CompactSign, compactVerify } from "jose";

export const SESSION_COOKIE_NAME = "quote_session";
export const SESSION_TTL_SECONDS = 7 * 24 * 60 * 60;

function getKey(secret: string): Uint8Array {
  return Buffer.from(secret, "utf8");
}

export function verifyTeamPassword(submittedPassword: string, expectedPassword: string): boolean {
  const submitted = Buffer.from(submittedPassword);
  const expected = Buffer.from(expectedPassword);

  if (submitted.length !== expected.length) {
    return false;
  }

  return crypto.timingSafeEqual(submitted, expected);
}

export async function createSessionToken(secret: string, ttlSeconds: number): Promise<string> {
  const issuedAt = Math.floor(Date.now() / 1000);
  const payload = {
    kind: "quote-session" as const,
    iat: issuedAt,
    exp: issuedAt + ttlSeconds,
  };

  return new CompactSign(Buffer.from(JSON.stringify(payload), "utf8"))
    .setProtectedHeader({ alg: "HS256", typ: "JWT" })
    .sign(getKey(secret));
}

export async function verifySessionToken(token: string, secret: string): Promise<boolean> {
  try {
    const { payload } = await compactVerify(token, getKey(secret), {
      algorithms: ["HS256"],
    });

    const parsed = JSON.parse(Buffer.from(payload).toString("utf8")) as {
      kind?: string;
      exp?: number;
    };

    return parsed.kind === "quote-session" && typeof parsed.exp === "number" && parsed.exp > Math.floor(Date.now() / 1000);
  } catch {
    return false;
  }
}

export function getTeamPassword(): string {
  return process.env.TEAM_PASSWORD ?? "dev-team-password";
}

export function getSessionSecret(): string {
  return process.env.SESSION_SECRET ?? "dev-session-secret";
}
