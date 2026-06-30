import { render, screen } from "@testing-library/react";
import type { ReactElement, ReactNode } from "react";
import { describe, expect, it } from "vitest";

import RootLayout from "@/app/layout";

describe("RootLayout", () => {
  it("shows the product branding", () => {
    const layout = RootLayout({ children: "报价内容" });
    const body = layout.props.children as ReactElement<{ children: ReactNode }>;

    render(body.props.children);

    expect(screen.getByText("知底装修报价")).toBeVisible();
  });
});
