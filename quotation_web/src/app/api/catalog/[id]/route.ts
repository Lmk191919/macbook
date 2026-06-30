import { z } from "zod";

import { errorResponse, parseJsonBody, repositoryErrorResponse, resolveParams, successResponse } from "@/app/api/_utils";
import { createQuotationRepository } from "@/server/repositories";

const catalogUpdateSchema = z.object({
  name: z.string().trim().min(1).max(120).optional(),
  spaces: z.array(z.string().trim().min(1)).min(1).optional(),
  unit: z.string().trim().min(1).max(32).optional(),
  pricingMode: z.enum(["combined", "split"]).optional(),
  combinedUnitPrice: z.number().finite().int().nonnegative().optional(),
  laborUnitPrice: z.number().finite().int().nonnegative().optional(),
  materialUnitPrice: z.number().finite().int().nonnegative().optional(),
  description: z.string().trim().max(240).optional(),
  notes: z.string().trim().max(240).optional(),
  active: z.boolean().optional(),
  sortOrder: z.number().int().nonnegative().optional(),
});

export async function GET(
  _request: Request,
  context: { params: { id: string } | Promise<{ id: string }> },
) {
  const { id } = await resolveParams(context.params);
  const repository = await createQuotationRepository();
  const item = await repository.getCatalogItem(id);

  if (!item) {
    return errorResponse("NOT_FOUND", "Catalog item not found", 404);
  }

  return successResponse(item);
}

export async function PATCH(
  request: Request,
  context: { params: { id: string } | Promise<{ id: string }> },
) {
  const parsed = catalogUpdateSchema.safeParse(await parseJsonBody(request));
  if (!parsed.success) {
    return errorResponse("VALIDATION_ERROR", parsed.error.issues[0]?.message ?? "Invalid request");
  }

  try {
    const { id } = await resolveParams(context.params);
    const repository = await createQuotationRepository();
    const item = await repository.updateCatalogItem(id, parsed.data);
    return successResponse(item);
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
    await repository.deleteCatalogItem(id);
    return successResponse(true);
  } catch (error) {
    return repositoryErrorResponse(error) ?? errorResponse("INTERNAL_ERROR", "Unexpected error", 500);
  }
}
