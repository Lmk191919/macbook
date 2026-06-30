// @vitest-environment node

import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { POST as CREATE_QUOTE } from "@/app/api/quotes/route";
import { POST as COPY_QUOTE } from "@/app/api/quotes/[id]/copy/route";

describe("quote copy api", () => {
  let tempDir: string;
  let repoFile: string;
  const previousFilePath = process.env.QUOTATION_DATA_FILE;

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), "quotation-copy-api-"));
    repoFile = join(tempDir, "dev-db.json");
    process.env.QUOTATION_DATA_FILE = repoFile;
  });

  afterEach(async () => {
    process.env.QUOTATION_DATA_FILE = previousFilePath;
    await rm(tempDir, { recursive: true, force: true });
  });

  it("copies an existing quote with spaces", async () => {
    const createdResponse = await CREATE_QUOTE(
      new Request("http://localhost/api/quotes", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          customerName: "王先生",
          projectName: "城南花园",
          area: 108,
          renovationType: "全屋装修",
        }),
      }),
    );

    const createdPayload = (await createdResponse.json()) as {
      data: { id: string; customerName: string; spaces: Array<{ id: string }> };
    };

    const copyResponse = await COPY_QUOTE(
      new Request(`http://localhost/api/quotes/${createdPayload.data.id}/copy`, {
        method: "POST",
      }),
      { params: Promise.resolve({ id: createdPayload.data.id }) },
    );

    expect(copyResponse.status).toBe(201);

    const copiedPayload = (await copyResponse.json()) as {
      data: { customerName: string; spaces: Array<{ id: string }> };
    };

    expect(copiedPayload.data.customerName).toContain("副本");
    expect(copiedPayload.data.spaces.length).toBe(createdPayload.data.spaces.length);
  });
});
