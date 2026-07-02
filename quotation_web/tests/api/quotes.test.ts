// @vitest-environment node

import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { POST } from "@/app/api/quotes/route";
import { PATCH as UPDATE_QUOTE } from "@/app/api/quotes/[id]/route";

describe("quotes api", () => {
  let tempDir: string;
  let repoFile: string;
  const previousFilePath = process.env.QUOTATION_DATA_FILE;

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), "quotation-api-"));
    repoFile = join(tempDir, "dev-db.json");
    process.env.QUOTATION_DATA_FILE = repoFile;
  });

  afterEach(async () => {
    process.env.QUOTATION_DATA_FILE = previousFilePath;
    await rm(tempDir, { recursive: true, force: true });
  });

  it("creates a quote with default spaces and generated number", async () => {
    const response = await POST(
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

    expect(response.status).toBe(201);

    const payload = (await response.json()) as {
      data: { quoteNo: string; spaces: Array<{ id: string }> };
    };

    expect(payload.data.quoteNo).toMatch(/^ZD-\d{8}-\d{3}$/);
    expect(payload.data.spaces.length).toBeGreaterThan(0);
  });

  it("rejects negative area values", async () => {
    const response = await POST(
      new Request("http://localhost/api/quotes", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          customerName: "王先生",
          projectName: "城南花园",
          area: -1,
          renovationType: "全屋装修",
        }),
      }),
    );

    expect(response.status).toBe(400);
    const payload = (await response.json()) as {
      error: { code: string; message: string };
    };
    expect(payload.error.code).toBe("VALIDATION_ERROR");
  });

  it("rejects stale quote versions", async () => {
    const createdResponse = await POST(
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
      data: { id: string; version: number };
    };

    const firstUpdate = await UPDATE_QUOTE(
      new Request(`http://localhost/api/quotes/${createdPayload.data.id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          version: createdPayload.data.version,
          notes: "第一次更新",
        }),
      }),
      { params: Promise.resolve({ id: createdPayload.data.id }) },
    );

    expect(firstUpdate.status).toBe(200);

    const conflictResponse = await UPDATE_QUOTE(
      new Request(`http://localhost/api/quotes/${createdPayload.data.id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          version: createdPayload.data.version,
          notes: "旧版本更新",
        }),
      }),
      { params: Promise.resolve({ id: createdPayload.data.id }) },
    );

    expect(conflictResponse.status).toBe(409);
    const payload = (await conflictResponse.json()) as {
      error: { code: string; message: string };
    };
    expect(payload.error.code).toBe("VERSION_CONFLICT");
  });
});
