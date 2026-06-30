import { CompactSign, compactVerify } from "jose";

export const SESSION_COOKIE_NAME = "quote_session";
export const SESSION_TTL_SECONDS = 7 * 24 * 60 * 60;

function getKey(secret: string): Uint8Array {
  return new TextEncoder().encode(secret);
}

export function verifyTeamPassword(submittedPassword: string, expectedPassword: string): boolean {
  const submitted = new TextEncoder().encode(submittedPassword);
  const expected = new TextEncoder().encode(expectedPassword);

  if (submitted.length !== expected.length) {
    return false;
  }

  let difference = 0;
  for (let index = 0; index < submitted.length; index += 1) {
    difference |= submitted[index] ^ expected[index];
  }

  return difference === 0;
}

export async function createSessionToken(secret: string, ttlSeconds: number): Promise<string> {
  const issuedAt = Math.floor(Date.now() / 1000);
  const payload = {
    kind: "quote-session" as const,
    iat: issuedAt,
    exp: issuedAt + ttlSeconds,
  };

  return new CompactSign(new TextEncoder().encode(JSON.stringify(payload)))
    .setProtectedHeader({ alg: "HS256", typ: "JWT" })
    .sign(getKey(secret));
}

export async function verifySessionToken(token: string, secret: string): Promise<boolean> {
  try {
    const { payload } = await compactVerify(token, getKey(secret), {
      algorithms: ["HS256"],
    });

    const parsed = JSON.parse(new TextDecoder().decode(payload)) as {
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
