// @vitest-environment node

import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { GET, POST } from "@/app/api/catalog/route";
import { PATCH } from "@/app/api/catalog/[id]/route";

describe("catalog api", () => {
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

  it("searches catalog items by space and keyword", async () => {
    const response = await GET(new Request("http://localhost/api/catalog?space=厨房&query=瓷砖"));
    expect(response.status).toBe(200);

    const payload = (await response.json()) as {
      data: Array<{ name: string; spaces: string[] }>;
    };

    expect(payload.data.length).toBeGreaterThan(0);
    expect(payload.data.some((item) => item.name.includes("瓷砖"))).toBe(true);
    expect(payload.data.every((item) => item.spaces.includes("厨房"))).toBe(true);
  });

  it("creates, updates, and disables catalog items", async () => {
    const createdResponse = await POST(
      new Request("http://localhost/api/catalog", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          name: "定制柜安装",
          spaces: ["主卧"],
          unit: "m",
          pricingMode: "combined",
          combinedUnitPrice: 9800,
          laborUnitPrice: 0,
          materialUnitPrice: 0,
        }),
      }),
    );

    expect(createdResponse.status).toBe(201);
    const createdPayload = (await createdResponse.json()) as { data: { id: string } };

    const updatedResponse = await PATCH(
      new Request(`http://localhost/api/catalog/${createdPayload.data.id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ active: false }),
      }),
      { params: Promise.resolve({ id: createdPayload.data.id }) },
    );

    expect(updatedResponse.status).toBe(200);
    const updatedPayload = (await updatedResponse.json()) as {
      data: { active: boolean };
    };

    expect(updatedPayload.data.active).toBe(false);
  });
});
