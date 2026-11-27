import { describe, it, expect } from "vitest";
import { heroActions } from "../index";

describe("heroActions", () => {
  it("offers a visitor the catalogue and a free account", () => {
    expect(heroActions(null)).toEqual([
      { label: "Browse Courses", to: "/courses", emphasis: "primary" },
      {
        label: "Create a free account",
        to: "/signup",
        emphasis: "secondary",
      },
    ]);
  });

  it("sends a signed-in person back to their dashboard instead of sign-up", () => {
    expect(heroActions({ id: 5 })).toEqual([
      { label: "Browse Courses", to: "/courses", emphasis: "primary" },
      {
        label: "Go to your dashboard",
        to: "/dashboard",
        emphasis: "secondary",
      },
    ]);
  });
});
