// @vitest-environment node

import { it, expect } from "vitest";
import {
  createSessionToken,
  verifySessionToken,
  verifyTeamPassword,
} from "@/server/auth";

it("rejects the wrong team password", async () => {
  expect(await verifyTeamPassword("wrong", "correct")).toBe(false);
});

it("round-trips a signed session", async () => {
  const token = await createSessionToken("secret", 60);
  expect(await verifySessionToken(token, "secret")).toBe(true);
  expect(await verifySessionToken(token, "different")).toBe(false);
});
