import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { AppShell } from "@/app/layout";

describe("AppShell", () => {
  it("shows the product branding", () => {
    render(<AppShell>报价内容</AppShell>);

    expect(screen.getByRole("link", { name: "知底装修报价" })).toBeVisible();
  });
});
