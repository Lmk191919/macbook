import { join } from "node:path";

import { FileQuotationRepository } from "@/server/repositories/file-quotation-repository";
import type { QuotationRepository } from "@/server/repositories/quotation-repository";

type RepositoryOptions = Readonly<{
  filePath?: string;
}>;

function getDefaultFilePath(): string {
  return process.env.QUOTATION_DATA_FILE ?? join(process.cwd(), "data", "dev-db.json");
}

export async function createQuotationRepository(
  options: RepositoryOptions = {},
): Promise<QuotationRepository> {
  if (process.env.QUOTATION_STORAGE === "supabase") {
    const supabaseModule = await import("./supabase-quotation-repository");
    return new supabaseModule.SupabaseQuotationRepository();
  }

  return new FileQuotationRepository(options.filePath ?? getDefaultFilePath());
}

export function getFileQuotationRepository(options: RepositoryOptions = {}): QuotationRepository {
  return new FileQuotationRepository(options.filePath ?? getDefaultFilePath());
}
