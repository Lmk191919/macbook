import { type NextRequest } from "next/server";
import { z } from "zod";

import { DEFAULT_SPACE_NAMES } from "@/domain/catalog";
import { errorResponse, parseJsonBody, repositoryErrorResponse, successResponse } from "@/app/api/_utils";
import { createQuotationRepository } from "@/server/repositories";

const quoteCreateSchema = z.object({
  customerName: z.string().trim().min(1).max(120),
  projectName: z.string().trim().min(1).max(120),
  area: z.number().finite().nonnegative(),
  renovationType: z.string().trim().min(1).max(120),
  customerPhone: z.string().trim().max(32).optional(),
  address: z.string().trim().max(240).optional(),
  notes: z.string().trim().max(1000).optional(),
  status: z.enum(["draft", "confirmed"]).optional(),
});

const quoteUpdateSchema = z.object({
  version: z.number().int().positive(),
  customerName: z.string().trim().min(1).max(120).optional(),
  projectName: z.string().trim().min(1).max(120).optional(),
  area: z.number().finite().nonnegative().optional(),
  renovationType: z.string().trim().min(1).max(120).optional(),
  customerPhone: z.string().trim().max(32).optional(),
  address: z.string().trim().max(240).optional(),
  notes: z.string().trim().max(1000).optional(),
  status: z.enum(["draft", "confirmed"]).optional(),
});

async function addDefaultSpaces(repository: Awaited<ReturnType<typeof createQuotationRepository>>, quoteId: string): Promise<void> {
  for (const [index, name] of DEFAULT_SPACE_NAMES.entries()) {
    await repository.createSpace(quoteId, {
      name,
      sortOrder: index,
    });
  }
}

export async function GET(request: NextRequest) {
  try {
    const repository = await createQuotationRepository();
    const quotes = await repository.listQuotes(new URL(request.url).searchParams.get("query") ?? "");
    return successResponse(quotes);
  } catch (error) {
    return repositoryErrorResponse(error) ?? errorResponse("INTERNAL_ERROR", "Unexpected error", 500);
  }
}

export async function POST(request: NextRequest) {
  const parsed = quoteCreateSchema.safeParse(await parseJsonBody(request));
  if (!parsed.success) {
    return errorResponse("VALIDATION_ERROR", parsed.error.issues[0]?.message ?? "Invalid request");
  }

  try {
    const repository = await createQuotationRepository();
    const quote = await repository.createQuote(parsed.data);
    await addDefaultSpaces(repository, quote.id);
    const created = await repository.getQuote(quote.id);
    return successResponse(created ?? quote, 201);
  } catch (error) {
    return repositoryErrorResponse(error) ?? errorResponse("INTERNAL_ERROR", "Unexpected error", 500);
  }
}

export { quoteUpdateSchema };
