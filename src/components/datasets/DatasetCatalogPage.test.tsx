import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { DatasetCatalogPage, filterStudies } from "./DatasetCatalogPage";
import type { Study } from "../../types/research";

const studies: Study[] = [
  { id: "BHP-001", title: "Reasoning study", description: "Cognitive scores", domain: "Cognition", records: 90, updated: "Sep 12, 2026", fields: [], color: "violet", trend: [] },
  { id: "BHP-002", title: "Sleep study", description: "Wellbeing trends", domain: "Wellbeing", records: 150, updated: "Aug 28, 2026", fields: [], color: "blue", trend: [] },
];

describe("dataset catalog", () => {
  it("filters by search and area, then sorts by record count", () => {
    expect(filterStudies(studies, { search: "study", domain: "All areas", sort: "records" }).map((study) => study.id)).toEqual(["BHP-002", "BHP-001"]);
    expect(filterStudies(studies, { search: "", domain: "Cognition", sort: "title" }).map((study) => study.id)).toEqual(["BHP-001"]);
  });

  it("offers filter recovery when no search results match", () => {
    const clear = vi.fn();
    render(<DatasetCatalogPage studies={studies} loading={false} currentRole="admin" token="" filters={{ search: "unknown", domain: "All areas", sort: "recent" }} onFiltersChange={vi.fn()} onClearFilters={clear} onOpenDataset={vi.fn()} />);
    expect(screen.getByText("No datasets match your current filters")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Clear filters" }));
    expect(clear).toHaveBeenCalledOnce();
  });

  it("shows a catalog skeleton while data is loading", () => {
    render(<DatasetCatalogPage studies={[]} loading currentRole="admin" token="" filters={{ search: "", domain: "All areas", sort: "recent" }} onFiltersChange={vi.fn()} onClearFilters={vi.fn()} onOpenDataset={vi.fn()} />);
    expect(screen.getByRole("status", { name: "Loading datasets…" })).toBeInTheDocument();
  });
});
