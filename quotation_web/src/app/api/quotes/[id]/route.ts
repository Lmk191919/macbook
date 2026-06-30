import { type NextRequest } from "next/server";

import { errorResponse, parseJsonBody, repositoryErrorResponse, resolveParams, successResponse } from "@/app/api/_utils";
import { createQuotationRepository } from "@/server/repositories";
import { quoteUpdateSchema } from "@/app/api/quotes/route";

export async function GET(
  _request: NextRequest,
  context: { params: { id: string } | Promise<{ id: string }> },
) {
  const { id } = await resolveParams(context.params);
  const repository = await createQuotationRepository();
  const quote = await repository.getQuote(id);

  if (!quote) {
    return errorResponse("NOT_FOUND", "Quote not found", 404);
  }

  return successResponse(quote);
}

export async function PATCH(
  request: NextRequest,
  context: { params: { id: string } | Promise<{ id: string }> },
) {
  const parsed = quoteUpdateSchema.safeParse(await parseJsonBody(request));
  if (!parsed.success) {
    return errorResponse("VALIDATION_ERROR", parsed.error.issues[0]?.message ?? "Invalid request");
  }

  try {
    const { id } = await resolveParams(context.params);
    const repository = await createQuotationRepository();
    const quote = await repository.updateQuote(id, parsed.data.version, parsed.data);
    return successResponse(quote);
  } catch (error) {
    return repositoryErrorResponse(error) ?? errorResponse("INTERNAL_ERROR", "Unexpected error", 500);
  }
}

export async function DELETE(
  _request: NextRequest,
  context: { params: { id: string } | Promise<{ id: string }> },
) {
  try {
    const { id } = await resolveParams(context.params);
    const repository = await createQuotationRepository();
    await repository.deleteQuote(id);
    return successResponse(true);
  } catch (error) {
    return repositoryErrorResponse(error) ?? errorResponse("INTERNAL_ERROR", "Unexpected error", 500);
  }
}
