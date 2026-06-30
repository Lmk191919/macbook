import { type NextResponse, NextResponse } from "next/server";
import { ZodError } from "zod";

import {
  type RepositoryErrorCode,
  QuotationRepositoryError,
} from "@/server/repositories/quotation-repository";

type ErrorPayload = Readonly<{
  code: string;
  message: string;
}>;

export function successResponse<T>(data: T, status = 200): NextResponse {
  return NextResponse.json({ data }, { status });
}

export function errorResponse(code: string, message: string, status = 400): NextResponse {
  return NextResponse.json({ error: { code, message } satisfies ErrorPayload }, { status });
}

export function repositoryErrorResponse(error: unknown): NextResponse | null {
  if (error instanceof QuotationRepositoryError) {
    const status = errorStatusForCode(error.code);
    return errorResponse(error.code, error.message, status);
  }

  if (error instanceof ZodError) {
    return errorResponse("VALIDATION_ERROR", error.issues[0]?.message ?? "Invalid request", 400);
  }

  return null;
}

export function errorStatusForCode(code: RepositoryErrorCode): number {
  switch (code) {
    case "VERSION_CONFLICT":
      return 409;
    case "NOT_FOUND":
      return 404;
  }
}

export function parseJsonBody<T>(request: Request): Promise<T> {
  return request.json() as Promise<T>;
}

export async function resolveParams<T extends Record<string, string>>(
  params: T | Promise<T>,
): Promise<T> {
  return await params;
}
