import { errorResponse, repositoryErrorResponse, resolveParams, successResponse } from "@/app/api/_utils";
import { createQuotationRepository } from "@/server/repositories";

export async function POST(
  _request: Request,
  context: { params: { id: string } | Promise<{ id: string }> },
) {
  try {
    const { id } = await resolveParams(context.params);
    const repository = await createQuotationRepository();
    const quote = await repository.copyQuote(id);
    return successResponse(quote, 201);
  } catch (error) {
    return repositoryErrorResponse(error) ?? errorResponse("INTERNAL_ERROR", "Unexpected error", 500);
  }
}
