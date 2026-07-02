import { z } from "zod";

import { errorResponse, parseJsonBody, repositoryErrorResponse, resolveParams, successResponse } from "@/app/api/_utils";
import { createQuotationRepository } from "@/server/repositories";
import { quoteUpdateSchema } from "@/app/api/quotes/route";

const quoteDocumentSchema = z.object({
  version: z.number().int().positive(),
  customerName: z.string().trim().min(1).max(120).optional(),
  customerPhone: z.string().trim().max(32).optional(),
  projectName: z.string().trim().min(1).max(120).optional(),
  area: z.number().finite().nonnegative().optional(),
  renovationType: z.string().trim().min(1).max(120).optional(),
  address: z.string().trim().max(240).optional(),
  notes: z.string().trim().max(1000).optional(),
  status: z.enum(["draft", "confirmed"]).optional(),
  spaces: z.array(
    z.object({
      id: z.string().optional(),
      name: z.string().trim().min(1).max(120),
      notes: z.string().trim().max(240).optional(),
      area: z.number().finite().nonnegative().optional(),
      wallArea: z.number().finite().nonnegative().optional(),
      sortOrder: z.number().int().nonnegative(),
      items: z.array(
        z.object({
          id: z.string().optional(),
          sourceCatalogItemId: z.string().optional(),
          name: z.string().trim().min(1).max(120),
          description: z.string().trim().max(240).optional(),
          unit: z.string().trim().min(1).max(32),
          quantity: z.number().finite().nonnegative(),
          pricingMode: z.enum(["combined", "split"]),
          combinedUnitPrice: z.number().finite().int().nonnegative(),
          laborUnitPrice: z.number().finite().int().nonnegative(),
          materialUnitPrice: z.number().finite().int().nonnegative(),
          notes: z.string().trim().max(240).optional(),
          sortOrder: z.number().int().nonnegative(),
        }),
      ),
    }),
  ),
  adjustments: z.array(
    z.object({
      id: z.string().optional(),
      kind: z.enum(["charge", "discount"]),
      name: z.string().trim().min(1).max(120),
      amount: z.number().finite().int().nonnegative(),
      notes: z.string().trim().max(240).optional(),
      sortOrder: z.number().int().nonnegative(),
    }),
  ),
});

export async function GET(
  _request: Request,
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
  request: Request,
  context: { params: { id: string } | Promise<{ id: string }> },
) {
  const body = await parseJsonBody(request);
  const parsed = ("spaces" in (body as Record<string, unknown>) || "adjustments" in (body as Record<string, unknown>))
    ? quoteDocumentSchema.safeParse(body)
    : quoteUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return errorResponse("VALIDATION_ERROR", parsed.error.issues[0]?.message ?? "Invalid request");
  }

  try {
    const { id } = await resolveParams(context.params);
    const repository = await createQuotationRepository();
    const quote = "spaces" in parsed.data && "adjustments" in parsed.data
      ? await repository.saveQuoteDocument(id, parsed.data.version, parsed.data as z.infer<typeof quoteDocumentSchema>)
      : await repository.updateQuote(id, parsed.data.version, parsed.data);
    return successResponse(quote);
  } catch (error) {
    return repositoryErrorResponse(error) ?? errorResponse("INTERNAL_ERROR", "Unexpected error", 500);
  }
}

export async function DELETE(
  _request: Request,
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
