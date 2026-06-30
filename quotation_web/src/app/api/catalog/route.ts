import { type NextRequest } from "next/server";
import { z } from "zod";

import { errorResponse, parseJsonBody, repositoryErrorResponse, successResponse } from "@/app/api/_utils";
import { ensureCatalogSeeded } from "@/server/catalog-seed";
import { createQuotationRepository } from "@/server/repositories";

const catalogCreateSchema = z.object({
  name: z.string().trim().min(1).max(120),
  spaces: z.array(z.string().trim().min(1)).min(1),
  unit: z.string().trim().min(1).max(32),
  pricingMode: z.enum(["combined", "split"]),
  combinedUnitPrice: z.number().finite().int().nonnegative(),
  laborUnitPrice: z.number().finite().int().nonnegative(),
  materialUnitPrice: z.number().finite().int().nonnegative(),
  description: z.string().trim().max(240).optional(),
  notes: z.string().trim().max(240).optional(),
  active: z.boolean().optional(),
  sortOrder: z.number().int().nonnegative().optional(),
});

export async function GET(request: NextRequest) {
  const repository = await createQuotationRepository();
  await ensureCatalogSeeded(repository);

  const searchParams = new URL(request.url).searchParams;
  const items = await repository.listCatalogItems({
    query: searchParams.get("query") ?? undefined,
    space: searchParams.get("space") ?? undefined,
    activeOnly: searchParams.get("activeOnly") === "true" || searchParams.get("activeOnly") === "1",
  });

  return successResponse(items);
}

export async function POST(request: NextRequest) {
  const parsed = catalogCreateSchema.safeParse(await parseJsonBody(request));
  if (!parsed.success) {
    return errorResponse("VALIDATION_ERROR", parsed.error.issues[0]?.message ?? "Invalid request");
  }

  try {
    const repository = await createQuotationRepository();
    const item = await repository.createCatalogItem(parsed.data);
    return successResponse(item, 201);
  } catch (error) {
    return repositoryErrorResponse(error) ?? errorResponse("INTERNAL_ERROR", "Unexpected error", 500);
  }
}
