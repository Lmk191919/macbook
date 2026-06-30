import { NextRequest, NextResponse } from "next/server";

import { getSessionSecret, SESSION_COOKIE_NAME, verifySessionToken } from "@/server/auth";

const PUBLIC_FILE = /\.[^/]+$/;

function isProtectedPath(pathname: string): boolean {
  return (
    pathname === "/quotes" ||
    pathname.startsWith("/quotes/") ||
    pathname === "/catalog" ||
    pathname.startsWith("/catalog/") ||
    pathname.startsWith("/api/quotes") ||
    pathname.startsWith("/api/catalog")
  );
}

function isPublicPath(pathname: string): boolean {
  return pathname === "/login" || pathname.startsWith("/api/auth");
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (
    pathname.startsWith("/_next") ||
    pathname === "/favicon.ico" ||
    pathname === "/robots.txt" ||
    PUBLIC_FILE.test(pathname) ||
    isPublicPath(pathname) ||
    !isProtectedPath(pathname)
  ) {
    return NextResponse.next();
  }

  const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;

  if (!token) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  const isValid = await verifySessionToken(token, getSessionSecret());

  if (!isValid) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image).*)"],
};
