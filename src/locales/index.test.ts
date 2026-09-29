import { describe, expect, it } from "vitest";
import { t } from "./index";

describe("typed English copy", () => {
  it("interpolates values and supports singular and plural forms", () => {
    expect(t("dashboard.greeting", { role: "Researcher" })).toBe(
      "Good to see you, Researcher.",
    );
    expect(t("dashboard.researchAreaCount", { count: 1 })).toBe(
      "Across 1 research area",
    );
    expect(t("dashboard.researchAreaCount", { count: 4 })).toBe(
      "Across 4 research areas",
    );
    expect(t("catalog.resultCount", { shown: 0, total: 0 })).toBe(
      "Showing 0 of 0 datasets",
    );
  });
});
