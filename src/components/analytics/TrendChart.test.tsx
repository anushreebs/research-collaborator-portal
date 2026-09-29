import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { TrendChart } from "./TrendChart";
import type { Study } from "../../types/research";

const study: Study = {
  id: "BHP-009",
  title: "Synthetic sample study",
  description: "Synthetic only",
  domain: "Cognition",
  records: 2,
  updated: "Sep 28, 2026",
  fields: ["measure"],
  color: "violet",
  trend: [11, 22, 33],
};

describe("synthetic trend chart", () => {
  it("exposes a text equivalent whose latest value matches the plotted series", () => {
    render(<TrendChart studies={[study]} />);
    expect(screen.getByRole("img", { name: /Synthetic measure trends by study/ })).toBeInTheDocument();
    expect(screen.getByText(/synthetic and are not research findings/i)).toBeInTheDocument();
    const table = screen.getByRole("table", { name: "Latest synthetic measure by study" });
    const row = within(table).getByRole("row", { name: /Synthetic sample study/ });
    expect(within(row).getByRole("cell")).toHaveTextContent("33");
    expect(document.querySelector("polyline")?.getAttribute("points")).toBe("0,79 42,68 84,57");
  });
});
