import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ResearchSearch } from "./ResearchSearch";

describe("metadata-only dataset discovery", () => {
  it("labels deterministic suggestions and applies a selected dataset only on user action", async () => {
    const query = vi.fn().mockResolvedValue({
      mode: "Deterministic metadata search",
      recommendations: [{ id: "BHP-001", fields: ["Sleep duration"] }],
    });
    const inspect = vi.fn();
    render(<ResearchSearch query={query} inspect={inspect} />);
    fireEvent.change(screen.getByLabelText("Research question"), {
      target: { value: "Synthetic sleep measures for the demo" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Find datasets" }));
    expect(
      await screen.findByText(/Keyword matches in existing catalog fields/),
    ).toBeInTheDocument();
    expect(query).toHaveBeenCalledWith("Synthetic sleep measures for the demo");
    expect(inspect).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Inspect dataset" }));
    await waitFor(() => expect(inspect).toHaveBeenCalledWith("BHP-001"));
  });

  it("shows safe retry copy instead of provider or network diagnostics", async () => {
    const query = vi
      .fn()
      .mockRejectedValue(new Error("provider secret/internal detail"));
    render(<ResearchSearch query={query} inspect={vi.fn()} />);
    fireEvent.change(screen.getByLabelText("Research question"), {
      target: { value: "Synthetic question for the demo" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Find datasets" }));
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "We couldn't search the study metadata. Please try again.",
    );
    expect(screen.queryByText(/provider secret/)).not.toBeInTheDocument();
  });
});
