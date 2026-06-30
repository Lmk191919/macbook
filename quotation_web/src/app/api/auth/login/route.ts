import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import {
  createSessionToken,
  getSessionSecret,
  getTeamPassword,
  SESSION_COOKIE_NAME,
  SESSION_TTL_SECONDS,
  verifyTeamPassword,
} from "@/server/auth";

const loginSchema = z.object({
  password: z.string().trim().min(1).max(128),
});

async function parseLoginPayload(request: NextRequest): Promise<unknown> {
  const contentType = request.headers.get("content-type") ?? "";

  if (contentType.includes("application/json")) {
    return request.json();
  }

  const formData = await request.formData();
  return Object.fromEntries(formData.entries());
}

export async function POST(request: NextRequest) {
  const payload = await parseLoginPayload(request);
  const parsed = loginSchema.safeParse(payload);

  if (!parsed.success) {
    return NextResponse.redirect(new URL("/login?error=1", request.url));
  }

  const teamPassword = getTeamPassword();
  const sessionSecret = getSessionSecret();

  if (!verifyTeamPassword(parsed.data.password, teamPassword)) {
    return NextResponse.redirect(new URL("/login?error=1", request.url));
  }

  const response = NextResponse.redirect(new URL("/quotes", request.url));
  response.cookies.set({
    name: SESSION_COOKIE_NAME,
    value: await createSessionToken(sessionSecret, SESSION_TTL_SECONDS),
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_TTL_SECONDS,
  });

  return response;
}
